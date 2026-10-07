# Despliegue (RS-06)

La plataforma corre en tres servicios gratuitos, todos con HTTPS.

| Pieza | Servicio | Dirección | Qué publica |
|---|---|---|---|
| Web (`web/`) | Vercel, proyecto `tea-plataforma-tg2` | https://tea-plataforma-tg2.vercel.app | Cada fusión a `main`; cada PR recibe una vista previa |
| API (`api/`) | Render, servicio `tea-plataforma-api` (Free, Oregon) | https://tea-plataforma-api.onrender.com | Cada fusión a `main` que toque `api/` |
| Base de datos | MongoDB Atlas, proyecto `tea-plataforma-tg2`, clúster M0 `tea-plataforma` (São Paulo) | — | — |

## Cómo se conectan

```
Navegador ──HTTPS──> Vercel (tea-plataforma-tg2.vercel.app)
                       ├─ /api/*  ──reenvío──> Render (tea-plataforma-api.onrender.com) ──> Atlas
                       └─ todo lo demás ──> index.html (la SPA)
```

- La web llama siempre a rutas relativas (`/api/contenidos`). En producción y en las
  vistas previas, `web/vercel.json` reenvía `/api/*` a Render. En local, el proxy de
  `web/vite.config.js` las manda a `http://localhost:3000`. **No hace falta variable
  de entorno con la URL de la API ni CORS**: para el navegador todo es el mismo dominio.
- Como la API se ve en el mismo dominio que la web, la cookie de sesión del panel
  (T4) puede ser `SameSite=Strict` y `Secure`.
- Si cambia la dirección de Render, se cambia en un solo lugar: `web/vercel.json`.

## Variables de entorno

| Dónde | Variable | Valor |
|---|---|---|
| Render | `MONGODB_URI` | Cadena de Atlas con el usuario de la base y `/tea_plataforma` antes del `?` |
| Render | `NODE_VERSION` | `22` |
| Render | `NODE_ENV` | `production`: la cookie de sesión del panel lleva `Secure` (T4) |
| Render | `ADMIN_USUARIO` | Solo para crear el primer administrador; se borra después (ver «Panel de administración») |
| Render | `ADMIN_CLAVE` | Solo para crear el primer administrador; **se borra después** |
| Render | `SALTOS_PROXY` | No se define: vale 2 (ver «Formulario de contacto»). Solo si la comprobación del límite falla |
| Render | `PORT` | No se define: Render la asigna |
| Vercel | — | Ninguna por ahora |

Los valores reales **solo** viven en los paneles de Render y Atlas. Nunca en el
repositorio, en un issue, en un PR ni en un chat.

## Configuración de cada servicio

**MongoDB Atlas**
1. Proyecto `tea-plataforma-tg2` → clúster **Free (M0)**, AWS, São Paulo.
2. *Database Access*: usuario de la API con contraseña autogenerada (solo letras y
   números, para no tener que codificarla en la cadena).
3. *Network Access*: `0.0.0.0/0` permanente. Render no tiene IP fija; la protección es
   la contraseña.
4. *Connect → Drivers*: copiar la cadena y agregar `/tea_plataforma` antes del `?`.

**Render** (*New → Web Service*, repositorio `Cedielito/tea-plataforma-tg2`)

