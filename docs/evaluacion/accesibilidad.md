# Accesibilidad y rendimiento (RA-01 a RA-11)

Auditoría de la tarea T10 sobre toda la plataforma: la zona pública (M-01 a M-07), el
panel de administración (M-08) y el registro conductual (M-09), con la zona del
profesional y la aplicación completa del participante. La norma es WCAG 2.1, nivel AA.

Metas de T10:

- **axe-core**: 0 violaciones críticas o graves, en las tres variantes de la interfaz
  (normal, alto contraste y 320 px).
- **Lighthouse** en perfil móvil, en cada página pública principal: accesibilidad ≥ 90 y
  rendimiento ≥ 80.

**Resultado.** Se cumplen las dos metas. Después de las correcciones, axe no encuentra
ninguna violación (ni crítica, ni grave, ni moderada, ni menor) en las 222 pantallas
auditadas (74 pantallas en 3 variantes), y ninguna pantalla se desplaza a lo ancho. Lighthouse
da 100 de accesibilidad en las 12 páginas públicas principales, y el rendimiento pasó de 73 a
76 en siete de ellas a entre 96 y 98 en todas. La causa era el desplazamiento del diseño
al llegar el contenido (CLS). Además, una revisión manual del código encontró 11 problemas
de accesibilidad que axe no ve: corregimos 9 y documentamos 2 como excepciones o
limitaciones de las tareas de M-09. Una segunda revisión, de las correcciones, encontró 5
problemas menores más: corregimos 4 y documentamos 1.

Una auditoría automática no basta para declarar la conformidad con WCAG: las herramientas
detectan una parte de los problemas. Por eso hicimos además una revisión manual del código
(«Revisión manual»), y dejamos aparte lo que solo se puede comprobar con personas y con
tecnologías de apoyo («Lo que no se revisa automáticamente»).

## Método

### Herramientas

