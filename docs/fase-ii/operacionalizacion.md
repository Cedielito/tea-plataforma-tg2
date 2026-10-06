# TABLA DE OPERACIONALIZACIÓN DE VARIABLES

## Vinculación entre las métricas capturadas y los dominios del DSM-5-TR

**Universidad Católica de Colombia — Ingeniería de Sistemas y Computación**
**Trabajo de Grado II**

> **Versión reconciliada.** Este documento es coherente con los Cuadros 9, 10, 12 y 22
> del documento de trabajo de grado y con la implementación del repositorio
> `tea-plataforma-mvp` (`src/dominio/indicadores/`). Cualquier cambio en uno de los tres
> exige revisar los otros dos.

---

## 1. ADVERTENCIA METODOLÓGICA

Las métricas aquí definidas **no son medidas directas de los criterios diagnósticos del
DSM-5-TR**. El manual describe criterios que se establecen mediante observación clínica,
entrevista y juicio profesional; no define pruebas de desempeño ni puntos de corte.

Lo que la plataforma captura son desempeños en tareas experimentales cuyos constructos
subyacentes guardan relación documentada con los dominios del trastorno. La relación es
indirecta y mediada por un constructo psicológico intermedio. La formulación correcta es
que la plataforma **recolecta indicadores conductuales asociados al dominio**, nunca que
lo mide.

**Ausencia de puntos de corte.** El sistema no establece umbrales, valores de referencia
ni categorías de riesgo. Determinar un punto de corte exigiría un estudio de validación
con muestra normativa amplia, estratificada por edad y con grupo de comparación clínico,
lo cual excede el alcance de este trabajo (muestra prevista: 30 a 50 participantes de 4 a
17 años). El sistema reporta **valores observados** y el profesional interpreta.

---

## 2. LA CADENA DE OPERACIONALIZACIÓN

```
DOMINIO DSM-5-TR
      ↓
CONSTRUCTO PSICOLÓGICO INTERMEDIO
      ↓
CONDUCTA OBSERVABLE EN LA TAREA
      ↓
M�TRICA OPERACIONAL (unidad, cálculo)
      ↓
CAMPO EN EL MODELO DE DATOS
```

Ninguna métrica se incorpora si no puede recorrerse la cadena completa. Este criterio es
el que impide que el desarrollo genere datos sin propósito declarado, y es también el que
obligó a retirar del sistema la estimación del dominio B4 a partir de los ajustes de
accesibilidad (ver sección 6).

---

## 3. INDICADORES DE DESEMPEÑO EN TAREA (CC-01 a CC-12)

Corresponden al Cuadro 12 del documento e implementan en
`src/dominio/indicadores/calculos.js`.

### 3.1 MJ-1. El detective de miradas — *Child Eyes Test*

| Código | Constructo intermedio | Métrica operacional | Cálculo | Dominio | Campo |
|---|---|---|---|---|---|
| CC-01 | Reconocimiento de estados mentales | Precisión global | aciertos / ítems respondidos | A2 (receptiva) | `cc01` |
| CC-02 | Velocidad de procesamiento social | Latencia de decisión | mediana del TR neto en ms | A2 (receptiva) | `cc02` |
| CC-03 | Complejidad del procesamiento emocional | Índice de complejidad emocional | %aciertos_básicas − %aciertos_complejas | A2 (receptiva) | `cc03` |
| CC-11 | Patrón de error sistemático | Matriz de confusión | matriz n×n (presentado × seleccionado) | A2 (receptiva) | `cc11` |

**Sobre CC-03.** La precisión global es insuficiente por sí sola: un valor bajo puede
deberse a fatiga, dificultad lectora o incomprensión de la mecánica. El índice diferencial
contrasta el desempeño del propio participante en dos niveles de exigencia, lo que
distingue una dificultad específica en estados complejos de un bajo desempeño general.
**Este principio de contraste intraindividual es el eje del diseño de las métricas y se
aplica también en CC-07 y CC-09.**

**Sobre CC-02.** Se usa la mediana y no la media: los tiempos de reacción en población
infantil presentan distribuciones asimétricas con valores extremos atribuibles a
distracciones momentáneas. El TR es además **neto**: el intervalo pausado durante el ítem
se resta del total (RF-20).

### 3.2 MJ-2. La fiesta de sorpresas — faux pas y falsa creencia

