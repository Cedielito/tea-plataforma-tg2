# Backlog Fase I — Plataforma web TEA

Reemplaza al backlog anterior (el del prototipo gamificado). Entrega del documento: **6 de noviembre de 2026**.

Cambio de alcance (propuesta de la asesora, 17 de octubre): la Fase I es la plataforma
informativa (M-01 a M-08, sin cambios) más **M-09 Registro conductual estructurado**,
una herramienta para que un profesional registre de forma estandarizada el desempeño en
dos tareas de dominio público, la clasificación con cambio de regla (DCCS) y las
figuras jerárquicas de Navon. En esta fase M-09 se evalúa solo con adultos voluntarios.
Decisión en `docs/decisiones/0007-registro-conductual.md`.

## Calendario

| Semana | Fechas | Meta |
|---|---|---|
| 1 | 6 – 12 oct | Repo limpio, base visual, contenidos (M-01, M-02, M-07) y panel con login |
| 2 | 13 – 19 oct | Ruta, directorio, recursos, preguntas, contacto y **despliegue**; núcleo del registro (T12, 18 oct) |
| 3 | 20 – 26 oct | M-09: T13 (20 oct), T14 (21 oct), T15 (23 oct) y T16 (24 oct); T10 y T11 (25 oct); **versión congelada el 26 oct** |
| 4 | 27 oct – 6 nov | Prueba con voluntarios adultos sobre la versión congelada, resultados en el documento (lo amarillo) y **entrega el 6 de noviembre** |

Reglas:
- Si una tarea no acerca a la plataforma desplegada al 19 de octubre, no entra.
- Después del 26 de octubre solo entran correcciones sobre la versión congelada.
- Línea de corte de M-09: si la tarea de Navon no está estable el 23 de octubre, se
  evalúa solo la de cambio de regla.

## Tareas humanas (no las hace Claude Code)

| Tarea | Responsable | Plazo | Bloquea |
|---|---|---|---|
| ✅ Textos de S1 a S5 a partir de las fuentes oficiales (MinSalud, OMS, DSM-5-TR), con fuente y fecha | Hechos (`api/contenidos/`); Santiago los revisa | 10 oct | T3 |
| ✅ Lista de 15 a 30 entidades públicas para el directorio con fuente | Hecha: 23 verificadas (`api/contenidos/directorio/`); Santiago las revisa | 14 oct | T6 |
| ✅ Pasos de la ruta por perfil, edad y régimen (según el protocolo de MinSalud) | Hechos: 18 pasos (`api/contenidos/ruta/`); Santiago los revisa | 13 oct | T5 |
| ✅ 3 a 5 recursos descargables o enlaces oficiales y 10 preguntas frecuentes | Hechos: 6 recursos y 12 preguntas (`api/contenidos/recursos/` y `preguntas/`); Santiago los revisa | 15 oct | T7 |
| ✅ Poner la fecha de vigencia de la política (`COMPLETAR` en `api/contenidos/paginas/privacidad.md`); los datos del responsable ya están | Hecha: vigente desde el 7 de octubre de 2026; si T8 se fusiona otro día, se cambia antes de fusionar | Antes de fusionar T8 | T8 |
| Google Form con consentimiento (Anexo A) + SUS + registro de tareas (Anexo B) | Santiago | 18 oct | Semana 3 |
| Conseguir 10 a 15 voluntarios adultos y agendarlos | Ambos | 19 oct | Semana 3 |

## Tareas de desarrollo (una por sesión de Claude Code, en su propia rama)