| Herramienta | Versión | Uso |
|---|---|---|
| axe-core, con `@axe-core/playwright` | 4.13.0 | Reglas de WCAG 2.0 y 2.1, niveles A y AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`), y buenas prácticas de axe (`best-practice`) |
| Playwright (`@playwright/test`) | 1.64.1 | Recorre las pantallas y le entrega cada una a axe |
| Chromium | 141.0.7390.37 | Navegador de las dos herramientas (el instalado en el contenedor) |
| Lighthouse | 12.8.2 | Accesibilidad y rendimiento en perfil móvil, con `npx lighthouse@12.8.2` |
| Node.js | 22.22.0 | Servidor y scripts |

Lighthouse no es una dependencia del proyecto: corre con `npx`, para no sumar sus paquetes
al `npm ci` del CI. Se conecta con `--port` al Chromium que abre Playwright.

### Servidor

`web/evaluacion/accesibilidad/servidor.js` sirve el build de la web (`web/dist`) y la API en
el mismo origen, como Vercel y Render en producción:

- Levanta MongoDB en memoria (`mongodb-memory-server`, el de las pruebas de `api/`) y corre
  `prepararArranque()` (`api/src/index.js`). Es la misma preparación del arranque real:
  carga los contenidos, los pasos de la ruta, el directorio, las preguntas, los recursos, las
  páginas fijas y el SUS de `api/contenidos`, y crea dos cuentas de prueba (una de
  administrador y una de profesional) que solo existen en esa base.
- Envía los archivos del build comprimidos con brotli o gzip (zlib de Node), como Vercel. Sin
  compresión, Lighthouse mediría un JavaScript tres veces más pesado que el real.

### Pantallas

axe se aplica a cada pantalla tal como la ve una persona, después de que llegan los datos y
las fuentes tipográficas. Son 74 pantallas por variante (la medición inicial tuvo 71: las tres
que faltaban, el fin de la práctica de cada tarea y la lista después de eliminar, las sumamos
después de la revisión del código):

- **Zona pública (25)**: inicio; Qué es el TEA, Mitos y realidades y Derechos; Señales de
  alerta con cada una de sus tres pestañas (4 a 7, 8 a 12 y 13 a 17 años); Ruta de atención
  en la pregunta 1, con el error de «Siguiente» sin respuesta, en las preguntas 2 y 3, en el
  final y en el final con una ciudad elegida; directorio, sin filtros y con ciudad y tipo;
  recursos; preguntas frecuentes, cerradas y con una abierta desde su ancla; contacto, vacío y
  con los errores de un envío sin datos; privacidad; acerca de; buscar; página no encontrada.
- **Panel (14)**: inicio de sesión, con el error de credenciales incorrectas; las seis listas
  (contenidos, pasos de la ruta, directorio, preguntas, recursos y mensajes); los editores de
  un contenido nuevo, de un contenido existente y de una entidad nueva; el aviso de
  vencimiento de la sesión y la sesión vencida.
- **Zona del profesional de M-09 (11)**: inicio de sesión; lista vacía y lista con sesiones;
  nueva sesión, con los errores de un envío incompleto; el seudónimo creado; el detalle de una
  sesión en curso (con «Entregar el dispositivo»), el de una sesión completa (con los valores
  observados, el aviso de M-09 y las tablas de contexto) y la confirmación de «Eliminar esta
  sesión»; la lista después de eliminarla; el aviso de vencimiento. Cada variante elimina al
  final su sesión, así que la lista empieza vacía en las tres.
- **Aplicación del participante de M-09 (24)**: la aplicación se recorre completa, como lo
  haría un participante. En cada ensayo se espera el estímulo y se presiona F, y en cada
  pantalla de texto se pulsa su botón. Se audita la primera pantalla de cada tipo:
  bienvenida, instrucciones y pantalla antes de la práctica de cada tarea; un ensayo de
  práctica y un ensayo medido de cada tarea, con el estímulo en pantalla; la
  retroalimentación de la práctica; el fin de la práctica y la primera pausa entre bloques de
  cada tarea, y una pausa con las instrucciones abiertas; las instrucciones antes de un bloque; la pantalla entre las dos tareas; el SUS,
  con los errores de un envío incompleto; y «Gracias».

La auditoría no toca la medición de M-09 (`reloj.js`, `motorEnsayo.js`): solo presiona
teclas, como una persona.

Los dos avisos de vencimiento se auditan en pruebas aparte, con el reloj simulado de
Playwright (`page.clock`), que adelanta 28,5 minutos sin esperar. Ese reloj nunca se instala
en la aplicación de M-09.

### Variantes

Cada pantalla se audita en tres variantes, un proyecto de Playwright por variante:

| Variante | Ventana | Ajuste |
|---|---|---|
| normal | 1280 × 800 | ninguno |
| alto contraste | 1280 × 800 | «Alto contraste» de la barra de accesibilidad (M-07), dejado en sessionStorage antes de cargar |
| 320 px | 320 × 640 | ninguno (RA-05; criterio 1.4.10, «Reajuste», equivale a 1280 px con zoom al 400 %) |

Antes de auditar, la prueba comprueba que la variante esté aplicada (la clase
`alto-contraste` en `<html>` y el ancho de la ventana), y guarda esa constancia con el
resultado. En todas las variantes comprueba también que la página no se desplace a lo
ancho, algo que axe no revisa.

### Severidad

Usamos la de axe: crítica (`critical`), grave (`serious`), moderada (`moderate`) y menor
(`minor`). Una «ocurrencia» es una regla que falla en una pantalla y una variante; cada
ocurrencia puede tener varios elementos.

axe también informa comprobaciones **incompletas**: casos que no puede decidir solo, como
el contraste de un texto sobre un degradado. No son violaciones: las revisamos a mano
(«Comprobaciones incompletas»).

### Lighthouse

- Perfil móvil, el predeterminado: pantalla de un Moto G Power (412 × 823) y red y CPU
  simuladas (RTT de 150 ms, 1,6 Mbit/s y CPU 4 veces más lenta).
- 12 páginas: inicio, las ocho secciones y las tres páginas del pie.
- 3 corridas por página y la mediana. En un contenedor compartido, el rendimiento varía unos
  puntos entre corridas.

## Resultados

### Antes de las correcciones

axe, 213 pantallas (71 por variante):

| Severidad | Reglas | Ocurrencias (pantalla × variante) | Elementos |
|---|---|---|---|
| Crítica | 0 | 0 | 0 |
| Grave | 0 | 0 | 0 |
| Moderada | 1 | 6 | 18 |
| Menor | 0 | 0 | 0 |

| Regla | Severidad | WCAG | Variantes | Pantallas | Elementos |
|---|---|---|---|---|---|
| `landmark-unique` | Moderada | buena práctica | 320-px, alto-contraste, normal | registro-detalle-completa, registro-detalle-eliminar | 18 |

Ninguna pantalla se desplazaba a lo ancho.

Lighthouse (móvil, mediana de 3 corridas):

| Página | Accesibilidad | Rendimiento | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|
| `/` | 100 | 98 | 1,8 s | 2,0 s | 9 ms | 0,012 | 1,8 s |
| `/que-es-el-tea` | 100 | **73** | 1,8 s | 2,4 s | 29 ms | **0,761** | 1,8 s |
| `/senales-de-alerta` | 100 | **74** | 2,0 s | 2,4 s | 9 ms | **0,625** | 2,0 s |
| `/mitos-y-realidades` | 100 | **73** | 1,8 s | 2,4 s | 13 ms | **0,783** | 1,8 s |
| `/ruta-de-atencion` | 100 | 96 | 2,0 s | 2,4 s | 18 ms | 0,028 | 2,0 s |
| `/derechos` | 100 | **73** | 1,8 s | 2,4 s | 18 ms | **0,819** | 1,8 s |
| `/directorio` | 100 | 98 | 1,8 s | 2,1 s | 54 ms | 0,008 | 1,8 s |
| `/recursos` | 100 | 84 | 1,7 s | 2,0 s | 11 ms | **0,285** | 1,7 s |
| `/preguntas-frecuentes` | 100 | 87 | 1,8 s | 1,8 s | 5 ms | **0,220** | 1,8 s |
| `/contacto` | 100 | 94 | 1,7 s | 2,0 s | 17 ms | **0,127** | 1,7 s |
| `/privacidad` | 100 | **76** | 1,8 s | 2,4 s | 29 ms | **0,485** | 1,8 s |
| `/acerca-de` | 100 | **75** | 2,0 s | 2,4 s | 9 ms | **0,507** | 2,0 s |

En negrilla, lo que no cumplía: el rendimiento menor de 80 y el CLS mayor de 0,1, el límite
de «bueno» de Lighthouse.

La accesibilidad ya estaba en 100 en todas las páginas, pero 7 de las 12 no llegaban a 80
en rendimiento. La causa era el **CLS** («desplazamiento acumulado del diseño»: cuánto se
mueve lo que ya está en pantalla). Los tiempos sí estaban bien: LCP de 2,4 s o menos.

Al llegar el contenido de la API, la página dibujaba primero las fuentes y la fecha de
revisión. El cuerpo, en Markdown, aparecía un momento después, porque `react-markdown` se
descarga aparte, y empujaba hacia abajo las fuentes y el pie. Lighthouse lo midió así en
Qué es el TEA: las fuentes se movieron 0,52 y el pie 0,22. En recursos, preguntas y
contacto, el aviso «Estamos cargando…» era corto y el pie quedaba a la vista; al llegar la
lista, el pie saltaba.

### Correcciones

| Problema | Corrección | Archivos |
|---|---|---|
| CLS: el cuerpo en Markdown llegaba después que el resto | Las páginas con contenido de la API esperan a tener los datos **y** `react-markdown` para mostrar todo de una vez (`useMarkdownListo`). El componente ya no usa `React.lazy`: guarda el módulo descargado y lo dibuja sin pasar por `Suspense`. Si la descarga falla, el texto se muestra sin formato | `componentes/Markdown.jsx`, `paginas/PaginaContenido.jsx`, `paginas/SenalesDeAlerta.jsx`, `preguntas/PreguntasFrecuentes.jsx`, `paginas/Busqueda.jsx` |
| CLS: el pie saltaba al llegar el contenido | Mientras carga, el aviso «Estamos cargando…» ocupa el alto de la ventana (`reservarAlto`, `--alto-reserva-carga`): el pie queda fuera de la vista y no salta | `componentes/EstadoDatos.jsx`, `estilos/contenido.css`, `tokens.css` y las páginas públicas con datos de la API |
| `landmark-unique` (moderada): en el detalle de una sesión completa, la sección de cada tarea y la región desplazable de su tabla tenían el mismo nombre, y las dos tablas de contexto también | La tabla de valores tiene su propio título, oculto a la vista («Valores observados: …»), y la de contexto suma el nombre de la tarea | `registro/ValoresSesion.jsx` |

Las correcciones de la revisión manual están en la sección «Revisión manual».

### Después de las correcciones

axe, 222 pantallas (74 por variante):

| Severidad | Reglas | Ocurrencias (pantalla × variante) | Elementos |
|---|---|---|---|
| Crítica | 0 | 0 | 0 |
| Grave | 0 | 0 | 0 |
| Moderada | 0 | 0 | 0 |
| Menor | 0 | 0 | 0 |

Ninguna pantalla se desplaza a lo ancho.

Lighthouse (móvil, mediana de 3 corridas):

| Página | Accesibilidad | Rendimiento | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|
| `/` | 100 | 98 | 1,8 s | 2,0 s | 12 ms | 0,012 | 1,8 s |
| `/que-es-el-tea` | 100 | 97 | 1,8 s | 2,4 s | 22 ms | 0,034 | 1,8 s |
| `/senales-de-alerta` | 100 | 97 | 1,9 s | 2,4 s | 39 ms | 0,010 | 1,9 s |
| `/mitos-y-realidades` | 100 | 97 | 1,8 s | 2,4 s | 11 ms | 0,034 | 1,8 s |
| `/ruta-de-atencion` | 100 | 98 | 1,8 s | 2,0 s | 26 ms | 0,028 | 1,8 s |
| `/derechos` | 100 | 97 | 1,8 s | 2,4 s | 33 ms | 0,000 | 1,8 s |
| `/directorio` | 100 | 98 | 1,8 s | 2,1 s | 57 ms | 0,008 | 1,8 s |
| `/recursos` | 100 | 98 | 1,8 s | 2,1 s | 11 ms | 0,000 | 1,8 s |
| `/preguntas-frecuentes` | 100 | 96 | 2,0 s | 2,4 s | 21 ms | 0,006 | 2,0 s |
| `/contacto` | 100 | 98 | 1,8 s | 2,1 s | 11 ms | 0,000 | 1,8 s |
| `/privacidad` | 100 | 97 | 1,8 s | 2,4 s | 35 ms | 0,034 | 1,8 s |
| `/acerca-de` | 100 | 96 | 2,0 s | 2,4 s | 9 ms | 0,034 | 2,0 s |

El CLS que queda (0,034 o menos, muy por debajo de 0,1) tiene dos causas:

- **Las fuentes tipográficas** (`font-display: swap`): el aviso «Estamos cargando…» se dibuja
  primero con la fuente del sistema y luego con Atkinson Hyperlegible y Lexend.
- **El h1** muestra primero el nombre de la sección y luego el título del contenido (T3). En
  Señales de alerta y en la Ruta de atención el título es más largo y, en un celular, pasa a dos
  líneas: el aviso de no diagnóstico (0,008) y la guía de la ruta (0,028) bajan una línea. Lo
  dejamos así porque el h1 es el mismo elemento y conserva el foco que el layout le pone al
  navegar.

#### Comprobaciones incompletas

axe dejó sin decidir el contraste de 24 elementos en tres pantallas. Los revisamos a mano con
los colores de `tokens.css`:

| Pantalla | Elementos | Por qué axe no decidió | Contraste calculado |
|---|---|---|---|
| Inicio (las tres variantes) | antetítulo, h1, texto de la portada, el aviso y los dos botones | La portada tiene una forma decorativa (`::after`, `--color-acento-suave` `#FBEEDB`) que puede quedar detrás del texto | Texto `#1F2A37`: 12,7:1; secundario `#4B5563`: 6,6:1; primario `#1F5F7A`: 6,2:1; botón primario (blanco sobre `#1F5F7A`): 7,1:1. En alto contraste la forma es blanca: 21:1 y 12,2:1 |
| Aviso de vencimiento, en el panel y en la zona del profesional | texto de la franja | Con la página desplazada, la franja queda encima de otro contenido | Texto `#1F2A37` sobre `--color-aviso-fondo` `#FFF4D6`: 13,3:1; botón: 7,1:1 |

