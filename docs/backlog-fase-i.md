# Backlog Fase I — Plataforma web TEA

Reemplaza al backlog anterior (el del prototipo gamificado). Entrega del documento: **6 de noviembre de 2026**.

Cambio de alcance (propuesta de la asesora, 13 de octubre): la Fase I es la plataforma
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
| 3 | 20 – 26 oct | M-09: T13 (20 oct), T14 (21 oct), T15 (23 oct) y T16 (24 oct); T10 y T11 (25 oct); T17, análisis de la evaluación con adultos; **versión congelada el 26 oct** |
| 4 | 27 oct – 6 nov | Prueba con voluntarios adultos sobre la versión congelada (solo con el aval escrito del comité de ética), resultados en el documento (lo amarillo) y **entrega el 6 de noviembre** |

Reglas:
- Si una tarea no acerca a la plataforma desplegada al 19 de octubre, no entra.
- Después del 26 de octubre solo entran correcciones sobre la versión congelada.
- Línea de corte de M-09: si la tarea de Navon no está estable el 23 de octubre, se
  evalúa solo la de cambio de regla.
- La prueba con voluntarios de la semana 4 empieza solo con el aval escrito del comité
  de ética.

## Tareas humanas (no las hace Claude Code)

| Tarea | Responsable | Plazo | Bloquea |
|---|---|---|---|
| ✅ Textos de S1 a S5 a partir de las fuentes oficiales (MinSalud, OMS, DSM-5-TR), con fuente y fecha | Hechos (`api/contenidos/`); Santiago los revisa | 10 oct | T3 |
| ✅ Lista de 15 a 30 entidades públicas para el directorio con fuente | Hecha: 23 verificadas (`api/contenidos/directorio/`); Santiago las revisa | 14 oct | T6 |
| ✅ Pasos de la ruta por perfil, edad y régimen (según el protocolo de MinSalud) | Hechos: 18 pasos (`api/contenidos/ruta/`); Santiago los revisa | 13 oct | T5 |
| ✅ 3 a 5 recursos descargables o enlaces oficiales y 10 preguntas frecuentes | Hechos: 6 recursos y 12 preguntas (`api/contenidos/recursos/` y `preguntas/`); Santiago los revisa | 15 oct | T7 |
| ✅ Poner la fecha de vigencia de la política (`COMPLETAR` en `api/contenidos/paginas/privacidad.md`); los datos del responsable ya están | Hecha: vigente desde el 7 de octubre de 2026; si T8 se fusiona otro día, se cambia antes de fusionar | Antes de fusionar T8 | T8 |
| Consentimiento escrito (Anexo A), impreso y en el formato del comité de ética, con su versión (la que el profesional marca al crear la sesión). El SUS y el registro de las tareas ya están en M-09 (T15) | Santiago | Antes del 26 oct | Prueba con voluntarios (semana 4) |
| Lista de 15 a 20 adultos interesados. Las sesiones se agendan solo con el aval escrito del comité de ética | Ambos | 23 oct (agendar: con el aval) | Prueba con voluntarios (semana 4) |
| Al terminar la prueba: cada profesional exporta los dos CSV de su propia cuenta (la cuenta de prueba del equipo no se exporta), correr el análisis de T17 con un `--par` por cuenta y pasar `resumen.md` al documento (pasos en `docs/evaluacion/analisis-adultos.md`) | Ambos | Antes del 6 nov | Resultados de la capa 2 en el documento |
| Repetir las tareas T1 a T8 del Cuadro B.1 en el sitio desplegado (Vercel) y anotar el resultado en `docs/evaluacion/casos-aceptacion.md`: los casos automáticos de T11 corren sobre el build local, con la API y MongoDB en memoria, y el Cuadro 19 pide ejecutarlos en el entorno desplegado | Ambos | Sobre la versión congelada (26 oct) | Cuadro 19 del documento |

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
| T13 ✅ | `feat/motor-tareas` | Motor de ensayos, reloj y tarea de cambio de regla gamificada | M-09, HU-17, CT-03, CT-07, CP-01, CP-04, RF-13, RF-14 | 3 (20 oct) |
| T14 ✅ | `feat/tarea-navon` | Tarea de Navon | M-09, HU-17, CC-10, CP-01, CP-04 | 3 (21 oct) |
| T15 ✅ | `feat/flujo-profesional` | Flujo del profesional, SUS y exportación | M-09, HU-16, HU-18, HU-19, CT-11, CT-13, RF-15 | 3 (23 oct) |
| T16 ✅ | `test/precision-temporal` | Experimento de precisión temporal, perfiles simulados y reproducibilidad | M-09, CT-07, CT-13 | 3 (24 oct) |
| T10 ✅ | `test/accesibilidad` | axe-core + Lighthouse + correcciones, también en las pantallas de M-09 | RA-01 a RA-11 | 3 (25 oct) |
| T11 ✅ | `docs/casos-aceptacion` | Casos de aceptación de HU-01 a HU-19 y su ejecución | C1 | 3 (25 oct) |
| T17 ✅ | `feat/analisis-evaluacion` | Análisis de la evaluación con adultos (capa 2): `entregada` y `duracionMin` en valores.csv y programa que resume los dos CSV en agregados | M-09, HU-19, CC-09, CC-10, CT-08, CT-13, RF-14, RF-15 | 3 |

