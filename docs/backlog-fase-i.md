# Backlog Fase I — Plataforma web TEA

Reemplaza al backlog anterior (el del prototipo gamificado). Entrega del documento: **finales de octubre de 2026**.

## Calendario

| Semana | Fechas | Meta |
|---|---|---|
| 1 | 6 – 12 oct | Repo limpio, base visual, contenidos (M-01, M-02, M-07) y panel con login |
| 2 | 13 – 19 oct | Ruta, directorio, recursos, preguntas, contacto y **despliegue** |
| 3 | 20 – 24 oct | Accesibilidad, rendimiento, casos de aceptación y **prueba con voluntarios** |
| 4 | 25 – 30 oct | Resultados en el documento (lo amarillo) y entrega |

Regla: si una tarea no acerca a la plataforma desplegada al 19 de octubre, no entra.

## Tareas humanas (no las hace Claude Code)

| Tarea | Responsable | Plazo | Bloquea |
|---|---|---|---|
| Textos de S1 a S5 a partir de las fuentes oficiales (MinSalud, OMS, DSM-5-TR), con fuente y fecha | Santiago (Claude puede redactar borradores para revisar) | 10 oct | T3 |
| Lista de 15 a 30 entidades públicas para el directorio (EPS, ICBF, secretarías de salud, líneas oficiales) con fuente | Santiago | 14 oct | T6 |
| Pasos de la ruta por perfil, edad y régimen (según el protocolo de MinSalud) | Santiago | 13 oct | T5 |
| 3 a 5 recursos descargables o enlaces oficiales y 10 preguntas frecuentes | Santiago | 15 oct | T7 |
| Google Form con consentimiento (Anexo A) + SUS + registro de tareas (Anexo B) | Santiago | 18 oct | Semana 3 |
| Conseguir 10 a 15 voluntarios adultos y agendarlos | Ambos | 19 oct | Semana 3 |

## Tareas de desarrollo (una por sesión de Claude Code, en su propia rama)

| # | Rama | Tarea | Módulos / requisitos | Semana |
|---|---|---|---|---|
| T0 ✅ | `chore/reenfoque-plataforma` | Preservar Fase II en la rama `fase-ii` y limpiar `main` | — | 1 |
| T1 ✅ | `feat/base-visual` | Layout, rutas, sistema visual, barra de accesibilidad e inicio | M-01, M-07, RA-01 a RA-11 | 1 |
| T2 ✅ | `feat/api-contenidos` | Modelos y API de contenidos, preguntas y recursos con fuente y fecha obligatorias | RCN-01, RCN-02, RF-10 | 1 |
| T3 | `feat/paginas-contenido` | Páginas S1 a S5, filtro por edad y buscador | M-02, RF-02, RF-03, RCN-03, RCN-04 | 1 |
| T4 | `feat/admin-auth` | Login del administrador y editor de contenidos | M-08, RF-09, RF-10, RS-05 | 1 |
| T5 | `feat/ruta-atencion` | Ruta de atención interactiva | M-03, RF-04, RS-01 | 2 |
| T6 | `feat/directorio` | Directorio con filtros + administración | M-04, RF-05, RS-07 | 2 |
| T7 | `feat/recursos-faq` | Recursos y preguntas frecuentes + administración | M-05, RF-06, RF-07 | 2 |
| T8 | `feat/contacto` | Contacto, privacidad, bandeja y supresión a 6 meses | M-06, RF-08, RF-11, RS-02 a RS-04 | 2 |
| T9 ✅ | `chore/despliegue` | Despliegue en Vercel + Render + MongoDB Atlas (adelantada a la semana 1) | RS-06 | 1 |
| T10 | `test/accesibilidad` | axe-core + Lighthouse + correcciones | RA-01 a RA-11 | 3 |
| T11 | `docs/casos-aceptacion` | Casos de aceptación de HU-01 a HU-15 y su ejecución | C1 | 3 |

Reglas de cada sesión (Claude Code web): sesión nueva desde `main` → pegar el prompt → revisar y aprobar el plan → Claude programa, prueba, hace commit y push **a la rama de la tarea** y abre el Pull Request → revisar CI y vista previa → el otro integrante aprueba → *Squash and merge* → borrar la rama.

