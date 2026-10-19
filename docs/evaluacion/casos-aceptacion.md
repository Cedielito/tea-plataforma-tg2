# Casos de aceptación (HU-01 a HU-19)

Evidencia de funcionalidad de la Fase I (tarea T11). El Cuadro 19 pide casos de aceptación
derivados del Cuadro 12 (`docs/requisitos-fase-i.md`), con la meta de que el 100 % se
superen sin incidencias bloqueantes. Aquí va un caso por historia de usuario, de HU-01 a
HU-19: el criterio, los pasos, el resultado esperado, la evidencia y el resultado obtenido.

Como evidencia usamos primero las pruebas que ya existían: Jest en `api/test`,
`node --test` en `web/src` y los recorridos de Playwright de T10 (accesibilidad) y T16
(precisión temporal). Casi todas las reglas ya tenían prueba. Lo que faltaba era comprobar lo
que la persona ve en la pantalla, y para eso escribimos 16 pruebas de extremo a extremo
(`web/evaluacion/aceptacion/aceptacion.spec.js`).

**Resultado.** Las 19 historias cumplen su criterio en todo lo que se comprueba de forma
automática: las 16 pruebas nuevas, las 976 de Jest, las 241 de `node --test` y las 24 de la
auditoría de T10 pasaron en esta versión, y CT-07 se apoya en la corrida completa de T16.
En 3 historias queda una parte del criterio que solo se puede comprobar con personas y que
marcamos «Pendiente (revisión manual)»:

- la redacción de S1 (HU-01, RCN-06);
- el orden visual del foco y el teclado en el panel y en la zona del profesional (HU-11);
- la duración real y la aplicación «sin ayuda» con los voluntarios (HU-17).

Ningún caso dio «No cumple».

## Método

### Qué tiene cada caso

- **Criterio**: el del Cuadro 12, copiado tal cual, con sus requisitos.
- **Pasos**: lo que hace la persona. Cuando el Cuadro B.1 tiene una tarea para esa historia,
  los pasos la siguen.
- **Resultado esperado**: lo que tiene que pasar para que se cumpla el criterio.
- **Evidencia**: las pruebas que lo comprueban, con su archivo y su nombre
  (`describe` › `test`). Las pruebas nuevas usan los mismos datos que el sitio: los textos,
  los pasos, el directorio, las preguntas y los recursos de `api/contenidos`.
- **Resultado obtenido**: «Cumple» si pasan todas las pruebas citadas; «No cumple» si falla
  alguna; «Pendiente (revisión manual)» para la parte que necesita personas, que no cuenta
  ni como cumple ni como no cumple.

### Tipos de evidencia

| Tipo | Dónde | Qué comprueba |
|---|---|---|
| Jest | `api/test/*.test.js` | Reglas de dominio y rutas de la API, con MongoDB en memoria |
| `node --test` | `web/src/**/*.test.js`, `web/evaluacion/**/*.test.js` | Lógica pura de la web: filtros, enlaces, textos y formatos |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | Recorre 74 pantallas en tres variantes (normal, alto contraste y 320 px) con axe-core, y mide el desplazamiento horizontal |
| Playwright, T16 | `web/evaluacion/precision/precision.spec.js` | Error del tiempo de reacción registrado (CT-07), en GitHub Actions |
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | Lo que la persona ve y hace en cada historia (nuevas) |
| Revisión manual | — | Lo que necesita personas: redacción, orden visual, lectores de pantalla, voluntarios |

### Las pruebas nuevas de extremo a extremo

- Corren con el servidor de la auditoría de T10 (`web/evaluacion/accesibilidad/servidor.js`),
  sin cambios. Ese servidor sirve el build de la web y la API en el mismo origen, levanta
  MongoDB en memoria y corre `prepararArranque()` (`api/src/index.js`), la misma preparación
  del arranque real. Así carga los contenidos de `api/contenidos` y crea dos cuentas de
  prueba, una de administrador y una de profesional. Usa el puerto 4330, para no chocar con
  una auditoría abierta.
- Corren en Chromium, en escritorio (1280 × 800). Los 320 px (HU-05) ya los recorre la
  auditoría de T10.
- Los valores esperados no se copian en la prueba: salen de la API (por ejemplo,
  `/api/pasos-ruta`) y de los módulos puros de la web (`filtrarPasos`, `filtrarEntidades`,
  `enlaceDeRecurso`, `valorObservado`). Si cambia un texto en `api/contenidos`, la prueba
  sigue valiendo.
- La aplicación de M-09 se recorre como lo haría un participante y solo con el teclado: F en
  cada ensayo, y Tab y Enter en las pantallas. La medición (`reloj.js`, `motorEnsayo.js`) no
  se toca.
- HU-05, HU-08, HU-12, HU-14 y HU-16 no tienen prueba nueva: su evidencia automática ya
  existía.

### Corrida de esta versión

| Elemento | Valor |
|---|---|
| Fecha | 19 de octubre de 2026 |
| Código | `main` en c1220be (T10), con los cambios de T11 |
| Node.js | 22.22.0 |
| Navegador | Chromium 141.0.7390.37 (el instalado en el contenedor) |
| Playwright / axe-core | 1.64.1 / 4.13.0 |
| Jest (`npm run test:cov`) | 52 archivos, 976 pruebas: 976 pasan. Cobertura del backend: 98,98 % de las sentencias (mínimo: 70 %) |
| `node --test` (`npm test -w web`) | 241 pruebas: 241 pasan |
| Auditoría de T10 (`npm run accesibilidad:axe -w web`) | 24 pruebas (8 por variante): 24 pasan. 222 pantallas, 0 violaciones de axe y ninguna pantalla con desplazamiento horizontal. Lighthouse no se volvió a correr: ninguna historia depende de él |
| Casos de T11 (`npm run aceptacion -w web`) | 16 pruebas: 16 pasan, en 1,5 minutos |
| T16 (CT-07) | Corrida 39153850094 de GitHub Actions, commit 3f51108, 18 de octubre de 2026: 222 ensayos por celda en Chromium, Firefox y WebKit (`docs/evaluacion/precision.md`) |

Antes de llenar la columna «Resultado obtenido», cruzamos cada prueba citada en este
documento con los reportes de la corrida: el JSON de Jest, el JUnit de `node --test` y los
JSON de Playwright de T10 y T11. Todas existen con ese nombre y todas pasaron.

## Casos

### HU-01. Familia: entender qué es el TEA

**Criterio.** La sección presenta la definición en párrafos breves, sin tecnicismos sin
explicar, con su fuente y su fecha de revisión. Requisitos: RCN-01, RCN-02, RCN-06.

**Pasos** (tarea T1 del Cuadro B.1)
1. Abrir el inicio.
2. Elegir «Qué es el TEA».
3. Leer la página hasta el final.