Reglas de cada sesión (Claude Code web): sesión nueva desde `main` → pegar el prompt → revisar y aprobar el plan → Claude programa, prueba, hace commit y push **a la rama de la tarea** y abre el Pull Request → revisar CI y vista previa → el otro integrante aprueba → *Squash and merge* → borrar la rama.

Al cerrar cada tarea, marcarla con ✅ en la tabla dentro del mismo PR.

## Pendientes detectados

| Detectado en | Pendiente | Módulos / requisitos |
|---|---|---|
| T17 | El documento debe reflejar el método de la capa 2 (`docs/evaluacion/analisis-adultos.md`): CC-09 y CC-10 se toman del resultado guardado de cada sesión completa; las mitades de H4 se cuentan en el orden de presentación después de los filtros de RF-14; la eficacia cumple si al menos el 85 % de las sesiones entregadas se completaron en 20 minutos o menos (las creadas que nunca se entregaron no cuentan; una incompleta y una completa de más de 20 minutos cuentan igual en contra) y se informan creadas, entregadas y completas, con la mediana, el máximo y cuántas completas pasan de 20 minutos; la duración va de la entrega del dispositivo a la llegada de las dos tareas, sin el SUS; con varias cuentas, cada profesional exporta su par de CSV y el programa los une. En los criterios de HU-19, valores.csv suma `entregada` y `duracionMin`. | M-09, HU-19, CC-09, CC-10, CT-08, RF-14, RF-15 |
| T11 | El documento debe reflejar los casos de aceptación (`docs/evaluacion/casos-aceptacion.md`): los 19 casos cumplen en lo automático y ninguno dio «No cumple». El Cuadro 19 dice «las quince historias de usuario»: son 19. Quedan tres partes para revisión manual: la redacción de S1 (HU-01, RCN-06), el orden visual del foco y el teclado en el panel y en la zona del profesional (HU-11, con la revisión manual de T10) y la duración real y la aplicación sin ayuda con los voluntarios (HU-17, CT-08). Anotar en ese documento el resultado de cada una. | HU-01 a HU-19, RCN-06, RA-03, RA-11, CT-08 |
| T10 | Hacer la revisión manual de `docs/evaluacion/accesibilidad.md` («Lo que no se revisa automáticamente») sobre la vista previa de Vercel: NVDA, TalkBack y VoiceOver, zoom al 200 % con «Letra muy grande», solo teclado y reducir movimiento; anotar el resultado en ese documento. Agregar al protocolo de aplicación de M-09 la pregunta por la visión de color y la revisión de que el dispositivo no tenga filtros de color ni escala de grises (el rojo y el azul de la tarea de cambio de regla tienen casi la misma luminancia). El documento debe reflejar los límites de tiempo de WCAG 2.2.1: los 5 s por ensayo son la excepción «esencial» (no hay temporizadores visibles, CT-03); el panel y la zona del profesional avisan 2 minutos antes del cierre por inactividad con «Seguir conectado»; el tope de 8 horas y las 2 horas de la aplicación son límites de seguridad. | M-08, M-09, RA-01 a RA-11, CT-03 |
| T16 | El documento debe reflejar el resultado de la corrida completa 39153850094 (`docs/evaluacion/precision.md`): con el reloj de la aplicación y sin carga, el 100 % de los ensayos con error de 50 ms o menos en los tres motores; las dos celdas de Firefox con el hilo ocupado se leen con la cota superior (¹). Además, el método de CT-07: se mide el error del software frente a una aparición y una pulsación de referencia medidas en el navegador, no la latencia del teclado ni de la pantalla, y una latencia constante se cancela en CC-09 y CC-10. También, que los 6 perfiles simulados recuperan sus parámetros con ±1 ms y que la misma entrada da la misma salida al pasar por la API (CT-13). | M-09, CT-07, CT-13 |
| T15 | El documento debe reflejar lo que cambió con T15. En el Cuadro 13 entran `sesion_registro` (seudónimo, constancia del consentimiento con la versión del formato y la mayoría de edad, estado, versiones del catálogo y del algoritmo, semilla, reloj, navegador, contexto, resultado y SUS) y `ensayo_registro` (un documento por ensayo), y `administrador` lleva el rol (`administrador` o `profesional`). Los criterios de HU-16 suman la mayoría de edad y la versión del formato; los de HU-19, los dos CSV (ensayos; valores y SUS). La sesión se aplica en el mismo dispositivo en las 2 horas siguientes a su creación; al entregarlo se cierra la sesión del profesional; una recarga a mitad de una tarea deja la sesión interrumpida y sin procesar (RF-15). El SUS usa una traducción de trabajo: reemplazarla por la validada de Sevilla-González y colaboradores (2020) en `api/contenidos/registro/sus.yaml` antes de la prueba con voluntarios, y crear en Render la cuenta del profesional (`docs/despliegue.md`). | M-09, HU-16, HU-18, HU-19, CT-11, CT-13, RF-15 |
| T14 | El documento debe reflejar cómo se aplica la tarea de Navon con T14. La práctica tiene un ensayo de cada nivel y los dos son incongruentes (en uno congruente se acierta mirando cualquier nivel). Cada bloque tiene 3 y 4 ensayos congruentes e incongruentes y la letra correcta repartida 4 y 3; cada nivel queda con 7 congruentes, 7 incongruentes, 7 H y 7 S. El cartel tiene un tamaño fijo en píxeles. Un error en Navon es siempre `aleatoria` y una omisión no tiene clase de error. En la sesión, las dos tareas van seguidas (cambio de regla, pausa, Navon) (`docs/decisiones/0009-tarea-navon.md`). | M-09, CC-10, CP-04, RF-14, HU-17 |
| T13 | El documento debe reflejar lo que cambió con T13. El catálogo pasa a la versión 1.1.0, con el límite de respuesta de 5 s (después, el ensayo queda omitido), 500 ms entre ensayos y 3 cambios y 3 repeticiones por bloque mixto. Con dos cajas y estímulos siempre en conflicto, todo error del bloque de forma es perseverativo, así que CC-08 equivale a la proporción de errores de ese bloque. La práctica usa solo la regla de color y cada cambio de regla tiene su pantalla de instrucciones. Una omisión no tiene clase de error. La señal y el estímulo aparecen juntos y el tiempo de reacción se mide desde esa aparición (`docs/decisiones/0008-motor-ensayos.md`). | M-09, CC-08, CT-07, RF-14, HU-17 |
| T12 | El documento 2.3 debe reflejar lo que cambió con T12. CC-09 pasa a la definición por ensayo (cambio menos repetición, solo en los bloques mixtos y solo con aciertos), CC-10 se llama «Diferencia global-local» y CC-12 informa si el criterio no se alcanzó. RF-14 suma las anticipaciones (tiempo neto menor de 200 ms) y no hay recorte por desviación estándar. Los criterios de aceptación de HU-16 a HU-19 en `docs/requisitos-fase-i.md` son una propuesta del equipo de desarrollo: revisarlos contra el documento. CT-08 se comprueba con una duración estimada (4 s por ensayo); la real se mide con los voluntarios (T16 no la mide: necesita personas). | M-09, CC-09, CC-10, CC-12, RF-14, CT-08 |
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

