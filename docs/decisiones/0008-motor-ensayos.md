# 0008 — Motor de ensayos, reloj y tarea de cambio de regla (T13)

**Estado:** aceptada (octubre de 2026)

**Contexto.** T12 dejó en `api/src/dominio/registro/` el catálogo, el secuenciador, los
indicadores y el motor de M-09, sin pantallas. T13 construye en `web/` el motor de
ensayos y la tarea de cambio de regla (DCCS). Necesitábamos decidir cómo obtiene la web
el plan sin copiar el catálogo, cómo se mide el tiempo, cómo se generan los ensayos y
cómo se asigna la clase de error.

**Decisión.**

- **Fuente única del plan.** `GET /api/registro/plan` (de solo lectura, sin datos de
  nadie, ignora la consulta) devuelve `planificarSesion()`. La web genera los ensayos a
  partir de ese plan y no copia el catálogo ni el secuenciador. La única copia es
  `vistaDeEnsayo` (CT-03), en `web/src/registro/vista.js`, porque el build de Vite no
  puede importar el CommonJS de `api/`; una prueba compara las dos con todos los
  ensayos de una sesión. Las pruebas de la web importan `planificarSesion`,
  `buscarVocabularioProhibido` y `contieneDatoIdentificable` directamente de `api/`.
- **Catálogo 1.1.0.** Los parámetros de medición viven en el catálogo:
  `limiteRespuestaMs: 5000` (sin respuesta en 5 s netos, el ensayo queda omitido),
  `intervaloEntreEnsayosMs: 500` (cruz de fijación, sin nada visible que cuente el
  tiempo) y `cambios: 3` en cada bloque mixto. El secuenciador rechaza un bloque mixto
  sin al menos un cambio y una repetición. `VERSION_ALGORITMO` no cambia: ningún
  cálculo cambió.
- **Medición del tiempo (CT-07).** La señal de la regla y el estímulo aparecen al mismo
  tiempo, y el tiempo de reacción se mide desde esa aparición. La aparición se marca con
  `performance.now()` dentro del `requestAnimationFrame` pedido después de que React
  pone el estímulo en la página (el fotograma en que se dibuja); la respuesta, con
  `event.timeStamp` del `keydown` o `pointerdown`. Tiempo de reacción = respuesta menos
  aparición, en ms con decimales (redondeado a milésimas solo para quitar el ruido de
  la coma flotante). Cuenta la primera respuesta (`rectificaciones = 0`); se ignoran
  las teclas mantenidas y lo que llega antes de la aparición. La estrategia vive en
  `web/src/registro/reloj.js` con dos variantes intercambiables por configuración
  (`VITE_RELOJ_REGISTRO` o `?reloj=` en `/registro/prueba`): `animacion`, la descrita, y
  `referencia`, con `setTimeout(0)` y `Date.now()`. T16 compara las dos.
- **Pausas (RF-13).** Si la pestaña se oculta durante un ensayo (`visibilitychange`),
  ese tiempo va a `pausasDuranteItemMs` y no cuenta para el límite de 5 s. El tiempo de
  reacción guardado incluye la pausa; el dominio calcula el neto.
- **Entrada.** Teclas F y J (por `event.code`, sin depender de la distribución del
  teclado) o `pointerdown` sobre las cajas, que son botones grandes. Enter o espacio
  sobre una caja enfocada también cuentan, como teclado. Cada ensayo guarda
  `tipoEntrada` (`teclado`, `raton`, `tactil` o `lapiz`).
- **Estímulos.** Conejo y barco, rojos o azules, dibujados en SVG. Las cajas son conejo
  rojo (F) y barco azul (J); los estímulos de prueba, conejo azul y barco rojo, siempre
  en conflicto. Rojo y azul (nunca rojo y verde), comprobados con una simulación de
  protanopía y deuteranopía. El color es el estímulo: el modo alto contraste no lo
  cambia (`--estimulo-*` en `tokens.css`, con prueba).
- **Generación con semilla.** Una sola secuencia seudoaleatoria (mulberry32, sin
  dependencias) con la semilla de la sesión, que se guarda en cada ensayo. Cada bloque,
  también los mixtos, reparte los dos estímulos 4 y 3, barajados. En los bloques mixtos,
  después del primer ensayo van 3 cambios y 3 repeticiones barajados. El tipo de ensayo
  no se guarda: lo calcula el dominio (`clasificarEnsayosMixtos`). La práctica usa solo
  la regla de color, para no mostrar la de forma antes del cambio.
- **Instrucciones en cada cambio de regla.** Antes del bloque de forma hay una pantalla
  que dice que ahora se clasifica por forma, y antes del primer bloque mixto otra que
  explica que la palabra de arriba indica la regla en cada ensayo. Son instrucciones, no
  práctica: sin ellas, los errores del bloque de forma medirían no conocer la regla y no
  la perseveración.
- **Clase de error.** `correcta` si acierta; `perseverativa` si la respuesta habría sido
  correcta con la regla anterior (en el bloque de forma, la de color; en los mixtos, la
  del ensayo anterior del mismo bloque); `aleatoria` en otro caso. El primer ensayo de
  cada bloque mixto no tiene regla anterior, así que su error es `aleatoria`. Una
  omisión no es un error: `acierto: false` y `claseError: null`.
- **CC-08 con dos cajas.** Con dos cajas y estímulos siempre en conflicto, la única
  respuesta incorrecta en el bloque de forma es la caja de la regla de color: **todo
  error del bloque de forma es perseverativo y CC-08 equivale a la proporción de errores
  de ese bloque**. Es lo esperado en el DCCS clásico; lo llevamos al documento. Los
  errores `aleatoria` solo aparecen en la práctica, en el bloque de color y en las
  repeticiones y el primer ensayo de los bloques mixtos.
- **Dinámicas gamificadas que no alteran la medición.** Marco narrativo («El taller que
  cambia»), barra de progreso por bloques (avanza al terminar cada bloque), mensaje de
  ánimo fijo al final de cada bloque (no depende del desempeño) y retroalimentación de
  acierto solo en la práctica. Sin puntos, vidas, rankings ni temporizadores visibles:
  la pantalla aplica `vistaDeEnsayo`. Cada dinámica declara su principio neuroeducativo
  en un comentario (`textos.js`, `BarraProgreso.jsx`).
- **Sesión local.** `/registro/prueba` (no enlazada, noindex) no envía ni guarda nada:
  al terminar muestra los ensayos en una tabla con «Descargar JSON». La interfaz de
  M-09 no nombra la plataforma, porque su nombre lleva una etiqueta diagnóstica.

**Consecuencias.** La sesión simulada de la web
(`api/test/ayudas/sesionWebCambioRegla.json`) prueba en `api/` que `procesarSesion`
obtiene CC-08, CC-09 y CC-12 con el formato de la web. Si ese formato cambia a
propósito, se regenera con `ACTUALIZAR_SESION_SIMULADA=1 npm test -w web`. T14 reutiliza
`motorEnsayo.js`, `reloj.js` y la página; T15 agrega el seudónimo, el guardado y el
flujo del profesional; T16 mide el error de las dos variantes del reloj.