**Resultado esperado**
- La página de S1 muestra el título y todo el cuerpo del texto publicado.
- Al final están las fuentes del texto y «Revisado el dd/mm/aaaa».
- El servidor no publica un texto sin fuente ni fecha de revisión.
- Los párrafos son breves y los tecnicismos están explicados (revisión de textos).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-01 qué es el TEA con su fuente y su fecha de revisión» › «desde el inicio se llega a S1, con el texto, sus fuentes y «Revisado el»» |
| Jest | `api/test/sincronizacionContenidos.test.js` | «Textos reales de api/contenidos» › «RCN-01 y RCN-02 todos se cargan publicados, con fuentes y fecha de revision» |
| Jest | `api/test/rutasPublicas.test.js` | «RCN-01 y RCN-02 las rutas publicas solo devuelven lo publicado, con fuente y fecha» › «GET /api/contenidos/:slug devuelve el contenido publicado con fuentes y fecha» |
| Jest | `api/test/modelos.test.js` | «RCN-01 y RCN-02 al guardar en la coleccion contenido» › «RCN-01 no se publica sin fuentes» |
| Jest | `api/test/modelos.test.js` | «RCN-01 y RCN-02 al guardar en la coleccion contenido» › «RCN-02 no se publica sin fecha de revision» |
| Revisión manual | `api/contenidos/s1-que-es-el-tea.md` | RCN-06: párrafos breves, instrucciones de dos frases como máximo y tecnicismos explicados |

**Resultado obtenido.** Cumple en lo automático. **Pendiente (revisión manual)**: la
redacción (RCN-06). Como apoyo, la prueba mide la página: tiene 15 párrafos y el más largo
tiene 42 palabras.

### HU-02. Familia: señales por edad

**Criterio.** Las señales se filtran por tramo de edad y cada una se presenta como motivo de
consulta, con enlace a la ruta de atención. Requisitos: RF-03, RCN-04.

**Pasos** (tarea T2 del Cuadro B.1)
1. Desde el inicio, abrir «Señales de alerta».
2. Elegir la pestaña «4 a 7» (un niño de 6 años).
3. Pasar por las pestañas «8 a 12» y «13 a 17».
4. Pulsar «Ver la ruta de atención».

**Resultado esperado**
- Cada pestaña muestra solo las señales de su tramo, y el tramo queda en la dirección
  (`?edad=4-7`).
- Cada tramo dice que sus señales son motivos de consulta.
- No hay lista numerada, casillas, contadores ni resultados (RCN-04).
- El enlace lleva a la ruta de atención.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-02 señales de alerta por tramo de edad, como motivos de consulta» › «cada pestaña muestra solo su tramo, sin lista para sumar, y enlaza a la ruta» |
| Jest | `api/test/rutasPublicas.test.js` | «RF-03 filtro de contenidos por seccion y tramo de edad» › «?seccion=S2&edad=4-7 devuelve la introduccion sin tramo arriba y luego el tramo 4-7» |
| Jest | `api/test/sincronizacionContenidos.test.js` | «Textos reales de api/contenidos» › «RCN-04 las senales de cada tramo no son una lista numerada ni de casillas para sumar» |
| Jest | `api/test/sincronizacionContenidos.test.js` | «Textos reales de api/contenidos» › «RCN-04 cada tramo aclara que sus senales son motivos de consulta y no un diagnostico» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 zona pública» › «señales de alerta con sus tres pestañas» |

La prueba nueva distingue los tramos por sus viñetas: cada pestaña tiene todas las que solo
están en su tramo y ninguna de las de los otros dos.

**Resultado obtenido.** Cumple.

### HU-03. Familia: a dónde acudir según la situación

**Criterio.** La ruta muestra pasos y entidades tras responder tres preguntas, sin pedir
datos personales ni guardar las respuestas. Requisitos: RF-04, RCN-05, RS-01.

**Pasos** (tarea T3 del Cuadro B.1: una madre con afiliación al régimen subsidiado y una
hija de 10 años)
1. Abrir «Ruta de atención».
2. Responder «Familia o cuidador», «8 a 12 años» y «Régimen subsidiado».
3. Leer los pasos y las entidades junto a cada uno.
4. Elegir la ciudad (opcional): Bogotá.

**Resultado esperado**
- La guía solo tiene opciones para elegir: ningún campo para escribir.
- Aparecen los pasos de esas tres respuestas, en orden, y junto a cada paso las entidades
  nacionales de sus tipos, cada una con «Verificado el». Con Bogotá, primero las de Bogotá.
- Revisión de tráfico: el navegador solo hace lecturas (GET) al mismo sitio, y ninguna
  dirección ni cuerpo lleva las respuestas ni la ciudad. No hay cookies. No queda nada en
  `localStorage`, en `sessionStorage` (salvo los ajustes de accesibilidad) ni en la
  dirección de la página.
- La API no recibe respuestas: entrega todos los pasos y la web elige en el navegador.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-03 ruta de atención sin datos personales ni respuestas guardadas» › «tras las tres preguntas muestra los pasos y las entidades, y nada sale del navegador» |
| `node --test` | `web/src/ruta/filtroPasos.test.js` | «RF-04 la guía elige en el navegador los pasos que coinciden con las tres respuestas» › «solo los del perfil, el tramo y el régimen elegidos, ordenados» |
| `node --test` | `web/src/ruta/preguntas.test.js` | «RF-04 las tres preguntas de la guía» › «ninguna pregunta ni opción indaga por conductas ni síntomas» |
| `node --test` | `web/src/directorio/filtroDirectorio.test.js` | «RF-04 RS-01 entidades junto a cada paso de la guía» › «la web pide todo el directorio sin parámetros: la ciudad no llega a la API» |
| Jest | `api/test/rutasPublicas.test.js` | «RF-04 RS-01 la API entrega todos los pasos publicados de la ruta, sin recibir respuestas» › «no filtra por respuestas: con parametros en la consulta devuelve lo mismo» |
| Jest | `api/test/rutasPublicas.test.js` | «RF-04 RS-01 la API entrega todos los pasos publicados de la ruta, sin recibir respuestas» › «no pone cookies» |
| Jest | `api/test/sincronizacionListas.test.js` | «Pasos reales de api/contenidos/ruta/pasos.yaml» › «RF-04 cada combinacion de perfil, tramo y regimen tiene pasos» |

**Resultado obtenido.** Cumple. RCN-05 (que la ruta siga el protocolo del Ministerio de
Salud y la Ley 1616 de 2013) se verifica contrastando los pasos con la fuente oficial,
como lo pide el Cuadro 5. Es una revisión de contenido que hace el equipo
(`api/contenidos/ruta/pasos.yaml`), fuera del criterio de esta historia.

### HU-04. Familia: entidades en mi ciudad

**Criterio.** El directorio filtra por ciudad y tipo de entidad, y cada registro muestra su
fecha de verificación. Requisitos: RF-05, RS-07.

**Pasos** (tarea T4 del Cuadro B.1)
1. Abrir «Directorio».
2. Elegir la ciudad «Bogotá» y el tipo «Salud».

**Resultado esperado**
- Sin filtros, cada tarjeta muestra «Verificado el dd/mm/aaaa».
- Con los filtros, la dirección queda en `?ciudad=bogota&tipo=salud` y solo aparecen
  entidades de salud de Bogotá y nacionales, cada una con su fecha de verificación.
- La constancia de autorización nunca llega a la web, y un profesional sin constancia no se
  publica (RS-07).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-04 directorio por ciudad y tipo, con la fecha de verificación» › «el filtro de Bogotá y salud deja solo esas entidades y las nacionales, cada una con «Verificado el»» |
