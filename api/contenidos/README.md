# Contenidos de la plataforma (M-02)

Textos de las secciones S1 a S5, listos para publicar. Cada archivo es una página o un
bloque de página y cumple las reglas de contenido del documento:

- **RCN-01**: cada afirmación se apoya en una fuente oficial o científica, listada en
  `fuentes`. No contienen contenido clínico propio.
- **RCN-02**: cada archivo tiene `fechaRevision`.
- **RCN-04**: las señales de alerta se presentan por tramo de edad como motivos de
  consulta, nunca como una lista para sumar.
- **RCN-05**: la ruta sigue el protocolo del Ministerio de Salud (2015), la Ley 1616 de
  2013 y la Ley 2628 de 2026.
- **RCN-06 a RCN-08**: frases cortas y literales, contexto colombiano, enfoque de
  derechos y sin describir el TEA como enfermedad.

## Archivos

| Archivo | Sección | Tramo | Ruta de la web |
|---|---|---|---|
| `s1-que-es-el-tea.md` | S1 | — | `/que-es-el-tea` |
| `s2-senales-de-alerta.md` | S2 | — (introducción, se muestra en las tres pestañas) | `/senales-de-alerta` |
| `s2-senales-4-a-7.md` | S2 | 4-7 | `/senales-de-alerta?edad=4-7` (pestaña) |
| `s2-senales-8-a-12.md` | S2 | 8-12 | `/senales-de-alerta?edad=8-12` (pestaña) |
| `s2-senales-13-a-17.md` | S2 | 13-17 | `/senales-de-alerta?edad=13-17` (pestaña) |
| `s3-mitos-y-realidades.md` | S3 | — | `/mitos-y-realidades` |
| `s4-ruta-de-atencion.md` | S4 | — | `/ruta-de-atencion` (arriba de la guía interactiva de T5) |
| `s5-derechos.md` | S5 | — | `/derechos` |

## Formato

Cada archivo empieza con un encabezado entre líneas `---` y sigue con el cuerpo en
Markdown. Los campos coinciden con la colección `contenido` (Cuadro 13 de
`docs/requisitos-fase-i.md`):

```
---
titulo: "Título visible de la página"
slug: identificador-unico
seccion: S1
tramoEdad: 4-7            # solo en S2; se omite en los demás
fechaRevision: 2026-10-06
fuentes:
  - texto: "Autor. Título. Año."
    url: https://...      # opcional
---
Cuerpo en Markdown. Los títulos internos empiezan en ## porque el h1 es el título.
```

El título y el texto de cada fuente van entre comillas dobles, porque pueden llevar
dos puntos.

Reglas para editar:

1. Toda afirmación nueva necesita su fuente en `fuentes`.
2. Al cambiar un texto, actualizamos `fechaRevision` a la fecha de hoy (AAAA-MM-DD).
   **Sin una fecha más reciente, el cambio no llega a la base.**
3. Revisamos el cambio en un PR, como el código.

## Cómo llegan a la base de datos

No hay que instalar nada: basta con editar el archivo en GitHub y fusionar el PR.

1. Como la carpeta está dentro de `api/`, Render vuelve a publicar la API cuando se
   fusiona un cambio en estos archivos.
2. Cada vez que la API arranca, lee esta carpeta y la compara con la colección
   `contenido`, buscando por `slug`
   (`api/src/datos/sincronizacionContenidos.js`):
   - si el contenido no existe, lo crea publicado;
   - si la `fechaRevision` del archivo es más reciente que la de la base, o la base no
     tiene fecha, lo actualiza y lo vuelve a publicar;
   - si la base tiene la misma fecha o una más reciente (por ejemplo, una corrección
     hecha desde el panel), no lo toca.
3. Nunca borra ni despublica: quitar un archivo de la carpeta no quita la página.
4. El servidor rechaza publicar un archivo sin fuentes o sin fecha (RCN-01, RCN-02).
   Un archivo con errores no detiene la API: el resto se carga y el error queda en
   los logs de Render, debajo de la línea
   `Contenidos: 0 creados, 1 actualizado, 7 sin cambios, 0 con errores.`

Las pruebas (`npm test`) cargan todos estos archivos en una base en memoria: si uno
tiene un error de formato, le falta la fuente o la fecha, o la fecha es posterior a
hoy, el CI del PR queda en rojo antes de fusionar.

## Datos de la semana 2 (T5 a T8)

Además de las páginas de S1 a S5, esta carpeta guarda en subcarpetas los datos que
cargan las tareas T5 a T8. La carga de las páginas solo lee los `.md` de este primer
nivel. Cada tarea agrega su propia carga, con las mismas reglas: buscar por `id` o
`slug`, crear lo que falta, actualizar solo si la fecha del archivo es más reciente y
nunca borrar. Ya se cargan los pasos de la ruta (T5), el directorio (T6), las
preguntas frecuentes y los recursos (T7). Las páginas fijas de `paginas/` (T8) no van
a la base: la API las lee al arrancar y las sirve tal como están en el repositorio.

