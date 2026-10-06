# ESPECIFICACIÓN DE REQUERIMIENTOS DEL SISTEMA

## Plataforma web gamificada para la identificación de indicadores preliminares del Trastorno del Espectro Autista (TEA) en población de 4 a 17 años

**Universidad Católica de Colombia — Programa de Ingeniería de Sistemas**
**Trabajo de Grado II**

> **Versión reconciliada.** Los minijuegos, los códigos de indicador y el alcance del
> procesamiento coinciden con los Cuadros 9, 10, 12 y 22 del documento de trabajo de grado
> y con el repositorio `tea-plataforma-mvp`. Los requerimientos RF-40 a RF-43 y las reglas
> RN-08 a RN-10 se incorporaron al retirar la estimación del dominio B4 a partir de los
> ajustes de accesibilidad.

---

## 1. INTRODUCCIÓN

### 1.1 Propósito del documento

Este documento consolida la especificación de requerimientos de la plataforma, expresada en dos niveles complementarios: historias de usuario (perspectiva del usuario final, orientadas a la planeación de iteraciones de desarrollo) y requerimientos funcionales y no funcionales (perspectiva del sistema, orientada a la verificación y validación).

Ambos niveles se vinculan mediante una matriz de trazabilidad que los relaciona con los objetivos específicos del proyecto, de modo que cada elemento desarrollado quede justificado frente a un propósito académico declarado.

### 1.2 Alcance del sistema

La plataforma es un **instrumento de tamizaje (screening)**, no un instrumento diagnóstico. Su función es recolectar, estructurar y presentar datos conductuales obtenidos mediante minijuegos interactivos, alineados con los dominios descritos en el DSM-5-TR, para que un profesional de la salud mental disponga de información preliminar organizada que oriente la decisión de remitir a una evaluación clínica formal.

El sistema **no emite diagnósticos, no asigna categorías clínicas y no sustituye la valoración profesional**. Esta restricción es transversal y se materializa en requerimientos concretos a lo largo del documento (ver RF-28, RF-32, RN-01).

### 1.3 Convenciones de identificación

| Prefijo | Significado |
|---------|-------------|
| HU-NA-xx | Historia de usuario — Niño/Adolescente |
| HU-AC-xx | Historia de usuario — Acudiente / representante legal |
| HU-PR-xx | Historia de usuario — Profesional de salud mental |
| RF-xx | Requerimiento funcional |
| RNF-xx | Requerimiento no funcional |
| RN-xx | Regla de negocio / restricción normativa |

**Priorización (MoSCoW):** M = Must have (obligatorio para el MVP); S = Should have (deseable en el MVP); C = Could have (posterior al MVP); W = Won't have (fuera del alcance de este trabajo de grado).

---

## 2. PERFILES DE USUARIO (ACTORES)

### 2.1 Actor primario — Niño/Adolescente participante

| Atributo | Descripción |
|----------|-------------|
| Rango etario | 4 a 17 años |
| Rol en el sistema | Ejecuta los minijuegos; genera los datos conductuales |
| Nivel de alfabetización digital | Heterogéneo; se asume mínimo |
| Nivel lector | Variable; el sistema no puede depender exclusivamente de texto |
| Condición de acceso | Nunca accede de forma autónoma; requiere sesión habilitada por un acudiente |
| Consideración crítica | Puede presentar hipersensibilidad sensorial, dificultades de atención sostenida o baja tolerancia a la frustración |

**Implicación de diseño:** la interfaz para este actor prioriza el apoyo visual y auditivo sobre el texto, evita la presión temporal explícita y elimina toda retroalimentación que comunique fracaso.

### 2.2 Actor primario — Acudiente / representante legal

| Atributo | Descripción |
|----------|-------------|
| Rol en el sistema | Titular de la autorización de tratamiento de datos del menor; administra el perfil; acompaña la sesión |
| Responsabilidad legal | Único habilitado para otorgar y revocar el consentimiento informado |
| Nivel técnico esperado | Usuario general, sin formación clínica ni técnica |
| Necesidad informativa | Comprender los resultados en lenguaje no especializado y saber qué hacer con ellos |

**Implicación de diseño:** toda información devuelta a este actor debe estar redactada sin terminología clínica y acompañada de una orientación explícita sobre el carácter no diagnóstico del resultado.

### 2.3 Actor primario — Profesional de salud mental

| Atributo | Descripción |
|----------|-------------|
| Perfil | Psicólogo, psiquiatra, neuropsicólogo, terapeuta ocupacional o fonoaudiólogo |
| Rol en el sistema | Consulta e interpreta los datos estructurados; registra observaciones; exporta información |
| Necesidad informativa | Datos desagregados por dominio, trazables, exportables y comparables entre sesiones |
| Condición de acceso | Requiere verificación de credenciales profesionales y vinculación autorizada al menor |

**Implicación de diseño:** este actor recibe el nivel de detalle más alto del sistema, incluyendo métricas crudas y no solo indicadores agregados.

### 2.4 Actor de soporte — Administrador del sistema

Perfil técnico responsable de la verificación de credenciales profesionales, la gestión de catálogos de contenido de los minijuegos y la auditoría de accesos. No constituye un perfil de usuario final para efectos del indicador de historias de usuario, pero genera requerimientos funcionales asociados (RF-36 a RF-39).

---

## 3. HISTORIAS DE USUARIO