| `node --test` | `web/src/directorio/filtroDirectorio.test.js` | «RF-05 filtros del directorio por ciudad y tipo» › «ciudad y tipo se combinan» |
| `node --test` | `web/src/directorio/filtroDirectorio.test.js` | «RF-05 filtros del directorio en la dirección, sin tildes ni mayúsculas» › «lee ?ciudad=bogota&tipo=salud como los valores de la API» |
| Jest | `api/test/rutasDirectorio.test.js` | «RF-05 GET /api/directorio» › «RS-07 nunca devuelve la constancia de autorizacion» |
| Jest | `api/test/entidadDirectorio.test.js` | «RS-07 un profesional independiente no se publica sin constancia de autorizacion» › «sin constancia se rechaza y no se guarda» |
| Jest | `api/test/sincronizacionDirectorio.test.js` | «Entidades reales de api/contenidos/directorio/entidades.yaml» › «RCN-01 RCN-02 RS-07 las 23 entidades se cargan publicadas, con fuentes y fecha, sin profesionales» |

**Resultado obtenido.** Cumple. La tarea T4 del Cuadro B.1 dice «abre un registro»: el
directorio no tiene página de detalle y cada tarjeta muestra todos los datos (pendiente de
T6 en el backlog).

### HU-05. Familia: leer desde el celular

**Criterio.** Todas las páginas se usan sin desplazamiento horizontal desde 320 píxeles de
ancho. Requisito: RA-05.

**Pasos**
1. Abrir cada página en una ventana de 320 × 640 px: la zona pública, el panel, la zona del
   profesional y la aplicación de M-09 completa.

**Resultado esperado**
- Ninguna pantalla se desplaza a lo ancho (`scrollWidth` no supera el ancho de la ventana).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 zona pública» › «inicio, secciones, páginas del pie, búsqueda y página no encontrada» (variante 320-px) |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 zona pública» › «ruta de atención: cada pregunta, el error y el final» (variante 320-px) |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 panel de administración» › «inicio de sesión, error, listas y editores» (variante 320-px) |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 registro conductual (M-09)» › «zona del profesional y aplicación completa» (variante 320-px) |
| `node --test` | `web/evaluacion/accesibilidad/resumen.test.js` | «RA-01 a RA-11 resumen de axe» › «informa las pantallas con desplazamiento horizontal» |

Las pruebas de T10 miden el desplazamiento en cada pantalla, y `resumir.js` lo informa:
en esta corrida, «Ninguna pantalla se desplaza a lo ancho» en las 74 pantallas de la
variante de 320 px.

**Resultado obtenido.** Cumple.

### HU-06. Familia: agrandar la letra o reducir el movimiento

**Criterio.** Los ajustes se aplican de inmediato y se conservan durante la visita.
Requisitos: RA-06, RA-07.

**Pasos** (tarea T5 del Cuadro B.1)
1. En el inicio, en la barra de accesibilidad, pulsar «Grande», luego «Muy grande» y
   «Reducir movimiento».
2. Ir a «Directorio» y luego recargar la página.
3. Abrir el sitio en otra visita (otro contexto del navegador).

**Resultado esperado**
- La letra sube al momento, sin recargar: 112,5 % y 125 %. Las transiciones pasan a 0 s.
- Los botones dicen si están activos (`aria-pressed`).
- Los ajustes siguen al cambiar de página y al recargar.
- Se guardan solo en `sessionStorage`, sin cookies. Otra visita empieza sin ajustes.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-06 tamaño de letra y reducir movimiento durante la visita» › «los ajustes se aplican de inmediato, siguen al navegar y al recargar, y no pasan a otra visita» |

**Resultado obtenido.** Cumple. La ampliación al 200 % del navegador (RA-06) está en la
lista de revisión manual de `docs/evaluacion/accesibilidad.md`; no es parte del criterio de
esta historia.

### HU-07. Familia: qué significa y qué no significa la información

**Criterio.** El aviso de no diagnóstico es visible en la página de inicio, en las señales
de alerta y en la ruta. Requisitos: RCN-03, RF-12.

**Pasos**
1. Abrir el inicio, «Señales de alerta», «Ruta de atención» y «Acerca de».
2. En la ruta, responder las tres preguntas y llegar a los pasos.

**Resultado esperado**
- «Esta información no constituye diagnóstico ni sustituye la valoración profesional.» se ve
  dentro del contenido de las cuatro páginas, al final de la guía de la ruta y en el pie de
  cada página.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-07 aviso de no diagnóstico en inicio, señales y ruta» › «el aviso se ve en las tres páginas, al final de la guía y en «Acerca de» (RF-12)» |
| Jest | `api/test/archivoPagina.test.js` | «RS-03 archivos reales de api/contenidos/paginas» › ««Acerca de» repite el aviso de no diagnostico (RF-12) y enlaza a la politica y al contacto» |

**Resultado obtenido.** Cumple.

### HU-08. Familia: preguntar sin exponer mis datos

**Criterio.** El formulario pide solo correo y mensaje, y no se envía sin la autorización
expresa de tratamiento de datos. Requisitos: RF-08, RS-02, RS-03.

**Pasos** (tarea T8 del Cuadro B.1)
1. Abrir «Contacto».
2. Escribir el correo y el mensaje, y pulsar «Enviar mensaje» sin marcar la casilla.
3. Marcar la casilla de autorización y enviar.

**Resultado esperado**
- El formulario tiene dos campos (correo y mensaje), una casilla sin marcar y el enlace a la
  política de privacidad.
- Sin la casilla no se envía: la web muestra el error y no llama a la API. El servidor
  también lo rechaza.
- Con la casilla, el envío lleva solo correo, mensaje, autorización y versión de la política;
  el servidor rechaza cualquier otro campo.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Jest | `api/test/rutasContacto.test.js` | «RS-02 RF-08 envio del formulario de contacto» › «sin la casilla de autorizacion no se envia ni se guarda» |
| Jest | `api/test/rutasContacto.test.js` | «RS-02 RF-08 envio del formulario de contacto» › «rechaza datos de mas, como un nombre, y no guarda nada» |
| Jest | `api/test/rutasContacto.test.js` | «RS-02 RF-08 envio del formulario de contacto» › «guarda solo correo, mensaje, fecha y version de la politica» |
| Jest | `api/test/contacto.test.js` | «RS-02 RF-08 sin autorizacion expresa no se envia» › «la autorizacion tiene que ser exactamente true» |
| `node --test` | `web/src/contacto/validacion.test.js` | «RS-02 RF-08 validación del formulario de contacto» › «sin la casilla de autorización no se envía» |
| `node --test` | `web/src/contacto/validacion.test.js` | «RS-02 RF-08 validación del formulario de contacto» › «el envío lleva solo correo, mensaje, autorización y versión de la política» |
| Jest | `api/test/archivoPagina.test.js` | «RS-03 archivos reales de api/contenidos/paginas» › «la politica dice la misma version en el encabezado, la casilla y el cuerpo» |
| Playwright, T11 (complementaria) | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-15 responder y eliminar los mensajes de la bandeja» › «el mensaje enviado por el formulario aparece en la bandeja y se elimina» |

La prueba de HU-15 usa este formulario como preparación y comprueba también en la pantalla
los dos campos, la casilla sin marcar, el enlace a `/privacidad`, que sin la casilla no
sale ninguna petición y que el envío lleva solo esos cuatro datos.

**Resultado obtenido.** Cumple.

### HU-09. Docente: material para orientar a una familia

**Criterio.** Los recursos se descargan en PDF o enlazan a la guía oficial, con su fuente.
Requisitos: RF-06, RCN-01.

**Pasos** (tarea T6 del Cuadro B.1)
1. Abrir «Recursos».
2. En cada tarjeta, ver el botón, la fecha de revisión y abrir «Fuentes».