Las listas `.yaml` se cargan con `api/src/datos/sincronizacionListas.js`: el `id` de
cada elemento se guarda en la base como `slug`, para no confundirlo con el `_id` de
MongoDB que usan el panel y sus rutas. Un elemento con errores queda en los logs de
Render, con el archivo y su `id`, y los demás se cargan:
`Pasos de la ruta: 18 creados, 0 actualizados, 0 sin cambios, 0 con errores.`,
`Directorio: 23 creados, 0 actualizados, 0 sin cambios, 0 con errores.`,
`Preguntas frecuentes: 12 creados, 0 actualizados, 0 sin cambios, 0 con errores.` y
`Recursos: 6 creados, 0 actualizados, 0 sin cambios, 0 con errores.`

| Carpeta | Colección (Cuadro 13) | Tarea | Contenido |
|---|---|---|---|
| `ruta/pasos.yaml` | `paso_ruta` | T5 | 18 pasos: 12 para familias y 6 para docentes |
| `directorio/entidades.yaml` | `entidad_directorio` | T6 | 23 entidades públicas verificadas |
| `preguntas/preguntas.yaml` | `pregunta_frecuente` | T7 | 12 preguntas frecuentes |
| `recursos/recursos.yaml` | `recurso` | T7 | 6 documentos y enlaces oficiales |
| `paginas/privacidad.md` | página fija (M-06) | T8 | Política de tratamiento de datos, versión 1.0 |
| `paginas/acerca-de.md` | página fija (M-06, RF-12) | T8 | Propósito, alcance y aviso de no diagnóstico |

Todos los archivos `.yaml` son listas. Cada elemento tiene un `id` único en
minúsculas con guiones, sus `fuentes` (texto y enlace) y su fecha (`fechaRevision`,
o `fechaVerificacion` en el directorio). Los comentarios al inicio de cada archivo
explican sus campos.

### Ruta de atención (`ruta/pasos.yaml`)

Cada paso dice a qué respuestas aplica: `perfiles` (familia, docente), `tramos`
(4-7, 8-12, 13-17) y `regimenes` (contributivo, subsidiado, sin-afiliacion). La guía
muestra, en `orden`, los pasos que coinciden con las tres respuestas, y junto a cada
paso las entidades del directorio de los `tiposEntidad` indicados. Contributivo y
subsidiado comparten los pasos, porque en los dos el camino empieza en la EPS. Sin
afiliación agrega primero la afiliación de oficio. Cada `texto` tiene dos frases como
máximo (RCN-06).

La guía está en `/ruta-de-atencion`, arriba del texto de S4. Si consulta un docente,
la pregunta del régimen ofrece «No lo sé» y muestra los pasos de todos los regímenes:
por eso los pasos que dependen del régimen se escriben como condicionales («Si el
estudiante no tiene EPS»). Las pruebas cargan este archivo y comprueban que no tenga
errores, que haya pasos para cada combinación de respuestas y que cada `texto` tenga
dos frases como máximo.

### Directorio (`directorio/entidades.yaml`)

Solo datos institucionales públicos (RS-07): ningún profesional independiente, así
que `esProfesional` es `false` en todas. Si algún día se agrega un profesional, necesita
`constanciaAutorizacion` (dónde está archivada su autorización firmada y su fecha):
sin ella no se publica, y la constancia nunca sale por la API pública.

La fecha se llama `fechaVerificacion`, como en el Cuadro 13: es la fecha de RCN-02 del
directorio y cumple las mismas reglas que `fechaRevision` (obligatoria para publicar,
no posterior a hoy y, para que un cambio llegue a la base, más reciente que la de la
base). Una entidad con `fechaRevision` se rechaza. `contacto` admite `telefonos`,
`correo`, `web`, `direccion` y `horario`, con al menos un teléfono, correo o sitio
web; un campo mal escrito (por ejemplo `telefono:`) queda como error.

Valores de `tipo`:

| `tipo` | Etiqueta para el filtro |
|---|---|
| `salud` | Salud |
| `educacion` | Educación |
| `proteccion` | Protección de derechos (Defensoría y Personerías) |
| `proteccion-ninez` | Protección de niñas, niños y adolescentes (ICBF) |
| `quejas-salud` | Quejas sobre servicios de salud |
| `linea-apoyo` | Líneas de orientación y apoyo emocional |
| `organizacion` | Organizaciones de familias y personas autistas |