| # | Rama | Tarea | Módulos / requisitos | Semana |
|---|---|---|---|---|
| T0 ✅ | `chore/reenfoque-plataforma` | Preservar Fase II en la rama `fase-ii` y limpiar `main` | — | 1 |
| T1 ✅ | `feat/base-visual` | Layout, rutas, sistema visual, barra de accesibilidad e inicio | M-01, M-07, RA-01 a RA-11 | 1 |
| T2 ✅ | `feat/api-contenidos` | Modelos y API de contenidos, preguntas y recursos con fuente y fecha obligatorias | RCN-01, RCN-02, RF-10 | 1 |
| T3 ✅ | `feat/paginas-contenido` | Páginas S1 a S5, filtro por edad y buscador | M-02, RF-02, RF-03, RCN-03, RCN-04 | 1 |
| T4 ✅ | `feat/admin-auth` | Login del administrador y editor de contenidos | M-08, RF-09, RF-10, RS-05 | 1 |
| T5 ✅ | `feat/ruta-atencion` | Ruta de atención interactiva | M-03, RF-04, RS-01 | 2 |
| T6 ✅ | `feat/directorio` | Directorio con filtros + administración | M-04, RF-05, RS-07 | 2 |
| T7 ✅ | `feat/recursos-faq` | Recursos y preguntas frecuentes + administración | M-05, RF-06, RF-07 | 2 |
| T8 ✅ | `feat/contacto` | Contacto, privacidad, bandeja y supresión a 6 meses | M-06, RF-08, RF-11, RS-02 a RS-04 | 2 |
| T9 ✅ | `chore/despliegue` | Despliegue en Vercel + Render + MongoDB Atlas (adelantada a la semana 1) | RS-06 | 1 |
| T12 ✅ | `feat/nucleo-registro` | Núcleo del registro: indicadores, catálogo, secuenciador, motor, versión y seudónimo traídos de `fase-ii` | M-09, CC-08, CC-09, CC-10, CC-12, CT-03, CT-08, CT-11, CT-13, CP-01, CP-04, RF-13 a RF-15 | 2 (18 oct) |
| T13 | `feat/motor-tareas` | Motor de ensayos, reloj y tarea de cambio de regla gamificada | M-09, HU-17, CT-03, CT-07, CP-01, CP-04, RF-13, RF-14 | 3 (20 oct) |
| T14 | `feat/tarea-navon` | Tarea de Navon | M-09, HU-17, CC-10, CP-01, CP-04 | 3 (21 oct) |
| T15 | `feat/flujo-profesional` | Flujo del profesional, SUS y exportación | M-09, HU-16, HU-18, HU-19, CT-11, CT-13, RF-15 | 3 (23 oct) |
| T16 | `test/precision-temporal` | Experimento de precisión temporal, perfiles simulados y reproducibilidad | M-09, CT-07, CT-13 | 3 (24 oct) |
| T10 | `test/accesibilidad` | axe-core + Lighthouse + correcciones, también en las pantallas de M-09 | RA-01 a RA-11 | 3 (25 oct) |
| T11 | `docs/casos-aceptacion` | Casos de aceptación de HU-01 a HU-19 y su ejecución | C1 | 3 (25 oct) |

Reglas de cada sesión (Claude Code web): sesión nueva desde `main` → pegar el prompt → revisar y aprobar el plan → Claude programa, prueba, hace commit y push **a la rama de la tarea** y abre el Pull Request → revisar CI y vista previa → el otro integrante aprueba → *Squash and merge* → borrar la rama.

Al cerrar cada tarea, marcarla con ✅ en la tabla dentro del mismo PR.

## Pendientes detectados

