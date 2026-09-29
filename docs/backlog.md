Backlog — cierre en 4 semanas (entrega: finales de octubre de 2026)

Reemplaza a docs/backlog.md. El objetivo 4 se reformuló: la plataforma se evalúa con adultos y perfiles simulados, no con niños. Todo lo que no sirva a esa evaluación pasa a trabajo futuro.

La meta que ordena todo

Al 12 de octubre el prototipo debe estar desplegado y permitir, de punta a punta:

Autorizar el consentimiento y registrar el asentimiento.
Configurar la sesión y jugar los tres minijuegos (estímulos provisionales).
Responder el cuestionario del cuidador.
Ver en el tablero del profesional el perfil de una sesión, con el origen de cada dato.

Si una tarea no acerca a esa meta, no entra.

Semana 1 · 29 sep – 5 oct · Flujo completo y simulador
#	Tarea	Criterios	Hecho cuando
1	Endpoints de consentimiento y asentimiento; nada se persiste antes del consentimiento	CT-12, CT-14	Prueba de recorrido completo contra BD en memoria en verde
2	Flujo web conectado a la API real, con mensajes de error visibles y pantalla de edad	HU-01, HU-02, HU-09	Se llega al mapa de selección en el navegador
3	Generador de sesiones sintéticas (api/scripts/simular.js) + cálculo de AUC por indicador	C6	Imprime AUC por indicador con efecto grande, nulo, y con omisiones/pausas
Semana 2 · 6 – 12 oct · Minijuegos, tablero y despliegue
#	Tarea	Criterios	Hecho cuando
4	Pantalla de ensayo genérica: TR neto, pausas, omisión, rectificaciones	RF-20, RF-23	Evento enviado con los campos del Cuadro 20
5	MJ-3 jugable (estímulos propios)	CC-08 a CC-10, CC-12	Se completa un minijuego y se guardan los eventos
6	MJ-1 y MJ-2 jugables con estímulos provisionales	CC-01 a CC-07, CC-11	Ídem
7	Cuestionario del cuidador (15 ítems)	RC-01 a RC-05	Avance guardado por ítem
8	Tablero del profesional: perfil por dominio, origen del dato, avisos	HU-13, HU-14	Muestra una sesión simulada
9	Despliegue (API + MongoDB Atlas + web) con datos de prueba	Cuadro 30	URL pública funcionando
Semana 3 · 13 – 19 oct · Evaluación (sin programar funcionalidades nuevas)
#	Tarea	Quién
10	C1: verificación de los 18 criterios de aceptación en el entorno desplegado	Equipo
11	C2: auditoría axe-core + teclado, contraste, zoom 200 %	Equipo (Claude Code puede automatizar axe)
12	Sesión de 90 min con los 3 expertos: validación de la matriz (Anexo A), principios CP, heurísticas	Equipo + expertos
13	Sesiones con ≥ 10 cuidadores y ≥ 5 profesionales: tareas, SUS, 20 perfiles simulados	Equipo
14	Corrección de defectos críticos y reauditoría	Claude Code
Semana 4 · 20 – 26 oct · Resultados y documento
#	Tarea
15	Script de análisis versionado: SUS con IC, κ de Cohen y de Fleiss, AUC
16	Completar Cuadro 35, apartados 5.7 y 5.8 (lo resaltado en amarillo)
17	Actualizar capítulo 4 (Cuadros 26, 27, 29, 30) con la fecha de corte nueva
18	Conclusiones, resumen y abstract con los resultados reales
Fuera de alcance (trabajo futuro, ya declarado en el capítulo 7)

Autenticación completa, bitácora de auditoría, exportación PDF, comparación entre sesiones, observaciones del profesional, persistencia offline, pruebas del frontend más allá de la auditoría de accesibilidad.

Tareas humanas (no se le pagan a Claude)
Tarea	Plazo	Bloquea
Redactar los 15 ítems RC-01 a RC-05 con el director	5 oct	Tarea 7
Banco provisional de estímulos (miradas y escenas propias o de dominio público)	8 oct	Tarea 6
Contactar y agendar 3 expertos, 5 profesionales y 10 cuidadores	10 oct	Semana 3
Imprimir Anexo F (consentimiento adultos) y el SUS	12 oct	Semana 3
Ejecutar la búsqueda PRISMA y completar el Cuadro 7 y la Figura 3	19 oct	Cuadro 17
Radicar ante el Comité de Ética y enviar la solicitud al ARC	esta semana	Anexo E
Prompts para Claude Code

Reglas para cada sesión:

Una tarea por sesión, en una rama nueva.
Pedir siempre el plan primero y traerlo a revisión antes de aprobarlo.
Terminado = pruebas en verde + PR abierto → squash and merge → borrar la rama.
Tarea 1 — Consentimiento y asentimiento
Lee CLAUDE.md y docs/backlog.md. Tarea 1 del backlog, en la rama
feat/consentimiento-endpoints.

Implementa en la API:
- POST /api/sesiones/:uuid/consentimiento: registra la autorización del representante
  (versión del formato, fecha, sin nombres ni documentos de identidad).
- POST /api/sesiones/:uuid/asentimiento: registra el asentimiento del participante;
  exige que el consentimiento ya exista.
- Ningún endpoint de eventos, cuestionario o puntuación persiste nada si la sesión no
  tiene consentimiento (responde 403 con un mensaje claro). CT-12 y CT-14.
- La revocación ya implementada debe seguir funcionando igual.

Terminado cuando: hay una prueba de recorrido completo contra mongodb-memory-server
(crear sesión → intentar guardar un evento sin consentimiento y fallar → consentir →
asentir → guardar evento → puntuar → revocar) y todas las pruebas pasan.
No escribas código todavía: propón el plan.
Tarea 2 — Flujo web conectado
Lee CLAUDE.md y docs/backlog.md. Tarea 2 del backlog, rama feat/flujo-web.

Conecta el frontend a la API real (sin datos simulados en el cliente):
pantalla de consentimiento del representante → pantalla de edad (4-17, define el tramo
4-7 u 8-17) → asentimiento con lenguaje sencillo → mapa de selección de minijuegos.
HU-01, HU-02, HU-09.
- Errores de red o de la API visibles en pantalla, en español y sin jerga técnica.
- Navegable solo con teclado, foco visible, textos con contraste AA.
- URL de la API por variable de entorno.
Terminado cuando: con npm run dev en api y web, se llega al mapa en el navegador y la
sesión queda guardada con consentimiento y asentimiento.
Propón el plan antes de escribir código.
Tarea 3 — Simulador de perfiles (C6)
Lee CLAUDE.md y docs/backlog.md. Tarea: generador de sesiones sintéticas para el
componente C6 del capítulo 5 (sensibilidad del motor). Rama feat/simulador.

Crea api/scripts/simular.js que genere eventos con exactamente los mismos campos que
guarda evento_conductual (constructo, acierto, claseError, estadoItem,
tiempoReaccionMs, pausasDuranteItemMs, posteriorACambio, condicion, presentado,
respuesta) para dos perfiles: referencia y con indicadores. En el perfil con
indicadores los parámetros se desplazan en la dirección documentada: menor acierto en
estados_complejos, falsa_creencia_segundo_orden y faux_pas; mayor tasa de error
perseverativo y mayor costo de cambio; sesgo local (latencia global mayor que local).
Tamaño del efecto: d = 0,8 (grande) y d = 0 (nulo). 200 sesiones por perfil y por tramo
de edad (4-7 y 8-17). Semilla fija para que sea reproducible.

Luego pasa cada sesión por el motor real (puntuar) y calcula el AUC de cada indicador
escalar entre perfiles, con su error estándar de Hanley y McNeil. Repite con 20 % de
ítems omitidos y con pausas insertadas. Imprime una tabla y guarda un JSON en
api/scripts/resultados/.

Reglas: sin dependencias nuevas; la lógica reutilizable (generador y AUC) va en
api/src/dominio/simulacion/ con sus pruebas; el script solo orquesta. No escribas
código todavía: propón el plan.
Tarea 4 — Pantalla de ensayo genérica
Lee CLAUDE.md y docs/backlog.md. Tarea 4, rama feat/pantalla-ensayo.

Crea en web un componente de ensayo reutilizable por los tres minijuegos. Recibe un
ítem (estímulo, opciones, constructo, condición) y envía a la API un evento con los
campos de evento_conductual:
- tiempoReaccionMs NETO: desde que el estímulo es visible hasta la respuesta, restando
  las pausas (RF-20).
- pausasDuranteItemMs cuando la pestaña pierde el foco o se pulsa "pausa".
- Ítem sin respuesta tras el tiempo límite = estadoItem "omitido", nunca error (RF-23).
- Rectificaciones: si cambia de opción antes de confirmar, se registra.
- Botones grandes, sin sonidos bruscos, sin límite de tiempo visible que presione,
  retroalimentación neutra (no "correcto/incorrecto" en rojo/verde).
Incluye pruebas unitarias del cálculo de TR neto y de omisión.
Propón el plan antes de escribir código.
Tarea 5 — MJ-3 jugable
Lee CLAUDE.md, docs/backlog.md y docs/operacionalizacion.md (sin modificarlo).
Tarea 5, rama feat/mj3.