| Código | Constructo intermedio | Métrica operacional | Cálculo | Dominio | Campo |
|---|---|---|---|---|---|
| CC-04 | Teoría de la mente de primer orden | Precisión en falsa creencia de primer orden | % de aciertos | A1 | `cc04` |
| CC-05 | Teoría de la mente de segundo orden | Precisión en falsa creencia de segundo orden | % de aciertos | A1 | `cc05` |
| CC-06 | Pragmática social | Detección de faux pas | % de escenas identificadas | A1 | `cc06` |
| CC-07 | Especificidad de la dificultad social | Índice de inferencia social | %secuencias_mecánicas − %secuencias_sociales | A3 | `cc07` |

**Sobre CC-07.** Es la métrica de mayor valor discriminativo del minijuego. La precisión
aislada en ítems sociales confunde dos causas: dificultad específica de atribución mental,
o dificultad general de secuenciación y memoria de trabajo. Al contrastar ambos tipos de
ítem en el mismo participante, la capacidad general queda controlada.

**Implicación para el catálogo de contenidos:** el banco debe incluir un número
equilibrado de ítems mecánicos y sociales, con dificultad estructural equivalente (mismo
número de viñetas, complejidad visual comparable). Sin ese equilibrio el índice pierde
validez. Es un requisito del diseño de contenidos, no del código.

### 3.3 MJ-3. El taller que cambia — DCCS y figuras de Navon

| Código | Constructo intermedio | Métrica operacional | Cálculo | Dominio | Campo |
|---|---|---|---|---|---|
| CC-08 | Rigidez ante el cambio de regla | Índice de perseveración | errores perseverativos / ensayos post-cambio | B2 | `cc08` |
| CC-09 | Costo cognitivo de la transición | Costo de cambio | TR neto post-cambio − TR neto pre-cambio, en ms | B2 | `cc09` |
| CC-10 | Estilo de procesamiento perceptivo | Sesgo local-global | latencia global − latencia local, en ms | Coherencia central | `cc10` |
| CC-12 | Velocidad de readaptación | Ensayos hasta criterio | ensayos post-cambio hasta 3 aciertos consecutivos | B2 | `cc12` |

**Sobre CC-08.** Un error es **perseverativo** solo si la respuesta emitida habría sido
correcta bajo la regla vigente antes del cambio. Un error que no corresponde ni a la regla
anterior ni a la nueva se clasifica como **aleatorio** y no computa. Esta clasificación se
realiza en el momento del registro (`claseError`), no a posteriori: es la diferencia entre
disponer de un indicador de rigidez cognitiva y de un simple conteo de errores.

**Sobre CC-10.** El sesgo local-global corresponde al constructo de coherencia central
débil, que **no es un dominio del DSM-5-TR**. Se reporta como valor observado y no computa
en el cálculo de cobertura.

---

## 4. ESCALAS DE REPORTE DEL CUIDADOR (RC-01 a RC-05)

Implementadas en `src/dominio/indicadores/reporte.js`. Cinco escalas de tres ítems cada
una, quince en total, en escala ordinal de frecuencia (nunca / a veces / con frecuencia /
casi siempre), redactadas en lenguaje no clínico. Se administran en sesión independiente
de la del menor, con avance guardado por ítem.

| Código | Contenido | Dominio | Campo |
|---|---|---|---|
| RC-01 | Uso de gestos, contacto visual y expresión facial en la interacción cotidiana | A2 (expresiva) | `RC-01` |
| RC-02 | Iniciativa, mantenimiento y ajuste de las relaciones con pares | A3 (relacional) | `RC-02` |
| RC-03 | Movimientos, uso de objetos o habla repetitivos observados en el entorno | B1 | `RC-03` |
| RC-04 | Intensidad y foco de los intereses | B3 | `RC-04` |
| RC-05 | Respuesta a sonidos, texturas, luces y otros estímulos sensoriales | B4 | `RC-05` |

**No se emite puntaje agregado ni categoría de riesgo.** Cada escala reporta su valor
observado sobre el máximo posible y si quedó completa. El tablero identifica de forma
explícita el origen como reporte de informante y no como desempeño observado.

---

## 5. VARIABLES CONTEXTUALES

Se capturan como metadatos de la sesión. **Ninguna se asocia a un dominio del DSM-5-TR ni
se interpreta clínicamente.**

