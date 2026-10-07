# CLAUDE.md — Plataforma TEA (Fase I)

Plataforma web de **información y orientación** sobre el trastorno del espectro autista
(TEA) para **familias y docentes** de niños, niñas y adolescentes de 4 a 17 años en
Colombia. Trabajo de grado de Ingeniería de Sistemas y Computación, Universidad Católica
de Colombia. Equipo de 2 personas. Entrega del documento: finales de octubre de 2026.

**La plataforma NO diagnostica ni hace tamizaje.** Informa, orienta sobre la ruta de
atención y muestra a dónde acudir. Los minijuegos, el motor de puntuación, el
consentimiento parental y el asentimiento son de la **Fase II** y viven solo en la rama
`fase-ii`: no se tocan ni se traen a `main`.

## Stack

- `web/`: React + Vite (SPA responsiva). Despliegue en Vercel.
- `api/`: Node.js 22.9+ con Express y Mongoose. MongoDB Atlas. Despliegue en Render.
- La web llama siempre a `/api/...` con rutas relativas: Vercel las reenvía a Render
  (`web/vercel.json`) y Vite a `localhost:3000`. Sin CORS ni URL de la API en
  variables. Detalles en `docs/despliegue.md`.
- Pruebas: Jest + supertest + mongodb-memory-server. Cobertura mínima 70 % (CI).
  La lógica pura de `web/` (por ejemplo, el filtro de la ruta) se prueba con el
  ejecutor de Node (`node --test`, archivos `web/src/**/*.test.js`), sin dependencias.
- Monorepo con workspaces de npm.

## Módulos (códigos del documento de tesis)

- M-01 Inicio y navegación (buscador, aviso de no diagnóstico)
- M-02 Contenidos: S1 Qué es el TEA, S2 Señales de alerta por edad (4-7, 8-12, 13-17),
  S3 Mitos y realidades, S4 Ruta de atención, S5 Derechos
- M-03 Ruta de atención interactiva (3 preguntas: quién consulta, tramo de edad,
  régimen de afiliación)
- M-04 Directorio de orientación (filtros por ciudad y tipo de entidad)
- M-05 Recursos descargables y preguntas frecuentes
- M-06 Contacto y privacidad
- M-07 Barra de ajustes de accesibilidad (tamaño de letra, alto contraste, reducir
  movimiento)
- M-08 Panel de administración (autenticado)

## Reglas de dominio (no negociables; cada una tiene una prueba)

Si una tarea parece exigir romper una, detente y pregunta.

1. **RCN-01/02** — Todo contenido, pregunta frecuente, recurso, paso de la ruta y entidad
   del directorio tiene **fuente** y **fecha de revisión**. El servidor rechaza publicar
   sin ellas.
2. **RCN-03** — Aviso visible «Esta información no constituye diagnóstico ni sustituye la
   valoración profesional» en inicio, señales de alerta y ruta de atención.
3. **RCN-04** — Las señales de alerta son **motivos de consulta**: nunca una lista que se
   pueda sumar, un puntaje, una banda de riesgo ni un resultado.
4. **RF-04 / RS-01** — La ruta interactiva se resuelve **en el navegador**; las
   respuestas no se envían ni se guardan.
5. **RS-01** — La zona pública **no pide registro**, no usa cookies de seguimiento,
   analítica de terceros ni recursos de CDN externos (fuentes tipográficas
   autoalojadas).
6. **RS-02/03** — El formulario de contacto pide solo correo y mensaje, y no se envía
   sin la casilla de autorización de tratamiento de datos (Ley 1581 de 2012), con
   enlace a la política de privacidad. El servidor también lo valida.
7. **RS-04** — Los mensajes se pueden eliminar y se suprimen automáticamente a los
   6 meses.
8. **RS-05** — Administrador con contraseña cifrada (bcrypt) y sesión que expira por
   inactividad. Toda ruta `/api/admin/*` exige autenticación.
9. **RS-07** — El directorio solo publica datos institucionales públicos o de
   profesionales con constancia de autorización.

## Accesibilidad (WCAG 2.1 AA, RA-01 a RA-11)

Contraste ≥ 4,5:1 en texto; todo operable con teclado y foco visible; enlace «Saltar al
contenido»; textos alternativos; HTML semántico (`header`, `nav`, `main`, `footer`,
`h1`-`h3` en orden); funciona desde 320 px sin desplazamiento horizontal; zoom al 200 %
sin romperse; respeta `prefers-reduced-motion`; nada de temporizadores, ventanas
emergentes automáticas ni carruseles automáticos; objetivos táctiles ≥ 44 px.