> **Indicador asociado:** el presente documento formula **20 historias de usuario** distribuidas en tres perfiles de usuario, superando el umbral mínimo de 15 establecido en la tabla de indicadores clave de desempeño.

### 3.1 Perfil: Niño/Adolescente participante

---

**HU-NA-01 — Ingreso simplificado a la sesión**
**Prioridad:** M

> Como **niño/adolescente participante**, quiero **ingresar a la plataforma seleccionando mi avatar sin escribir contraseñas**, para **poder empezar a jugar sin depender de habilidades de lectura o escritura**.

**Criterios de aceptación:**
- El ingreso se realiza mediante selección gráfica de avatar, sin campos de texto obligatorios.
- La sesión solo puede ser habilitada previamente por un acudiente autenticado.
- La pantalla de ingreso no presenta más de cuatro opciones simultáneas para evitar sobrecarga visual.
- Si no existe una sesión habilitada vigente, el sistema muestra un mensaje visual neutro y no permite continuar.

---

**HU-NA-02 — Instrucciones multimodales previas al minijuego**
**Prioridad:** M

> Como **niño/adolescente participante**, quiero **recibir las instrucciones de cada minijuego con imágenes y narración en audio**, para **entender qué debo hacer aunque no sepa leer**.

**Criterios de aceptación:**
- Cada minijuego presenta instrucciones en formato visual (secuencia ilustrada) y auditivo (narración) de forma simultánea.
- Las instrucciones pueden repetirse un número ilimitado de veces sin costo en el registro de la sesión.
- Se incluye un ejemplo guiado (ronda de práctica) cuyos resultados **no** se registran como datos de tamizaje.
- La narración puede silenciarse sin perder el contenido visual equivalente.

---

**HU-NA-03 — MJ-1. El detective de miradas**
**Prioridad:** M

> Como **niño/adolescente participante**, quiero **identificar la emoción que expresa un rostro ilustrado**, para **completar la actividad de manera comprensible y sin sentirme evaluado**.

**Criterios de aceptación:**
- Se presenta un rostro ilustrado y un conjunto de opciones de respuesta en formato icónico y textual.
- La dificultad progresa desde emociones básicas (alegría, tristeza, enojo, miedo) hacia emociones complejas y expresiones ambiguas.
- El sistema registra, por cada ítem: emoción presentada, emoción seleccionada, tiempo de reacción en milisegundos y número de cambios de selección antes de confirmar.
- No se muestra un contador de aciertos ni de errores durante la ejecución.
- Un ítem no respondido tras un intervalo definido se registra como "sin respuesta" y avanza automáticamente, sin mensaje de penalización.

---

**HU-NA-04 — MJ-2. La fiesta de sorpresas**
**Prioridad:** M

> Como **niño/adolescente participante**, quiero **ordenar las viñetas de una historieta según lo que pasa**, para **completar la historia de una forma que me resulte entretenida**.

**Criterios de aceptación:**
- Se presenta un conjunto de viñetas desordenadas que representan una situación social con desenlace inferible.
- La interacción se realiza mediante arrastrar y soltar, con alternativa por selección secuencial para dispositivos o usuarios con dificultad motora fina.
- El sistema registra: orden final propuesto, orden correcto, número de reubicaciones, tiempo total y tiempo hasta el primer movimiento.
- Se incluyen ítems específicamente orientados a inferencia de estados mentales ajenos (indicadores de Teoría de la Mente).
- La historieta se muestra completa y ordenada al finalizar el ítem, como cierre narrativo y no como corrección.

---

**HU-NA-05 — MJ-3. El taller que cambia**
**Prioridad:** M

> Como **niño/adolescente participante**, quiero **seguir un patrón rítmico que a veces cambia**, para **participar en una actividad dinámica que puedo realizar a mi propio ritmo**.

**Criterios de aceptación:**
- El sistema presenta una secuencia rítmica o de patrón que el participante debe reproducir.
- En puntos predefinidos, la regla del patrón cambia sin aviso explícito, para observar la adaptación a la nueva condición.
- El sistema registra: latencia de respuesta por estímulo, número de errores perseverativos (mantener la regla anterior tras el cambio) y número de ensayos hasta recuperar el desempeño previo al cambio.
- Los estímulos visuales no incluyen parpadeos superiores a 3 Hz ni cambios cromáticos de alto contraste súbitos.
- El volumen del componente auditivo es ajustable y desactivable sin impedir la ejecución del minijuego.

---

**HU-NA-06 — Pausa y salida sin penalización**
**Prioridad:** M

> Como **niño/adolescente participante**, quiero **poder pausar o salir del minijuego en cualquier momento**, para **detenerme cuando me sienta cansado o incómodo sin que eso se interprete como un fracaso**.

**Criterios de aceptación:**
- Existe un control de pausa visible y persistente durante toda la ejecución.
- Al pausar, el cronómetro interno se detiene y el intervalo de pausa se excluye de los tiempos de reacción registrados.
- Al salir, el sistema conserva los ítems ya completados y marca la sesión como "incompleta", sin mensajes de advertencia dirigidos al participante.
- Ningún mensaje del sistema dirigido al participante emplea lenguaje de fracaso, pérdida o error.

---

**HU-NA-07 — Refuerzo positivo no competitivo**
**Prioridad:** S

> Como **niño/adolescente participante**, quiero **recibir un reconocimiento agradable al terminar cada actividad**, para **sentir que completé algo, sin compararme con nadie**.