Todos superan 4,5:1, el mínimo de 1.4.3 para texto normal.

## Revisión manual

axe y Lighthouse no ven, entre otras cosas, el orden y el destino del foco, los anuncios de
las regiones vivas, el tamaño de los enlaces sueltos ni el comportamiento en el tiempo. Por
eso cuatro revisores independientes leyeron el código: uno por zona (pública, panel y M-09) y
uno para el código nuevo de T10. Cada hallazgo pasó luego por un segundo revisor, que trató
de refutarlo leyendo el código. Aquí van los que se sostuvieron y lo que hicimos con cada uno.

| Hallazgo | Criterio | Severidad | Qué hicimos |
|---|---|---|---|
| El aviso de vencimiento (nuevo en T10) no quedaba fijo arriba: el elemento `sticky` estaba dentro de un contenedor de su mismo alto, así que con la página desplazada no se veía | 2.2.1 | Grave | Corregido: la región `role="status"` es la que se pega arriba. Mientras se ve, su alto va a `scroll-padding-top`, para que no tape el control enfocado. La prueba ahora desplaza la página hasta abajo y exige que el botón esté dentro de la ventana |
| Tras «Seguir conectado», el texto oculto «Listo: tu sesión sigue abierta.» quedaba en la página después de cerrar sesión o de vencer | 4.1.3 | Menor | Corregido: el mensaje solo se muestra con la sesión activa, mientras no haya otra actividad ni cambie la etapa del aviso |
| En «Esta cuenta es del registro conductual» y en la página no encontrada del panel, un 401 de «Seguir conectado» dejaba el foco en `body` sin decir nada | 2.4.3 | Menor | Corregido: las dos páginas muestran `SesionVencida`, como las demás |
| Bandeja de mensajes: el segundo «Mensaje eliminado.» seguido no se anunciaba, porque el texto no cambiaba | 4.1.3 | Menor | Corregido: cada aviso se vuelve a escribir |
| En `/buscar`, buscar otra vez dejaba el foco en `body` (la caja se reemplaza) o en un campo oculto (el menú del encabezado se cierra en pantallas angostas) | 2.4.3 | Moderada | Corregido: si el foco se perdió, pasa al resumen de resultados, que los anuncia |
| La región de búsqueda de `/buscar` se llamaba «Buscar en esta página», pero busca en todo el sitio | 2.4.6 | Menor | Corregido: «Nueva búsqueda en el sitio» |
| Al reintentar dentro de «Pasos para tu caso», el foco saltaba al h1 de lo alto de la página | 2.4.3 | Menor | Corregido: `EstadoDatos` recibe el destino del foco (`focoAlRetirarse`), y en la guía es el título «Pasos para tu caso» |
| Enlaces sueltos de menos de 44 px: las fuentes (al final de cada página y en los desplegables), el resumen de errores, «Ver todas las preguntas frecuentes», «Volver al inicio», «Ver la sesión» y «Volver a las sesiones» | RA-05 (WCAG 2.1 no lo exige en AA) | Menor | Corregido: alto mínimo de 44 px (`--objetivo-tactil`) |
| M-09: al terminar el SUS, «Gracias» no recibía el foco (React reutilizaba la pantalla) y el foco caía en `body` | 2.4.3 | Moderada | Corregido: cada pantalla final se monta de nuevo y su h1 recibe el foco |
| M-09: la respuesta en `pointerdown` no se puede cancelar | 2.5.2 | Menor | Documentado: excepción «esencial» (ver «Límites de tiempo y excepciones») |
| M-09: el rojo y el azul de los estímulos tienen casi la misma luminancia (1,1:1) y en escala de grises se ven iguales | 1.4.1 | Menor | Documentado: limitación de la tarea (ver «Límites de tiempo y excepciones») |
| Código de T10: la prueba buscaba el texto «Valores observados», que ahora también está en los títulos ocultos de las tablas, y fallaba en modo estricto; el ensayo se tomaba después de auditar; los resultados viejos se mezclaban; en Windows una ruta con espacios rompía `npx` | — | — | Corregido antes de la medición final |

