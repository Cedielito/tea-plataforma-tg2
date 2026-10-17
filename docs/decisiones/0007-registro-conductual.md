# 0007 — M-09 Registro conductual estructurado en la Fase I

**Estado:** aceptada (octubre de 2026)

**Contexto.** La asesora propuso ampliar la Fase I: además de la plataforma informativa
(M-01 a M-08, sin cambios), una herramienta para que un profesional registre de forma
estandarizada el desempeño en dos tareas de dominio público, la clasificación con
cambio de regla (DCCS) y las figuras jerárquicas de Navon. En esta fase la evaluación
se hace solo con adultos voluntarios. La entrega del documento pasa al 6 de noviembre
de 2026. La decisión 0004 había dejado todo el código del registro en la rama
`fase-ii`; buena parte de ese código de dominio (indicadores, catálogo, secuenciador,
motor, versión y seudónimo) sirve para M-09 con ajustes.

**Decisión.**

- M-09 entra a `main` como módulo nuevo. No tamiza, no clasifica y no sugiere: entrega
  valores observados por tarea con su aviso de no diagnóstico. La salida y la interfaz
  no pueden tener etiquetas diagnósticas, niveles de riesgo o de apoyo, puntos de
  corte, puntajes globales ni nombres de dominios del DSM-5-TR
  (`api/src/dominio/registro/vocabularioProhibido.js`).
- Solo tareas de dominio público, con estímulos generados por código. Nada del Autism
  Research Centre.
- En esta fase no se registran datos de menores. Cada sesión usa un seudónimo
  aleatorio de 8 caracteres (XXXX-XXXX, sin 0, O, 1, I ni L, para poder dictarlo) y
  ninguna colección del registro guarda nombre, documento ni contacto.
- El código de `fase-ii` se trae archivo por archivo, adaptado y con sus pruebas, y el
  PR dice qué se trajo. MJ-1, MJ-2, el reporte del cuidador, el consentimiento parental
  y el asentimiento se quedan en `fase-ii`.
- T12 trae a `api/src/dominio/registro/` (tomado de `fase-ii` en el commit
  `d33398d`):

  | Archivo nuevo | Origen en `fase-ii` | Cambios |
  |---|---|---|
  | `indicadores.js` | `api/src/dominio/indicadores/calculos.js` | Solo CC-08, CC-09, CC-10 y CC-12, sin `dominio`. CC-09 por ensayo en los bloques mixtos; CC-09 y CC-10 solo con aciertos; anticipaciones fuera (RF-14); CC-12 con `criterioAlcanzado` |
  | `catalogo.js` | `api/src/dominio/minijuegos/catalogo.js` | Dos tareas, sin tramos de edad, con `bloquesMixtos` y `trMinimoMs` |
  | `secuenciador.js` | `api/src/dominio/minijuegos/secuenciador.js` | Bloques mixtos expandidos, CT-08 con la pausa tras cada bloque, `vistaDeEnsayo` con retroalimentación en la práctica |
  | `motor.js` | `api/src/dominio/puntuacion/motor.js` | Salida por tarea y constructo; sin dominios, cobertura, reporte del cuidador ni percentiles; rechaza datos identificables |
  | `version.js` | `api/src/dominio/puntuacion/version.js` | Congelado, empieza en 1.0.0 |
  | `seudonimo.js` | `api/src/dominio/privacidad/seudonimo.js` | Código corto en lugar del UUID; detección recursiva con más campos |

  Las pruebas vienen de `api/test/indicadores.test.js`, `motor.test.js`,
  `secuenciador.test.js` y `privacidad.test.js` (solo CT-11), adaptadas.
- Los códigos de la Fase II que chocan con los de la Fase I cambian: RF-20 pasa a
  RF-13, RF-23 a RF-14 y RF-24 a RF-15. CC-08, CC-09, CC-10, CC-12, CT-03, CT-07,
  CT-08, CT-11, CT-13, CP-01 y CP-04 conservan su código
  (`docs/requisitos-fase-i.md`, sección 7).
- Sin muestra normativa no se calculan percentiles: el motor de `fase-ii` los dejaba
  provisionales; el de M-09 no los tiene, para que no quede ninguna comparación con una
  norma.

**Consecuencias.** La regla «nada que evalúe, puntúe o clasifique» de `CLAUDE.md` pasa
a cubrir a cualquier persona, no solo a niños. El registro necesita consentimiento
firmado de cada adulto voluntario, del que la plataforma solo guarda la constancia
(T15). Las colecciones, rutas y pantallas de M-09 llegan con T13 a T15; T10 y T11
también cubren M-09. Si la tarea de Navon no está estable el 23 de octubre, se evalúa
solo la de cambio de regla.