**Criterios de aceptación:**
- El refuerzo se otorga por **finalización**, nunca por desempeño.
- No se muestran puntajes numéricos, calificaciones, estrellas por rendimiento, rankings ni comparación con otros participantes.
- El refuerzo es breve, con animación de baja intensidad y sonido opcional.
- El refuerzo es idéntico independientemente del número de respuestas correctas.

---

### 3.2 Perfil: Acudiente / representante legal

---

**HU-AC-01 — Registro de cuenta del acudiente**
**Prioridad:** M

> Como **acudiente**, quiero **crear una cuenta con mis datos personales**, para **poder registrar al menor bajo mi responsabilidad y acceder a la plataforma de forma segura**.

**Criterios de aceptación:**
- El registro solicita únicamente los datos necesarios para la identificación y el contacto (principio de minimización).
- El sistema exige la declaración expresa de mayoría de edad y de la condición de representante legal del menor.
- La contraseña cumple una política mínima de complejidad y se almacena mediante función de derivación de clave con salt.
- La cuenta se activa mediante verificación del correo electrónico registrado.

---

**HU-AC-02 — Otorgamiento del consentimiento informado**
**Prioridad:** M

> Como **acudiente**, quiero **leer y aceptar de forma explícita la autorización de tratamiento de datos antes de que se recolecte cualquier información del menor**, para **conocer y controlar el uso que se dará a esos datos**.

**Criterios de aceptación:**
- El sistema **impide técnicamente** la creación de un perfil de menor y la ejecución de cualquier minijuego mientras no exista consentimiento registrado.
- El texto de autorización especifica: finalidad, tipo de datos recolectados, tiempo de conservación, responsable del tratamiento, derechos del titular y canal para ejercerlos.
- El consentimiento se otorga mediante acción afirmativa inequívoca; no se admiten casillas premarcadas ni consentimiento tácito.
- El sistema almacena registro de la aceptación con marca temporal y versión del texto aceptado.
- El acudiente puede descargar una copia del documento aceptado.

---

**HU-AC-03 — Registro del perfil del menor**
**Prioridad:** M

> Como **acudiente**, quiero **registrar los datos básicos del menor**, para **que las actividades se ajusten a su edad y los resultados queden asociados correctamente**.

**Criterios de aceptación:**
- Se solicitan exclusivamente: identificador asignado por el acudiente (no documento de identidad), fecha de nacimiento y sexo asignado al nacer.
- El sistema calcula el rango etario y valida que se encuentre entre 4 y 17 años; fuera de ese rango, no permite continuar.
- El sistema asigna un identificador pseudonimizado interno que es el utilizado en todos los registros de datos conductuales.
- Un acudiente puede registrar más de un menor bajo la misma cuenta.

---

**HU-AC-04 — Habilitación y acompañamiento de la sesión**
**Prioridad:** M

> Como **acudiente**, quiero **habilitar una sesión de juego para el menor y conocer las condiciones recomendadas**, para **garantizar que la actividad se realice en un entorno adecuado**.

**Criterios de aceptación:**
- La sesión se habilita desde la cuenta autenticada del acudiente y tiene una vigencia limitada.
- Antes de iniciar, el sistema presenta recomendaciones del entorno (nivel de ruido, iluminación, dispositivo, ausencia de interrupciones).
- El acudiente puede finalizar la sesión de forma remota desde su propia vista.
- El sistema registra si la sesión fue completada, interrumpida o abandonada.

---

**HU-AC-05 — Consulta de resultados en lenguaje no clínico**
**Prioridad:** M

> Como **acudiente**, quiero **ver un resumen comprensible de la participación del menor**, para **entender qué se observó sin interpretaciones que yo no esté en capacidad de hacer**.

**Criterios de aceptación:**
- El resumen se redacta sin terminología clínica, sin nombres de dominios diagnósticos y sin puntajes de riesgo.
- Se presenta de forma prominente y no omitible la advertencia de que el resultado es un tamizaje preliminar y no constituye un diagnóstico.
- El resumen incluye una orientación explícita sobre el paso siguiente recomendado (consulta con profesional de salud mental).
- No se emplean colores de alarma (rojo/verde) asociados a niveles de riesgo.

---

**HU-AC-06 — Ejercicio de derechos sobre los datos**
**Prioridad:** M

> Como **acudiente**, quiero **poder consultar, actualizar, revocar la autorización y solicitar la supresión de los datos del menor**, para **ejercer los derechos que me otorga la normativa de protección de datos personales**.

**Criterios de aceptación:**
- Existe una sección específica y accesible desde el menú principal para el ejercicio de estos derechos.
- La revocación del consentimiento suspende de forma inmediata toda recolección adicional de datos.
- La solicitud de supresión se atiende dentro de los plazos establecidos por la normativa aplicable y se confirma por escrito al acudiente.
- El sistema registra en bitácora toda solicitud recibida y su gestión, conservando la trazabilidad del proceso.

---

**HU-AC-07 — Generación de reporte para el profesional**
**Prioridad:** S

> Como **acudiente**, quiero **generar un reporte descargable de los resultados**, para **poder llevarlo a una consulta con un profesional de la salud mental**.

**Criterios de aceptación:**
- El reporte se genera en formato PDF con identificación del menor mediante el identificador asignado por el acudiente.
- Incluye fecha de las sesiones, minijuegos completados y la advertencia de carácter no diagnóstico en todas sus páginas.
- El nivel de detalle es intermedio: superior al resumen del acudiente e inferior a la vista completa del profesional.
- La generación del reporte queda registrada en la bitácora de accesos.

