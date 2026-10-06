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

**Vercel** (*Add New → Project*): Root Directory `web`, preset Vite. Sin variables.

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

## Cosas que hay que saber

- **La API gratuita se duerme** tras 15 minutos sin uso y la primera petición tarda
  hasta un minuto en despertarla; mientras tanto la web puede mostrar el estado de
  error. Antes de una demostración o de una sesión con voluntarios, abrir
  `/api/salud` un par de minutos antes.
- **Las vistas previas de los PR usan la API y la base de producción.** Al probar el
  panel de administración (T4 en adelante) en una vista previa, lo que se cree o se
  borre queda en la base real.
- **IP de quien consulta** (para el límite de envíos de T8): las peticiones llegan a
  Express a través de Vercel y del balanceador de Render, así que la IP del visitante
  viene en `X-Forwarded-For`; hay que configurar `trust proxy` en Express y probarlo
  en el entorno desplegado.
- Render solo vuelve a publicar cuando cambia algo dentro de `api/`. Para forzarlo:
  *Manual Deploy → Deploy latest commit*. Los textos viven en `api/contenidos/` por
  eso mismo: un PR que solo cambia un texto también vuelve a publicar la API, y al
  arrancar la API los carga en Atlas.
- La carga de textos corre en cada arranque, también cuando la API despierta. Solo
  escribe si un archivo trae una `fechaRevision` más reciente que la de la base.