**Resultado esperado**
- Hay recursos para docentes.
- Cada tarjeta tiene un botón «Descargar PDF (dominio)» o «Abrir página oficial (dominio)»,
  con su dirección https.
- Cada tarjeta tiene «Revisado el» y al menos una fuente.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-09 recursos en PDF o en la guía oficial, con su fuente» › «cada tarjeta trae su enlace, su fuente y su fecha de revisión» |
| `node --test` | `web/src/recursos/enlaceRecurso.test.js` | «RF-06 enlace de cada recurso: qué abre y en qué sitio» › «un archivo PDF dice «Descargar PDF» con el dominio, sin «www.»» |
| `node --test` | `web/src/recursos/enlaceRecurso.test.js` | «RF-06 enlace de cada recurso: qué abre y en qué sitio» › «una página oficial dice «Abrir página oficial» con el dominio» |
| Jest | `api/test/sincronizacionPreguntasRecursos.test.js` | «Recursos reales de api/contenidos/recursos/recursos.yaml» › «RF-06 cada archivo para descargar es un PDF y cada enlace es una página https» |
| Jest | `api/test/sincronizacionPreguntasRecursos.test.js` | «Recursos reales de api/contenidos/recursos/recursos.yaml» › «RF-06 hay recursos para docentes (tarea T6 de la prueba de usabilidad) y para familias» |
| Jest | `api/test/sincronizacionPreguntasRecursos.test.js` | «Recursos reales de api/contenidos/recursos/recursos.yaml» › «RCN-01 y RCN-02 los 6 recursos se cargan publicados, con fuentes y fecha» |

La prueba no descarga los archivos de los sitios oficiales: el contenedor no sale a
internet. Comprueba la dirección de cada enlace.

**Resultado obtenido.** Cumple.

### HU-10. Docente: encontrar rápido una respuesta

**Criterio.** El buscador devuelve las páginas y preguntas que contienen el término, y las
preguntas frecuentes se despliegan por separado. Requisitos: RF-02, RF-07.

**Pasos** (tarea T7 del Cuadro B.1)
1. Buscar «valoración» con la caja del encabezado.
2. Buscar «consultar primero» y abrir «¿A quién debo consultar primero?».
3. En «Preguntas frecuentes», abrir otra pregunta y cerrar la primera.

**Resultado esperado**
- Los resultados traen las mismas páginas y preguntas que la API para ese término.
- La pregunta del buscador abre su página con esa pregunta desplegada y con el foco en su
  botón. Las demás quedan cerradas.
- Cada pregunta se abre y se cierra sin cambiar las otras.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-10 buscador y preguntas frecuentes desplegables» › «el buscador trae páginas y preguntas, y cada pregunta se despliega por separado» |
| Jest | `api/test/rutasPublicas.test.js` | «RF-02 buscador de contenidos y preguntas frecuentes» › «encuentra contenidos y preguntas publicados sin importar tildes ni mayusculas» |
| Jest | `api/test/rutasPublicas.test.js` | «RF-02 buscador de contenidos y preguntas frecuentes» › «las preguntas encontradas traen su slug (el ancla en la web), respuesta, fuentes y fecha» |
| Jest | `api/test/busqueda.test.js` | «RF-02 buscador: coincidencias sin tildes» › «sin tilde encuentra el texto con tilde, y al reves» |
| `node --test` | `web/src/preguntas/anclaPregunta.test.js` | «RF-07 el ancla #slug abre su pregunta» › «encuentra la pregunta del ancla» |
| Jest | `api/test/sincronizacionPreguntasRecursos.test.js` | «Preguntas reales de api/contenidos/preguntas/preguntas.yaml» › «RF-07 la primera es «¿A quién debo consultar primero?» (tarea T7 de la prueba de usabilidad)» |

**Resultado obtenido.** Cumple.

### HU-11. Docente: navegar solo con el teclado

**Criterio.** Todas las funciones se operan con teclado, con foco visible y en orden lógico.
Requisitos: RA-03, RA-11.

**Pasos**
1. En el inicio, señales, ruta, directorio, recursos, preguntas y contacto, recorrer la
   página entera con Tab.
2. Solo con el teclado: «Saltar al contenido», cambiar la letra, cambiar de pestaña con las
   flechas, responder la ruta, abrir y cerrar una pregunta y enviar el formulario de
   contacto.
3. Solo con el teclado: entrar al panel y hacer la aplicación de M-09 completa (pruebas de
   HU-13 y HU-17).

**Resultado esperado**
- La primera parada es «Saltar al contenido», que lleva el foco al contenido.
- Cada parada del Tab tiene un anillo de foco de 2 px o más y queda dentro de la ventana.
- Cada parada va después de la anterior en el orden del documento, y ningún elemento tiene
  `tabindex` positivo.
- Todas esas funciones se completan sin ratón.
- El orden del foco sigue el orden visual y el foco se ve también en alto contraste
  (revisión manual).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-11 navegación solo con el teclado» › «cada parada del Tab tiene foco visible y sigue el orden del documento» |
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-11 navegación solo con el teclado» › «saltar al contenido, ajustes, pestañas, ruta, preguntas y contacto se operan con el teclado» |
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-13 publicar y despublicar un contenido desde el editor» › «el editor no publica sin fuente ni fecha, publica con ellas y despublica» |
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «M-09 registro conductual: HU-17 a HU-19» › «HU-17 instrucciones, práctica con retroalimentación y barra de progreso» › «las dos tareas, solo con el teclado: sin temporizadores, marcadores ni puntajes» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 zona pública» › «inicio, secciones, páginas del pie, búsqueda y página no encontrada» |
| Revisión manual | `docs/evaluacion/accesibilidad.md` | «Lo que no se revisa automáticamente»: teclado solo (orden visual, foco en alto contraste, aviso de vencimiento) y lectores de pantalla |

El recorrido con Tab pasó por 30 paradas en el inicio, 30 en señales, 34 en la ruta, 136 en
el directorio, 33 en recursos, 34 en preguntas y 26 en contacto, todas con anillo de foco.
axe (T10) revisa además las reglas de teclado que puede ver en el DOM, como `tabindex` y el
acceso a las regiones desplazables: 0 violaciones.

**Resultado obtenido.** Cumple en lo automático. **Pendiente (revisión manual)**: que el
orden del foco coincida con el orden visual, el foco en alto contraste, y el panel y la zona
del profesional recorridos solo con el teclado (pendiente de T10 en el backlog).

### HU-12. Administrador: entrar al panel de forma segura

**Criterio.** El acceso exige usuario y contraseña; la contraseña se almacena cifrada y la
sesión expira por inactividad. Requisitos: RF-09, RS-05.

**Pasos**
1. Abrir `/admin`, entrar con usuario y contraseña.
2. Dejar la sesión sin actividad.

**Resultado esperado**
- Sin sesión, toda ruta `/api/admin/*` responde 401. Con una clave incorrecta, 401 y sin
  cookie.
- La contraseña se guarda con bcrypt (costo 10) y el hash no contiene la clave.
- La sesión vence a los 30 minutos sin actividad y a las 8 horas. Dos minutos antes aparece
  el aviso con «Seguir conectado», y al vencer se pide entrar de nuevo.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Jest | `api/test/rutasSesion.test.js` | «RF-09 inicio de sesion» › «con usuario y clave correctos entrega la cookie de sesion» |