---

---

**HU-AC-08 — Cuestionario de observación conductual**
**Prioridad:** M

> Como **acudiente**, quiero **responder un cuestionario breve sobre el comportamiento cotidiano del menor**, para **complementar la información que la plataforma no puede observar durante el juego**.

**Criterios de aceptación:**
- El instrumento consta de quince ítems repartidos en cinco escalas de tres, en escala ordinal de frecuencia y en lenguaje no clínico.
- Se habilita después de la primera sesión completada, para no incrementar la carga del registro inicial.
- El avance se guarda por ítem y la sesión puede reanudarse desde el último ítem respondido.
- Las respuestas se presentan al profesional como valores observados, sin puntaje agregado ni categoría de riesgo.
- Se administra en sesión independiente de la del menor.


### 3.3 Perfil: Profesional de salud mental

---

**HU-PR-01 — Acceso verificado a la plataforma**
**Prioridad:** M

> Como **profesional de salud mental**, quiero **acceder mediante credenciales verificadas por la plataforma**, para **garantizar que solo personal habilitado consulte información clínica sensible**.

**Criterios de aceptación:**
- El registro exige número de tarjeta profesional y especialidad, sujetos a verificación por parte del administrador.
- La cuenta permanece en estado "pendiente de verificación" y sin acceso a datos de menores hasta su aprobación.
- El acceso incorpora un segundo factor de autenticación.
- Toda sesión iniciada se registra con marca temporal en la bitácora de auditoría.

---

**HU-PR-02 — Vinculación autorizada a un menor**
**Prioridad:** M

> Como **profesional de salud mental**, quiero **acceder únicamente a los perfiles de menores cuyos acudientes me hayan autorizado explícitamente**, para **operar dentro del marco de autorización otorgado por el titular de los datos**.

**Criterios de aceptación:**
- La vinculación se origina en una acción del acudiente, mediante código de vinculación de un solo uso y vigencia limitada.
- El profesional no puede buscar, listar ni acceder a perfiles no vinculados.
- El acudiente puede revocar la vinculación en cualquier momento, con efecto inmediato sobre el acceso.
- Cada acceso a un perfil vinculado se registra en la bitácora de auditoría.

---

**HU-PR-03 — Tablero de indicadores por dominio**
**Prioridad:** M

> Como **profesional de salud mental**, quiero **visualizar los resultados organizados por dominio conductual del DSM-5-TR**, para **interpretar los datos dentro de un marco de referencia reconocido**.

**Criterios de aceptación:**
- El tablero agrupa las métricas capturadas según los dominios conductuales definidos en la tabla de operacionalización del proyecto.
- Cada indicador presenta el valor observado, la métrica de la que se deriva y el minijuego que la originó.
- El sistema presenta datos observados y **no** genera clasificaciones, categorías diagnósticas ni puntajes de riesgo global.
- Se indica de forma explícita cuando un dominio cuenta con datos insuficientes por sesión incompleta.

---

**HU-PR-04 — Acceso a métricas desagregadas**
**Prioridad:** S

> Como **profesional de salud mental**, quiero **consultar el detalle ítem por ítem de cada minijuego**, para **analizar patrones que los indicadores agregados no permiten observar**.

**Criterios de aceptación:**
- Es posible descender desde el indicador agregado hasta el registro individual de cada ítem.
- Para MJ-1 (detective de miradas) se presenta la matriz de confusión entre emociones presentadas y seleccionadas.
- Se distinguen explícitamente los ítems "sin respuesta" de los ítems respondidos incorrectamente.
- Los tiempos de reacción se presentan en milisegundos, con indicación de los intervalos excluidos por pausa.

---

**HU-PR-05 — Comparación entre sesiones**
**Prioridad:** S

> Como **profesional de salud mental**, quiero **comparar los resultados de distintas sesiones de un mismo menor**, para **observar la evolución de los indicadores en el tiempo**.

**Criterios de aceptación:**
- El sistema permite seleccionar dos o más sesiones del mismo menor y presentarlas de forma paralela.
- La comparación se restringe a sesiones con el mismo minijuego y nivel de dificultad equivalente.
- Se advierte explícitamente sobre el posible efecto de aprendizaje por repetición del instrumento.
- Las sesiones incompletas se identifican visualmente y se excluyen por defecto de la comparación.

---

**HU-PR-06 — Registro de observaciones profesionales**
**Prioridad:** C

> Como **profesional de salud mental**, quiero **registrar observaciones cualitativas asociadas a una sesión**, para **complementar los datos cuantitativos con mi criterio clínico**.

**Criterios de aceptación:**
- Las observaciones se asocian a una sesión específica y quedan firmadas con la identificación del profesional y la marca temporal.
- Las observaciones no son visibles para el acudiente ni para el participante.
- Las observaciones son editables por su autor durante un período definido y posteriormente quedan en modo de solo lectura, conservando el historial de versiones.

---

**HU-PR-07 — Exportación de datos estructurados**
**Prioridad:** S

> Como **profesional de salud mental**, quiero **exportar los datos de las sesiones en un formato estructurado**, para **integrarlos a mi propio proceso de análisis o a la historia clínica del paciente**.