Ciudades: Nacional, Bogotá, Medellín, Cali y Barranquilla. Las entidades nacionales
aparecen con cualquier ciudad que se elija. Los números de WhatsApp van en
`telefonos` con el sufijo «(WhatsApp)»: la web los enlaza a `https://wa.me/57` más el
número. Un teléfono con «, ext. 300» se marca al número principal.

En `/directorio` los filtros van en la dirección sin tildes (`?ciudad=bogota&tipo=salud`).
La guía de la ruta muestra junto a cada paso las entidades nacionales de sus
`tiposEntidad` y, si la persona elige su ciudad, también las de esa ciudad; esa ciudad
no se envía, no se guarda y no va en la dirección (RF-04, RS-01). Las pruebas cargan
este archivo y comprueban que no tenga errores, que haya entidades de cada ciudad y
que cada tipo que usan los pasos tenga al menos una entidad nacional.

Las secretarías de Salud Pública y de Educación de Cali aparecen con los canales
generales de atención de la Alcaldía de Santiago de Cali, porque sus páginas propias
no respondieron el 6 de octubre de 2026. Cuando se puedan consultar, se cambian por
sus canales propios y se actualiza `fechaVerificacion`.

### Preguntas frecuentes (`preguntas/preguntas.yaml`)

Cada pregunta tiene `orden` (obligatorio, de 10 en 10), `pregunta`, `respuesta`,
`fuentes` y `fechaRevision`. Se muestran en `/preguntas-frecuentes` de menor a mayor
orden, en un acordeón: cada pregunta se abre por separado con su respuesta, sus
fuentes y «Revisado el dd/mm/aaaa». El `id` es el ancla de la pregunta:
`/preguntas-frecuentes#a-quien-consultar-primero` la abre, y así enlazan los
resultados del buscador. Por eso **el `id` de una pregunta publicada no se cambia**:
los enlaces que ya se compartieron dejarían de abrirla. Las pruebas comprueban que las
12 se cargan sin errores, que la primera es «¿A quién debo consultar primero?» (tarea
T7 de la prueba de usabilidad) y que los órdenes no se repiten.

### Recursos (`recursos/recursos.yaml`)

Cada recurso tiene `titulo`, `descripcion`, `tipo` (`archivo` para descargar o
`enlace` a una página oficial), `url`, `perfiles` (familia, docente; al menos uno),
`fuentes` y `fechaRevision`. En `/recursos` se muestran en el orden del archivo. El
botón de cada tarjeta dice qué abre y en qué sitio, con el dominio del enlace sin
«www.»: «Descargar PDF (minsalud.gov.co)» si es un `archivo` cuya dirección termina
en `.pdf`, y «Abrir página oficial (who.int)» si es un `enlace`. Las pruebas comprueban
que los 6 se cargan sin errores, que hay recursos para docentes (tarea T6 de la prueba)
y para familias, y que cada `archivo` es un PDF con enlace https.

### Páginas fijas (`paginas/`)

Markdown con el mismo encabezado de los contenidos. La política de privacidad agrega
`version` (la que se guarda con cada mensaje, RS-02), `vigenteDesde` y
`textoAutorizacion` (el texto de la casilla del formulario de contacto).

No van a la base ni se editan desde el panel: **la política cambia con una versión
nueva en el repositorio**, revisada en un PR. Al arrancar, la API lee la carpeta
(`api/src/datos/paginasFijas.js`), deja en los logs de Render
`Páginas fijas: 2 cargadas, 0 con errores.` y las sirve en `/api/paginas/privacidad`
y `/api/paginas/acerca-de`. En la web se ven en `/privacidad` y `/acerca-de`, con sus
fuentes y «Revisado el dd/mm/aaaa»; el formulario de `/contacto` toma de la política
el texto de la casilla y la versión que se guarda con cada mensaje.

Reglas (`api/src/dominio/archivoPagina.js`):

- Un archivo que todavía dice `COMPLETAR` no se publica, y una prueba falla si alguno
  lo dice: el CI queda en rojo antes de fusionar.
- Fuentes y `fechaRevision` obligatorias, sin fecha posterior a hoy (RCN-01, RCN-02).
- `vigenteDesde` es el día en que se fusiona el cambio (AAAA-MM-DD). Solo se valida
  el formato, porque puede ser posterior al día en que se escribe.
- La versión debe aparecer igual en `version`, en `textoAutorizacion`
  («(versión 1.0)») y en el cuerpo («**Versión 1.0.**»).
- Sin la política, el formulario de contacto no recibe mensajes (responde 503).

Para publicar una versión nueva de la política: cambiar `version` en los tres
lugares, el texto, `vigenteDesde` y la frase «Vigente desde…» con la fecha de la
fusión, y `fechaRevision`. Quien tenga el formulario abierto con la versión anterior
recibe un aviso para leer y aceptar la nueva antes de enviar. Si el cambio es
importante, la política promete avisar por correo a quienes tengan mensajes guardados.