| Detectado en | Pendiente | Módulos / requisitos |
|---|---|---|
| T12 | El documento 2.3 debe reflejar lo que cambió con T12. CC-09 pasa a la definición por ensayo (cambio menos repetición, solo en los bloques mixtos y solo con aciertos), CC-10 se llama «Diferencia global-local» y CC-12 informa si el criterio no se alcanzó. RF-14 suma las anticipaciones (tiempo neto menor de 200 ms) y no hay recorte por desviación estándar. Los criterios de aceptación de HU-16 a HU-19 en `docs/requisitos-fase-i.md` son una propuesta del equipo de desarrollo: revisarlos contra el documento. CT-08 se comprueba con una duración estimada (4 s por ensayo); T16 mide la real. | M-09, CC-09, CC-10, CC-12, RF-14, CT-08 |
| T8 | Comprobar en el entorno desplegado el límite de envíos por IP (pasos en `docs/despliegue.md`, «Formulario de contacto») y ajustar `SALTOS_PROXY` en Render si hace falta. El documento debe reflejar que los mensajes se suprimen a los 180 días (seis meses de 30 días: unos días antes de cumplirse los seis meses de calendario, nunca después) y que en el Cuadro 13 la versión de la autorización se llama `versionPolitica`. | M-06, RS-02, RS-04 |
| T7 | El documento debe reflejar lo que cambió con T7. En el Cuadro 13, `pregunta_frecuente` y `recurso` llevan además un identificador (`slug`), y en `pregunta_frecuente` el orden es obligatorio. En el Cuadro B.1, la tarea T7 («¿A quién debo consultar primero?») se cumple desplegando la pregunta en `/preguntas-frecuentes` o desde el buscador, que enlaza a la pregunta abierta. | M-05, RF-06, RF-07 |
| T6 | El documento debe reflejar lo que cambió con T6. En el Cuadro B.1, la tarea T4 de la prueba de usabilidad («Aplica el filtro de ciudad y abre un registro») ya no aplica: el directorio no tiene página de detalle y cada tarjeta muestra todos los datos (lo ajusta el equipo). En el Cuadro 13, `entidad_directorio` lleva además descripción, fuentes, estado de publicación y la marca de profesional independiente. | M-04, RF-05, RS-07 |
| T4 | Las páginas de S1, S3, S4 y S5 muestran un solo contenido, con un slug fijo (`web/src/secciones.js`). Un contenido nuevo en esas secciones, creado desde el panel, no aparece en el sitio: el buscador lo encuentra, pero su enlace lleva a la página fija de la sección. Por ahora el editor lo avisa. Resolver antes de cargar contenidos nuevos en esas secciones (por ejemplo, una ruta `/contenidos/:slug` o mostrar todos los contenidos de la sección). | M-02, RF-01, RF-02, RF-10 |

---

## Prompts para Claude Code

### T0 — Preservar la Fase II y limpiar main ✅
Hecha. La rama `fase-ii` conserva el prototipo gamificado completo (motor, minijuegos,
consentimiento y sus pruebas). `main` quedó como base limpia: API con `/salud`,
manejo de errores y conexión a MongoDB; web con el sistema visual nuevo; documentos
viejos en `docs/fase-ii/`. Decisión registrada en `docs/decisiones/0004-reenfoque-fase-i.md`.

### T1 — Base visual, barra de accesibilidad e inicio ✅
```
Lee CLAUDE.md. Tarea T1, rama feat/base-visual.

Construye en web/ la base de la plataforma siguiendo la «Dirección visual» y las
reglas de accesibilidad de CLAUDE.md:
- Tokens de diseño en CSS (colores, tipografía, espaciado, radios) y modo de alto
  contraste. Fuentes Atkinson Hyperlegible y Lexend autoalojadas con @fontsource.
- Layout común: encabezado con logo textual, navegación (Qué es el TEA, Señales,
  Ruta de atención, Directorio, Recursos, Preguntas), buscador (solo la caja por
  ahora), enlace «Saltar al contenido» y pie con aviso de no diagnóstico,
  privacidad y «Acerca de».
- Barra de accesibilidad (M-07): tamaño de letra (3 niveles), alto contraste y
  reducir movimiento; se aplica al instante y se conserva durante la visita
  (sessionStorage), sin cookies.
- Página de inicio (M-01): mensaje principal «Información confiable sobre el TEA
  y a dónde acudir», 6 tarjetas a las secciones y el aviso de no diagnóstico.
  Que se vea cálida y cuidada: buena jerarquía, espacio en blanco, íconos lucide.
- Rutas con react-router y páginas vacías para cada sección.
Dependencias que autorizo: react-router-dom, @fontsource/atkinson-hyperlegible,
@fontsource/lexend, lucide-react. Ninguna otra sin preguntar.
Terminado cuando: npm run dev muestra el inicio, todo se navega con teclado,
funciona en 320 px y los tres ajustes de la barra funcionan.
Propón el plan antes de escribir código.
```