**Criterios de aceptación:**
- La exportación se ofrece en formato CSV (datos crudos) y PDF (informe estructurado).
- El archivo exportado emplea el identificador pseudonimizado y no incluye datos directamente identificables.
- Todo archivo exportado incluye la leyenda de carácter no diagnóstico del instrumento.
- Cada exportación se registra en la bitácora de auditoría con identificación del profesional, fecha y alcance de los datos exportados.

---

## 4. REQUERIMIENTOS FUNCIONALES

### 4.1 Módulo de gestión de cuentas y autenticación

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-01 | El sistema debe permitir el registro de cuentas de acudiente mediante correo electrónico, contraseña y declaración expresa de representación legal del menor. | HU-AC-01 | M |
| RF-02 | El sistema debe permitir el registro de cuentas de profesional de salud mental, incorporando número de tarjeta profesional y especialidad, en estado inicial de "pendiente de verificación". | HU-PR-01 | M |
| RF-03 | El sistema debe autenticar a los usuarios mediante credenciales y emitir un token de sesión con tiempo de expiración definido. | HU-AC-01, HU-PR-01 | M |
| RF-04 | El sistema debe requerir un segundo factor de autenticación para el acceso de cuentas con perfil profesional. | HU-PR-01 | M |
| RF-05 | El sistema debe implementar un mecanismo de recuperación de contraseña mediante enlace de un solo uso con vigencia limitada. | HU-AC-01 | S |

### 4.2 Módulo de consentimiento informado y protección de datos

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-06 | El sistema debe presentar el texto completo de autorización de tratamiento de datos personales antes de habilitar cualquier funcionalidad de recolección. | HU-AC-02 | M |
| RF-07 | El sistema debe bloquear la creación de perfiles de menores y la ejecución de minijuegos mientras no exista un consentimiento vigente asociado a la cuenta del acudiente. | HU-AC-02 | M |
| RF-08 | El sistema debe almacenar, por cada consentimiento otorgado, la identificación del acudiente, la marca temporal y la versión del texto aceptado. | HU-AC-02 | M |
| RF-09 | El sistema debe proveer funcionalidades para consultar, actualizar, revocar la autorización y solicitar la supresión de los datos del menor. | HU-AC-06 | M |
| RF-10 | El sistema debe suspender de forma inmediata toda recolección de datos asociada a un menor cuando se registre la revocación del consentimiento. | HU-AC-06 | M |

### 4.3 Módulo de gestión del perfil del menor

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-11 | El sistema debe permitir el registro de perfiles de menores con identificador asignado por el acudiente, fecha de nacimiento y sexo asignado al nacer. | HU-AC-03 | M |
| RF-12 | El sistema debe validar que la edad calculada del menor se encuentre dentro del rango de 4 a 17 años y rechazar el registro fuera de dicho rango. | HU-AC-03 | M |
| RF-13 | El sistema debe generar y asociar un identificador pseudonimizado a cada perfil de menor, y utilizarlo como llave en todos los registros de datos conductuales. | HU-AC-03, HU-PR-07 | M |

### 4.4 Módulo del motor de minijuegos

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-14 | El sistema debe habilitar sesiones de juego con vigencia limitada, generadas exclusivamente desde una cuenta de acudiente autenticada. | HU-NA-01, HU-AC-04 | M |
| RF-15 | El sistema debe presentar las instrucciones de cada minijuego en formato visual y auditivo simultáneo, con posibilidad de repetición ilimitada. | HU-NA-02 | M |
| RF-16 | El sistema debe ejecutar una ronda de práctica previa a cada minijuego, cuyos resultados se excluyen del conjunto de datos de tamizaje. | HU-NA-02 | M |
| RF-17 | El sistema debe implementar MJ-1 (detective de miradas) con progresión de dificultad desde emociones básicas hacia expresiones complejas y ambiguas. | HU-NA-03 | M |
| RF-18 | El sistema debe implementar MJ-2 (fiesta de sorpresas) mediante secuenciación de viñetas, con interacción por arrastre y alternativa por selección secuencial. | HU-NA-04 | M |
| RF-19 | El sistema debe implementar MJ-3 (taller que cambia) con cambios de regla no anunciados en puntos predefinidos de la secuencia. | HU-NA-05 | M |
| RF-20 | El sistema debe proveer un control de pausa persistente que detenga la contabilización del tiempo y excluya el intervalo pausado de las métricas temporales. | HU-NA-06 | M |

### 4.5 Módulo de captura y persistencia de métricas

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-21 | El sistema debe registrar el tiempo de reacción de cada ítem en milisegundos, utilizando un reloj monotónico de alta resolución del lado del cliente. | HU-NA-03, HU-NA-04, HU-NA-05 | M |
| RF-22 | El sistema debe registrar, por cada ítem, el estímulo presentado, la respuesta seleccionada, la respuesta esperada y el número de rectificaciones previas a la confirmación. | HU-NA-03, HU-PR-04 | M |
| RF-23 | El sistema debe distinguir y almacenar de forma diferenciada los ítems omitidos ("sin respuesta") de los ítems respondidos de manera incorrecta. | HU-PR-04 | M |
| RF-24 | El sistema debe registrar el estado final de cada sesión como completada, interrumpida o abandonada. | HU-AC-04, HU-PR-05 | M |
| RF-25 | El sistema debe conservar localmente los datos de la sesión en curso y sincronizarlos al restablecerse la conexión, ante una interrupción de red. | HU-NA-06 | S |

