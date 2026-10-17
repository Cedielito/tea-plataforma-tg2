# Plataforma TEA

Plataforma web de **información y orientación** sobre el trastorno del espectro autista
(TEA) para familias y docentes de niños, niñas y adolescentes de 4 a 17 años en Colombia.

Trabajo de grado — Ingeniería de Sistemas y Computación, Universidad Católica de Colombia.

> Esta plataforma **no diagnostica ni hace tamizaje**. Explica qué es el TEA, cuáles son
> las señales que justifican una consulta, cómo es la ruta de atención y a dónde acudir.
> Todo contenido declara su fuente y su fecha de revisión.

## Módulos (Fase I)

| Código | Módulo |
|---|---|
| M-01 | Inicio y navegación |
| M-02 | Contenidos: qué es el TEA, señales de alerta por edad, mitos, ruta de atención, derechos |
| M-03 | Ruta de atención interactiva (se resuelve en el navegador, no guarda respuestas) |
| M-04 | Directorio de orientación |
| M-05 | Recursos y preguntas frecuentes |
| M-06 | Contacto y privacidad |
| M-07 | Barra de accesibilidad |
| M-08 | Panel de administración |
| M-09 | Registro conductual estructurado: herramienta del profesional para registrar el desempeño en dos tareas de dominio público (cambio de regla y Navon); entrega valores observados por tarea, sin clasificar. En esta fase se evalúa solo con adultos voluntarios |

El resto de la Fase II (los otros minijuegos, el reporte del cuidador, el consentimiento
parental y el asentimiento) está preservado en la rama
[`fase-ii`](https://github.com/Cedielito/tea-plataforma-tg2/tree/fase-ii) y no forma parte de esta entrega.

## Estructura

```
api/     Node.js + Express + MongoDB — API de contenidos y administración
web/     React + Vite — sitio público y panel
docs/    backlog de la Fase I, guía del equipo y decisiones (ADR)
```

## Primeros pasos

Requisitos: Node.js 22.9 o superior y Git.

```
git clone https://github.com/Cedielito/tea-plataforma-tg2.git
cd tea-plataforma-tg2
npm install
npm test
npm run dev:web
```

La guía de instalación está en [`docs/GUIA_EQUIPO.md`](docs/GUIA_EQUIPO.md), el plan de
trabajo en [`docs/backlog-fase-i.md`](docs/backlog-fase-i.md) y la forma de trabajar en
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Equipo

- Lucas — desarrollo de la plataforma
- Santiago Cárdenas Rubio — contenidos, documento y revisión de los Pull Request

Directora: Sara Fernanda Sánchez.