### T2 — API de contenidos ✅
```
Lee CLAUDE.md. Tarea T2, rama feat/api-contenidos.

En api/ crea los modelos contenido (título, slug, sección S1-S5, tramo de edad
opcional 4-7 | 8-12 | 13-17, cuerpo en Markdown, fuentes [texto, url], fecha de
revisión, estado borrador|publicado), pregunta_frecuente y recurso, según el
Cuadro 13 de docs/requisitos-fase-i.md. Reglas en api/src/dominio con pruebas: no se publica
sin fuentes ni fecha de revisión (RCN-01, RCN-02).
Rutas públicas de solo lectura: GET /api/contenidos?seccion=&edad=,
GET /api/contenidos/:slug, GET /api/buscar?q= (contenidos y preguntas publicados).
Las rutas de escritura irán en /api/admin y se protegen en T4.
Incluye un script de seed con 2 contenidos de ejemplo marcados como «borrador».
Pruebas con Jest y mongodb-memory-server. Propón el plan antes de escribir código.
```

### T3 — Páginas de contenido ✅
Hecha en dos PR: `feat/carga-contenidos` (la API carga los textos de `api/contenidos/`
al arrancar) y `feat/paginas-contenido` (páginas S1 a S5, señales por edad y buscador).
```
Lee CLAUDE.md. Tarea T3, rama feat/paginas-contenido.

Conecta web/ a la API de T2: plantilla de página de contenido con migas de pan,
cuerpo en Markdown (renderizado seguro), bloque de fuentes y «Revisado el
dd/mm/aaaa» al final. Sección Señales de alerta con pestañas 4-7, 8-12 y 13-17,
cada señal presentada como motivo de consulta y un recuadro final que enlaza a la
ruta de atención (RCN-04). Aviso de no diagnóstico en señales (RCN-03).
Buscador funcional con resultados accesibles (región aria-live).
Estados de carga y error en español, sin jerga técnica (la API gratuita puede
tardar hasta un minuto en despertar: muéstralo con calma, sin temporizadores).
Llama a la API con rutas relativas /api/... (ver docs/despliegue.md).
Pide autorización si necesitas una librería de Markdown.
Propón el plan antes de escribir código.
```

### T4 — Login y panel de administración ✅
Hecha. Cambio frente al prompt: el primer administrador no se crea con un script por
consola (Render gratuito no la tiene), sino al arrancar la API con `ADMIN_USUARIO` y
`ADMIN_CLAVE` si la colección está vacía (pasos en `docs/despliegue.md`). Sesión en el
servidor dentro del documento `administrador`, bcrypt con costo 10, bloqueo por usuario
y límite global de intentos: `docs/decisiones/0005-sesion-administrador.md`.
```
Lee CLAUDE.md. Tarea T4, rama feat/admin-auth.

Autenticación del administrador (RS-05): colección administrador con contraseña
bcrypt, login que entrega una cookie httpOnly, SameSite=Strict y Secure en
producción, con expiración por inactividad de 30 minutos; middleware que protege
/api/admin/*. Script para crear el primer administrador por consola (sin
registro público). En web/, ruta /admin no enlazada desde la navegación pública,
con login y editor de contenidos: listar, crear, editar, publicar y despublicar,
con fuente y fecha de revisión obligatorias en el formulario.
Pruebas: rutas de admin responden 401 sin sesión; no se publica sin fuente.
Dependencias que autorizo: bcrypt (o bcryptjs) y cookie-parser.
Propón el plan antes de escribir código.
```