## Dirección visual («bonita» pero tranquila)

- Sensación cálida, confiable y calmada. Nada infantil ni clínico-frío. Mucho espacio en
  blanco; como máximo un elemento animado por pantalla.
- Paleta en `web/src/tokens.css`: fondo `#FAF8F5`, superficie `#FFFFFF`, texto
  `#1F2A37`, secundario `#4B5563`, primario `#1F5F7A`, primario hover `#174A5F`, acento
  `#E8A54B` (solo decorativo, nunca texto sobre blanco), aviso `#FFF4D6` con borde
  `#B8860B`. Alto contraste: blanco, negro y primario `#0B3A4D`.
  **Usa siempre las variables; no escribas colores ni tamaños sueltos.**
- Tipografía: Atkinson Hyperlegible (cuerpo, 18 px base) y Lexend (títulos),
  autoalojadas con @fontsource (se instalan en T1).
- Íconos: lucide-react. Ilustraciones simples y planas si se usan.
- Lenguaje: español de Colombia, frases cortas y literales, sin metáforas; tecnicismos
  explicados.

## Mapa del código

```
api/src/api/         Express: servidor, rutas y middleware (las rutas solo validan,
                     llaman al dominio y responden)
api/src/dominio/     lógica pura y validaciones de las reglas de dominio
api/src/datos/       conexión, esquemas Mongoose (modelos/) y repositorios
api/contenidos/      textos S1-S5 en Markdown con fuentes y fecha; la API los carga a
                     la base al arrancar (datos/sincronizacionContenidos.js)
api/contenidos/ruta/ pasos de la ruta (pasos.yaml); el id de cada uno se guarda como
                     slug (datos/sincronizacionListas.js); igual directorio/entidades.yaml
api/test/            pruebas Jest; ayudas/baseEnMemoria.js levanta MongoDB en memoria
web/src/             React + Vite; tokens.css es el sistema visual; secciones.js define
                     navegación, tarjetas, rutas y enlaces del buscador
web/src/api/         cliente de la API (rutas relativas /api, un reintento) y useDatos
web/src/ruta/        guía de la ruta (M-03): preguntas, filtro en el navegador y final
web/src/directorio/  directorio (M-04): página, tarjetas, filtros y entidades por paso
web/src/admin/       panel de administración (M-08): sesión, listas y editores
web/src/componentes/ layout y piezas comunes: Markdown seguro, migas de pan, fuentes y
                     revisión, pestañas accesibles, estados de carga y error
docs/                requisitos-fase-i.md, backlog-fase-i.md, GUIA_EQUIPO.md, decisiones/
docs/fase-ii/        documentos del prototipo gamificado; solo referencia, no se editan
```

## Comandos

Se ejecutan desde la raíz del repositorio.

```
npm install          instala api y web (workspaces)
npm test             pruebas del backend (Jest) y de web/ (node --test)
npm run test:cov     lo mismo, con la cobertura del backend; el umbral mínimo es 70 %
npm run dev:api      API en http://localhost:3000 (requiere MongoDB y api/.env);
                     al arrancar carga los textos de api/contenidos
npm run dev:web      interfaz en http://localhost:5173 (proxy de /api a la API)
npm run build:web    compila el frontend
```

## Convenciones

- **Idioma**: código, nombres, comentarios, commits y pruebas en español, sin tildes en
  identificadores (`validarFuente`, no `validárFuente`). Los textos visibles para el
  usuario sí llevan tildes.
- **Trazabilidad**: todo archivo nuevo declara en su comentario inicial los códigos que
  implementa (M-xx, RF-xx, RCN-xx, RA-xx, RS-xx). Todo `describe` de prueba que verifica
  una regla empieza con su código: `describe('RCN-01 fuente obligatoria', ...)`.
- **Códigos oficiales**: usa solo los códigos de `docs/requisitos-fase-i.md`
  (RCN-01..08, RA-01..11, RF-01..12, RS-01..07, HU-01..HU-15), que copia los cuadros
  del documento de tesis, incluido el modelo de datos (Cuadro 13). No inventes
  códigos; si hace falta uno, pregunta.
- **Voz del equipo**: commits, PR, comentarios de revisión y documentos se redactan en
  primera persona del plural, como trabajo del equipo: «implementamos», «verificamos»,
  «revisamos». Nunca en singular («revisé», «comprobé»). En el chat de la sesión sí se
  puede hablar en singular.
- **Toda regla de dominio nueva lleva su prueba** en el mismo commit.
- Cada modelo Mongoose nuevo agrega su colección a `COLECCIONES` en
  `api/src/datos/modelos/index.js`.