### 4.6 Módulo de procesamiento e indicadores

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-26 | El sistema debe calcular los doce indicadores de desempeño (CC-01 a CC-12) y las cinco escalas de reporte del cuidador (RC-01 a RC-05), agrupándolos por dominio del DSM-5-TR según la tabla de operacionalización. | HU-PR-03 | M |
| RF-27 | El sistema debe calcular la matriz de confusión entre emociones presentadas y emociones seleccionadas para MJ-1 (detective de miradas). | HU-PR-04 | S |
| RF-28 | El sistema **no debe** generar clasificaciones diagnósticas, categorías clínicas, bandas de priorización, puntajes de riesgo global, puntos de corte ni recomendaciones terapéuticas. Reporta valores observados. | RN-01 | M |
| RF-29 | El sistema debe identificar y señalar los dominios con datos insuficientes derivados de sesiones incompletas. | HU-PR-03 | S |

### 4.7 Módulo de reportes y visualización

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-30 | El sistema debe presentar al acudiente un resumen de la participación redactado sin terminología clínica ni puntajes de riesgo. | HU-AC-05 | M |
| RF-31 | El sistema debe presentar al profesional un tablero de indicadores agrupados por dominio, con navegación descendente hasta el registro individual de cada ítem. | HU-PR-03, HU-PR-04 | M |
| RF-32 | El sistema debe incluir la advertencia sobre el carácter no diagnóstico del instrumento en toda vista de resultados y en la totalidad de las páginas de los documentos exportados. | RN-01 | M |
| RF-33 | El sistema debe permitir la comparación paralela de sesiones de un mismo menor, restringida a minijuegos y niveles de dificultad equivalentes. | HU-PR-05 | S |
| RF-34 | El sistema debe permitir la exportación de datos en formato CSV y la generación de informes en formato PDF, empleando siempre el identificador pseudonimizado. | HU-AC-07, HU-PR-07 | S |
| RF-35 | El sistema debe permitir al profesional registrar observaciones cualitativas asociadas a una sesión, no visibles para el acudiente ni para el participante. | HU-PR-06 | C |

### 4.8 Módulo de administración, vinculación y trazabilidad

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-36 | El sistema debe permitir al administrador verificar o rechazar las solicitudes de registro de cuentas profesionales. | HU-PR-01 | M |
| RF-37 | El sistema debe implementar la vinculación entre profesional y menor mediante código de un solo uso generado por el acudiente, con vigencia limitada y revocable. | HU-PR-02 | M |
| RF-38 | El sistema debe mantener una bitácora de auditoría que registre accesos a perfiles, exportaciones de datos, otorgamientos y revocaciones de consentimiento, con identificación de usuario y marca temporal. | HU-AC-06, HU-PR-02, HU-PR-07 | M |
| RF-39 | El sistema debe permitir al administrador gestionar el catálogo de contenidos de los minijuegos (estímulos, secuencias y parámetros de dificultad) sin requerir un nuevo despliegue de la aplicación. | — | C |

### 4.9 Módulo de reporte del cuidador

| ID | Requerimiento | HU asociada | Prioridad |
|----|---------------|-------------|-----------|
| RF-40 | El sistema debe presentar al acudiente un instrumento estructurado de observación conductual de quince ítems, repartidos en cinco escalas de tres (RC-01 a RC-05), aplicable con posterioridad a la primera sesión completada. | HU-AC-08 | M |
| RF-41 | El sistema debe registrar las respuestas del instrumento asociadas al identificador seudonimizado del menor y a la fecha de diligenciamiento, admitiendo avance guardado por ítem. | HU-AC-08 | M |
| RF-42 | El sistema debe presentar al profesional el valor observado de cada escala integrado al tablero, identificando de forma explícita su origen como reporte de informante y no como desempeño observado. | HU-PR-03 | M |
| RF-43 | El sistema **no debe** estimar el dominio B4 a partir de los ajustes del panel de accesibilidad; dicho dominio se cubre exclusivamente mediante RC-05. | RN-08 | M |


---

## 5. REQUERIMIENTOS NO FUNCIONALES

### 5.1 Usabilidad

| ID | Requerimiento | Criterio de verificación |
|----|---------------|--------------------------|
| RNF-01 | La interfaz destinada al participante debe ser operable sin dependencia de la lectura de texto. | Prueba con participantes preescolares no lectores; tasa de finalización sin asistencia verbal del acompañante. |
| RNF-02 | La plataforma debe alcanzar el umbral de usabilidad establecido en la tabla de indicadores clave de desempeño del proyecto, medido mediante la escala SUS aplicada a acudientes y profesionales. | Aplicación de la escala SUS al finalizar las pruebas con usuarios. |
| RNF-03 | Un acudiente sin experiencia previa debe completar el flujo de registro, consentimiento y habilitación de la primera sesión sin asistencia externa. | Prueba de usabilidad con tareas cronometradas y registro de puntos de bloqueo. |

### 5.2 Accesibilidad y diseño neuroeducativo