| Jest | `api/test/rutasSesion.test.js` | «RF-09 inicio de sesion» › «con la clave incorrecta responde 401 sin cookie» |
| Jest | `api/test/rutasSesion.test.js` | «RS-05 toda ruta /api/admin exige sesion» › «get /api/admin/contenidos responde 401 sin cookie» |
| Jest | `api/test/autenticacion.test.js` | «RS-05 contrasena cifrada con bcrypt» › «el costo es 10, el minimo que recomienda OWASP» |
| Jest | `api/test/autenticacion.test.js` | «RS-05 contrasena cifrada con bcrypt» › «el hash no contiene la clave y cambia en cada cifrado (sal)» |
| Jest | `api/test/rutasSesion.test.js` | «RS-05 la sesion expira tras 30 minutos de inactividad» › «cada peticion renueva el plazo; a los 30 minutos sin actividad vence» |
| Jest | `api/test/rutasSesion.test.js` | «RS-05 la sesion expira tras 30 minutos de inactividad» › «ninguna sesion dura mas de 8 horas, aunque tenga actividad» |
| `node --test` | `web/src/admin/vencimiento.test.js` | «RS-05 aviso de vencimiento de la sesión» › «el límite de inactividad es el mismo que el de la API (30 minutos) y el aviso sale 2 minutos antes» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 panel de administración» › «aviso de vencimiento y sesión vencida» |

**Resultado obtenido.** Cumple.

### HU-13. Administrador: publicar o corregir un contenido sin tocar el código

**Criterio.** El editor exige fuente y fecha de revisión antes de publicar, y permite
despublicar. Requisitos: RF-10, RCN-01, RCN-02.

**Pasos**
1. Entrar al panel (con el teclado) y abrir «Nuevo contenido».
2. Escribir título, slug, sección (S3) y cuerpo, sin fuente ni fecha, y pulsar «Publicar».
3. Completar la fuente, pulsar «Usar la fecha de hoy» y «Publicar».
4. Pulsar «Despublicar».

**Resultado esperado**
- Sin fuente ni fecha, el editor muestra «No se pudo guardar: revisa 2 campos» con los dos
  mensajes, y el contenido no aparece en el sitio. La fila de fuente vacía no cuenta como
  fuente.
- Con fuente y fecha se publica: «Publicado. Ya aparece en el sitio.», y la API pública lo
  entrega con su fuente y su fecha.
- «Despublicar» lo pasa a borrador y la API pública deja de entregarlo.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-13 publicar y despublicar un contenido desde el editor» › «el editor no publica sin fuente ni fecha, publica con ellas y despublica» |
| Jest | `api/test/rutasAdminContenidos.test.js` | «RF-10 RCN-01 RCN-02 crear desde el panel» › «RCN-01 no publica sin fuente: 422 con el mensaje en el campo fuentes» |
| Jest | `api/test/rutasAdminContenidos.test.js` | «RF-10 RCN-01 RCN-02 crear desde el panel» › «RCN-02 no publica sin fecha de revision: 422 con el mensaje en el campo» |
| Jest | `api/test/rutasAdminContenidos.test.js` | «RF-10 RCN-01 RCN-02 editar, publicar y despublicar» › «completar fuente y fecha publica el borrador; despublicar lo saca del sitio» |
| Jest | `api/test/rutasAdminPreguntas.test.js` | «RF-10 RCN-01 editar, publicar y despublicar preguntas frecuentes» › «completar fuente y fecha la publica; despublicar la saca del sitio» |
| Jest | `api/test/rutasAdminRecursos.test.js` | «RF-10 RCN-02 editar, publicar y despublicar recursos» › «completar fuente y fecha lo publica; despublicar lo saca del sitio» |

**Resultado obtenido.** Cumple.

### HU-14. Administrador: mantener el directorio y la ruta

**Criterio.** Cada entidad exige tipo, ciudad, contacto, fecha de verificación y constancia
de autorización si es un profesional; cada paso de la ruta exige su fuente. Requisitos:
RF-10, RS-07, RCN-05.

**Pasos**
1. En el panel, crear una entidad sin tipo, ciudad o canal de contacto; luego publicarla sin
   fecha de verificación; luego publicar un profesional sin constancia.
2. Crear y publicar un paso de la ruta sin fuente.

**Resultado esperado**
- Cada falta responde con su mensaje en el campo y no se publica.
- Con todos los datos, la entidad y el paso se publican.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Jest | `api/test/entidadDirectorio.test.js` | «HU-14 esquema de entidad del directorio» › «nombre, tipo, ciudad y descripcion son obligatorios, tambien en borrador» |
| Jest | `api/test/entidadDirectorio.test.js` | «HU-14 esquema de entidad del directorio» › «sin canal de contacto no se guarda, ni siquiera en borrador» |
| Jest | `api/test/directorio.test.js` | «HU-14 cada entidad tiene al menos un canal de contacto» › «basta un telefono, un correo o un sitio web» |
| Jest | `api/test/rutasDirectorio.test.js` | «RF-10 RCN-01 RCN-02 RS-07 crear entidades desde el panel» › «RCN-02 no publica una entidad sin fecha de verificacion» |
| Jest | `api/test/rutasDirectorio.test.js` | «RF-10 RCN-01 RCN-02 RS-07 crear entidades desde el panel» › «RS-07 no publica a un profesional sin constancia; con constancia, si» |
| Jest | `api/test/rutasDirectorio.test.js` | «RF-10 RCN-01 RCN-02 RS-07 crear entidades desde el panel» › «sin canal de contacto, o con tipo y ciudad fuera del catalogo, responde 422 con un mensaje por campo» |
| Jest | `api/test/entidadDirectorio.test.js` | «RS-07 un profesional independiente no se publica sin constancia de autorizacion» › «marcar como profesional una entidad publicada exige la constancia» |
| Jest | `api/test/rutasAdminPasosRuta.test.js` | «RF-10 RCN-01 RCN-02 crear pasos de la ruta desde el panel» › «RCN-01 no publica un paso sin fuente» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 panel de administración» › «inicio de sesión, error, listas y editores» |

Los editores de entidades y de pasos muestran los errores con el mismo mecanismo que el de
contenidos (`{ error, campos }`, `admin/edicion.js`), que la prueba de HU-13 recorre en la
pantalla.

**Resultado obtenido.** Cumple.

### HU-15. Administrador: responder y eliminar los mensajes

**Criterio.** La bandeja muestra los mensajes y permite eliminarlos; los mensajes con más
de seis meses se suprimen de forma automática. Requisitos: RF-11, RS-04.

**Pasos**
1. Enviar un mensaje desde «Contacto» (preparación, HU-08).
2. Entrar al panel y abrir «Mensajes».
3. Ver el mensaje y su enlace «Responder por correo».
4. Pulsar «Eliminar» y confirmar con «Sí, eliminar».

**Resultado esperado**
- La bandeja muestra el correo, el mensaje y un enlace `mailto:` con el asunto.
- «Eliminar» pide confirmación en la misma tarjeta y pone el foco en la pregunta. Al
  confirmar, se anuncia «Mensaje eliminado.» y el mensaje ya no está, ni en la pantalla ni
  en la API.