| Campo | Valor |
|---|---|
| Branch | `main` |
| Root Directory | `api` |
| Language | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/salud` |

Con `NODE_ENV=production`, el `npm install` de Render no instala las dependencias de
desarrollo (Jest, supertest, mongodb-memory-server). La API no las necesita para
funcionar: verificamos que arranca con `npm ci --omit=dev` seguido de `node src/index.js`.

**Vercel** (*Add New → Project*): Root Directory `web`, preset Vite. Sin variables.
`web/vercel.json` también envía `X-Robots-Tag: noindex, nofollow` en `/admin`, para
que los buscadores no indexen el panel.

## Comprobar que todo funciona

1. https://tea-plataforma-api.onrender.com/salud → `{"estado":"ok"}` (la API).
2. https://tea-plataforma-tg2.vercel.app/api/salud → `{"estado":"ok"}` (el reenvío
   desde Vercel).
3. En los logs de Render, la línea `API en el puerto ...` aparece solo después de
   conectarse a Atlas: si está, la base responde.
4. Justo antes aparece la carga de textos de `api/contenidos/`, por ejemplo
   `Contenidos: 8 creados, 0 actualizados, 0 sin cambios, 0 con errores.` Si hay
   archivos con errores, cada uno sale en una línea debajo, con el motivo.
5. https://tea-plataforma-tg2.vercel.app/api/contenidos → la lista de contenidos
   publicados (8 con los textos actuales).
6. Justo antes de `API en el puerto ...` también aparecen
   `Páginas fijas: 2 cargadas, 0 con errores.` y
   `Mensajes de contacto: se suprimen automáticamente a los 180 días.` (T8).
7. https://tea-plataforma-tg2.vercel.app/admin → el inicio de sesión del panel. Al
   entrar, los logs de Render muestran una vez por arranque
   `Inicio de sesión: la primera comparación de contraseña tardó … ms (bcrypt, costo 10).`

## Panel de administración (M-08, T4)

El panel vive en `/admin` (no está enlazado desde el sitio). No hay registro público:
el primer administrador se crea al arrancar la API, con variables de entorno, porque el
plan gratuito de Render no tiene consola.

**Crear el primer administrador**

1. En Render → `tea-plataforma-api` → *Environment*, agregar:
   - `NODE_ENV` = `production` (si no existe).
   - `ADMIN_USUARIO`: de 3 a 40 caracteres entre `a-z`, `0-9`, `.`, `_` y `-`. Que no
     sea obvio (evitar `admin`): el bloqueo por intentos es por usuario.
   - `ADMIN_CLAVE`: 12 caracteres o más (máximo 72 bytes), generada con un gestor de
     contraseñas.
2. Guardar las variables y desplegar de nuevo (Render lo ofrece al guardar; si no,
   *Manual Deploy → Deploy latest commit*). En los logs debe aparecer
   `Administrador: administrador inicial creado: <usuario>.`
   Si la clave o el usuario no cumplen, aparece `Administrador: no se creó.` con el motivo.
3. **Borrar `ADMIN_CLAVE` y `ADMIN_USUARIO`** de *Environment*. La clave ya quedó cifrada
   en Atlas; mientras siga configurada, cada arranque deja un aviso para borrarla.

La API solo crea el administrador si la colección `administrador` está vacía: cambiar las
variables después no cambia nada. Nunca escribe la clave en los logs.

**Si se olvida la contraseña:** en Atlas → *Browse Collections* → `tea_plataforma` →
`administrador`, borrar el documento y repetir los pasos 1 a 3.

**Cómo funciona la sesión** (detalles en `docs/decisiones/0005-sesion-administrador.md`)

- Cookie `sesion_admin`: `HttpOnly`, `SameSite=Strict`, `Path=/api/admin` y `Secure`.
- Vence tras 30 minutos sin actividad y, en todo caso, a las 8 horas. Escribir en el
  editor no cuenta como actividad; guardar o abrir otra página del panel sí. Si vence,
  el editor conserva lo escrito y pide entrar de nuevo.
- 5 intentos fallidos con un mismo usuario lo bloquean 15 minutos. Además, la API
  acepta como máximo 20 intentos de inicio de sesión por minuto en total.
- Si la API se reinicia (se durmió o hubo despliegue), las sesiones siguen abiertas
  porque viven en Atlas; los contadores de intentos sí vuelven a cero.

## Cosas que hay que saber

- **La API gratuita se duerme** tras 15 minutos sin uso y la primera petición tarda
  hasta un minuto en despertarla; mientras tanto la web puede mostrar el estado de
  error. Antes de una demostración o de una sesión con voluntarios, abrir
  `/api/salud` un par de minutos antes.
- **Las vistas previas de los PR usan la API y la base de producción.** Al probar el
  panel de administración (T4 en adelante) en una vista previa, lo que se cree o se
  borre queda en la base real, y se entra con el mismo administrador de producción.
- **El panel puede cambiar páginas que vienen de `api/contenidos/`.** El cambio se
  mantiene hasta que el archivo llegue con una `fechaRevision` más reciente: en ese
  arranque el archivo lo reemplaza y vuelve a publicar la página. El editor lo avisa.
- **IP de quien consulta** (límite de envíos del formulario de contacto): ver
  «Formulario de contacto (T8)».
- Render solo vuelve a publicar cuando cambia algo dentro de `api/`. Para forzarlo:
  *Manual Deploy → Deploy latest commit*. Los textos viven en `api/contenidos/` por
  eso mismo: un PR que solo cambia un texto también vuelve a publicar la API, y al
  arrancar la API los carga en Atlas.
- La carga de textos corre en cada arranque, también cuando la API despierta. Solo
  escribe si un archivo trae una `fechaRevision` más reciente que la de la base.

## Formulario de contacto (T8)

Detalles en `docs/decisiones/0006-mensajes-contacto.md`.

**Qué se guarda.** Solo correo, mensaje, fecha y versión de la política aceptada, en la
colección `mensaje_contacto` de Atlas. La IP no se guarda y, como el correo y el
mensaje, nunca se escribe en los logs.

**Límite de envíos.** 5 por IP cada 15 minutos y 40 por hora en total, en memoria: se
reinician si la API se reinicia. La IP llega en `X-Forwarded-For`: Vercel escribe la
del visitante y el balanceador de Render agrega la de Vercel. Express (`trust proxy`)
cuenta 2 saltos desde la derecha, así que lo que el visitante agregue a la izquierda
no cuenta. Quien llame directo a `tea-plataforma-api.onrender.com` podría falsear su
IP; para eso está el límite total.

**Comprobar el límite en el entorno desplegado** (sin mirar ninguna IP). Deja mensajes
de prueba en la base real: se borran después desde la bandeja.

1. Desde un celular con datos móviles, envía 6 mensajes seguidos en `/contacto`. El
   sexto debe decir «Ya se enviaron varios mensajes desde tu conexión…».
2. En ese mismo momento, desde otro dispositivo en otra red (por ejemplo, el Wi-Fi de
   la casa), envía 1 mensaje. Debe llegar.
3. Si el paso 2 también recibe el aviso, la API está contando menos saltos de los
   reales y toma la IP de un proxy, compartida por todos los visitantes. En Render,
   agrega `SALTOS_PROXY` = `3`, despliega y repite. **Nunca lo bajes a `1`**: Vercel
   sobrescribe `X-Forwarded-For` con la IP del visitante, así que contar más saltos
   de los reales no hace daño (la dirección de más a la izquierda sigue siendo la que
   escribió Vercel), y contar menos devuelve la IP de un proxy.
4. Elimina los mensajes de prueba desde `/admin/mensajes`.

**Supresión automática de mensajes (RS-04).** Un índice TTL de MongoDB sobre `fecha`
borra cada mensaje 180 días después de recibido: lo hace Atlas, aunque la API esté
dormida (una tarea programada en Express no correría). Seis meses de calendario son
de 181 a 184 días, así que se borra unos días antes, nunca después. La API crea el
índice al arrancar y deja en el log si tiene el plazo correcto. Para cambiar el plazo
en una base que ya tiene el índice hay que usar `collMod` (en Atlas → *Data Explorer*
→ *Shell*, o con `mongosh`), además de cambiar `DIAS_CONSERVACION` en
`api/src/dominio/contacto.js`:

```
db.runCommand({ collMod: "mensaje_contacto",
  index: { keyPattern: { fecha: 1 }, expireAfterSeconds: <días × 86400> } })
```

**Bandeja.** En `/admin/mensajes`: del más reciente al más antiguo, «Responder por
correo» y «Eliminar» con confirmación. Si un mensaje trae nombres, documentos o datos
de salud de niños, niñas o adolescentes, se responde de forma general y se elimina
después de responder.