Después de esas correcciones hicimos una segunda revisión, solo de lo que cambió, con el
mismo método. Confirmó cinco problemas menores. Corregimos cuatro: si fallaba la descarga de
`react-markdown`, el cuerpo quedaba vacío un momento (ahora el texto aparece sin formato de
inmediato); el mensaje de error del aviso de vencimiento podía anunciarse después de un
guardado exitoso (ahora cada mensaje vale solo para la actividad y la etapa en que se
produjo); al medir de nuevo una sola página con Lighthouse se mezclaban corridas viejas en la
mediana; y la «lista vacía» del profesional solo estaba vacía en la primera variante. El
quinto lo documentamos: el h1 que cambia de texto mueve un poco el contenido, como se explica
en «Después de las correcciones».

Dos hallazgos no se sostuvieron. El primero decía que al empezar cada ensayo el foco cae en
`body`. Es cierto, pero las teclas F y J se escuchan en toda la ventana y los botones
responden a Enter y a espacio, así que la tarea se puede hacer con teclado. El segundo decía
que la confirmación de una sesión eliminada no se anuncia. Pero la eliminación lleva a otra
página: el foco va a su h1 y el aviso está justo debajo, con `role="status"`.

## Límites de tiempo y excepciones

### Criterio 2.2.1 (Tiempo ajustable)