### T13 — Motor de ensayos, reloj y tarea de cambio de regla ✅
Hecha. Cambios frente al prompt, acordados al aprobar el plan: el catálogo pasa a la
versión 1.1.0 con `limiteRespuestaMs`, `intervaloEntreEnsayosMs` y `cambios` (la web no
inventa parámetros de medición); `vistaDeEnsayo` tiene una copia mínima en
`web/src/registro/vista.js`, con una prueba que la compara con la de `api/`; el error en
el primer ensayo de un bloque mixto queda como `aleatoria` y una omisión no tiene clase
de error. Ajustes del equipo: una pantalla de instrucciones antes del bloque de forma y
otra antes del primer bloque mixto; figuras rojas y azules que el alto contraste no
cambia; los dos estímulos balanceados también en los bloques mixtos; la señal aparece
con el estímulo y el tiempo se mide desde esa aparición. La práctica usa solo la regla
de color. Hecha en la rama `claude/motor-ensayos-dccs-2ki0ju` (la que asignó el entorno
de Claude Code). Decisión en `docs/decisiones/0008-motor-ensayos.md`.
```
Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea T13, rama feat/motor-tareas.

Construye en web/ el motor de ensayos de M-09 y la tarea de cambio de regla
(DCCS), sobre el núcleo de T12 (api/src/dominio/registro/).

Fuente única: el catálogo y el secuenciador viven en la API y la web no los
copia. Propón cómo los obtiene la web (por ejemplo, GET /api/registro/plan, de
solo lectura, que devuelve planificarSesion() sin datos de nadie).

Medición del tiempo (CT-07):
- La aparición del estímulo se marca con el tiempo del requestAnimationFrame
  en que se dibuja (performance.now()); la respuesta, con event.timeStamp del
  keydown o pointerdown. Tiempo de reacción = respuesta menos aparición, en ms
  con decimales. Cuenta la primera respuesta (rectificaciones = 0).
- La estrategia vive en web/src/registro/reloj.js, con dos variantes
  intercambiables por configuración: la anterior y una de referencia con
  setTimeout y Date.now(). T16 compara las dos.
- Si la pestaña se oculta durante un ensayo (visibilitychange), ese tiempo va
  a pausasDuranteItemMs (RF-13).
- Teclas F y J, o dos botones grandes en pantallas táctiles; se registra el
  tipo de entrada. Sin animaciones ni sonidos durante el ensayo.
- Sin respuesta en 5 s: estadoItem 'omitido' y tiempoReaccionMs null.

Tarea de cambio de regla:
- Estímulos generados por código (SVG): 2 colores y 2 formas. Las dos cajas
  objetivo cruzan color y forma (por ejemplo, conejo rojo y barco azul) y los
  estímulos de prueba siempre están en conflicto (conejo azul, barco rojo): con
  una regla van a una caja y con la otra, a la otra.
- En los bloques mixtos la señal de cada ensayo es «COLOR» o «FORMA» con un
  ícono. Después del primer ensayo de cada bloque van 3 cambios y 3
  repeticiones, en orden seudoaleatorio con semilla registrada (sin
  dependencias).
- Cada ensayo sale con la forma que documenta indicadores.js (tarea, bloque,
  fase, regla, condicion, practica, estadoItem, acierto, claseError,
  tiempoReaccionMs, pausasDuranteItemMs, rectificaciones), más número,
  estímulo, respuesta, aparición, semilla y tipo de entrada. El tipo de ensayo
  (cambio o repetición) lo calcula el dominio, no la web.
- claseError: 'correcta' si acierta; 'perseverativa' si la respuesta habría
  sido correcta con la regla anterior (en el bloque de forma, la de color; en
  los mixtos, la del ensayo anterior); 'aleatoria' en otro caso.
- Dinámicas gamificadas que no alteran la medición: marco narrativo («El
  taller que cambia»), barra de progreso por bloques, mensaje de ánimo al final
  de cada bloque y retroalimentación de acierto solo en la práctica. Nada de
  puntos, vidas, rankings ni temporizadores visibles: la interfaz aplica la
  regla de vistaDeEnsayo (CT-03), con prueba. Cada dinámica declara en un
  comentario el principio neuroeducativo que aplica.
- Una prueba pasa los textos de la tarea por buscarVocabularioProhibido.

La sesión es local: no se guarda en la API. La tarea se abre en
/registro/prueba (no enlazada, noindex) y al terminar muestra los ensayos en
una tabla con «Descargar JSON». El flujo del profesional y el guardado son de
T15.

Pruebas: con semilla fija el generador produce la estructura del catálogo y
3 cambios y 3 repeticiones por bloque mixto; todo estímulo de prueba está en
conflicto; el reloj es inyectable y el tiempo de reacción se prueba sin
navegador; una prueba en api/ procesa con procesarSesion una sesión con el
formato de la web y obtiene CC-08, CC-09 y CC-12.

Propón el plan antes de escribir código.
```