| Variable | Campo | Uso previsto | Restricción |
|---|---|---|---|
| Ajustes de accesibilidad | `contexto.audioDesactivado`, `nivelVolumen`, `modoEstimuloReducido` | Contextualizar la interpretación | **No se interpreta como indicador de reactividad sensorial** |
| Tasa de omisión | `tasaOmision` | Persistencia en la tarea | No interpretable clínicamente |
| Rectificaciones por ítem | `rectificaciones` | Certeza en la decisión | Exploratorio |
| Variabilidad del TR | `variabilidadTiempoReaccion`, `coeficienteVariacion` | Consistencia atencional | Exploratorio |
| Repeticiones de instrucción | `repeticionesInstruccion` | Comprensión de la consigna | Exploratorio |
| Pausas | `pausas[]` | Contextualizar fatiga o carga | Interpretación cautelosa |
| Estado final de la sesión | `estadoSesion` | Determinar validez de los datos | Las sesiones no completadas no se procesan |
| Dispositivo y tipo de entrada | `contexto.dispositivo`, `tipoEntrada` | Control de variabilidad en TR | Táctil y ratón no son comparables entre sí |

### 5.1 Por qué los ajustes sensoriales no estiman B4

Resulta tentador interpretar la desactivación del audio como indicador del dominio B4.
**No es sostenible**, por tres razones:

1. La acción puede ejecutarla el acudiente y no el participante.
2. Puede responder al entorno físico —ruido ambiental, ausencia de audífonos, espacio
   compartido— y no a una característica del participante.
3. La configuración de accesibilidad existe para garantizar el acceso equitativo;
   convertirla en dato clínico penalizaría su uso e introduciría un conflicto ético con el
   propósito de la funcionalidad.

El dominio B4 se cubre mediante RC-05. Esta decisión está implementada y verificada: la
prueba `ningún indicador de desempeño se asigna a B1, B3 ni B4` falla si alguien vuelve a
introducir la atribución.

---

## 6. COBERTURA DE DOMINIOS

### 6.1 Cobertura por fuente

| Dominio | Fuente | Componente | Valor |
|---|---|---|---|
| A1 — Reciprocidad socioemocional | Desempeño en tarea | MJ-2 (CC-04 a CC-06) | 1,0 |
| A2 — Comunicación no verbal | Mixta | MJ-1 receptiva (CC-01 a CC-03, CC-11); RC-01 expresiva | 1,0 |
| A3 — Desarrollo y comprensión de relaciones | Mixta | MJ-2 comprensión (CC-07); RC-02 relacional | 1,0 |
| B1 — Conductas estereotipadas o repetitivas | Reporte del informante | RC-03 | 1,0 |
| B2 — Insistencia en la monotonía | Desempeño en tarea | MJ-3 (CC-08, CC-09, CC-12) | 1,0 |
| B3 — Intereses restringidos | Reporte del informante | RC-04 | 1,0 |
| B4 — Reactividad sensorial | Reporte del informante | RC-05 | 1,0 |

### 6.2 Cálculo

```
Solo minijuegos:  A1·1 + A2·0,5 + A3·0,5 + B1·0 + B2·1 + B3·0 + B4·0 = 3,0 / 7 = 42,9 %
Fuente combinada: 7 / 7 = 100 %
```

Los minijuegos por sí solos **no alcanzan el umbral del 70 %** del indicador de OE2. No es
una deficiencia del diseño: es una consecuencia estructural del medio. Los dominios B1, B3
y B4, junto con la vertiente expresiva de A2 y la conducta relacional de A3, describen
conductas que no se manifiestan en la ejecución de una tarea en un navegador.

La combinación de desempeño en tarea con reporte estructurado de informante es la
estrategia que emplean los instrumentos de tamizaje establecidos. La cifra reportada como
cumplimiento del indicador es la de fuente combinada, y **se acompaña siempre de la
desagregación por origen del dato**, porque cuatro de los siete dominios dependen total o
parcialmente del reporte y no del desempeño observado.

---

## 7. CONTRATO DE DATOS

Estructura de sesión entre el cliente y la API. Corresponde al Cuadro 19 del documento y a
`src/datos/modelos/index.js`.