| ID | Requerimiento | Criterio de verificación |
|----|---------------|--------------------------|
| RNF-04 | La plataforma debe cumplir el nivel AA de las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 en contraste, tamaño de objetivos táctiles y navegación por teclado. | Auditoría con herramienta automatizada complementada con revisión manual. |
| RNF-05 | La interfaz no debe presentar destellos ni parpadeos con frecuencia superior a 3 Hz, ni transiciones cromáticas de alto contraste no anticipadas. | Revisión de todas las animaciones implementadas contra el criterio WCAG 2.3.1. |
| RNF-06 | Todo componente auditivo debe ser desactivable de forma independiente sin impedir la ejecución de la actividad. | Prueba funcional por minijuego con audio desactivado. |
| RNF-07 | La estructura de navegación debe ser predecible y consistente entre minijuegos: misma ubicación de controles, misma secuencia de pantallas y mismos patrones de interacción. | Revisión heurística de consistencia entre los tres minijuegos. |
| RNF-08 | El sistema debe implementar la totalidad de los principios neuroeducativos definidos en el marco teórico del proyecto, verificable mediante revisión de experto. | Lista de chequeo de principios neuroeducativos diligenciada por evaluador experto. |

### 5.3 Rendimiento

| ID | Requerimiento | Criterio de verificación |
|----|---------------|--------------------------|
| RNF-09 | La medición del tiempo de reacción debe realizarse con un reloj monotónico de alta resolución, con error de medición inferior a 50 ms respecto a la interacción real del usuario. | Prueba de calibración con dispositivo de entrada automatizado. |
| RNF-10 | El tiempo de carga inicial de un minijuego no debe superar los 3 segundos en una conexión de banda ancha estándar. | Medición en herramienta de auditoría de rendimiento web. |
| RNF-11 | La renderización de las animaciones debe sostenerse por encima de 30 cuadros por segundo en dispositivos de gama media. | Perfilado de rendimiento en dispositivo de referencia. |

### 5.4 Seguridad y privacidad

| ID | Requerimiento | Criterio de verificación |
|----|---------------|--------------------------|
| RNF-12 | Toda comunicación entre cliente y servidor debe realizarse sobre protocolo cifrado TLS. | Verificación de configuración del despliegue. |
| RNF-13 | Las contraseñas deben almacenarse mediante función de derivación de clave con salt; en ningún caso en texto plano ni con funciones de resumen simples. | Revisión de código e inspección del esquema de datos. |
| RNF-14 | El sistema debe aplicar el principio de minimización: no se recolectan datos personales no requeridos por una finalidad declarada en el consentimiento. | Inventario de datos contrastado contra el texto de autorización. |
| RNF-15 | El sistema debe implementar control de acceso basado en roles, verificado del lado del servidor en cada solicitud a recursos protegidos. | Pruebas de acceso no autorizado por rol. |

### 5.5 Compatibilidad, mantenibilidad y disponibilidad

| ID | Requerimiento | Criterio de verificación |
|----|---------------|--------------------------|
| RNF-16 | La plataforma debe operar en navegadores basados en Chromium, Firefox y Safari, en sus dos versiones estables más recientes. | Matriz de pruebas de compatibilidad. |
| RNF-17 | La interfaz debe ser responsiva, con soporte prioritario para tableta en orientación horizontal y escritorio. | Pruebas en resoluciones de referencia. |
| RNF-18 | El código fuente debe mantenerse bajo control de versiones, con historial de cambios trazable y documentación técnica de la API. | Repositorio y documentación de endpoints. |
| RNF-19 | El sistema debe conservar la disponibilidad durante el período de pruebas con usuarios, con capacidad de restablecer el servicio ante fallos de despliegue. | Registro de incidentes durante la fase de validación. |

---

## 6. REGLAS DE NEGOCIO Y RESTRICCIONES NORMATIVAS

| ID | Regla | Fundamento |
|----|-------|------------|
| RN-01 | La plataforma constituye un instrumento de tamizaje y no de diagnóstico. No emite diagnósticos, categorías clínicas ni recomendaciones terapéuticas. | Alcance declarado del proyecto; RF-28, RF-32. |
| RN-02 | Ningún dato de un menor puede recolectarse sin autorización previa, expresa e informada de su representante legal. | Régimen de protección de datos personales (Habeas Data); RF-06, RF-07. |
| RN-03 | Los datos personales de niños, niñas y adolescentes tienen naturaleza de dato sensible y reciben el nivel de protección más alto previsto en el sistema. | Régimen especial de protección de datos de menores. |
| RN-04 | El participante nunca accede a la plataforma de forma autónoma; toda sesión requiere habilitación previa por un acudiente autenticado. | RF-14; principio de acompañamiento adulto. |
| RN-05 | El acceso profesional a los datos de un menor requiere autorización explícita del acudiente, revocable en cualquier momento con efecto inmediato. | RF-37; principio de finalidad y circulación restringida. |
| RN-06 | Los datos exportados o transmitidos fuera del sistema emplean exclusivamente el identificador pseudonimizado. | RF-13, RF-34; principio de minimización. |
| RN-07 | La retroalimentación dirigida al participante no puede comunicar fracaso, error ni comparación con otros participantes. | Principio de diseño neuroeducativo; HU-NA-06, HU-NA-07. |
| RN-08 | Los ajustes del panel de accesibilidad son metadatos de contexto y no constituyen medida de ningún dominio conductual. Convertir una opción de accesibilidad en dato clínico penalizaría su uso. | Tabla de operacionalización, sección 5.1; RF-43. |
| RN-09 | Los dominios B1, B3 y B4, la vertiente expresiva de A2 y la conducta relacional de A3 no son observables en la ejecución de una tarea en navegador y se cubren mediante reporte del informante. Todo dato mostrado declara su origen. | Tabla de operacionalización, sección 6; RF-42. |
| RN-10 | Un ítem sin respuesta se registra como omitido y se excluye del cálculo de precisión; nunca se computa como error. | RF-23; Cuadro 22 del documento. |

