# 0012 — Auditoría de accesibilidad y rendimiento, CLS y aviso de vencimiento (T10)

**Estado:** aceptada (octubre de 2026)

**Contexto.** Antes de congelar la versión, T10 pedía auditar toda la plataforma con axe-core
y Lighthouse (WCAG 2.1 AA, RA-01 a RA-11), también las pantallas de M-09, con dos metas: 0
violaciones críticas o graves, y en Lighthouse móvil accesibilidad ≥ 90 y rendimiento ≥ 80.
La medición inicial no encontró violaciones graves, pero 7 de las 12 páginas públicas
quedaron entre 73 y 76 de rendimiento por el desplazamiento del diseño (CLS) al llegar el
contenido. Además, la sesión del panel y de la zona del profesional se cerraba a los 30
minutos sin actividad sin avisar antes, y el criterio 2.2.1 pide avisar y dejar extender.
Había que decidir cómo auditar sin sumar peso al CI, cómo quitar el CLS sin perder la
descarga aparte de `react-markdown`, y cómo avisar sin romper la regla de «nada de ventanas
emergentes automáticas».

**Decisión.**

- **La auditoría es un script, no una prueba del CI.** `npm run accesibilidad -w web`
  (`web/evaluacion/accesibilidad/`) sobre el build, con la API y MongoDB en memoria, la
  misma preparación del arranque real (`prepararArranque()`, que separamos de `principal()`
  en `api/src/index.js`) y el build comprimido como en Vercel. axe-core corre con
  `@axe-core/playwright` 4.13.0, dependencia de desarrollo de `web/`, en tres variantes
  (normal, alto contraste y 320 px), y comprueba también el desplazamiento horizontal.
  Lighthouse 12.8.2 corre con `npx` y `--port` hacia el Chromium de Playwright: no entra a
  `package.json`, así el `npm ci` del CI no carga sus paquetes. En el CI solo corren las
  pruebas de la lógica pura del resumen.
- **El contenido de la API aparece de una vez.** `Markdown.jsx` deja de usar `React.lazy` y
  `Suspense`: guarda el módulo de `react-markdown` cuando se descarga, que sigue siendo
  aparte. Las páginas esperan a `useMarkdownListo()` y a los datos para mostrar el cuerpo,
  las fuentes y la fecha juntos. Mientras cargan, `EstadoDatos` con `reservarAlto` ocupa el
  alto de la ventana, para que el pie no salte. Si la descarga falla, el texto se muestra sin
  formato.
- **Aviso antes del cierre por inactividad.** `clienteAdmin.js` anota como actividad cada
  respuesta de `/api/admin` que el servidor atendió con la sesión vigente
  (`cuentaComoActividad` en `admin/vencimiento.js`), con la hora en que salió la petición.
  Dos minutos antes de los 30, `AvisoVencimiento.jsx` muestra arriba una franja fija dentro
  de `role="status"`: dice la hora de cierre, sin cuenta regresiva, y ofrece «Seguir
  conectado», que pide `GET /api/admin/sesion`. No es una ventana emergente ni mueve el
  foco. El temporizador es interno: nada cuenta el tiempo en pantalla. Si la sesión ya venció,
  el 401 lleva a `SesionVencida`, que conserva lo escrito.
- **Límites que no se extienden.** El tope de 8 horas (RS-05) y las 2 horas de la aplicación
  de M-09 son límites de seguridad. Los 5 s por ensayo son la excepción «esencial» de
  2.2.1. Lo documentamos en `docs/evaluacion/accesibilidad.md`.

**Consecuencias.** Las metas se cumplen: 0 violaciones de axe en 222 pantallas y, en
Lighthouse, accesibilidad de 100 y rendimiento de 96 a 98 en las 12 páginas. Una revisión
manual del código encontró problemas que axe no ve (foco, regiones vivas, objetivos de
44 px), y los corregimos. La auditoría no cubre lectores de pantalla ni zoom al 200 %: quedan
como revisión manual del equipo (pendiente en `docs/backlog-fase-i.md`). Si cambian los
colores o la portada, hay que revisar de nuevo a mano las comprobaciones de contraste que axe
deja incompletas. Las cuentas de la auditoría solo existen en la base en memoria.
