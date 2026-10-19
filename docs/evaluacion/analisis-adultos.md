# Análisis de la evaluación con adultos (capa 2)

Evaluación de la capa 2 de M-09, con 15 a 20 adultos voluntarios (objetivo OE4, criterios
del Cuadro 31 del documento 2.3). La capa 1, sin participantes, está en `precision.md`
(T16). Este documento explica cómo pasamos de los dos CSV que exporta el profesional a las
cifras de H3, H4 y H5, con las fórmulas y la lectura de cada criterio.

**Estado.** El programa y sus pruebas están listos (T17). Los resultados se agregan cuando
termine la prueba con voluntarios (ver «Resultados»).

El programa es `api/scripts/analisisEvaluacion.js`. Solo usa Node y los módulos del dominio
de M-09 (`api/src/dominio/registro/`): no necesita MongoDB, ni la API, ni dependencias
nuevas. Escribe `resumen.md` (para el documento) y `resumen.json` (las mismas cifras sin
redondear) y **solo trae agregados y n**: ningún seudónimo y ningún valor por participante.

## Antes de exportar

1. La prueba se hace sobre la versión congelada y solo con el aval escrito del comité de
   ética. Cada adulto firma el consentimiento escrito (Anexo A) y el profesional marca la
   constancia, la versión del formato y la mayoría de edad al crear la sesión (HU-16).
2. **Cada profesional usa su propia cuenta.** Cada cuenta exporta solo sus sesiones, así
   que cada profesional descarga su par de CSV y el programa los une (`--par`, ver
   «Comandos»). La cuenta de otro profesional se crea como la primera
   (`docs/despliegue.md`, «Crear la cuenta de un profesional»).
3. **La cuenta de prueba del equipo no se exporta.** Las sesiones de ensayo se hacen solo
   en esa cuenta. Si una cuenta de la prueba tiene una sesión de ensayo, se elimina por su
   seudónimo antes de exportar (HU-19): el programa analiza todas las filas, y una sesión
   de ensayo contaría como participante.
4. **Exportar cuando no quede ninguna sesión en curso.** Una sesión entregada que sigue en
   curso cuenta como incompleta. Una sesión pasa a «abandonada» 2 horas después de creada;
   basta con exportar 2 horas después de la última.
5. Cada profesional descarga sus dos CSV desde la zona del profesional (`/registro`):
   «Descargar los ensayos (CSV)» (`registro-ensayos.csv`) y «Descargar los valores y el
   SUS (CSV)» (`registro-valores-sus.csv`). Como los dos profesionales descargan archivos
   con el mismo nombre, cada par va en su propia carpeta (por ejemplo,
   `~/evaluacion/profesional-1/` y `~/evaluacion/profesional-2/`). **No abrirlos y
   guardarlos en una hoja de cálculo**: una
   hoja de cálculo en español puede cambiar la coma por punto y coma o el punto decimal por
   coma, y el programa los rechaza.
6. Guardar los CSV en la carpeta del equipo, **fuera del repositorio**. No se suben a
   GitHub. Lo que pasa al documento es el resumen.

## Comandos

Desde la raíz del repositorio, con una sola cuenta:

```
node api/scripts/analisisEvaluacion.js ~/evaluacion/registro-ensayos.csv ~/evaluacion/registro-valores-sus.csv
```

Con varias cuentas, un `--par` por profesional, con sus ensayos y sus valores en ese orden:

```
node api/scripts/analisisEvaluacion.js \
  --par ~/evaluacion/profesional-1/registro-ensayos.csv ~/evaluacion/profesional-1/registro-valores-sus.csv \
  --par ~/evaluacion/profesional-2/registro-ensayos.csv ~/evaluacion/profesional-2/registro-valores-sus.csv \
  --salida ~/evaluacion/resumen
```

