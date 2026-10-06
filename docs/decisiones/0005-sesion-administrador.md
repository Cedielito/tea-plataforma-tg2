# 0005 — Sesión del administrador y primer administrador sin consola

**Estado:** aceptada (octubre de 2026)

**Contexto.** El panel de administración (M-08, RF-09, RF-10) exige contraseña cifrada y
una sesión que expire por inactividad (RS-05). La API corre en el plan gratuito de
Render: 0,1 CPU, se duerme tras 15 minutos sin uso, se reinicia en cada despliegue y no
ofrece consola. La web y la API comparten dominio gracias al reenvío de Vercel
(`docs/despliegue.md`).

**Decisión.**

- **Contraseña:** bcrypt con costo 10, el mínimo que recomienda OWASP. Usamos `bcryptjs`
  (JavaScript puro, sin compilar); con costo 12, cada intento tardaría varios segundos en
  0,1 CPU y frenaría la API pública. La API deja en el registro cuánto tarda la primera
  comparación de cada arranque.
- **Sesión en el servidor, dentro del documento `administrador`:** la cookie lleva un
  token aleatorio de 32 bytes y la base guarda solo su hash SHA-256, con la fecha de
  inicio y la de la última actividad. Una sesión en memoria se perdería cuando Render se
  duerme o se reinicia. Una colección `sesion` nueva cambiaría el Cuadro 13 del
  documento; con un campo auxiliar en `administrador`, el Cuadro 13 no cambia (usuario,
  contraseña cifrada y fecha del último acceso siguen siendo los campos principales).
- **Vencimiento:** 30 minutos sin actividad (cada petición a `/api/admin/*` renueva el
  plazo) y, en todo caso, 8 horas después de iniciada. Al iniciar sesión se borran las
  vencidas y se conservan como máximo 5 por administrador. Cerrar sesión la borra de la
  base: una cookie copiada deja de servir.
- **Cookie `sesion_admin`:** `HttpOnly`, `SameSite=Strict`, `Path=/api/admin` y `Secure`
  cuando `NODE_ENV=production`. Sin `Max-Age`: el navegador la borra al cerrarse.
- **Rutas:** el inicio de sesión vive en `POST /api/sesion`, fuera de `/api/admin`, para
  que todo `/api/admin/*` exija sesión sin excepciones (también las rutas que no existen
  responden 401).
- **Límites de intentos, en memoria y sin servicios externos:** 5 fallos con un mismo
  usuario en 15 minutos lo bloquean 15 minutos, aunque luego llegue la clave correcta; y
  como máximo 20 intentos por minuto en total, para que nadie sature la CPU probando
  usuarios distintos. Además, solo puede haber un intento en curso por usuario: si no,
  varias peticiones en paralelo pasarían la consulta del bloqueo antes del primer fallo
  y se podrían probar más de 5 claves. El bloqueo es por usuario y no por IP, porque la
  IP que llega a través de Vercel y Render todavía no es confiable (se revisa en T8).
- **Primer administrador:** al arrancar, si la colección `administrador` está vacía y
  existen `ADMIN_USUARIO` y `ADMIN_CLAVE`, la API lo crea con la clave cifrada. No hay
  registro público. Los pasos están en `docs/despliegue.md`.
- **Registro:** la clave, el token y la cookie nunca se escriben en el registro, ni
  siquiera en los mensajes de error.

**Consecuencias.**

- Quien conozca el usuario puede bloquearlo 15 minutos con intentos fallidos; por eso el
  usuario no debe ser obvio. Los contadores de intentos se reinician si la API se
  reinicia.
- Cada petición del panel hace una escritura en la base (la última actividad); con el
  tráfico del panel no es un problema.
- Para cambiar una contraseña olvidada se borra el documento en Atlas y se vuelve a
  crear con las variables (ver `docs/despliegue.md`). Un cambio de contraseña desde el
  panel queda fuera del alcance de la Fase I.