### T5 — Ruta de atención interactiva ✅
Hecha. Cambios frente al prompt: la guía va arriba en `/ruta-de-atencion`, antes del
texto de S4; el `id` de cada paso se guarda como `slug`, igual que en contenidos (T6 y
T7 siguen el mismo patrón con `crearCargaDeLista` de `api/src/datos/sincronizacionListas.js`);
los docentes tienen «No lo sé» en la pregunta del régimen, que muestra los pasos de todos
los regímenes. Las entidades junto a cada paso quedan para T6. La lógica pura de `web/`
se prueba con `node --test`, que corre con `npm test`.
```
Lee CLAUDE.md y api/contenidos/README.md. Tarea T5, rama feat/ruta-atencion.

Modelo paso_ruta (perfiles familia|docente, tramos, regímenes
contributivo|subsidiado|sin-afiliacion, orden, título, texto, tipos de entidad
enlazados, fuentes, fecha de revisión) con su administración en el panel. Los 18
pasos ya están en api/contenidos/ruta/pasos.yaml: cárgalos al arrancar la API como
T3 carga los contenidos, buscando por id. En web/, asistente de 3 preguntas
(una por pantalla, con «Paso X de 3», Anterior/Siguiente y teclado) que al final
muestra los pasos ordenados y las entidades del directorio. Las respuestas se
procesan en el navegador y NO se envían a la API (RF-04, RS-01): la web descarga
todos los pasos publicados y filtra localmente. Texto visible: «Tus respuestas no
se guardan». Las preguntas nunca indagan por conductas ni síntomas. Al final,
enlaza a las señales de alerta del tramo elegido. Si T6 aún no está, muestra los
pasos sin las entidades.
Propón el plan antes de escribir código.
```

### T6 — Directorio ✅
Hecha. Cambios frente al prompt: la fecha de verificación se llama `fechaVerificacion`
en el YAML, la base, la API y la web, y RCN-02 se le aplica parametrizando el campo de
fecha (`publicable`, `validarPublicacion` y `crearCargaDeLista` reciben `campoFecha`).
Cada entidad necesita al menos un teléfono, correo o sitio web (HU-14). Agregamos el tipo
`proteccion-ninez` para el ICBF, aparte de `proteccion` (Defensoría y Personerías). En
`/directorio` los filtros van en la dirección sin tildes (`?ciudad=bogota&tipo=salud`) y
las tarjetas muestran todos los datos, sin página de detalle; WhatsApp enlaza a
`wa.me/57`. La guía de la ruta descarga todo el directorio una sola vez y muestra junto
a cada paso las entidades nacionales de sus tipos y, si la persona elige su ciudad en
un selector opcional, también las de esa ciudad: la ciudad no se envía, no se guarda y
no va en la dirección. Las rutas del panel de pasos y directorio salen de una fábrica
común (`api/src/api/rutas/adminLista.js`), que T7 puede reutilizar.
```
Lee CLAUDE.md. Tarea T6, rama feat/directorio.

Modelo entidad_directorio (nombre, tipo, ciudad, contacto, fuente, fecha de
verificación, es_profesional, constancia_autorizacion). Regla con prueba: si
es_profesional, no se publica sin constancia (RS-07). Página pública con filtros
por ciudad y tipo, tarjetas accesibles y «Verificado el dd/mm/aaaa».
Administración en el panel. Las 23 entidades verificadas ya están en
api/contenidos/directorio/entidades.yaml (lee api/contenidos/README.md): cárgalas
al arrancar, buscando por id. Las entidades nacionales aparecen con cualquier
ciudad que se elija.
Propón el plan antes de escribir código.
```

### T7 — Recursos y preguntas frecuentes ✅
Hecha. Cambios frente al prompt: `pregunta_frecuente` y `recurso` llevan `slug` (el `id`
del YAML), y el `orden` de las preguntas pasó a ser obligatorio. Las respuestas públicas
de preguntas, recursos y buscador identifican cada elemento por `slug`, sin `_id`. Cada
pregunta tiene un ancla (`/preguntas-frecuentes#slug`) que la abre, y los resultados del
buscador enlazan a ella. Cada recurso tiene un botón que dice qué abre y en qué sitio, con
el dominio del enlace («Descargar PDF (minsalud.gov.co)», «Abrir página oficial
(who.int)»); como los 6 recursos son para familias y docentes, no hay filtro por perfil.
```
Lee CLAUDE.md. Tarea T7, rama feat/recursos-faq.

Página de recursos (descarga o enlace oficial, con fuente y perfil destinatario)
y página de preguntas frecuentes con acordeón accesible (button + aria-expanded),
ambas administrables desde el panel. Las preguntas aparecen en el buscador.
Las 12 preguntas y los 6 recursos ya están en api/contenidos/preguntas/ y
api/contenidos/recursos/ (lee api/contenidos/README.md): cárgalos al arrancar como
T3, buscando por id; los modelos de T2 necesitan ese campo identificador.
«¿A quién debo consultar primero?» es la tarea T7 de la prueba de usabilidad.
Propón el plan antes de escribir código.
```