El programa une las filas de todos los pares y analiza el conjunto como si fuera una sola
exportación. El resumen dice cuántos pares recibió. **Si un seudónimo aparece en dos
pares**, el programa termina con código 1 sin escribir nada: es el mismo archivo pasado dos
veces o una cuenta compartida. El mensaje dice cuántos seudónimos se repiten y entre qué
pares, sin escribirlos.

`resumen.md` y `resumen.json` quedan junto al CSV de valores (del primer par, si hay
varios) o en la carpeta de `--salida`.

Si falta un archivo, falta una columna o una celda no tiene el formato de la exportación,
el programa lo explica (archivo, fila y columna) y termina con código 1, sin escribir nada.

El resumen no tiene fecha de generación: **la misma entrada da los mismos archivos**
(CT-13). Cualquiera del equipo puede repetir el análisis con los mismos CSV y debe obtener
el mismo `resumen.md`.

Las pruebas del programa corren con las demás (`npm test`); solas, con
`npm test -w api -- analisisEvaluacion`.

## De dónde sale cada cifra

| Cifra | Archivo | Sesiones que entran | Qué se toma |
|---|---|---|---|
| Creadas, entregadas y completas | valores.csv | Todas las filas (de todos los pares) | `estado` y `entregada` |
| H3: CC-09 y CC-10 | valores.csv | `estado` = completada (RF-15) | `cc09` y `cc10`: el resultado que se guardó al completarse la sesión, con su versión del algoritmo (CT-13) |
| H4: mitades | ensayos.csv | `estadoSesion` = completada (RF-15) | Los ensayos, con los filtros de RF-14 (ver «Fórmulas») |
| H5: valor SUS | valores.csv | Las filas con `valorSUS` (solo una sesión completa llega al SUS) | `valorSUS`, que calcula la API al guardar |
| H5: sesiones completas en 20 minutos o menos | valores.csv | Las entregadas | Completas con `duracionMin` ≤ 20 ÷ entregadas |
| H5: duración | valores.csv | Las completas | `duracionMin`: mediana, máximo y cuántas pasan de 20 |

**Comprobación.** El programa vuelve a calcular CC-09 y CC-10 de cada sesión completa con
los ensayos de ensayos.csv y el motor de M-09 (`procesarSesion`), y los compara con los de
valores.csv (tolerancia de 0,001 ms). También revisa que las sesiones completas sean las
mismas en los dos archivos. Si algo no coincide, el resumen lo dice al comienzo: los dos
archivos no son de la misma exportación o la versión del algoritmo cambió.

**Versiones.** El resumen dice qué versiones del algoritmo y del catálogo tienen las
sesiones. En la versión congelada debe haber una sola de cada una; si aparecen dos, el
resumen lo advierte.

## Fórmulas

### Media, desviación e intervalo de confianza (H3 y valor SUS)

- Media: x̄ = Σx / n.
- Desviación estándar muestral: DE = √(Σ(x − x̄)² / (n − 1)).
- Intervalo de confianza del 95 % de la media, con la t de Student:
  x̄ ± t(0,975; n − 1) · DE / √n.

El programa calcula el cuantil de la t en lugar de leerlo de una tabla (la distribución sale
de la beta incompleta regularizada y el cuantil, por bisección). Coincide con la tabla:
2,145 con 14 grados de libertad (15 participantes) y 2,093 con 19 (20 participantes). Con
menos de 2 valores no hay intervalo y el resumen dice «No calculable».

### Consistencia por mitades (H4)

Por cada participante (sesión completa) y cada condición:

1. Se toman los ensayos con los mismos filtros de RF-14 que usan CC-09 y CC-10: sin
   práctica, sin omisiones, sin anticipaciones (tiempo neto menor de 200 ms) y solo los
   aciertos. Se usa el tiempo neto, sin las pausas ocurridas durante el ensayo (RF-13).
2. Condiciones: **cambio** y **repetición** en los bloques mixtos de la tarea de cambio de
   regla, con `clasificarEnsayosMixtos` del dominio (el primer ensayo de cada bloque no
   cuenta); **global** y **local** en la tarea de Navon.
