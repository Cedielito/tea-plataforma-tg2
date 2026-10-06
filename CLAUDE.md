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
api/test/            pruebas Jest; ayudas/baseEnMemoria.js levanta MongoDB en memoria
web/src/             React + Vite; tokens.css es el sistema visual
contenidos/          textos S1-S5 en Markdown con fuentes y fecha (se cargan a la base)
docs/                requisitos-fase-i.md, backlog-fase-i.md, GUIA_EQUIPO.md, decisiones/
docs/fase-ii/        documentos del prototipo gamificado; solo referencia, no se editan
```

## Comandos

Se ejecutan desde la raíz del repositorio.

```
npm install          instala api y web (workspaces)
npm test             pruebas del backend
npm run test:cov     pruebas con cobertura; el umbral mínimo es 70 %
npm run dev:api      API en http://localhost:3000 (requiere MongoDB y api/.env)
npm run dev:web      interfaz en http://localhost:5173 (proxy de /api a la API)
npm run build:web    compila el frontend
npm run seed:api     crea 2 contenidos de ejemplo en borrador (usa api/.env)
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

T0, T1 y T2 hechas. API con `/salud` y `/api/salud`, manejo de errores y conexión a
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
y `/api/buscar?q=`. Aún no hay rutas `/api/admin` (llegan con T4). La fecha de
revisión es una fecha de calendario: el formulario la envía como AAAA-MM-DD, se
guarda a medianoche UTC y la web la muestra con `timeZone: 'UTC'`.
Siguiente: T3 (`feat/paginas-contenido`). Ver `docs/backlog-fase-i.md`.