### T8 — Contacto y privacidad ✅
Hecha. Cambios frente al prompt: la política y «Acerca de» no van a la base: la API
las lee de `api/contenidos/paginas/` al arrancar y las sirve en `/api/paginas/:slug`; un
archivo que dice `COMPLETAR` no se publica. El servidor rechaza cualquier campo además
de correo, mensaje, autorización y versión, y responde 409 si la versión enviada no es
la vigente. Límite de 5 envíos por IP cada 15 minutos y 40 por hora en total, con
`trust proxy` = 2 (variable `SALTOS_PROXY`). La supresión a los 6 meses es un índice TTL
de MongoDB de 180 días, no una tarea programada. La bandeja está en `/admin/mensajes` y
Preguntas frecuentes termina con un enlace al contacto. Decisión registrada en
`docs/decisiones/0006-mensajes-contacto.md`.
```
Lee CLAUDE.md. Tarea T8, rama feat/contacto.

Formulario de contacto con solo correo y mensaje y casilla obligatoria de
autorización de tratamiento de datos que enlaza a /privacidad (RS-02, RS-03);
el servidor rechaza el envío sin autorización y guarda la versión de la política
aceptada. Páginas /privacidad y /acerca-de con los textos de
api/contenidos/paginas/: la política (versión 1.0) trae en su encabezado el texto
de la casilla (textoAutorizacion). Solo falta su fecha de vigencia (COMPLETAR en
vigenteDesde y en «Vigente desde…»): pídela al equipo. No publiques un archivo
que diga COMPLETAR.
Bandeja de mensajes en el panel con opción de eliminar (RF-11) y tarea que
suprime mensajes de más de 6 meses (RS-04), con pruebas. Protección básica
contra abuso (límite de envíos por IP) sin servicios de terceros: según la
política, la IP se usa por poco tiempo y no se guarda con el mensaje.
Propón el plan antes de escribir código.
```

### T9 — Despliegue ✅
Hecha (adelantada para poder revisar T3 en adelante en las vistas previas). Web en
Vercel, API en Render y base en MongoDB Atlas; Vercel reenvía `/api/*` a Render, así
que no hay CORS. Pasos, variables y advertencias en `docs/despliegue.md`.

### T12 — Núcleo del registro conductual ✅
Hecha. Cambios frente al prompt, acordados al aprobar el plan: el seudónimo es un
código de 8 caracteres (XXXX-XXXX) con un alfabeto sin 0, O, 1, I ni L, en lugar del
UUID; CC-09 y CC-10 promedian solo aciertos; RF-14 excluye también las anticipaciones
(tiempo neto menor que `trMinimoMs: 200`, parámetro del catálogo), sin recorte por
desviación estándar; CC-12 lleva `criterioAlcanzado`; se conserva `vistaDeEnsayo`
(CT-03) adaptada a la práctica con retroalimentación. Los códigos de la Fase II que
chocaban con los actuales pasaron a RF-13 (antes RF-20), RF-14 (antes RF-23) y RF-15
(antes RF-24). La tarea se presenta con `titulo` y no con `nombre`, porque `nombre` es
un campo identificable. El motor tampoco procesa una sesión con datos identificables.
```
Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea T12, rama feat/nucleo-registro.

Cambio de alcance: la Fase I es la plataforma informativa (M-01 a M-08) más M-09
Registro conductual estructurado (DCCS y Navon, solo adultos voluntarios en esta
fase). Entrega: 6 de noviembre de 2026.

1. Actualiza CLAUDE.md (descripción, entrega, mapa del código, estado actual, reglas
   de M-09 y «Qué no hacer sin preguntar»).
2. Agrega al backlog M-09, HU-16 a HU-19 y las tareas T12 a T16.
3. Trae de fase-ii a api/src/dominio, adaptado y con sus pruebas: los indicadores de
   las dos tareas (CC-08, CC-09, CC-10 y CC-12) y sus utilidades, sin el campo
   dominio y con CC-09 por ensayo en los bloques mixtos; el catálogo y el
   secuenciador reducidos a las dos tareas y sin tramos de edad; el motor, con salida
   por tarea y constructo, versión inmutable, sesiones incompletas sin procesar y
   avisos obligatorios; el seudónimo y la detección de campos identificables.
4. Conserva como pruebas las restricciones del Cuadro 27 que aplican: sin datos
   identificables, salida sin clasificación ni nombres de dominios del DSM-5-TR,
   práctica y omisiones fuera del cálculo, tiempo de reacción neto, sesiones
   incompletas sin procesar y reproducibilidad por versión.
5. Agrega los códigos a docs/requisitos-fase-i.md.
Sin colecciones, rutas, pantallas ni dependencias nuevas.
Propón el plan antes de escribir código.
```