3. Se cuentan en el orden en que se presentaron, **después de los filtros**: el 1.º, el
   3.º, el 5.º… son la mitad impar y el 2.º, el 4.º… la mitad par. Así las dos mitades
   quedan parejas: sin errores, 6 y 6 ensayos en cambio y en repetición (12 de cada uno en
   los 4 bloques mixtos) y 7 y 7 en global y en local (14 de cada uno).
4. Se calcula el tiempo medio de cada mitad.

Con esas medias, por condición y a través de los participantes:

- Correlación de Pearson entre la mitad impar y la par:
  r = Σ(x − x̄)(y − ȳ) / √(Σ(x − x̄)² · Σ(y − ȳ)²).
- Corrección de Spearman-Brown, que estima la consistencia de la tarea completa a partir de
  la de sus mitades: ρ = 2r / (1 + r). Por ejemplo, r = 0,50 da ρ = 0,67 y r = 0,70 da
  ρ = 0,82.

Un participante sin ensayos en una de las dos mitades no entra en esa condición. Con menos
de 3 participantes, o si todas las medias de una mitad son iguales, no hay correlación
(«No calculable»).

**Exploratorio.** Lo mismo para las diferencias por mitad: CC-09 de la mitad impar (cambio
impar − repetición impar) frente a CC-09 de la mitad par, y CC-10 (global − local) igual.
Una diferencia de dos medias suma el error de las dos, así que su consistencia suele ser
menor que la de cada condición. Por eso el Cuadro 31 las deja sin umbral.

No recortamos valores por desviación estándar, igual que los indicadores
(`api/src/dominio/registro/indicadores.js`): con 7 ensayos por bloque no hay datos
suficientes.

### Valor SUS (H5)

valorSUS = 2,5 × (Σ ítems impares (respuesta − 1) + Σ ítems pares (5 − respuesta)), de 0
a 100. Lo calcula la API al guardar el cuestionario (`api/src/dominio/registro/sus.js`); el
programa lo lee de valores.csv.

### Sesiones completas en 20 minutos o menos (H5, CT-08)

- duracionMin = (`completadaEn` − `entregadaEn`) ÷ 60 000 ms, con dos decimales. Va desde la
  **última** entrega del dispositivo hasta que llegan las dos tareas: incluye las
  instrucciones, la práctica y las pausas, y no incluye el SUS. Solo existe en las sesiones
  completas. Las fechas no se exportan, solo la duración.
- Proporción = sesiones entregadas que se completaron con duracionMin ≤ 20 ÷ sesiones
  entregadas. Una entregada que no se completó y una completa que pasó de 20 minutos
  cuentan igual en contra. Una sesión creada que nunca se entregó no se aplicó: cuenta en
  las creadas, pero no en el denominador.
- El resumen informa además las creadas, las entregadas, las completas (y su proporción
  sobre las entregadas) y, de las completas, la mediana y el máximo de la duración y
  cuántas pasan de 20 minutos.

Por ejemplo, con 7 entregadas, una que pase de 20 minutos deja 6 de 7 (85,7 %) y cumple;
dos, sean incompletas o largas, dejan 5 de 7 (71,4 %) y no cumple.

## Lectura de cada criterio del Cuadro 31

