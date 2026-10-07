# 0006 — Formulario de contacto, límite por IP y supresión a los 180 días

**Estado:** aceptada (octubre de 2026)

**Contexto.** El formulario de contacto (M-06, RF-08) es el único lugar donde la
plataforma recoge datos personales. La política de tratamiento de datos (versión 1.0,
`api/contenidos/paginas/privacidad.md`) promete guardar solo correo, mensaje, fecha y
versión aceptada; usar la IP por poco tiempo y no guardarla; y borrar cada mensaje a
los seis meses (RS-02 a RS-04). La API corre en el plan gratuito de Render, que se
duerme tras 15 minutos sin uso, y recibe las peticiones a través del reenvío de
Vercel.

**Decisión.**

- **Datos mínimos (RS-02).** `POST /api/contacto` acepta solo `correo`, `mensaje`,
  `autorizacion` (exactamente `true`) y `versionPolitica`; cualquier otro campo da 400.
  La colección `mensaje_contacto` guarda correo, mensaje, fecha y versión, con
  `strict: 'throw'`, sin `__v` ni marcas de tiempo. El correo admite letras sin
  tildes, números, punto, guion, guion bajo y +, para que el enlace `mailto:` de la
  bandeja no se pueda manipular.
- **Versión aceptada (RS-03).** La web envía la versión de la política que mostró. Si
  no es la vigente, la API responde 409 y la web pide leer y aceptar la nueva. Así, la
  versión guardada es la que la persona leyó.
- **La política no está en la base.** Las páginas de `api/contenidos/paginas/` se leen
  al arrancar y se sirven desde la memoria (`/api/paginas/:slug`): cambian con una
  versión nueva en el repositorio, revisada en un PR, y no desde el panel. Un archivo
  que dice `COMPLETAR` no se publica, y una prueba lo detecta antes de fusionar.
- **Límite de envíos, en memoria y sin servicios externos.** 5 por IP cada 15 minutos
  y 40 por hora en total. Solo cuentan los envíos válidos. Cada IP se olvida en cuanto
  vence su ventana. La IP sale de `X-Forwarded-For` con `trust proxy` = 2, contando
  desde la derecha (balanceador de Render y Vercel), para que el visitante no la pueda
  cambiar agregando direcciones a la izquierda. El valor se puede cambiar con
  `SALTOS_PROXY` después de comprobarlo en el entorno desplegado (`docs/despliegue.md`).
- **Registro.** Ni la IP, ni el correo, ni el mensaje se escriben en el registro, ni
  siquiera en un error: la ruta no escribe nada y el manejador de errores responde 500
  sin detalles. Una prueba espía la consola para comprobarlo.
- **Supresión automática (RS-04) con un índice TTL de MongoDB** sobre `fecha`, de 180
  días: Atlas borra los mensajes vencidos cada minuto, aunque la API esté dormida. Una
  tarea programada en Express no correría con el plan gratuito. Seis meses de
  calendario son de 181 a 184 días: con 180 se borra unos días antes, nunca después, y
  no hace falta un quinto campo con la fecha exacta.
- **Bandeja (RF-11).** `GET` y `DELETE /api/admin/mensajes`, detrás de la sesión. La web
  muestra el mensaje como texto plano, un enlace para responder por correo y
  «Eliminar» con confirmación en la misma tarjeta, sin ventanas emergentes.
- **Sin reintento automático del envío:** si la red falla, la web conserva lo escrito y
  la persona decide cuándo reenviar, para no guardar dos veces el mismo mensaje.

**Consecuencias.**

- Varias personas en la misma red (por ejemplo, el Wi-Fi de la universidad) comparten
  el cupo de 5 envíos cada 15 minutos. Para la prueba de usabilidad, con sesiones
  seguidas, alcanza.
- Los contadores se reinician cuando la API se reinicia o se duerme.
- Cambiar el plazo de 180 días en una base existente requiere `collMod`
  (`docs/despliegue.md`); la API avisa en el registro si el índice no tiene el plazo
  esperado.
- Una versión nueva de la política obliga a quien tenga el formulario abierto a
  aceptarla de nuevo.
