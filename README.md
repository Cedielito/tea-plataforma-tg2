# Plataforma TEA

Plataforma web gamificada para el **tamizaje preliminar** de indicadores del trastorno
del espectro autista en niños, niñas y adolescentes de 4 a 17 años en Colombia.

Trabajo de grado — Ingeniería de Sistemas y Computación, Universidad Católica de Colombia.

> Esta plataforma **no emite diagnósticos**. Reporta valores observados a un profesional
> de salud mental, identificando si cada dato procede del desempeño en tarea o del reporte
> del cuidador.

## Estructura

```
api/     Node.js + Express + MongoDB — dominio, rutas y datos
web/     React + Vite — interfaz y minijuegos
docs/    operacionalización, requerimientos, backlog y decisiones
```

## Primeros pasos

Requisitos: Node.js 20 o superior y Git.

```
git clone <url-del-repositorio>
cd tea-plataforma
npm install
npm test
npm run dev:web
```

La guía completa de instalación está en [`docs/GUIA_EQUIPO.md`](docs/GUIA_EQUIPO.md).
Cómo trabajamos: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Equipo

- Lucas — backend
- Santiago Cárdenas — frontend