| Hipótesis | Criterio del Cuadro 31 | Cómo lo lee el programa | Si no se cumple |
|---|---|---|---|
| H3 (replicación), CC-09 | IC 95 % de la media mayor que 0 | Cumple si el límite inferior del intervalo es mayor que 0 | Se reporta como hallazgo |
| H3 (replicación), CC-10 | IC 95 % de la media menor que 0 (la letra grande se reconoce antes) | Cumple si el límite superior del intervalo es menor que 0 | Se reporta como hallazgo |
| H4 (consistencia) | Spearman-Brown ≥ 0,70 en los tiempos medios por condición | Una lectura por condición: cambio, repetición, global y local | Se informa la condición que no llega |
| H4, exploratorio | CC-09 y CC-10 por mitad, sin umbral | Se informan r y Spearman-Brown, sin «Cumple» | — |
| H5 (usabilidad) | Media del valor SUS de los participantes ≥ 68, siempre con su IC 95 % | Cumple si la media es 68 o más. Es una referencia de aceptabilidad, no una prueba estadística: el intervalo se informa, pero no decide | Se informa la media con su intervalo |
| H5 (eficacia) | Al menos el 85 % de las sesiones entregadas se completaron en 20 minutos o menos (CT-08) | Cumple si (completas con duracionMin ≤ 20) ÷ entregadas ≥ 0,85. La duración de las completas (mediana, máximo y cuántas pasan de 20) se informa sin criterio aparte | Se informan las creadas, las entregadas, las completas y cuántas pasan de 20 minutos |

El SUS de los profesionales se aplica en papel y se reporta aparte: no entra en este
programa.

**Dirección esperada en H3.** El resumen dice también si la media va en la dirección
esperada (CC-09 mayor que 0 y CC-10 menor que 0), aparte del criterio. Con pocos
participantes, la media puede ir en la dirección esperada y el intervalo incluir el 0.

## Lo que verifican las pruebas

`api/test/analisisEvaluacion.test.js` aplica por la API de T15 los 6 perfiles simulados de
T16 (`api/test/ayudas/perfilesSimulados.json`), con valores SUS y duraciones conocidas, más
una sesión interrumpida (con los ensayos de cambio de regla de uno de los perfiles) y una
creada que nunca se entregó. Descarga los dos CSV y corre el programa como lo hará el
equipo. Con esos datos el resumen da:

| Cifra | Resultado con los perfiles |
|---|---|
| Sesiones | 8 creadas, 7 entregadas y 6 completas (85,7 % de las entregadas) |
| CC-09 | n = 6; media 175,0 ms (la de los perfiles, ±1 ms); IC 95 % [110,7; 239,3]: excluye el 0, porque el efecto simulado es grande (150 a 300 ms) |
| CC-10 | n = 6; media −28,3 ms; IC 95 % [−84,0; 27,4]: incluye el 0, porque un perfil va en sentido contrario (+80 ms) |
| Mitades | n = 6 en las cuatro condiciones (la sesión interrumpida no entra); las dos mitades juntas recuperan las medias de cada perfil (±1 ms) y la r es la misma que con los perfiles sin pasar por la exportación |
| Valor SUS | n = 6; media 77,5; IC 95 % [67,7; 87,3] |
| Eficacia | 5 de 7 entregadas completas en 20 minutos o menos (71,4 %): no cumple, porque la interrumpida y la de 25 minutos cuentan en contra. Duración de las completas: mediana 17,0 min, máximo 25,0 min, 1 pasa de 20 (la de 20 justos cuenta como dentro) |
| Dos cuentas | Un segundo profesional con 2 sesiones más: con `--par` el resumen es el de las 10 filas unidas (8 completas); el mismo par dos veces termina con código 1 |

Además: el criterio de eficacia con 7 entregadas, donde una completa de 23 minutos no lo
hace fallar si las demás cumplen y una segunda (larga o incompleta) sí; el cuantil de la t
frente a la tabla; la media, la DE, el intervalo, Pearson y
Spearman-Brown con casos calculados a mano; el reparto en mitades con una omisión, una
anticipación, un error y una pausa en medio; la lectura de los CSV (comillas, BOM, una
columna que falta, una coma decimal); que ni `resumen.md` ni `resumen.json` tienen
seudónimos, listas por persona ni vocabulario prohibido; y que dos corridas dan los mismos
archivos.

## Resultados

Pendiente: se agregan aquí las tablas de `resumen.md` cuando termine la prueba con los
voluntarios, con la fecha de la exportación y el número de sesiones.