## Forma de trabajo (obligatoria)

1. Lee este archivo y `docs/backlog-fase-i.md`. Una tarea del backlog por sesión.
2. Antes de escribir código, **propón un plan** y espera aprobación.
3. Trabaja siempre en la rama de la tarea, creada desde `main` actualizado. Nunca
   hagas commit ni push a `main`.
4. Antes de cada commit: `npm test` en verde y, si tocaste `web/`, `npm run build:web`.
5. Commits en Conventional Commits, en español, con el código del requisito:
   `feat(contenidos): RCN-01 rechazar contenido sin fuente`.
6. En Claude Code web: haz commit y push **solo a la rama de la tarea** y abre el Pull
   Request contra `main`. La revisión y el «Squash and merge» los hace el equipo.
7. Terminado = pruebas en verde, CI en verde y la funcionalidad revisada en el
   navegador (vista previa de Vercel).

## Qué no hacer sin preguntar

- Agregar dependencias nuevas (las previstas en el backlog se autorizan con el plan).
- Tocar `.github/workflows/`.
- Modificar `docs/fase-ii/` o traer código de la rama `fase-ii`.
- Crear archivos `.env` con credenciales reales o subirlos al repositorio.
- Agregar cualquier funcionalidad que evalúe, puntúe o clasifique a un niño.

## Estado actual

T0 a T6 y T9 hechas. API con `/salud` y `/api/salud`, manejo de errores y conexión a
MongoDB. Web con tokens y alto contraste (`tokens.css`), fuentes autoalojadas, layout
común (`web/src/componentes/`), barra de accesibilidad M-07 con sessionStorage
(`web/src/accesibilidad/`), inicio M-01 y páginas vacías por sección. Las secciones
se definen una sola vez en `web/src/secciones.js` (navegación, tarjetas y rutas).

Contenidos (T2): colecciones `contenido`, `pregunta_frecuente` y `recurso` con
`fuentes [{texto, url}]`, `fechaRevision` y `estado` (borrador | publicado). RCN-01/02
viven en `api/src/dominio/publicacion.js` y se aplican al guardar mediante el plugin
`publicable` (`api/src/datos/modelos/comunes.js`); las actualizaciones por consulta
(`updateOne`, `findOneAndUpdate`, ...) están bloqueadas, así que toda escritura va por
los repositorios de `api/src/datos/repositorios/` (`crear`, `actualizar`). Rutas
públicas de solo lectura: `/api/contenidos?seccion=&edad=` (con edad incluye también
los contenidos sin tramo), `/api/contenidos/:slug`, `/api/preguntas`, `/api/recursos`
y `/api/buscar?q=`. La fecha de
revisión es una fecha de calendario: el formulario la envía como AAAA-MM-DD, se
guarda a medianoche UTC y la web la muestra con `timeZone: 'UTC'`.

Carga de textos (T3, parte A): los archivos de `api/contenidos/` (encabezado YAML +
Markdown) se sincronizan con la colección `contenido` cada vez que arranca la API,
antes de escuchar. Busca por `slug`: crea lo que falta y actualiza (y vuelve a
publicar) solo si la `fechaRevision` del archivo es más reciente que la de la base;
nunca borra ni despublica. Un archivo con errores queda en el registro («Contenidos:
…») y no detiene el arranque. El formato se lee en `api/src/dominio/archivoContenido.js`.