Implementa el minijuego MJ-3 usando la pantalla de ensayo de la tarea 4, con los
estímulos propios que ya define la operacionalización (CC-08 a CC-10, CC-12):
cambio de regla (errores perseverativos, costo de cambio, posteriorACambio) y figuras
global/local. Instrucciones con ejemplo de práctica que no se puntúa. Al terminar,
vuelve al mapa y marca el minijuego como completado.
Terminado cuando: se juega de principio a fin en el navegador y los eventos quedan en
la BD con constructo y condición correctos; hay pruebas de la secuencia de ítems.
Propón el plan antes de escribir código.
Tarea 6 — MJ-1 y MJ-2 con estímulos provisionales
Lee CLAUDE.md, docs/backlog.md y docs/operacionalizacion.md (sin modificarlo).
Tarea 6, rama feat/mj1-mj2.

Implementa MJ-1 (lectura de miradas/emociones) y MJ-2 (escenas de teoría de la mente:
falsa creencia de primer y segundo orden, faux pas, estados complejos) sobre la
pantalla de ensayo. CC-01 a CC-07 y CC-11. Los estímulos se cargan desde
web/public/estimulos/ con un archivo JSON de manifiesto; mientras no estén las
imágenes definitivas, usa marcadores de posición claramente etiquetados
"estímulo provisional". Contenido distinto por tramo de edad (4-7 y 8-17).
Terminado cuando: ambos se juegan de principio a fin y guardan eventos correctos.
Propón el plan antes de escribir código.
Tarea 7 — Cuestionario del cuidador
Lee CLAUDE.md y docs/backlog.md. Tarea 7, rama feat/cuestionario-cuidador.

Implementa el cuestionario del cuidador: 15 ítems (RC-01 a RC-05, tres por dominio)
cargados desde un archivo de configuración (te paso el texto de los ítems aparte).
Escala Likert, guardado del avance ítem por ítem para poder retomar, opción
"prefiero no responder" que cuenta como omitido. B4 solo se alimenta de RC-05.
Endpoint y pantalla web, con pruebas de la API.
Propón el plan antes de escribir código.
Tarea 8 — Tablero del profesional
Lee CLAUDE.md. Tarea: tablero del profesional (HU-13, HU-14) conectado a
GET /api/sesiones/:uuid/puntuacion. Rama feat/tablero.

Debe mostrar por dominio los valores observados,
etiquetando cada uno como "desempeño observado" o "reporte del cuidador", los
dominios sin datos suficientes y, siempre visibles, los avisos de no diagnóstico y de
ausencia de puntos de corte. Prohibido mostrar bandas, colores de riesgo o puntajes
globales. Añade una vista que liste las sesiones simuladas para el componente C5, sin
revelar el perfil de origen. Propón el plan antes de escribir código.
Tarea 9 — Despliegue
Lee CLAUDE.md. Tarea: desplegar la plataforma para la evaluación con adultos.
Rama feat/despliegue.

API en Render (o Railway) con MongoDB Atlas (plan gratuito), web en Vercel. Solo datos de
prueba. Variables de entorno documentadas en docs/, nada de secretos en el
repositorio. Añade un script que cargue 20 sesiones simuladas para el componente C5.
Propón el plan, incluidos los pasos que tengo que hacer yo en cada servicio.
Tarea 11 — Auditoría de accesibilidad (C2)
Lee CLAUDE.md. Tarea: auditoría automática WCAG 2.1 AA con axe-core sobre todas las
pantallas (consentimiento, edad, asentimiento, mapa, los tres minijuegos, cuestionario,
tablero). Rama test/accesibilidad. Pide autorización antes de añadir la dependencia
(@axe-core/playwright). Genera un informe en docs/evaluacion/axe.md con las
violaciones por severidad y corrige las críticas y serias.
Propón el plan antes de escribir código.
Tarea 15 — Script de análisis
Lee CLAUDE.md. Tarea: script versionado de análisis de la evaluación en
api/scripts/analisis.js, rama feat/analisis. Entrada: CSV en docs/evaluacion/datos/
(sin nombres). Calcula: SUS por participante, media e IC 95 %; porcentaje de tareas
sin ayuda; κ de Cohen de cada evaluador contra el perfil de origen y κ de Fleiss entre
evaluadores (C5); toma el JSON del simulador para C6. Salida: tabla en Markdown lista
para pegar en el Cuadro 35. Sin dependencias nuevas, con pruebas de las fórmulas.
Propón el plan antes de escribir código.