- MongoDB borra solo los mensajes de más de 180 días (índice TTL).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «HU-15 responder y eliminar los mensajes de la bandeja» › «el mensaje enviado por el formulario aparece en la bandeja y se elimina» |
| Jest | `api/test/rutasAdminMensajes.test.js` | «RF-11 bandeja de mensajes» › «lista los mensajes del mas reciente al mas antiguo, con la fecha de supresion» |
| Jest | `api/test/rutasAdminMensajes.test.js` | «RS-04 eliminar un mensaje» › «lo borra de la base y responde 204» |
| Jest | `api/test/mensajeContacto.test.js` | «RS-04 supresion automatica a los 180 dias» › «hay un indice TTL sobre la fecha con 180 dias» |
| Jest | `api/test/mensajeContacto.test.js` | «RS-04 supresion automatica a los 180 dias» › «MongoDB borra el mensaje de hace 181 dias y conserva el de hace 179» |
| Jest | `api/test/contacto.test.js` | «RS-04 plazo de conservacion y limites de envios» › «los mensajes se conservan 180 dias, menos que los seis meses mas cortos (181 dias)» |
| `node --test` | `web/src/admin/enlaceRespuesta.test.js` | «RF-11 responder por correo desde la bandeja» › «arma el mailto: con el correo y el asunto» |

**Resultado obtenido.** Cumple. Los «seis meses» son 180 días: los mensajes se suprimen unos
días antes de cumplirse los seis meses de calendario, nunca después (pendiente de T8 en el
backlog, para el documento).

### HU-16. Profesional: crear una sesión con seudónimo y constancia del consentimiento

**Criterio.** La sesión se crea solo después de marcar la constancia del consentimiento
firmado, recibe un seudónimo aleatorio de 8 caracteres y ningún campo del registro guarda
nombre, documento ni contacto. Requisito: CT-11.

**Pasos**
1. Entrar a `/registro` con la cuenta del profesional y abrir «Nueva sesión».
2. Pulsar «Crear la sesión» sin marcar nada.
3. Marcar la constancia del consentimiento, escribir la versión del formato, marcar la
   mayoría de edad y crear la sesión.

**Resultado esperado**
- Sin las marcas, la sesión no se crea y se explica por qué.
- Con ellas, la sesión recibe un seudónimo XXXX-XXXX con un alfabeto sin 0, O, 1, I ni L,
  generado por la API, único en la base.
- Las colecciones del registro rechazan cualquier campo identificable, también anidado.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-16 nueva sesion con la constancia del consentimiento» › «con las dos marcas crea la sesion con un seudonimo XXXX-XXXX, reloj animacion y sin datos de la persona» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-16 nueva sesion con la constancia del consentimiento» › «CT-11 un campo identificable o cualquier otro campo responde 400» |
| Jest | `api/test/registroSesionEnvio.test.js` | «HU-16 la sesion se crea solo con la constancia del consentimiento y la mayoria de edad» › «sin ninguna de las dos marcas, explica las dos» |
| Jest | `api/test/registroSeudonimo.test.js` | «CT-11 seudónimo aleatorio de la sesión» › «tiene 8 caracteres en formato XXXX-XXXX» |
| Jest | `api/test/registroSeudonimo.test.js` | «CT-11 seudónimo aleatorio de la sesión» › «el alfabeto no tiene caracteres ambiguos» |
| Jest | `api/test/registroSeudonimo.test.js` | «CT-11 seudónimo aleatorio de la sesión» › «genera seudonimos distintos» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-16 nueva sesion con la constancia del consentimiento» › «CT-11 el seudonimo tiene indice unico: si el generado ya existe, se genera otro» |
| Jest | `api/test/modelosRegistro.test.js` | «CT-11 las colecciones del registro no guardan datos identificables» › «el plugin revisa el documento antes de validar, con cualquier clave identificable» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 registro conductual (M-09)» › «zona del profesional y aplicación completa» |

La prueba de T10 intenta crear la sesión sin marcas («No pudimos crear la sesión») y
luego con ellas. Las pruebas nuevas de M-09 (HU-17 y HU-18) crean dos sesiones más desde la
pantalla y comprueban el formato del seudónimo.

**Resultado obtenido.** Cumple.

### HU-17. Participante adulto: completar las dos tareas sin ayuda

**Criterio.** Cada tarea empieza con instrucciones y al menos dos ensayos de práctica con
retroalimentación; durante los ensayos se ve una barra de progreso y no se ven
temporizadores, marcadores ni puntajes; la aplicación dura 20 minutos o menos, con pausas.
Requisitos: CP-01, CP-04, CT-03, CT-07, CT-08.

**Pasos**
1. El profesional crea una sesión y entrega el dispositivo.
2. El participante hace la tarea de cambio de regla, la pausa entre tareas, la de Navon y
   el SUS, solo con el teclado.

**Resultado esperado**
- Cada tarea empieza con pantallas de instrucciones, antes de cualquier ensayo.
- Cada tarea tiene 2 ensayos de práctica, cada uno seguido de su retroalimentación, antes
  de los ensayos medidos (CP-04).
- En cada ensayo se ve la barra de progreso («Práctica» o «Parte n de N»). Avanza solo entre
  partes, con una pausa en medio, y cada parte tiene 7 ensayos o menos (CP-01, CT-08).
- Durante los ensayos no hay números fuera de la barra, ni tiempo, aciertos, puntos ni
  marcadores, ni elementos de temporizador (CT-03).
- La sesión dura 20 minutos o menos, con una pausa al menos cada 5 minutos (CT-08).
- El tiempo de reacción se registra con un error de 50 ms o menos (CT-07).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «M-09 registro conductual: HU-17 a HU-19» › «HU-17 instrucciones, práctica con retroalimentación y barra de progreso» › «las dos tareas, solo con el teclado: sin temporizadores, marcadores ni puntajes» |
| Jest | `api/test/registroSecuencia.test.js` | «CP-01 como máximo 7 ensayos por bloque» › «cambio-regla» |
| Jest | `api/test/registroSecuencia.test.js` | «CP-01 como máximo 7 ensayos por bloque» › «navon» |
| Jest | `api/test/registroSecuencia.test.js` | «CP-04 al menos 2 ensayos de práctica con retroalimentación» › «cambio-regla» |
| Jest | `api/test/registroSecuencia.test.js` | «CP-04 al menos 2 ensayos de práctica con retroalimentación» › «navon» |
| Jest | `api/test/registroSecuencia.test.js` | «CT-08 20 minutos o menos, con una pausa al menos cada 5 minutos» › «la sesion completa cumple los dos limites» |
| Jest | `api/test/registroSecuencia.test.js` | «CT-03 el participante no ve temporizador, marcador ni acierto» › «fuera de la practica oculta el tiempo, el acierto y la clase de error» |
| `node --test` | `web/src/registro/vista.test.js` | «CT-03 vistaDeEnsayo en la web» › «las pantallas de la tarea no leen el tiempo, el acierto ni la clase de error» |
| `node --test` | `web/src/registro/textos.test.js` | «M-09 / RCN-03 textos de la tarea sin vocabulario prohibido» › «ningún texto habla de puntos, vidas, rankings ni tiempo restante» |
| `node --test` | `web/src/registro/textos.test.js` | «HU-17 instrucciones en cada cambio de regla» › «antes del bloque de forma se dice explícitamente que ahora se clasifica por forma» |
| `node --test` | `web/src/registro/textos.test.js` | «HU-17 instrucciones de la tarea de Navon» › «cada nivel tiene su pantalla: «Mira la letra grande» y «Mira las letras pequeñas»» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 registro conductual (M-09)» › «zona del profesional y aplicación completa» |
| Playwright, T16 | `web/evaluacion/precision/precision.spec.js` | Corrida 39153850094 de GitHub Actions (commit 3f51108, 18 de octubre de 2026): 14 celdas, 222 ensayos por celda en Chromium, Firefox y WebKit (`docs/evaluacion/precision.md`) |
| Revisión manual | Prueba con voluntarios (semana 4) | Duración real de la sesión y aplicación sin ayuda |

