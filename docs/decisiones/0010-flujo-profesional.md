# 0010 — Flujo del profesional, aplicación, SUS y exportación (T15)

**Estado:** aceptada (octubre de 2026)

**Contexto.** T12 a T14 dejaron el núcleo de M-09 (`api/src/dominio/registro/`) y las dos
tareas en la web, pero solo en local: `/registro/prueba` no guarda nada. T15 agrega el
flujo del profesional de punta a punta (HU-16 a HU-19): crear una sesión con la
constancia del consentimiento, aplicar las dos tareas y el SUS a un adulto en el mismo
dispositivo, ver los valores observados, exportarlos y eliminar una sesión por su
seudónimo. Teníamos que decidir cómo entra el profesional, cómo se separa el participante
de los datos de otras sesiones, qué se guarda y qué pasa si algo falla en medio de la
aplicación.

**Decisión.**

- **Cuenta del profesional.** Reutilizamos la autenticación de T4. La colección
  `administrador` gana `rol`: `administrador` o `profesional`; una cuenta sin rol (las de
  antes) es de administrador. La cuenta se crea al arrancar con `PROFESIONAL_USUARIO` y
  `PROFESIONAL_CLAVE` (`api/src/datos/profesionalInicial.js`), igual que el primer
  administrador: Render gratuito no da consola y no hay registro público. Se crea si no
  existe una cuenta con ese usuario; no convierte a un administrador en profesional.
  Elegimos variables de entorno y no una página del panel porque ninguna HU la pide y el
  equipo es de dos personas.
- **Roles separados.** El mismo `POST /api/sesion` responde `{ usuario, rol }`. Todo
  `/api/admin/*` sigue exigiendo sesión (401); después, `exigirRol` responde 403 al rol
  equivocado: `/api/admin/registro/*` es del profesional y el resto del panel, del
  administrador. Cada consulta del registro filtra por la cuenta: un profesional no ve,
  exporta ni elimina las sesiones de otro.
- **La zona del profesional va en `/registro`**, con el layout de M-09, y no en `/admin`:
  el encabezado del panel nombra la plataforma y M-09 no puede tener ese vocabulario.
  Reutiliza `ProveedorSesion`, `FormularioAcceso` y `SesionVencida` del panel.
- **Nueva sesión (HU-16).** Solo con `consentimientoFirmado: true`, la versión del formato
  y `mayorDeEdad: true`; cualquier otro campo, 400. La API genera el seudónimo de T12 (con
  índice único y un nuevo intento si choca), la semilla de los ensayos y el reloj, que es
  siempre `animacion`. La web muestra el seudónimo en grande, con «Copiar», para
  escribirlo en la copia del consentimiento.
- **Entrega del dispositivo.** Para que el participante no vea otras sesiones, la entrega
  (`POST /api/admin/registro/sesiones/:seudonimo/entrega`) cierra en una sola respuesta la
  sesión del profesional en ese navegador (cookie y hash en la base) y deja una cookie
  aparte, `aplicacion_registro`: HttpOnly, SameSite=Strict, `Path=/api/registro/aplicacion`,
  con un token aleatorio cuyo hash se guarda en esa sesión. Esa cookie solo permite leer el
  plan y la semilla de esa sesión y enviar sus ensayos y su SUS; ninguna respuesta trae
  valores, el seudónimo ni otras sesiones. Vence a las 2 horas de creada la sesión o al
  terminar. La web pasa a `/registro/aplicacion` reemplazando la entrada del historial: al
  volver atrás aparece el inicio de sesión. El costo es que el profesional vuelve a entrar
  después de cada participante; a cambio, tampoco importa que la sesión del panel venza
  durante las tareas.
- **Aplicación.** Cambio de regla, pausa, Navon, SUS y «Gracias», sin enlaces. Reutiliza
  `TareaCambioRegla` y `TareaNavon` sin cambios, con el reloj fijo en `animacion` (no lee
  `?reloj=` ni `VITE_RELOJ_REGISTRO`). Al final el participante ve «Gracias» y si todo
  quedó guardado: ningún valor.
