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
| `s2-senales-4-a-7.md` | S2 | 4-7 | `/senales-de-alerta` (pestaña) |
| `s2-senales-8-a-12.md` | S2 | 8-12 | `/senales-de-alerta` (pestaña) |
| `s2-senales-13-a-17.md` | S2 | 13-17 | `/senales-de-alerta` (pestaña) |
| `s3-mitos-y-realidades.md` | S3 | — | `/mitos-y-realidades` (nueva, la agrega T3) |
| `s4-ruta-de-atencion.md` | S4 | — | `/ruta-de-atencion` (arriba de la guía interactiva de T5) |
| `s5-derechos.md` | S5 | — | `/derechos` (nueva, la agrega T3) |

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
2. Al cambiar un texto, actualizamos `fechaRevision`.
3. Revisamos el cambio en un PR, como el código.

## Cómo llegan a la base de datos

Un script de carga lee esta carpeta y publica cada archivo con los repositorios de la
API (T2), buscando por `slug`: si ya existe lo actualiza, si no lo crea. El servidor
rechaza publicar un archivo sin fuentes o sin fecha (RCN-01, RCN-02). El script hace
parte de T3.