| Límite | Dónde | Tratamiento |
|---|---|---|
| 5 s para responder cada ensayo | M-09, aplicación | **Excepción «esencial»** de 2.2.1: las dos tareas miden el tiempo de reacción, y sin el límite la medición no sería válida. Después de 5 s netos el ensayo queda como omitido (`limiteRespuestaMs`, catálogo 1.1.0). El tiempo con la pestaña oculta no cuenta (`pausasDuranteItemMs`, RF-13). **No hay temporizadores visibles** (CT-03): durante los ensayos no se muestran tiempo, cuenta regresiva, acierto ni marcador; la retroalimentación sale solo en la práctica. Las pausas entre bloques no tienen límite y desde ellas se pueden volver a leer las instrucciones |
| 30 min sin actividad | Panel y zona del profesional | **Aviso y extensión**: 2 minutos antes aparece arriba una franja fija, dentro de `role="status"` (no es una ventana emergente ni mueve el foco). Dice la hora de cierre, sin cuenta regresiva, y ofrece «Seguir conectado», que renueva la sesión con una petición (`GET /api/admin/sesion`). WCAG pide al menos 20 segundos para hacerlo con una acción simple. Si la sesión ya venció, la página muestra el formulario para volver a entrar y lo escrito se conserva |
| 8 horas desde el inicio de sesión | Panel y zona del profesional | **Límite de seguridad** (RS-05): no se puede extender. Al vencer se vuelve a entrar en la misma página y lo escrito se conserva (`SesionVencida`), que es lo que pide el criterio 2.2.5 (AAA) |
| 2 horas para aplicar una sesión | M-09, aplicación | **Límite de seguridad**: la cookie de la aplicación solo sirve para una sesión y vence a las 2 horas de creada, para que un dispositivo olvidado no siga abierto. Ninguna sesión de las tareas se acerca: la duración estimada es de 9 minutos (CT-08, `planificarSesion`) |