Lo que vio el recorrido de T11: en cambio de regla, 9 pantallas de texto, 2 ensayos de
práctica con su retroalimentación, 42 ensayos medidos en 6 partes y 6 pausas (la del fin de
la práctica y una entre cada parte); en Navon, 9 pantallas de texto, 2 de práctica, 28
medidos en 4 partes y 4 pausas. Después de la última parte, cada tarea termina sin pausa:
sigue la pantalla entre tareas o el SUS. El recorrido
automático, que responde de inmediato, tardó 0,7 minutos. La duración estimada de una
persona es de 8,9 minutos, con un tramo máximo de 2 minutos sin pausa (`planificarSesion`,
4 s por ensayo).

CT-07, con el reloj que usa la aplicación (`animacion`): sin carga, el error fue de 50 ms o
menos en el 100 % de los ensayos de los tres motores (percentil 95 de 3,0 ms o menos), y
con la CPU 4 veces más lenta, también (Chromium). Con el hilo ocupado (una condición de
esfuerzo), Chromium y WebKit siguieron en el 100 %. En Firefox esa celda se lee con la cota
superior, porque el arnés no pudo separar su latencia: el 92,8 % de los ensayos quedó dentro
de 50 ms (percentil 95 de 58,9 ms). Es una cota: el error real está entre las dos tablas de
`docs/evaluacion/precision.md`.

**Resultado obtenido.** Cumple en lo automático. **Pendiente (revisión manual)**: la duración
real (20 minutos o menos) y que las personas completen las tareas sin ayuda, con los
voluntarios. Lo de Firefox con el hilo ocupado queda como límite conocido de CT-07, no como
falla de este criterio.

### HU-18. Profesional: ver los valores observados con el aviso

**Criterio.** La vista muestra por tarea cada valor observado con su constructo, el aviso de
no diagnóstico y la versión del algoritmo, sin etiquetas, niveles, puntos de corte ni
puntajes globales; una sesión incompleta no muestra valores. Requisitos: CC-08, CC-09,
CC-10, CC-12, RF-13, RF-14, RF-15, CT-13, RCN-03.

**Pasos**
1. Después de la aplicación de HU-17, el profesional entra y abre el detalle de la sesión.
2. Crear otra sesión, entregar el dispositivo, empezar la primera tarea y recargar la
   página a mitad del primer ensayo de práctica.
3. Abrir el detalle de esa segunda sesión.

**Resultado esperado**
- La sesión completa muestra el aviso de M-09 tal cual, «Versión del algoritmo: 1.0.0» y,
  por tarea, una fila por indicador con su código, constructo, métrica y valor: CC-08, CC-09
  y CC-12 en cambio de regla y CC-10 en Navon, iguales a los de la API.
- En toda la página no hay vocabulario prohibido (`buscarVocabularioProhibido`).
- La recarga deja la segunda sesión «Interrumpida»: su detalle muestra el aviso y dice que
  no está completa, sin tablas de valores ni versión del algoritmo (RF-15).
- Los valores usan el tiempo neto, sin práctica, omisiones ni anticipaciones, y la misma
  entrada da la misma salida (RF-13, RF-14, CT-13).

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «M-09 registro conductual: HU-17 a HU-19» › «HU-18 valores observados por tarea con el aviso de no diagnóstico» › «la sesión completa muestra cada valor con su constructo, el aviso y la versión del algoritmo» |
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «M-09 registro conductual: HU-17 a HU-19» › «HU-18 valores observados por tarea con el aviso de no diagnóstico» › «una sesión interrumpida por una recarga no muestra valores (RF-15)» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-18 / RF-15 sesiones del profesional y sus valores» › «una sesion completa muestra los valores por tarea con el aviso y la version del algoritmo (CT-13)» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-18 / RF-15 sesiones del profesional y sus valores» › «RF-15 una sesion incompleta se guarda pero no muestra valores» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-18 / RF-15 sesiones del profesional y sus valores» › «M-09 / RCN-03 ninguna respuesta de las rutas del registro tiene vocabulario prohibido» |
| Jest | `api/test/registroMotor.test.js` | «RCN-03 aviso de no diagnóstico en toda salida de M-09» › «lleva el texto exacto, se procese o no la sesion» |
| Jest | `api/test/registroRestricciones.test.js` | «M-09 salida sin clasificación ni nombres de dominios del DSM-5-TR» › «la salida no agrega valores: no hay total, banda, dominio ni categoria» |
| Jest | `api/test/registroRestricciones.test.js` | «RF-13 tiempo de reacción neto» › «la pausa durante el ensayo se resta» |
| Jest | `api/test/registroRestricciones.test.js` | «RF-14 práctica, omisiones y anticipaciones fuera del cálculo» › «un ensayo de practica no cambia ningun indicador» |
| Jest | `api/test/registroRestricciones.test.js` | «RF-15 las sesiones incompletas no se procesan» › «estado interrumpida» |
| Jest | `api/test/registroRestricciones.test.js` | «CT-13 reproducibilidad por versión» › «la misma entrada da la misma salida, sin depender de la hora» |
| Jest | `api/test/registroReproducibilidad.test.js` | «CT-13 misma entrada y misma versión dan la misma salida al pasar por la API» › «perfil base» |
| Jest | `api/test/registroPerfiles.test.js` | «CC-09 CC-10 CC-08 CC-12 procesarSesion recupera los parámetros de cada perfil» › «base» |
| `node --test` | `web/src/registro/textosProfesional.test.js` | «HU-18 valores observados con su unidad» › «un valor que no se calculó se dice con palabras; CC-12 dice si no se alcanzó el criterio» |

**Resultado obtenido.** Cumple.

### HU-19. Profesional: exportar en CSV y eliminar por seudónimo

**Criterio.** El CSV trae los ensayos y los valores con el seudónimo y la versión del
algoritmo, sin datos identificables; al eliminar por seudónimo se borran la sesión y sus
ensayos. Requisitos: CT-11, CT-13.

**Pasos**
1. En la lista de sesiones, pulsar «Descargar los ensayos (CSV)» y «Descargar los valores y
   el SUS (CSV)».
2. En «Eliminar una sesión», escribir el seudónimo de cada sesión en minúsculas y sin guion,
   pulsar «Eliminar» y confirmar con «Sí, eliminar».
3. Descargar otra vez los dos CSV.

**Resultado esperado**
- Los dos CSV tienen las columnas `seudonimo` y `versionAlgoritmo`, ninguna columna
  identificable y ningún nombre con vocabulario prohibido.
- `ensayos.csv` trae los 74 ensayos de la sesión completa, con la versión del algoritmo.
  `valores.csv` trae sus valores; la sesión interrumpida aparece sin valores y sin versión.
- Al eliminar, la pantalla confirma «Se eliminó la sesión … con todos sus ensayos.», la API
  responde 404 y los CSV ya no traen ninguna fila de esas sesiones.