- **Envío con reintento.** Los ensayos se envían al terminar cada tarea
  (`PUT /api/registro/aplicacion/tareas/:tarea`). La cola de la web (`colaEnvios.js`) los
  conserva en memoria hasta que la API confirma y los envía en orden: si falla la red o la
  API está despertando, reintenta una vez de inmediato y después con el envío siguiente,
  al volver la conexión o con «Intentar de nuevo», sin temporizadores. La API recibe cada
  tarea una sola vez (idempotente) y borra los ensayos de un intento a medias antes de
  guardar.
- **Recarga a mitad de una tarea.** Lo medido en esa tarea se pierde y repetirla daría
  ensayos con práctica previa: la sesión queda `interrumpida` (se guarda lo recibido y no
  se procesa, RF-15). Si las dos tareas ya llegaron, la recarga solo vuelve a mostrar el
  SUS. La web sabe que viene de la entrega porque lo recuerda en el estado de React, que
  una recarga borra.
- **Estados.** `en_curso` al crearla; `completada` cuando llegan las dos tareas (el SUS no
  hace falta para procesar); `interrumpida`; `abandonada` si no se completó en 2 horas.
- **Resultado guardado (CT-13).** Al completarse la sesión, `procesarSesion` corre una vez
  con los ensayos guardados y su salida se guarda en `resultado`, con `versionAlgoritmo`.
  Lo que se ve y se exporta es siempre ese resultado: si la versión sube después, los
  valores ya entregados no cambian.
- **Nada identificable (CT-11).** `sesion_registro` y `ensayo_registro` tienen
  `strict: 'throw'`, también en los subesquemas, y el plugin `sinDatosIdentificables`
  aplica `contieneDatoIdentificable` antes de validar. Las rutas además rechazan un envío
  con un campo identificable (422) antes de llegar al modelo. Del navegador se guardan
  solo la familia y la versión mayor («Firefox 131»): `describirNavegador` reduce el
  User-Agent de la entrega y el esquema no acepta otro formato. La exportación no lleva la
  constancia del consentimiento ni fechas: de las fechas solo sale la duración en minutos
  (T17).
- **Vista del profesional (HU-18).** Lista por seudónimo con estado; en una sesión
  completa, los valores por tarea con su unidad, el aviso de M-09 y la versión del
  algoritmo, y las variables de contexto aparte. Las pruebas pasan por
  `buscarVocabularioProhibido` las respuestas de la API, los dos CSV, los textos y las
  pantallas.
- **Exportación (HU-19).** Dos CSV con las sesiones del profesional: ensayos (uno por fila)
  y valores con el SUS (una sesión por fila; las incompletas sin valores). Llevan el
  seudónimo, la versión del algoritmo y del catálogo, el reloj y el navegador. Con T17,
  valores.csv dice además si el dispositivo se entregó (`entregada`, true o false) y, en las
  sesiones completas, la duración en minutos con dos decimales (`duracionMin`): desde la
  última entrega hasta que llegan las dos tareas, sin el SUS (CT-08). Las dos columnas son
  para el análisis de la evaluación (`docs/evaluacion/analisis-adultos.md`). Formato
  acordado: coma como separador, punto decimal y UTF-8 (RFC 4180).
- **Eliminación (HU-19, Ley 1581).** Por seudónimo, escrito como sea
  (`normalizarSeudonimo`): se borran los ensayos y la sesión.
- **SUS.** Los 10 ítems, la escala y la versión viven en `api/contenidos/registro/sus.yaml`
  para cambiar la traducción sin tocar el código; la API los lee al arrancar. `valorSUS` =
  2,5 × (Σ impares (respuesta − 1) + Σ pares (5 − respuesta)). Se guarda con las respuestas
  y la versión del cuestionario. Valora la herramienta, no a la persona, y nunca se llama
  «puntaje».
- **Nada de `fase-ii`.** Su modelo de sesiones guarda edad, sexo y región y depende del
  consentimiento parental; T15 no trae ningún archivo de esa rama.

**Consecuencias.** El Cuadro 13 del documento debe sumar `sesion_registro` y
`ensayo_registro` y el rol de `administrador` (pendiente en el backlog). La prueba con
voluntarios necesita la cuenta del profesional creada en Render y la API despierta antes
de cada sesión (`docs/despliegue.md`). La traducción del SUS es de trabajo y se reemplaza
por la validada (Sevilla-González y colaboradores, 2020) cambiando `sus.yaml` y su
versión. T16 puede usar `/registro/prueba` sin cambios; en la aplicación real el reloj es
siempre `animacion`.
