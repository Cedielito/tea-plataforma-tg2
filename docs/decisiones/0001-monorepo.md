# 0001 — Monorepo con workspaces de npm

**Estado:** aceptada

**Contexto.** Equipo de dos personas, un backend y un frontend que comparten reglas de
negocio y evolucionan juntos. La tesis exige trazabilidad entre criterios y código.

**Decisión.** Un único repositorio con `api/` y `web/` como workspaces de npm. Una sola
instalación, un solo CI, un solo historial.

**Consecuencias.** Un PR puede cubrir backend y frontend de una misma historia. El
historial del repositorio respalda el Cuadro 26 de la tesis.