**Evidencia**

| Tipo | Archivo | Prueba |
|---|---|---|
| Playwright, T11 | `web/evaluacion/aceptacion/aceptacion.spec.js` | «M-09 registro conductual: HU-17 a HU-19» › «HU-19 exportar en CSV y eliminar una sesión por su seudónimo» › «los dos CSV traen el seudónimo y la versión sin datos identificables; eliminar borra la sesión y sus ensayos» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-19 exportacion en CSV» › «ensayos.csv: un ensayo por fila con seudonimo, versiones, reloj y navegador» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-19 exportacion en CSV» › «valores.csv: una sesion por fila, con los valores, el SUS y las incompletas sin valores» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-19 exportacion en CSV» › «otro profesional no recibe sesiones ajenas» |
| Jest | `api/test/rutasAdminRegistro.test.js` | «HU-19 eliminar una sesion por su seudonimo» › «borra la sesion y todos sus ensayos; el seudonimo se puede escribir en minusculas y con espacio» |
| Jest | `api/test/registroExportacion.test.js` | «HU-19 formato de los CSV» › «CT-11 / M-09 las columnas no tienen datos identificables ni vocabulario prohibido» |
| Playwright, T10 | `web/evaluacion/accesibilidad/accesibilidad.spec.js` | «RA-01 a RA-11 registro conductual (M-09)» › «zona del profesional y aplicación completa» |

**Resultado obtenido.** Cumple.

## Resumen

| Historia | Perfil | Casos | Cumplen (parte automática) | Evidencia | Pendiente (revisión manual) |
|---|---|---:|---:|---|---|
| HU-01 | Familia | 1 | 1 | Automática + revisión manual | Redacción de S1 (RCN-06) |
| HU-02 | Familia | 1 | 1 | Automática | — |
| HU-03 | Familia | 1 | 1 | Automática | — |
| HU-04 | Familia | 1 | 1 | Automática | — |
| HU-05 | Familia | 1 | 1 | Automática | — |
| HU-06 | Familia | 1 | 1 | Automática | — |
| HU-07 | Familia | 1 | 1 | Automática | — |
| HU-08 | Familia | 1 | 1 | Automática | — |
| HU-09 | Docente | 1 | 1 | Automática | — |
| HU-10 | Docente | 1 | 1 | Automática | — |
| HU-11 | Docente | 1 | 1 | Automática + revisión manual | Orden visual del foco; alto contraste; panel y zona del profesional con teclado |
| HU-12 | Administrador | 1 | 1 | Automática | — |
| HU-13 | Administrador | 1 | 1 | Automática | — |
| HU-14 | Administrador | 1 | 1 | Automática | — |
| HU-15 | Administrador | 1 | 1 | Automática | — |
| HU-16 | Profesional | 1 | 1 | Automática | — |
| HU-17 | Participante adulto | 1 | 1 | Automática + revisión manual | Duración real y «sin ayuda», con los voluntarios |
| HU-18 | Profesional | 1 | 1 | Automática | — |
| HU-19 | Profesional | 1 | 1 | Automática | — |
| **Total** | | **19** | **19** | 16 automáticas; 3 automáticas + revisión manual | 3 |

Los 19 casos cumplen en todo lo que se comprueba de forma automática, y ninguno dio
«No cumple». Los tres pendientes no son fallas: son la parte del criterio que necesita
personas.

## Lo que queda para revisión manual

1. **Redacción de S1 (HU-01, RCN-06).** Leer `api/contenidos/s1-que-es-el-tea.md` (o la
   página) y comprobar que los párrafos son breves, que las instrucciones tienen dos frases
   como máximo, que no hay metáforas y que cada tecnicismo está explicado. La revisan las
   personas del equipo que revisan los textos.
2. **Teclado y lectores de pantalla (HU-11, RA-03, RA-11).** La lista de «Lo que no se revisa
   automáticamente» de `docs/evaluacion/accesibilidad.md`, sobre la vista previa de Vercel:
   que el orden del foco siga el orden visual, que el foco se vea también en alto contraste,
   el panel y la zona del profesional solo con el teclado, y NVDA, TalkBack y VoiceOver. Ya
   está como pendiente de T10 en el backlog.
3. **Duración real y aplicación sin ayuda (HU-17, CT-08).** Con los voluntarios adultos de
   la semana 4, solo con el aval escrito del comité de ética: anotar cuánto dura cada sesión
   y si la persona necesitó ayuda para seguir.
4. **Las tareas del Cuadro B.1 en el sitio desplegado.** El Cuadro 19 pide ejecutar los
   casos en el entorno desplegado. Las pruebas automáticas corren sobre el build local, con
   la API y MongoDB en memoria. El equipo debe repetir las tareas T1 a T8 del Cuadro B.1 en
   Vercel y anotar el resultado (tarea del equipo en el backlog).

## Diferencias con el documento

- El Cuadro 19 dice «las quince historias de usuario». Con M-09 son 19 (HU-01 a HU-19): hay
  que corregirlo en el documento.
- El Cuadro 19 pide ejecutar los casos en el entorno desplegado. Aquí corren sobre el build
  local (ver el punto 4 de la sección anterior).
- La tarea T4 del Cuadro B.1 («abre un registro») ya no aplica: el directorio no tiene página
  de detalle (pendiente de T6).
- Los criterios de HU-16 a HU-19 son una propuesta del equipo de desarrollo (pendiente de
  T12): estos casos usan los de `docs/requisitos-fase-i.md`, con lo que sumó T15 (mayoría de
  edad, versión del formato y los dos CSV).

## Cómo se ejecuta

Desde la raíz del repositorio:

```
npm install
npm run test:cov                 # Jest y node --test
npm run build:web
npm run accesibilidad:axe -w web # T10: axe en las tres variantes (unos 7 minutos)
npm run accesibilidad:resumen -w web
npm run aceptacion -w web        # T11: los 16 casos de extremo a extremo (unos 2 minutos)
```

`npm run aceptacion -w web` levanta el servidor de la auditoría de T10 en el puerto 4330 y
deja el reporte en `web/evaluacion/aceptacion/resultados/aceptacion.json`. Esa carpeta no se
sube al repositorio. Variables: `CHROMIUM_EJECUTABLE` (otro Chromium ya instalado; en el
contenedor de Claude Code, `/opt/pw-browsers/chromium`), `PUERTO_ACEPTACION` (4330) y
`ACEPTACION_VISIBLE=1` (con ventana).

`npm run accesibilidad:resumen -w web` termina con código 1 si no encuentra resultados de
Lighthouse. Para HU-05 basta su parte de axe: «Ninguna pantalla se desplaza a lo ancho».

Ni los casos de T11 ni la auditoría de T10 corren en el CI normal: necesitan el build y un
navegador. El CI corre las pruebas de Jest y de `node --test`.

## Limitaciones

- **Build local, no el sitio desplegado.** Las pruebas usan el mismo build y la misma
  preparación del arranque, pero no Vercel ni Render: no ven el reenvío de `/api`, el
  despertar de Render ni HTTPS (RS-06).
- **Un solo navegador.** Los casos de T11 corren en Chromium. El tiempo de reacción sí se
  midió en los tres motores (T16).
- **Personas.** Una prueba automática no reemplaza la prueba de usabilidad del Cuadro B.1 ni
  la prueba con voluntarios de M-09: comprueba que la funcionalidad está, no que sea fácil
  de usar.