### Otras excepciones de M-09

- **2.5.2 (Cancelación del puntero)**: en los ensayos, la respuesta se registra en
  `pointerdown` y no se puede cancelar deslizando el dedo fuera del botón. Es la excepción
  «esencial» del criterio: el tiempo de reacción se mide en la pulsación (CT-07) y cuenta la
  primera respuesta. Solo aplica a los botones de respuesta durante los ensayos; todos los
  demás controles responden al clic.
- **1.1.1 (Contenido no textual)**: los estímulos (el juguete, las cajas y los carteles de
  letras) son la prueba misma y no tendrían sentido en texto. Es la excepción de «prueba o
  ejercicio» del criterio. Cada botón de respuesta tiene un nombre accesible que lo
  identifica.
- **1.4.1 (Uso del color)**: en la tarea de cambio de regla, el color es la información que
  se clasifica (la regla COLOR). Este criterio no trae una excepción «esencial», así que lo
  declaramos como **limitación de la tarea**. El rojo `#c62828` y el azul `#1e5bc6` se
  distinguen con protanopía y deuteranopía, pero tienen casi la misma luminancia (1,1:1): con
  acromatopsia o con el filtro de escala de grises del dispositivo se ven iguales. La forma
  (conejo o barco) sí se distingue siempre. El protocolo de aplicación debe preguntar por la
  visión de color y revisar que el dispositivo no tenga filtros de color ni escala de grises
  (pendiente en `docs/backlog-fase-i.md`).

## Lo que no se revisa automáticamente

Estas comprobaciones necesitan personas y tecnologías de apoyo. Quedan como lista de
verificación para el equipo, sobre la vista previa de Vercel:

- **Lectores de pantalla**: NVDA con Firefox y con Chrome en Windows, TalkBack en Android y
  VoiceOver en iOS. Recorrer el inicio, señales de alerta (cambiar de pestaña), la guía de la
  ruta completa, el directorio con filtros, una pregunta frecuente y el formulario de
  contacto con errores. Comprobar que se anuncian el título de cada página al navegar, los
  avisos de `role="status"` (resultados de la búsqueda, cargando, enviado) y los errores de
  los formularios. En M-09: la zona del profesional, la entrega del dispositivo y el SUS. Las
  dos tareas son visuales por naturaleza y no se pueden hacer sin ver los estímulos.
- **Zoom al 200 %**, en Chrome y Firefox de escritorio, y también con «Letra muy grande»
  (125 %) de la barra de accesibilidad. Que nada se corte ni se superponga y que no haya
  desplazamiento horizontal. La variante de 320 px lo cubre en parte: 1280 px al 400 %
  equivalen a 320 px.
- **Teclado solo**: que el orden del foco siga el orden visual y que el foco siempre se vea,
  también en alto contraste. En particular, el aviso de vencimiento (que no tape el control
  enfocado) y las pantallas de M-09.
- **Reducir movimiento**: con `prefers-reduced-motion` del sistema y con el ajuste de la
  barra, que no quede ninguna transición.
- **Contraste en estados que axe no captura**: foco, hover y error, en los dos modos de
  color.
- **Lenguaje claro y textos alternativos**: que los textos sean literales y cortos, y que el
  nombre accesible de cada ícono con función diga lo que hace.
- **Comprobaciones incompletas de axe**: ya revisadas a mano («Comprobaciones
  incompletas»). Si cambian los colores o la portada, hay que revisarlas de nuevo.

## Cómo se ejecuta

Desde la raíz del repositorio:

```
npm install
npm run build:web
npm run accesibilidad -w web
```

El script corre las tres partes en orden:

1. `npm run accesibilidad:axe -w web`: Playwright con las tres variantes. Primero borra los
   resultados anteriores (`resultados/axe`). Tarda unos 7 minutos, porque la aplicación de
   M-09 se recorre completa en cada variante.
2. `npm run accesibilidad:lighthouse -w web`: Lighthouse con `npx` (la primera vez lo
   descarga). 12 páginas × 3 corridas; unos 15 minutos.
3. `npm run accesibilidad:resumen -w web`: escribe `resultados/resumen.md` y
   `resultados/resumen.json`, y muestra las tablas. Termina con código 1 si no se cumplen las
   metas.

Variables útiles:

- `CHROMIUM_EJECUTABLE`: otro Chromium ya instalado (en el contenedor de Claude Code,
  `/opt/pw-browsers/chromium`).
- `LIGHTHOUSE_CORRIDAS` (3) y `LIGHTHOUSE_PAGINAS` (rutas separadas por coma).
- `ACCESIBILIDAD_SALIDA`: carpeta de los resultados.
- `ACCESIBILIDAD_VISIBLE=1`: con ventana.

La carpeta `web/evaluacion/accesibilidad/resultados/` no se sube al repositorio. La auditoría
no corre en el CI normal; ahí solo corren las pruebas de su lógica pura
(`web/evaluacion/accesibilidad/resumen.test.js`).

## Limitaciones

- **Herramientas automáticas.** axe y Lighthouse detectan una parte de los problemas de
  accesibilidad. Un resultado sin violaciones no equivale a la conformidad con WCAG 2.1 AA:
  hace falta la revisión con personas de la sección anterior.
- **Un solo motor.** La auditoría corre en Chromium. Las reglas de axe dependen del DOM y de
  los estilos calculados, que no cambian entre motores en lo que revisan, pero el
  comportamiento con lectores de pantalla sí cambia entre navegadores.
- **Servidor local.** Lighthouse mide contra el servidor local, con red y CPU simuladas.
  Render gratuito puede tardar hasta un minuto en despertar la API (el sitio lo avisa); eso
  no se refleja aquí. Las cifras sirven para comparar antes y después y para encontrar
  problemas como el CLS, no como tiempos de producción.
- **Variación entre corridas.** El rendimiento varía unos puntos entre corridas en el mismo
  equipo; por eso informamos la mediana de tres.