### T14 — Tarea de Navon ✅
Hecha. Decisiones acordadas al aprobar el plan: la práctica tiene dos ensayos
incongruentes con letras correctas distintas; entre los dos bloques de cada nivel se
alterna el congruente de más y la letra de más, para que cada nivel quede con 7 y 7; una
omisión no tiene clase de error, como en T13; `respuesta` guarda la letra; los ensayos de
cambio de regla no cambian. `?tarea=cambio-regla` también abre solo esa tarea. Única
prueba de T13 que se ajustó: el nombre del archivo descargado, que ahora puede traer las
dos tareas. Hecha en la rama `claude/lucid-cannon-4ksg3y` (la que asignó el entorno de
Claude Code). Decisión en `docs/decisiones/0009-tarea-navon.md`.
```
Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea T14, rama feat/tarea-navon.

Agrega la tarea de figuras jerárquicas (Navon) sobre el motor de T13, sin
cambiar el reloj ni motorEnsayo.js. Usa la secuencia 'navon' del plan
(GET /api/registro/plan): 2 ensayos de práctica y los 4 bloques del catálogo
en su orden (global, local, local, global), 7 ensayos por bloque, con
limiteRespuestaMs e intervaloEntreEnsayosMs del plan.

- Figuras generadas por código (SVG): una letra grande, H o S, formada por
  letras pequeñas H o S. Congruentes (H de H, S de S) e incongruentes (H de S,
  S de H): 3 y 4 en cada bloque, barajadas con la semilla, y la letra correcta
  repartida lo más parejo posible. El tamaño de la figura es fijo en píxeles:
  no cambia con el tamaño de letra de la barra de accesibilidad.
- Respuesta: F = H y J = S, con dos botones grandes que muestran la letra y la
  tecla. La respuesta correcta es la letra del nivel que pide el bloque.
- Antes de cada bloque, una pantalla de instrucciones: «Mira la letra grande»
  o «Mira las letras pequeñas», con un ejemplo dibujado. La práctica tiene un
  ensayo de cada nivel, con retroalimentación (CP-04).
- La figura aparece después de la cruz de fijación y queda visible hasta la
  respuesta o el límite. Durante el ensayo, arriba, un recordatorio fijo del
  nivel del bloque («GRANDE» o «PEQUEÑAS»).
- Cada ensayo guarda condicion ('global' | 'local') y congruencia
  ('congruente' | 'incongruente'), además de los campos de T13. claseError:
  'correcta' si acierta y 'aleatoria' si no (en Navon no hay regla anterior).
- Generaliza lo que haga falta de PantallaEnsayo.jsx para que las dos tareas
  compartan la pantalla, sin cambiar la medición de T13 (sus pruebas siguen
  pasando).
- Las mismas dinámicas gamificadas de T13, con su propio marco narrativo y
  sus textos en textos.js (pasan por buscarVocabularioProhibido).

En /registro/prueba la sesión hace las dos tareas seguidas (cambio de regla,
pausa, Navon) y descarga un solo JSON. Con ?tarea=navon se abre solo Navon,
para revisar.

Pruebas: con semilla fija, el generador produce la estructura del plan y el
balance de congruencia; los aciertos se clasifican según el nivel del bloque;
una prueba en api/ procesa con procesarSesion una sesión simulada de las dos
tareas y obtiene CC-08, CC-09, CC-10 y CC-12.

Propón el plan antes de escribir código.
```