---

## 7. MATRIZ DE TRAZABILIDAD

> **Nota de verificación:** la redacción de los objetivos específicos que se presenta a continuación es una formulación de referencia. **Debe contrastarse y ajustarse a la redacción literal del capítulo de objetivos del documento de trabajo de grado** antes de su incorporación definitiva.

| Objetivo específico | Historias de usuario | Requerimientos funcionales | Requerimientos no funcionales |
|---------------------|----------------------|----------------------------|-------------------------------|
| **OE1** — Levantamiento y especificación de los requerimientos de la plataforma a partir de las necesidades de los tres perfiles de usuario. | HU-NA-01 a HU-NA-07; HU-AC-01 a HU-AC-08; HU-PR-01 a HU-PR-07 (20 historias) | Documento completo | — |
| **OE2** — Diseño de los componentes gamificados alineados con los dominios conductuales del DSM-5-TR. | HU-NA-03, HU-NA-04, HU-NA-05, HU-AC-08, HU-PR-03 | RF-17 a RF-19, RF-21 a RF-23, RF-26, RF-27, RF-40 a RF-43 | RNF-09 |
| **OE3** — Desarrollo del producto mínimo viable incorporando principios neuroeducativos. | HU-NA-01, HU-NA-02, HU-NA-06, HU-NA-07 | RF-14, RF-15, RF-16, RF-20 | RNF-04, RNF-05, RNF-06, RNF-07, RNF-08 |
| **OE4** — Validación de la plataforma con usuarios y verificación del cumplimiento normativo. | HU-AC-02, HU-AC-05, HU-AC-06, HU-PR-05, HU-PR-07 | RF-06 a RF-10, RF-30, RF-32, RF-33, RF-34, RF-38 | RNF-01, RNF-02, RNF-03, RNF-12 a RNF-15 |

### 7.1 Cobertura de perfiles de usuario

| Perfil | Historias formuladas | Requerimientos funcionales derivados |
|--------|----------------------|--------------------------------------|
| Niño/Adolescente participante | 7 | 11 |
| Acudiente / representante legal | 8 | 19 |
| Profesional de salud mental | 7 | 14 |
| **Total (con solapamientos)** | **20** | **43** |

---

## 8. PLAN DE ITERACIONES SUGERIDO

| Iteración | Alcance | Historias incluidas | Entregable verificable |
|-----------|---------|---------------------|------------------------|
| 1 | MJ-1 en React, sin persistencia; captura de métricas en memoria y volcado a JSON. | HU-NA-02, HU-NA-03, HU-NA-06, HU-NA-07 | Prototipo funcional y estructura de datos validada. |
| 2 | Definición del esquema de datos en MongoDB derivado de la estructura JSON validada; API REST mínima de sesiones. | RF-21 a RF-25 | Persistencia de sesiones y contrato de API documentado. |
| 3 | Cuentas, autenticación y flujo completo de consentimiento informado. | HU-AC-01, HU-AC-02, HU-AC-03, HU-AC-04 | Flujo habilitante para las pruebas con usuarios. |
| 4 | Vistas de resultados para acudiente y profesional; exportación de datos. | HU-AC-05, HU-PR-01 a HU-PR-04, HU-PR-07 | Tablero de indicadores y reportes exportables. |
| 5 | MJ-2 y MJ-3. | HU-NA-04, HU-NA-05 | Cobertura completa de dominios conductuales. |
| 6 | Gestión de derechos sobre los datos, bitácora de auditoría y ajustes derivados de las pruebas con usuarios. | HU-AC-06, HU-AC-07, HU-PR-05, HU-PR-06 | Cumplimiento normativo verificable y ajustes de usabilidad. |

**Observación sobre la secuencia:** la iteración 3 (consentimiento informado) constituye una precondición legal para la ejecución de pruebas con participantes reales. Su postergación bloquearía la fase de validación con la muestra de 30 a 50 participantes prevista en el diseño metodológico.

---

## 9. NOTAS PARA LA INTEGRACIÓN DOCUMENTAL

**Ubicación sugerida en el documento de trabajo de grado:**

- **Capítulo de diseño metodológico, sección de instrumentos (6.2):** la tabla de operacionalización de variables y los requerimientos funcionales de los módulos de captura y procesamiento (secciones 4.5 y 4.6) constituyen la descripción técnica de los instrumentos de recolección.
- **Capítulo de desarrollo / diseño del sistema:** secciones 2, 4 y 5 del presente documento.
- **Anexos:** sección 3 (historias de usuario completas con criterios de aceptación) y sección 7 (matriz de trazabilidad).
- **Sección de productos y entregables:** sección 8 (plan de iteraciones), articulada con el cronograma de 16 semanas.

**Elementos pendientes de definición antes de la versión final:**

1. Contrastar la redacción de los objetivos específicos en la sección 7 con el texto literal del documento.
2. Verificar que el umbral SUS referido en RNF-02 corresponda al valor consignado en la tabla de indicadores clave de desempeño, sin introducir modificaciones no justificadas.
3. Elaborar la tabla de operacionalización que vincula cada métrica capturada con el dominio conductual del DSM-5-TR correspondiente, insumo directo para RF-26 y para el indicador de cobertura de dominios.
4. Confirmar el listado de principios neuroeducativos referido en RNF-08 contra el marco teórico del documento.