Páginas de contenido (T3, parte B): S1, S3, S4 y S5 usan la plantilla
`web/src/paginas/PaginaContenido.jsx` (migas de pan, h1, aviso RCN-03 donde aplica,
cuerpo en Markdown, fuentes y «Revisado el dd/mm/aaaa»). Señales de alerta
(`SenalesDeAlerta.jsx`) muestra la introducción arriba, pestañas WAI-ARIA por tramo con
el tramo en la dirección (`?edad=8-12`), un recuadro final hacia la ruta y las fuentes de
cada contenido por separado. El buscador lleva a `/buscar?q=`; solo el resumen va en la
región `role="status"`. `react-markdown` descarta el HTML, no admite imágenes y se
descarga aparte (las páginas lo precargan al montarse). Todos los enlaces abren en la
misma pestaña. Mientras llega la API se muestra un mensaje sin temporizadores; ante
502/503/504 o falla de red se reintenta una vez y luego se ofrece «Intentar de nuevo».
Panel de administración (T4, M-08): colección `administrador` (usuario, `claveCifrada`
con bcrypt costo 10, `fechaUltimoAcceso` y `sesiones` con el hash SHA-256 del token).
El primer administrador se crea al arrancar si la colección está vacía y existen
`ADMIN_USUARIO` y `ADMIN_CLAVE` (`datos/administradorInicial.js`). Inicio de sesión en
`POST /api/sesion` (fuera de `/api/admin`); todo `/api/admin/*` pasa por
`exigirSesion` (`api/src/api/autenticacion.js`) y responde 401 sin sesión, también en
rutas que no existen. Cookie `sesion_admin` HttpOnly, SameSite=Strict,
`Path=/api/admin` y Secure con `NODE_ENV=production`. La sesión vence a los 30 minutos
sin actividad o a las 8 horas; como máximo 5 por administrador. Límites en memoria
(`dominio/limiteIntentos.js`): 5 fallos por usuario en 15 minutos lo bloquean 15
minutos, y 20 intentos por minuto en total. Nunca se registra la clave, el token ni la
cookie. Rutas del panel: `GET|DELETE /api/admin/sesion` y
`GET|POST /api/admin/contenidos`, `GET|PATCH /api/admin/contenidos/:id`; los errores
de guardado llegan como `{ error, campos }` (`api/erroresDeGuardado.js`) y cada
contenido trae `archivo` si viene de `api/contenidos/` (su slug no se puede cambiar).
En la web, `/admin` se descarga aparte (`web/src/admin/`), con su layout, noindex y
sin enlace desde la zona pública; si la sesión vence, el editor conserva lo escrito y
pide entrar de nuevo. Pendiente detectado: contenidos nuevos de S1, S3, S4 y S5 no se
ven en el sitio (ver backlog).

Ruta de atención (T5, M-03): colección `paso_ruta` (`slug`, título, texto, `perfiles`,
`tramos`, `regimenes`, `orden`, `tiposEntidad`, fuentes, fecha y estado). Los 18 pasos
de `api/contenidos/ruta/pasos.yaml` se cargan al arrancar con
`datos/sincronizacionListas.js` (`crearCargaDeLista`, que T6 y T7 reutilizan): el `id`
del YAML se guarda como `slug`. `GET /api/pasos-ruta` devuelve todos los pasos
publicados y no recibe respuestas. La guía va arriba en `/ruta-de-atencion`
(`web/src/ruta/`): tres preguntas, una por pantalla, cada una en un `<form>` con
`<fieldset>`; las respuestas viven solo en el estado de React (ni API, ni dirección, ni
sessionStorage) y `filtroPasos.js` elige los pasos en el navegador. Los docentes tienen
«No lo sé» en el régimen. Panel: `/admin/ruta` (lista y editor) sobre
`GET|POST /api/admin/pasos-ruta` y `GET|PATCH /api/admin/pasos-ruta/:id`; los dos
editores comparten `admin/edicion.js` y `admin/PiezasEditor.jsx`. Las entidades junto a
cada paso llegaron con T6.

Directorio (T6, M-04): colección `entidad_directorio` (`slug`, nombre, `tipo`, `ciudad`,
descripción, `contacto {telefonos, correo, web, direccion, horario}`, `esProfesional`,
`constanciaAutorizacion`, fuentes, `fechaVerificacion` y estado). `fechaVerificacion` es
la fecha de RCN-02 del directorio: `publicable`, `validarPublicacion` y
`crearCargaDeLista` reciben `campoFecha` (por defecto `fechaRevision`). Reglas en
`dominio/directorio.js`: RS-07 (un profesional no se publica sin constancia, que nunca
sale por la API pública) y al menos un teléfono, correo o web. Catálogos: tipos con
`proteccion-ninez` (ICBF) y `CIUDADES` (Nacional, Bogotá, Medellín, Cali, Barranquilla).
Las 23 entidades de `directorio/entidades.yaml` se cargan al arrancar (`cargaEntidades`).
`GET /api/directorio` devuelve todo lo publicado sin filtrar; el panel usa
`/api/admin/directorio` y las rutas de pasos y directorio salen de
`api/rutas/adminLista.js`. En la web, `/directorio` filtra en el navegador con los
filtros en la dirección (`?ciudad=bogota&tipo=salud`) y tarjetas con todos los datos
(teléfonos `tel:`, WhatsApp a `wa.me/57`). La guía de la ruta descarga el directorio
una vez y muestra junto a cada paso las entidades nacionales de sus `tiposEntidad` y,
si se elige una ciudad opcional, las de esa ciudad; la ciudad vive solo en el estado
de React. Panel: `/admin/directorio`.
Siguiente: T7 (`feat/recursos-faq`). Ver `docs/backlog-fase-i.md`.