### T15 — Flujo del profesional, SUS y exportación ✅
Hecha. Decisiones acordadas al aprobar el plan: la cuenta del profesional se crea al
arrancar con `PROFESIONAL_USUARIO` y `PROFESIONAL_CLAVE` (`docs/despliegue.md`) y los roles
no se mezclan (`exigirRol`, 403); la zona del profesional va en `/registro` y no en
`/admin`, porque el encabezado del panel nombra la plataforma. Para que el participante no
vea otras sesiones, la entrega del dispositivo cierra la sesión del profesional en ese
navegador y deja una cookie que solo sirve para aplicar esa sesión, hasta 2 horas después
de creada. La sesión queda completa cuando llegan las dos tareas (el SUS no hace falta
para procesarla); una recarga a mitad de una tarea la deja interrumpida; si no se
completa en 2 horas, queda sin completar. El resultado de `procesarSesion` se guarda al
completarse, con su versión del algoritmo (CT-13). CSV con coma, punto decimal y UTF-8.
No se trajo nada de `fase-ii`. Hecha en la rama `claude/jolly-ptolemy-h6pz0r` (la que
asignó el entorno de Claude Code; corresponde a `feat/flujo-profesional`). Decisión en
`docs/decisiones/0010-flujo-profesional.md`.
```
Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea T15, rama feat/flujo-profesional.

Flujo del profesional de M-09 de punta a punta (HU-16 a HU-19), sobre las dos
tareas de T13 y T14. /registro/prueba se queda como está: la usa T16.

1. Acceso: el profesional entra con una cuenta del panel con rol
   «profesional» (reutiliza la autenticación de T4; sin registro público).
   Propón cómo se crea la cuenta y cómo se protegen las rutas nuevas de la API.
2. Nueva sesión: el profesional marca que el adulto firmó el consentimiento en
   papel (con la versión del formato) y que es mayor de edad; sin las dos
   marcas la sesión no se crea (prueba). La API genera el seudónimo de T12, con
   índice único, y la web lo muestra en grande para copiarlo en la copia del
   consentimiento que se lleva el participante.
3. El participante hace en el mismo dispositivo las dos tareas y al final el
   SUS de 10 ítems (texto abajo, en api/contenidos/registro/sus.yaml para poder
   cambiarlo). El reloj es siempre 'animacion' (sin ?reloj=) y queda guardado
   en la sesión. Los ensayos se envían al terminar cada tarea; si el envío
   falla, la web reintenta sin perder lo registrado. Al final el participante
   solo ve «Gracias»: ningún valor (no hay resultados individuales). Durante la
   aplicación la pantalla no tiene enlaces al panel; propón cómo evitar que el
   participante vea otras sesiones.
4. Nada identificable: los esquemas rechazan campos extra (strict: 'throw'),
   contieneDatoIdentificable se aplica al guardar y del navegador solo se
   guardan la familia y la versión mayor (por ejemplo, «Firefox 131»), nunca la
   cadena completa.
5. El profesional ve sus sesiones por seudónimo, con su estado, y en cada
   sesión completa los valores de procesarSesion por tarea, con el aviso de
   M-09. Las incompletas se guardan pero no se procesan (RF-15). Prueba: ni la
   vista ni la API tienen vocabulario prohibido.
6. Exporta dos CSV (ensayos; valores y SUS) con seudónimo, versión del
   algoritmo y del catálogo, reloj y navegador, y elimina una sesión por su
   seudónimo (normalizarSeudonimo) con todos sus ensayos (Ley 1581).
7. SUS: escala de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo). El
   valor es la suma de (respuesta − 1) en los ítems impares y (5 − respuesta)
   en los pares, multiplicada por 2,5. Valora la herramienta, no a la persona:
   se guarda como valorSUS, sin la palabra «puntaje».
Cada colección nueva va a COLECCIONES.

Ítems del SUS (traducción de trabajo; se reemplazará por la versión validada
de Sevilla-González y colaboradores, 2020): los 10 de
api/contenidos/registro/sus.yaml.

Propón el plan antes de escribir código.
```

