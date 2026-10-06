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