### T13 — Motor de ensayos, reloj y tarea de cambio de regla
Prompt pendiente (lo escribe el equipo). Alcance: motor de ensayos en el navegador que
genera los estímulos por código a partir del catálogo de T12, mide el tiempo con reloj
monotónico (`performance.now()`, CT-07), descuenta las pausas (RF-13), registra
omisiones, anticipaciones y `claseError` al registrar cada ensayo, y la tarea de
cambio de regla gamificada con instrucciones, práctica con retroalimentación (CP-04),
barra de progreso y sin temporizadores ni marcadores (CT-03, `vistaDeEnsayo`). Textos
revisados con `vocabularioProhibido`.

### T14 — Tarea de Navon
Prompt pendiente. Alcance: figuras jerárquicas generadas por código, 2 ensayos de
práctica y 4 bloques ABBA de 7 ensayos sobre el motor de T13 (CC-10). Si el 23 de
octubre no está estable, se evalúa solo la tarea de cambio de regla.

### T15 — Flujo del profesional, SUS y exportación
Prompt pendiente. Alcance: colecciones del registro (sin datos identificables, índice
único del seudónimo), creación de la sesión con la constancia del consentimiento
(HU-16), vista de valores observados con el aviso de M-09 (HU-18), exportación CSV de
ensayos y valores y eliminación por seudónimo (HU-19), y el cuestionario SUS.

### T16 — Precisión temporal, perfiles simulados y reproducibilidad
Prompt pendiente. Alcance: experimento que mide el error del registro del tiempo de
reacción frente a una referencia (CT-07), perfiles de desempeño simulados que pasan
por el motor y prueba de reproducibilidad por versión (CT-13).

### T10 — Accesibilidad y rendimiento
```
Lee CLAUDE.md. Tarea T10, rama test/accesibilidad.

Auditoría automática con axe-core sobre todas las páginas públicas, del panel y de M-09,
y medición con Lighthouse (perfil móvil). Pide autorización antes de añadir
@axe-core/playwright. Genera docs/evaluacion/accesibilidad.md con violaciones
por severidad y puntajes de Lighthouse por página; corrige las críticas y graves
y vuelve a medir. Metas: 0 críticas o graves, Lighthouse accesibilidad ≥ 90 y
rendimiento ≥ 80. Propón el plan antes de escribir código.
```

### T11 — Casos de aceptación
```
Lee CLAUDE.md. Tarea T11, rama docs/casos-aceptacion.

A partir del Cuadro 12 de docs/requisitos-fase-i.md (HU-01 a HU-19), escribe
docs/evaluacion/casos-aceptacion.md: un caso por historia con pasos, resultado
esperado y columna de resultado obtenido. Donde sea viable, automatízalos con
pruebas de extremo a extremo (pide autorización para Playwright).
Propón el plan antes de escribir código.
```
