# 0009 — Tarea de figuras jerárquicas de Navon (T14)

**Estado:** aceptada (octubre de 2026)

**Contexto.** T13 dejó en `web/src/registro/` el motor de ensayos, el reloj, el generador
con semilla y la tarea de cambio de regla, sobre el plan de `GET /api/registro/plan`. T14
agrega la segunda tarea de M-09, las figuras jerárquicas de Navon (CC-10), sobre el mismo
motor y sin cambiar la medición. Necesitábamos decidir cómo se generan y se balancean los
estímulos, cómo es la práctica, qué guarda cada ensayo y cómo comparten la pantalla las
dos tareas.

**Decisión.**

- **Plan sin cambios.** La tarea usa la secuencia `navon` del plan: 2 ensayos de práctica
  y los 4 bloques del catálogo en su orden (global, local, local, global), 7 ensayos por
  bloque, con `limiteRespuestaMs` e `intervaloEntreEnsayosMs` del plan. El catálogo, el
  secuenciador y `version.js` no cambian.
- **Estímulos.** Una letra grande, H o S, hecha con letras pequeñas, H o S, sobre una
  cuadrícula de 5 × 7 (`estimulosNavon.js`). Cada estímulo es `{ global, local }`, y la
  condición del bloque es el nombre de la letra que se responde: la respuesta correcta es
  `estimulo[condicion]`. Las letras pequeñas son trazos SVG, no texto, para que no
  dependan de la fuente (`FiguraNavon.jsx`).
- **Tamaño fijo.** El cartel mide 200 × 280 px (`--figura-navon-*` en `tokens.css`, en px
  a propósito): la relación entre la letra grande y las pequeñas es parte del estímulo y
  no cambia con el tamaño de letra de la barra de accesibilidad. Cabe en 320 px. El color
  (`--estimulo-contorno`) no cambia con el alto contraste. Una prueba revisa las unidades.
- **Balance con semilla.** En cada bloque, congruentes e incongruentes 3 y 4 (o 4 y 3) y,
  dentro de cada grupo, la letra correcta lo más pareja posible: en el bloque, 4 de una
  letra y 3 de la otra. Entre los dos bloques de cada condición se alterna quién lleva el
  congruente de más y qué letra va una vez más (la semilla elige el primero), así que cada
  condición queda con 7 congruentes, 7 incongruentes, 7 H y 7 S. Así la congruencia y la
  letra no se confunden con la diferencia global-local. Todo sale de la misma secuencia
  seudoaleatoria (`azar.js`) y la semilla de la sesión va en cada ensayo.
- **Práctica (CP-04).** Un ensayo de cada nivel, en el orden de los bloques (global y
  después local), los dos **incongruentes** y con letras correctas distintas: en un
  ensayo congruente se acierta mirando cualquier nivel, así que la práctica no
  comprobaría la instrucción. Cada ensayo de práctica tiene antes su pantalla de
  instrucciones y después retroalimentación.
- **Instrucciones antes de cada bloque.** «Mira la letra grande» o «Mira las letras
  pequeñas», con un ejemplo dibujado (una H grande hecha con S pequeñas), también antes
  del tercer bloque aunque repita el nivel. Durante el ensayo, arriba, un recordatorio fijo
  del nivel («GRANDE» o «PEQUEÑAS»), visible también durante la cruz de fijación. El
  cartel aparece después de la cruz y queda visible hasta la respuesta o el límite.
- **Respuesta.** F = H y J = S (por `event.code`), o dos botones grandes que muestran la
  letra y la tecla. `respuesta` guarda la letra elegida.
- **Campos del ensayo.** Los de T13, con `fase` y `regla` en `null`, más `condicion`
  (`'global'` | `'local'`) y `congruencia` (`'congruente'` | `'incongruente'`), después de
  `condicion`. `numero` cuenta dentro de cada tarea; `tarea` distingue las dos. Los
  ensayos de cambio de regla no cambian (no llevan `congruencia`).
- **Clase de error.** `correcta` si acierta y `aleatoria` si no: en Navon no hay regla
  anterior, así que ningún error es perseverativo. Una omisión, como en T13, tiene
  `acierto: false` y `claseError: null` (RF-14: la omisión no es un error).
- **Pantalla compartida.** `PantallaEnsayo.jsx` conserva los efectos que miden (cruz,
  `crearEnsayoMedido`, `keydown`, `pointerdown` y `visibilitychange`) y recibe por props lo
  propio de cada tarea: las opciones con su tecla, lo que aparece después de la cruz y un
  encabezado fijo opcional. `EnsayoCambioRegla.jsx` y `EnsayoNavon.jsx` la usan;
  `PantallasTarea.jsx` tiene las pantallas de texto y la pausa de las dos tareas.
  `reloj.js` y `motorEnsayo.js` no cambian.
- **Dinámicas gamificadas.** Las mismas de T13, con su propio marco narrativo («Los
  carteles de letras»): barra de progreso por bloques, ánimo fijo al final de cada bloque,
  retroalimentación solo en la práctica y el recordatorio fijo del nivel. Los textos y sus
  principios neuroeducativos están en `textos.js` (`NAVON`, `INSTRUCCIONES_NIVEL`) y pasan
  por `buscarVocabularioProhibido`.
- **Sesión de las dos tareas.** `/registro/prueba` hace cambio de regla, una pausa entre
  tareas y Navon, con la misma semilla y el mismo reloj, y descarga un solo JSON
  (`unirSesiones`: ensayos en orden y contexto sumado). `?tarea=navon` (o
  `?tarea=cambio-regla`) abre solo esa tarea. El archivo se llama
  `registro-prueba-<semilla>.json` con las dos tareas y `registro-prueba-<tarea>-<semilla>.json`
  con una.

**Consecuencias.** `sesionSimulada.js` produce además
`api/test/ayudas/sesionWebDosTareas.json`, que `registroSesionDosTareas.test.js` procesa
con `procesarSesion` y obtiene CC-08, CC-09, CC-10 y CC-12. La parte de cambio de regla
es la misma sesión de T13, cuyo archivo no cambia. T15 guarda la sesión de las dos tareas
con el seudónimo; T16 mide la precisión del reloj en las dos.