### T16 — Precisión temporal, perfiles simulados y reproducibilidad ✅
Hecha. Decisiones acordadas al aprobar el plan: `@playwright/test` 1.64.1 en `web/`; el
arnés se inyecta en la página y no cambia la web; la aparición de referencia es el final
del fotograma que dibuja el estímulo (no la marca de `requestAnimationFrame`, que en
Chromium queda antes de la inserción) y la pulsación de referencia, el `event.timeStamp`
del `keydown` en captura; se informan el error (con la latencia del arnés separada) y la
cota superior, y una celda con carga en la que el desvío del arnés (P95) sube más de 10 ms
frente a la normal se lee con la cota superior; 3 sesiones de las dos tareas por celda (222 ensayos). Perfiles con ruido
centrado por grupo, para que las medias sean exactas, y errores al comienzo del bloque de
forma. La duración real de la sesión (CT-08) queda para la prueba con voluntarios. No se
trajo nada de `fase-ii`. Hecha en la rama `claude/confident-goldberg-sbozcu` (la que asignó
el entorno de Claude Code; corresponde a `test/precision-temporal`). Decisión en
`docs/decisiones/0011-precision-temporal.md`.
```
Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea T16, rama test/precision-temporal.

Capa 1 de la evaluación de M-09, sin participantes: un experimento de
precisión temporal, perfiles simulados y reproducibilidad. Autorizo
@playwright/test (dependencia de desarrollo) y un flujo nuevo de GitHub
Actions que solo se ejecuta a mano (workflow_dispatch). En esta sesión solo
hay Chromium y no se pueden descargar Firefox ni WebKit: el experimento
completo corre en Actions, que instala los tres navegadores.

1. Experimento de precisión (CT-07). Playwright recorre /registro/prueba
   (con ?semilla=, ?reloj= y ?tarea=) sobre un build local de la web y la API
   local (basta el plan), y responde con el teclado a latencias programadas
   (300, 500 y 800 ms después de la aparición). Por ensayo se guardan la
   latencia programada, el tiempo de reacción registrado y el error. Explica
   en el plan cómo detecta el arnés la aparición y cómo separa su propia
   latencia; si no se puede separar, el resultado se reporta como cota
   superior del error.
2. Diseño, con al menos 200 ensayos medidos por celda:
   - motor: Chromium, Firefox y WebKit;
   - reloj: 'animacion' y 'referencia';
   - carga: normal, e hilo principal ocupado (tareas largas de 30 a 100 ms
     inyectadas en la página en momentos aleatorios con semilla), que funciona
     en los tres motores. En Chromium, además, CPU ralentizada ×4 por CDP.
3. Salida: CSV por celda como artefacto del flujo, un script que los resume
   (media y desviación del error, percentil 95 del error absoluto y porcentaje
   de ensayos con error ≤ 50 ms, por celda) y docs/evaluacion/precision.md con
   la tabla y el método. Aclara que se mide el error del software y no la
   latencia del teclado ni de la pantalla, y que una latencia constante se
   cancela en los indicadores, que son diferencias.
4. Perfiles simulados: 6 perfiles con parámetros conocidos (tiempo medio,
   costo de cambio, diferencia global-local, tasa de error y de omisión),
   generados con semilla en el formato de la web. procesarSesion debe
   recuperar los valores con tolerancia de ±1 ms y distinguir perfiles con
   parámetros distintos.
5. Reproducibilidad (CT-13): misma entrada y misma versión dan la misma
   salida, también al pasar por la API de T15 (sesión guardada y vuelta a
   procesar).
Los perfiles y la reproducibilidad corren en el CI normal; el experimento de
precisión no, solo en el flujo manual. Antes de terminar, corre en esta
sesión una versión corta del experimento solo con Chromium para comprobar que
el arnés funciona.

Propón el plan antes de escribir código.
```

