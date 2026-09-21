# Backlog y plan de sprints

Sprints de dos semanas. Los códigos HU remiten al Cuadro 18 del documento de tesis.
Cada fila se convierte en un issue de GitHub.

## Sprint 0 — Montaje (esta semana)

| Tarea | Responsable |
|---|---|
| Crear el repositorio, invitar a Santiago Cardenas, proteger `main` | Lucas |
| Subir la base del MVP y verificar CI en verde | Lucas |
| Instalar Node, Git y Claude Code; clonar; `npm install`; `npm test` | Ambos |
| Primer PR de prueba de cada uno (p. ej. su nombre en el README) | Ambos |
| Crear los issues de este backlog y el tablero de proyecto | Lucas |

## Sprint 1 — Persistencia y acceso

| Tarea | Área | HU / criterio | Responsable |
|---|---|---|---|
| Conexión a MongoDB Atlas y pruebas del repositorio contra BD en memoria | api | CT-11 | Lucas |
| Cuentas y autenticación de acudiente y profesional | api | HU-09, HU-13 | Lucas |
| Supresión efectiva de eventos tras la revocación | api | HU-10, CT-12 | Lucas |
| Flujo consentimiento → asentimiento → panel conectado a la API real | web | HU-01, HU-02, HU-09 | Santiago Cardenas |
| Pantalla de ensayo genérica que envía eventos con TR neto y omisiones | web | HU-04, HU-08, RF-20, RF-23 | Santiago Cardenas |

## Sprint 2 — Minijuegos jugables

| Tarea | Área | HU / criterio | Responsable |
|---|---|---|---|
| MJ-3 completo con estímulos propios (no depende del ARC) | web | CC-08 a CC-10, CC-12 | Santiago Cardenas |
| MJ-1 y MJ-2 con estímulos provisionales marcados como tales | web | CC-01 a CC-07, CC-11 | Santiago Cardenas |
| Clasificación perseverativa del error en el registro | api | CC-08 | Lucas |
| Persistencia local y sincronización diferida | ambos | HU-05, CT-10 | Ambos |
| Pausas entre bloques sin pérdida de avance | web | HU-05, CT-08 | Santiago Cardenas |

## Sprint 3 — Cuidador y profesional

| Tarea | Área | HU / criterio | Responsable |
|---|---|---|---|
| Pantalla del cuestionario del cuidador con avance por ítem | web | HU-11, RC-01 a RC-05 | Santiago Cardenas |
| Tablero del profesional: perfil por dominio con origen del dato | api + web | HU-13, HU-14, RF-42 | Ambos |
| Exportación seudonimizada de una sesión | api | HU-15 | Lucas |
| Observaciones del profesional y filtro de sesiones | api + web | HU-17, HU-18 | Ambos |

## Sprint 4 — Calidad y despliegue

| Tarea | Área | HU / criterio | Responsable |
|---|---|---|---|
| Auditoría de accesibilidad con axe-core | web | CT-01 a CT-05 | Santiago Cardenas |
| Pruebas del frontend | web | — | Santiago Cardenas |
| Despliegue de la API y la base de datos | api | Cuadro 29 | Lucas |
| Despliegue del frontend | web | Cuadro 29 | Santiago Cardenas |
| Actualizar el capítulo 4 de la tesis con el estado real | docs | Cuadros 25 a 29 | Lucas |

## Bloqueos externos

No dependen del código, pero sin ellos no hay prueba con usuarios.

| Bloqueo | Afecta | Responsable |
|---|---|---|
| Redacción de los 15 ítems RC-01 a RC-05 con visto bueno del director | Sprint 3 | Lucas |
| Autorización del Autism Research Centre para los estímulos de MJ-1 y MJ-2 | Sprint 2 | Lucas |
| Aval del Comité de Ética en Investigación | Capítulo 5 | Lucas |
