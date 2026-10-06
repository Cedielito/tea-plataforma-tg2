# 0004 — Reenfoque: la Fase I es solo la plataforma web de información y orientación

**Estado:** aceptada (octubre de 2026)

**Contexto.** El proyecto se dividió en dos fases por alcance y complejidad. Los
minijuegos y el registro de indicadores conductuales requieren validación con
profesionales de salud mental, estudios piloto con niños y aval de un comité de ética,
lo que excede el alcance de la Fase I. El documento de tesis se reformuló con tres
objetivos centrados en una plataforma web de información y orientación para familias y
docentes.

**Decisión.**

- El código del prototipo gamificado (dominio de privacidad, minijuegos, indicadores y
  puntuación; rutas de sesiones; esquemas del Cuadro 19 anterior; pantallas de
  consentimiento, asentimiento, panel sensorial y tablero) se conserva íntegro en la
  rama `fase-ii` y se retira de `main`.
- Sus documentos (`backlog.md`, `operacionalizacion.md`, `requerimientos.md` y las
  decisiones 0002 y 0003) se mueven a `docs/fase-ii/` como referencia.
- `main` conserva la infraestructura que sigue siendo útil: monorepo con workspaces,
  Express, conexión a MongoDB, Jest con mongodb-memory-server, CI con umbral de
  cobertura del 70 % y la decisión 0001.
- La Fase I se guía por `CLAUDE.md` y `docs/backlog-fase-i.md`, con los módulos M-01 a
  M-08 y los requisitos RCN, RA, RF y RS del documento.

**Consecuencias.** La plataforma no evalúa, puntúa ni clasifica a ningún niño, de modo
que la Fase I no necesita consentimiento parental ni aval ético para su evaluación, que
se hace con pruebas técnicas y voluntarios adultos. Retomar la Fase II implica partir de
la rama `fase-ii` y revisar su integración con la plataforma ya desplegada.