Al cerrar cada tarea, marcarla con ✅ en la tabla dentro del mismo PR.

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

### T3 — Páginas de contenido
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

### T4 — Login y panel de administración
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

### T5 — Ruta de atención interactiva
```
Lee CLAUDE.md. Tarea T5, rama feat/ruta-atencion.

Modelo paso_ruta (perfil familia|docente, tramo de edad, régimen
contributivo|subsidiado|sin afiliación, orden, texto, entidad enlazada opcional,
fuente) con su administración en el panel. En web/, asistente de 3 preguntas
(una por pantalla, con «Paso X de 3», Anterior/Siguiente y teclado) que al final
muestra los pasos ordenados y las entidades del directorio. Las respuestas se
procesan en el navegador y NO se envían a la API (RF-04, RS-01): la web descarga
todos los pasos publicados y filtra localmente. Texto visible: «Tus respuestas no
se guardan». Las preguntas nunca indagan por conductas ni síntomas.
Propón el plan antes de escribir código.
```

### T6 — Directorio
```
Lee CLAUDE.md. Tarea T6, rama feat/directorio.

Modelo entidad_directorio (nombre, tipo, ciudad, contacto, fuente, fecha de
verificación, es_profesional, constancia_autorizacion). Regla con prueba: si
es_profesional, no se publica sin constancia (RS-07). Página pública con filtros
por ciudad y tipo, tarjetas accesibles y «Verificado el dd/mm/aaaa».
Administración en el panel. Seed con 3 entidades públicas de ejemplo.
Propón el plan antes de escribir código.
```

### T7 — Recursos y preguntas frecuentes
```
Lee CLAUDE.md. Tarea T7, rama feat/recursos-faq.

Página de recursos (descarga o enlace oficial, con fuente y perfil destinatario)
y página de preguntas frecuentes con acordeón accesible (button + aria-expanded),
ambas administrables desde el panel. Las preguntas aparecen en el buscador.
Propón el plan antes de escribir código.
```

### T8 — Contacto y privacidad
```
Lee CLAUDE.md. Tarea T8, rama feat/contacto.

Formulario de contacto con solo correo y mensaje y casilla obligatoria de
autorización de tratamiento de datos que enlaza a /privacidad (RS-02, RS-03);
el servidor rechaza el envío sin autorización y guarda la versión de la política
aceptada. Páginas /privacidad y /acerca-de con el texto que te paso aparte.
Bandeja de mensajes en el panel con opción de eliminar (RF-11) y tarea que
suprime mensajes de más de 6 meses (RS-04), con pruebas. Protección básica
contra abuso (límite de envíos por IP) sin servicios de terceros.
Propón el plan antes de escribir código.
```

### T9 — Despliegue ✅
Hecha (adelantada para poder revisar T3 en adelante en las vistas previas). Web en
Vercel, API en Render y base en MongoDB Atlas; Vercel reenvía `/api/*` a Render, así
que no hay CORS. Pasos, variables y advertencias en `docs/despliegue.md`.

### T10 — Accesibilidad y rendimiento
```
Lee CLAUDE.md. Tarea T10, rama test/accesibilidad.

Auditoría automática con axe-core sobre todas las páginas públicas y del panel,
y medición con Lighthouse (perfil móvil). Pide autorización antes de añadir
@axe-core/playwright. Genera docs/evaluacion/accesibilidad.md con violaciones
por severidad y puntajes de Lighthouse por página; corrige las críticas y graves
y vuelve a medir. Metas: 0 críticas o graves, Lighthouse accesibilidad ≥ 90 y
rendimiento ≥ 80. Propón el plan antes de escribir código.
```

### T11 — Casos de aceptación
```
Lee CLAUDE.md. Tarea T11, rama docs/casos-aceptacion.

A partir del Cuadro 12 de docs/requisitos-fase-i.md (HU-01 a HU-15), escribe
docs/evaluacion/casos-aceptacion.md: un caso por historia con pasos, resultado
esperado y columna de resultado obtenido. Donde sea viable, automatízalos con
pruebas de extremo a extremo (pide autorización para Playwright).
Propón el plan antes de escribir código.
```