```json
{
  "uuid": "identificador seudónimo de la sesión",
  "estadoSesion": "en_curso | completada | interrumpida | abandonada",
  "versionCatalogo": "1.0.0",
  "contexto": {
    "dispositivo": "tablet | escritorio | movil",
    "tipoEntrada": "tactil | raton | teclado",
    "audioDesactivado": false,
    "nivelVolumen": 0.8,
    "modoEstimuloReducido": false
  },
  "repeticionesInstruccion": 0,
  "pausas": [{ "inicio": "ISO-8601", "fin": "ISO-8601", "duracionMs": 45000 }],
  "eventos": [
    {
      "minijuego": "MJ-1",
      "bloque": "MJ1-B2",
      "numeroEnsayo": 4,
      "practica": false,
      "constructo": "estados_complejos",
      "condicion": "global | local",
      "posteriorACambio": false,
      "claseError": "correcta | perseverativa | aleatoria",
      "presentado": "duda",
      "respuesta": "miedo",
      "acierto": false,
      "estadoItem": "respondido | omitido",
      "tiempoReaccionMs": 3420,
      "tiempoHastaPrimeraSeleccionMs": 2180,
      "pausasDuranteItemMs": 0,
      "rectificaciones": 2
    }
  ],
  "reporteCuidador": [
    { "escala": "RC-05", "item": "B4-1", "respuesta": "a_veces" }
  ]
}
```

### 7.1 Notas de implementación

| Aspecto | Especificación |
|---|---|
| Medición temporal | `performance.now()`, reloj monotónico. Nunca `Date.now()` |
| Descuento de pausas | `tiempoReaccionMs` neto: el intervalo pausado se resta (RF-20) |
| Omisión frente a error | `estadoItem` los distingue; la omisión nunca se computa como error (RF-23) |
| Error perseverativo | `claseError` se asigna en el registro, no a posteriori |
| Versionado del catálogo | `versionCatalogo` permite excluir de la comparación longitudinal sesiones con contenidos distintos (RF-33) |
| Cálculo de indicadores | Se derivan **en el servidor** a partir de los eventos crudos, nunca en el cliente |
| Ronda de práctica | Se persiste con `practica: true` en lugar de descartarse, para analizar la comprensión de la consigna |
| Versión del algoritmo | Campo inmutable en cada fila de puntuación (CT-13) |

---

## 8. CONSIDERACIONES PARA EL DOCUMENTO

### 8.1 Estratificación por edad

El diseño contempla dos recorridos —4 a 7 y 8 a 17 años— que comparten estructura,
variables y componentes, pero difieren en la complejidad de los ítems (apartado 3.6 del
documento). Un TR de 3.400 ms es esperable a los 5 años y llamativo a los 15: comparar sin
estratificar carece de sentido interpretativo.

**Limitación que debe declararse:** con 30 a 50 participantes, cada tramo contaría con 15
a 25 casos, número insuficiente para establecer valores de referencia. Por eso el motor
reporta valor observado y no calcula percentil mientras no exista muestra normativa.
Declarar esta limitación fortalece la posición del trabajo; omitirla la debilita.

### 8.2 Efecto de aprendizaje

La repetición del mismo catálogo produce mejoras atribuibles a la familiaridad y no a un
cambio real en el constructo. Mitigaciones: conjuntos alternos de ítems equivalentes,
registro del número de exposiciones previas y advertencia en toda vista comparativa.

### 8.3 Variables que introducen ruido

| Variable | Efecto | Control |
|---|---|---|
| Tipo de dispositivo de entrada | Los TR táctiles y por ratón no son comparables | `tipoEntrada`; comparación restringida al mismo tipo |
| Latencia del dispositivo | Equipos de gama baja introducen retrasos de renderización | Registro del dispositivo |
| Presencia del acudiente | Puede intervenir o responder por el menor | Recomendaciones de entorno previas a la sesión |
| Fatiga y momento del día | Afecta atención sostenida y TR | Registro de hora de inicio |
| Nivel lector | Afecta la comprensión de las opciones | Opciones en formato icónico y textual simultáneo |

---

## 9. ELEMENTOS PENDIENTES

| # | Pendiente | Bloquea |
|---|---|---|
| 1 | Redacción de los quince ítems de RC-01 a RC-05, con fundamentación en la literatura y revisión del director | Módulo de cuidador operativo |
| 2 | Catálogo de estímulos de MJ-1: número por bloque y estados mentales incluidos | Sujeto a la autorización del Autism Research Centre |
| 3 | Catálogo de MJ-2, con equilibrio entre ítems mecánicos y sociales de dificultad estructural equivalente | Validez de CC-07 |
| 4 | Intervalo máximo de respuesta por ítem antes de registrar omisión | Cálculo de la tasa de omisión |
| 5 | Citación NTC 1486 de los criterios del DSM-5-TR y de las fuentes de cada constructo intermedio | Apartado 2.6.2 |