### T10 — Accesibilidad y rendimiento ✅
```
Lee CLAUDE.md. Tarea T10, rama test/accesibilidad.

Auditoría automática con axe-core sobre todas las páginas públicas, del panel y de M-09,
y medición con Lighthouse (perfil móvil). Pide autorización antes de añadir
@axe-core/playwright. Genera docs/evaluacion/accesibilidad.md con violaciones
por severidad y puntajes de Lighthouse por página; corrige las críticas y graves
y vuelve a medir. Metas: 0 críticas o graves, Lighthouse accesibilidad ≥ 90 y
rendimiento ≥ 80. Propón el plan antes de escribir código.
```

### T11 — Casos de aceptación ✅
```
Lee CLAUDE.md. Tarea T11, rama docs/casos-aceptacion.

A partir del Cuadro 12 de docs/requisitos-fase-i.md (HU-01 a HU-19), escribe
docs/evaluacion/casos-aceptacion.md: un caso por historia con pasos, resultado
esperado y columna de resultado obtenido. Donde sea viable, automatízalos con
pruebas de extremo a extremo (pide autorización para Playwright).
Propón el plan antes de escribir código.
```

### T17 — Análisis de la evaluación con adultos ✅
Hecha. Decisiones acordadas al aprobar el plan: la proporción de sesiones completas va sobre
las **entregadas**, no sobre las creadas, y valores.csv suma `entregada` (true o false) junto a
`duracionMin`; el resumen informa creadas, entregadas y completas. Ajustes de la revisión: la
eficacia cumple si al menos el 85 % de las entregadas se completaron en 20 minutos o menos
(con la mediana, el máximo y cuántas completas pasan de 20, sin criterio aparte), y el
programa acepta un par de CSV por cuenta de profesional (`--par`; un seudónimo en dos pares
se rechaza con código 1). En el código y en los
`describe` solo van códigos oficiales (M-09, CC-09, CC-10, CT-08, CT-13, RF-14, RF-15, HU-19):
H3 a H5 y el Cuadro 31 se nombran solo en `resumen.md` y en
`docs/evaluacion/analisis-adultos.md`. Las mitades se cuentan en el orden de presentación
después de los filtros de RF-14 (mitades parejas). El cuantil de la t se calcula, sin tabla.
La duración va de la última entrega del dispositivo a la llegada de las dos tareas, sin el
SUS. El SUS de los
profesionales se aplica en papel y no entra. Hecha en la rama `claude/stoic-planck-lsa33f` (la
que asignó el entorno de Claude Code; corresponde a `feat/analisis-evaluacion`). Método y
lectura de los criterios en `docs/evaluacion/analisis-adultos.md`.
```
Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea nueva T17, rama feat/analisis-evaluacion:
análisis de la evaluación con adultos (M-09, OE4; Cuadro 31 del documento 2.3). Agrégala
al backlog en el mismo PR y actualiza las tareas humanas que cambiaron: el Google Form y
los 10 a 15 voluntarios pasan a consentimiento escrito y 15 a 20 adultos.

Objetivo: un programa reproducible que lea los dos CSV que exporta el profesional
(ensayos.csv y valores.csv) y produzca las cifras de la capa 2, solo como agregados.

1. valores.csv: agregar duracionMin (de entregadaEn a completadaEn; vacío si la sesión
   no se completó). Actualiza la prueba de HU-19 y la decisión 0010.
2. api/scripts/analisisEvaluacion.js (Node, sin dependencias nuevas), que reciba las
   rutas de los dos CSV y escriba resumen.md y resumen.json con:
   - H3: CC-09 y CC-10 por participante; media, DE, n e IC 95 % con t de Student.
     Dirección esperada: CC-09 > 0 y CC-10 < 0.
   - H4: consistencia por mitades. Con ensayos.csv y los mismos filtros de RF-14 (sin
     práctica, omisiones ni anticipaciones; solo aciertos), tiempo medio de ensayos
     pares e impares por participante y condición (cambio y repetición en los bloques
     mixtos, con clasificarEnsayosMixtos del dominio; global y local en Navon).
     Correlación de Pearson entre mitades y corrección de Spearman-Brown, 2r/(1+r).
     Reportar también la de CC-09 y CC-10, marcada como exploratoria.
   - H5: SUS de los participantes (media, DE, IC 95 %); proporción de sesiones
     completas sobre las creadas; duración (mediana, máximo y cuántas en 20 minutos o
     menos).
   - Nada por seudónimo en el resumen: solo agregados y n.
3. Pruebas Jest con los 6 perfiles de api/test/ayudas/perfilesSimulados.json pasados por
   la exportación: el script recupera las medias conocidas, el IC excluye 0 cuando el
   efecto simulado es grande y la fórmula de Spearman-Brown se verifica con un caso
   calculado a mano. Una sesión incompleta no entra a H3 ni a H4, pero sí cuenta en el
   total de sesiones creadas.
4. Documentar el uso en docs/evaluacion/analisis-adultos.md: comandos, fórmulas y la
   lectura de cada criterio del Cuadro 31.

Propón el plan antes de escribir código.
```
