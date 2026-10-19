# Precisión temporal del registro conductual (CT-07)

Evaluación de la capa 1 de M-09, sin participantes (T16). CT-07 pide que el sistema
registre el tiempo de reacción de cada ensayo con un error de 50 ms o menos. Este documento
explica cómo lo medimos y trae la tabla por celda.

**Estado.** La tabla es la del **experimento completo**: la corrida 39153850094 del flujo
«Precisión temporal (M-09)» en GitHub Actions, sobre el commit 3f51108, el 18 de octubre de
2026, con 222 ensayos por celda en Chromium, Firefox y WebKit (ver «Resultados»).

## Qué se mide y qué no

Medimos el **error del software**: la diferencia entre el tiempo de reacción que registra
la web y el que de verdad produjo el arnés, medidos los dos dentro del navegador.

No medimos:

- **La latencia del teclado**: el tiempo entre que la tecla baja y el sistema operativo
  entrega el evento al navegador. El arnés entrega la tecla por el protocolo de Playwright,
  no por un teclado físico.
- **La latencia de la pantalla**: el tiempo entre que el navegador termina de dibujar el
  fotograma y la pantalla lo muestra (composición, sincronía vertical y el propio monitor).
  Las pruebas corren sin pantalla.

Las dos dependen del equipo y no del software. Medirlas exige hardware (un fotodiodo sobre
la pantalla y un actuador sobre la tecla) que no tenemos.

**Una latencia constante se cancela en los indicadores.** CC-09 (costo de cambio) y CC-10
(diferencia global-local) son diferencias de medias de la misma sesión, en el mismo equipo:
si el teclado o la pantalla suman siempre *d* ms, las dos medias suben *d* y la diferencia
no cambia. CC-08 y CC-12 cuentan respuestas y no usan tiempos. Lo único que una latencia
constante puede mover son los umbrales absolutos: un ensayo cerca de los 200 ms puede
pasar a contarse o no como anticipación, y uno cerca de los 5 s, como omisión. La parte
variable del error sí suma ruido a las medias; es la que muestra la columna «DE».

## Método

### El arnés

El experimento recorre `/registro/prueba` tal como está, sobre el build de la web
(`npm run build:web`) y la API local (`web/evaluacion/precision/servidor.js` sirve los dos en
el mismo origen; la página solo pide el plan, sin base de datos). La dirección lleva la
semilla de la sesión, el reloj y, si se quiere, una sola tarea:
`/registro/prueba?semilla=20261024&reloj=referencia`.

Playwright inyecta un script antes de que cargue la página (`arnes.js`); la web no cambia y
no sabe que la miden. El script deja en la página, por cada ensayo, sus propias marcas de
tiempo, todas con `performance.now()`.

**Aparición.** Un `MutationObserver` ve cuándo el estímulo reemplaza a la cruz de fijación.
El script pide entonces un `requestAnimationFrame`, que corre en el mismo fotograma que el
del reloj `animacion`, y desde ahí avisa a Node para que programe la tecla. En ese mismo
callback deja un mensaje por `MessageChannel`. El navegador lo atiende solo cuando terminó
el fotograma (el callback, los estilos, el diseño y el dibujo van juntos, sin tareas en
medio), así que el `performance.now()` de ese momento es la **aparición de referencia**: el
estímulo ya está dibujado. Si una tarea larga inyectada se cuela antes del mensaje, la
referencia es el inicio de esa tarea, porque el dibujo terminó antes de que empezara
(`medicion.js`).

No usamos la marca que el navegador entrega a `requestAnimationFrame` (el comienzo del
fotograma). Una sonda en Chromium mostró que queda unos 7 ms **antes** de que el estímulo
entre en la página, y que con una tarea larga de 80 ms el callback corre unos 89 ms después
de esa marca. No describe cuándo se ve el estímulo.

**Respuesta.** Con cada aviso, Node presiona F o J (sorteada) a la **latencia programada**:
300, 500 u 800 ms, barajadas en grupos de tres para que queden balanceadas. El script
escucha el `keydown` en fase de captura, antes que la web, y guarda su `event.timeStamp`:
la marca que el navegador pone a la tecla al recibirla. Es la **pulsación de referencia**.
En Chromium esa marca no espera al hilo principal: en la misma sonda, con una tarea larga de
100 ms, la web atendió la tecla unos 58 ms después y la marca no se movió.

**Cómo separamos la latencia del arnés.** El arnés no toma la latencia programada como
verdad. Entre el aviso a Node, su temporizador y la entrega de la tecla se pierden algunos
milisegundos, y no son siempre los mismos. Por eso medimos, en la página, lo que de verdad
pasó. Por ensayo:

| Medida | Cálculo |
|---|---|
| Latencia efectiva del arnés | pulsación de referencia − aparición de referencia |
| **Error** | TR registrado por la web − latencia efectiva |
| **Cota superior del error** | TR registrado − latencia programada |
| Desvío del arnés | latencia efectiva − latencia programada |
| Error de la aparición y de la respuesta | el error separado en las dos marcas de la web (positivo: alarga el TR registrado) |

Con el reloj `referencia`, que marca con `Date.now()`, las dos marcas de la web se pasan a la
escala de `performance.now()` con el desfase que el script mide en el mismo fotograma.

**Lo que no se puede separar.** Si un motor pone la marca de la tecla inyectada en el hilo
principal, la pulsación misma espera a que termine la tarea larga. Esa espera queda dentro
de la latencia efectiva y no se ve como error, aunque con un teclado físico sí lo sería. Se
nota porque el desvío del arnés crece con la carga. El resumen marca (¹) toda celda con
carga en la que el percentil 95 del desvío absoluto sube más de 10 ms frente a la celda
`normal` del mismo motor y reloj: **en esa celda vale la cota superior**. Que el desvío
varíe sin carga (por el temporizador de Node o por el protocolo) no invalida el error,
porque la pulsación se mide igual. La cota superior siempre incluye la latencia del arnés,
así que nunca subestima el error.

Cada sesión se comprueba ensayo por ensayo. La prueba falla si el arnés vio un número de
apariciones distinto del de ensayos registrados, si la tecla no llegó como evento del
navegador o si la web registró una respuesta que no es la de la tecla presionada.

### Diseño

| Factor | Niveles |
|---|---|
| Motor | Chromium, Firefox y WebKit, sin pantalla, con las versiones de Playwright 1.64.1 |
| Reloj | `animacion` (aparición con `performance.now()` en el `requestAnimationFrame`, respuesta con `event.timeStamp`) y `referencia` (`setTimeout(0)` y `Date.now()`) |
| Carga | `normal`; `hilo-ocupado`: tareas largas de espera activa de 30 a 100 ms, separadas por 100 a 400 ms (el hilo principal queda ocupado cerca del 25 % del tiempo), en momentos sorteados con la semilla, en los tres motores; `cpu-x4`, solo en Chromium: CPU 4 veces más lenta por CDP (`Emulation.setCPUThrottlingRate`) |

Son 14 celdas: 6 en Chromium y 4 en cada uno de los otros dos motores. Cada celda aplica 3
sesiones completas, con las dos tareas: 74 ensayos por sesión, contando los 4 de práctica,
que se miden igual. Son **222 ensayos por celda**. Las sesiones de todas las celdas usan
las mismas semillas (20261024, 20261025 y 20261026): los mismos ensayos, las mismas
latencias y las mismas teclas, para que las celdas se puedan comparar. Las celdas corren
una tras otra, nunca al mismo tiempo, para que no compitan por la CPU.

### Análisis

`web/evaluacion/precision/resumir.js` lee los CSV y da, por celda, para el error y para su
cota superior:

- n, media y desviación estándar (DE, muestral, con n − 1);
- percentil 95 del error absoluto (interpolación lineal entre los dos valores más cercanos,
  como `PERCENTIL.INCLUIR` de una hoja de cálculo);
- porcentaje de ensayos con error absoluto de 50 ms o menos (CT-07).

Las celdas con menos de 200 ensayos llevan la marca ² (corrida de comprobación).

## Resultados

### Experimento completo

Corrida 39153850094 del flujo «Precisión temporal (M-09)» en GitHub Actions, con 3 sesiones
por celda, sobre el commit 3f51108, el 18 de octubre de 2026. Las 14 celdas tienen 222
ensayos cada una. Las tablas son las del resumen de la corrida (`resumen.md` del artefacto
`precision-resumen`), tal cual.

#### Entorno

| Motor | Playwright | Sistema | CPU | Sesiones por celda | Catálogo / algoritmo | Commit | Fecha |
|---|---|---|---|---:|---|---|---|
| chromium 156.0.8078.4 | 1.64.1 | Linux 6.17.0-1022-azure x64 | AMD EPYC 7763 64-Core Processor (2 núcleos) | 3 | 1.1.0 / 1.0.0 | 3f51108 | 2026-10-18 |
| firefox 157.0 | 1.64.1 | Linux 6.17.0-1022-azure x64 | AMD EPYC 9V45 96-Core Processor (2 núcleos) | 3 | 1.1.0 / 1.0.0 | 3f51108 | 2026-10-18 |
| webkit 27.2 | 1.64.1 | Linux 6.17.0-1022-azure x64 | AMD EPYC 7763 64-Core Processor (2 núcleos) | 3 | 1.1.0 / 1.0.0 | 3f51108 | 2026-10-18 |

#### Error del tiempo de reacción registrado (TR registrado − latencia efectiva del arnés)

| Motor | Reloj | Carga | n | Media (ms) | DE (ms) | P95 abs. (ms) | ≤ 50 ms |
|---|---|---|---:|---:|---:|---:|---:|
| chromium 156.0.8078.4 | animacion | normal | 222 | 1,2 | 0,5 | 2,0 | 100,0 % |
| chromium 156.0.8078.4 | animacion | hilo-ocupado | 222 | 1,1 | 0,5 | 1,9 | 100,0 % |
| chromium 156.0.8078.4 | animacion | cpu-x4 | 222 | 4,1 | 1,4 | 6,3 | 100,0 % |
| chromium 156.0.8078.4 | referencia | normal | 222 | 1,9 | 0,8 | 3,2 | 100,0 % |
| chromium 156.0.8078.4 | referencia | hilo-ocupado | 222 | 9,4 | 18,2 | 48,6 | 95,0 % |
| chromium 156.0.8078.4 | referencia | cpu-x4 | 222 | 4,6 | 3,4 | 10,1 | 100,0 % |
| firefox 157.0 | animacion | normal | 222 | 1,8 | 0,7 | 3,0 | 100,0 % |
| firefox 157.0 | animacion | hilo-ocupado¹ | 222 | 1,7 | 0,6 | 2,0 | 100,0 % |
| firefox 157.0 | referencia | normal | 222 | 0,3 | 0,8 | 2,0 | 100,0 % |
| firefox 157.0 | referencia | hilo-ocupado¹ | 222 | 0,1 | 0,8 | 1,0 | 100,0 % |
| webkit 27.2 | animacion | normal | 222 | 1,1 | 0,7 | 2,0 | 100,0 % |
| webkit 27.2 | animacion | hilo-ocupado | 222 | 1,2 | 0,7 | 2,0 | 100,0 % |
| webkit 27.2 | referencia | normal | 222 | 12,5 | 5,7 | 18,0 | 100,0 % |
| webkit 27.2 | referencia | hilo-ocupado | 222 | 20,0 | 19,1 | 67,9 | 91,0 % |

#### Cota superior (TR registrado − latencia programada)

| Motor | Reloj | Carga | n | Media (ms) | DE (ms) | P95 abs. (ms) | ≤ 50 ms |
|---|---|---|---:|---:|---:|---:|---:|
| chromium 156.0.8078.4 | animacion | normal | 222 | 2,4 | 1,0 | 3,6 | 100,0 % |
| chromium 156.0.8078.4 | animacion | hilo-ocupado | 222 | 2,2 | 0,8 | 3,3 | 100,0 % |
| chromium 156.0.8078.4 | animacion | cpu-x4 | 222 | 2,9 | 0,9 | 4,3 | 100,0 % |
| chromium 156.0.8078.4 | referencia | normal | 222 | 3,0 | 0,9 | 4,0 | 100,0 % |
| chromium 156.0.8078.4 | referencia | hilo-ocupado | 222 | 10,4 | 18,3 | 49,8 | 95,0 % |
| chromium 156.0.8078.4 | referencia | cpu-x4 | 222 | 3,4 | 3,7 | 9,0 | 100,0 % |
| firefox 157.0 | animacion | normal | 222 | 3,0 | 1,0 | 4,9 | 100,0 % |
| firefox 157.0 | animacion | hilo-ocupado | 222 | 11,4 | 19,3 | 58,9 | 92,8 % |
| firefox 157.0 | referencia | normal | 222 | 1,4 | 1,0 | 3,0 | 100,0 % |
| firefox 157.0 | referencia | hilo-ocupado | 222 | 8,6 | 18,0 | 56,0 | 93,7 % |
| webkit 27.2 | animacion | normal | 222 | 2,9 | 0,8 | 4,0 | 100,0 % |
| webkit 27.2 | animacion | hilo-ocupado | 222 | 2,7 | 1,0 | 4,0 | 100,0 % |
| webkit 27.2 | referencia | normal | 222 | 14,1 | 5,7 | 19,0 | 100,0 % |
| webkit 27.2 | referencia | hilo-ocupado | 222 | 21,5 | 19,1 | 69,9 | 90,1 % |

«≤ 50 ms»: porcentaje de ensayos con error absoluto de 50 ms o menos (CT-07).

¹ Con la carga, el percentil 95 del desvío del arnés sube más de 10 ms frente a la carga
normal: la tecla llegó tarde, el arnés no pudo separar esa espera y en esta celda vale la
cota superior.

Lectura breve:

- **El reloj de la aplicación (`animacion`) sin carga** registró el tiempo con un error de
  50 ms o menos en el 100 % de los ensayos de los tres motores: media de 1,1 a 1,8 ms y
  percentil 95 de 3,0 ms o menos. La cota superior también quedó en el 100 %.
- **Con la CPU 4 veces más lenta** (solo Chromium), el error medio con `animacion` subió a
  4,1 ms (percentil 95 de 6,3 ms), con el 100 % dentro de 50 ms.
- **Con el hilo ocupado**, Chromium y WebKit con `animacion` siguieron en el 100 %. Las dos
  celdas de Firefox con el hilo ocupado quedaron marcadas (¹): el desvío del arnés creció
  con la carga, porque la tecla inyectada esperó a la tarea larga, y el arnés no pudo separar
  esa espera («Lo que no se puede separar»). **En esas celdas vale la cota superior**: con
  `animacion`, media de 11,4 ms, percentil 95 de 58,9 ms y el 92,8 % de los ensayos dentro
  de 50 ms. La cota incluye la latencia del arnés, así que el error real está entre la
  primera tabla y la segunda.
- **El reloj `referencia`** (`setTimeout` y `Date.now()`), que la aplicación no usa, tuvo
  más error: 12,5 ms de media en WebKit sin carga y, con el hilo ocupado, el 95,0 % de los
  ensayos dentro de 50 ms en Chromium y el 91,0 % en WebKit. Con el hilo ocupado,
  `Date.now()` se toma cuando la web atiende la tecla, después de la tarea larga.
- La carga `hilo-ocupado` es una condición de esfuerzo: tareas largas de 30 a 100 ms que
  ocupan el hilo principal cerca del 25 % del tiempo.

## Cómo se ejecuta

**En GitHub Actions (el experimento completo).** Actions → «Precisión temporal (M-09)» →
*Run workflow* (rama `main`; «Sesiones por celda» en 3). Un trabajo por motor instala su
navegador, compila la web y mide sus celdas; cada uno sube sus CSV y sus metadatos como
artefacto (`precision-chromium`, `precision-firefox` y `precision-webkit`). El trabajo
«Resumen» arma la tabla, la muestra en el resumen de la corrida y la sube como
`precision-resumen`. Tarda unos 30 minutos.

**En un equipo propio**, desde la raíz del repositorio:

```
npm run build:web
npx playwright install chromium        # una vez; también firefox y webkit
npm run precision -w web -- --project=chromium
npm run precision:resumen -w web
```

Variables: `PRECISION_SESIONES` (sesiones por celda, 3), `PRECISION_TAREA` (`cambio-regla` o
`navon`; sin ella, las dos), `PRECISION_SEMILLA` (semilla de la primera sesión),
`PRECISION_SALIDA` (carpeta de los CSV), `PRECISION_VISIBLE=1` (con ventana) y
`CHROMIUM_EJECUTABLE` (otro Chromium ya instalado).

**Archivos.** Un CSV por celda, `precision-<motor>-<reloj>-<carga>.csv`, con una fila por
ensayo (coma, punto decimal, UTF-8 y CRLF): motor y versión, reloj, carga, sesión, semilla,
tarea, número, práctica, tecla, latencia programada, latencia efectiva, desvío del arnés,
TR registrado, error, cota superior, error de la aparición, error de la respuesta y tareas
largas que se cruzaron con el ensayo. Un `metadatos-<motor>.json` por motor con las
versiones (navegador, Playwright, Node, catálogo y algoritmo), el sistema, la CPU, el
commit y la fecha.

## Limitaciones

- **Sin pantalla y en máquinas virtuales.** Los motores corren sin pantalla (*headless*) y,
  en Actions, en máquinas virtuales compartidas. El ritmo de los fotogramas no lo marca un
  monitor real.
- **WebKit no es Safari.** Playwright usa su propia compilación de WebKit para Linux. Se
  parece a Safari, pero no es el mismo navegador ni el mismo sistema.
- **Resolución de los relojes.** Los navegadores redondean `performance.now()` y
  `event.timeStamp` para proteger la privacidad: Chromium a 0,1 ms, y Firefox y WebKit
  hasta a 1 ms. `Date.now()` siempre va de 1 ms en 1 ms. Esto suma hasta 1 ms de error en
  cada marca, en la web y en el arnés.
- **Teclas inyectadas.** Ver «Lo que no se puede separar»: en los motores que marcan la
  tecla en el hilo principal, la celda con el hilo ocupado se lee con la cota superior.
- **Un solo equipo por motor.** Los resultados valen para el equipo y la versión de cada
  corrida, que quedan en los metadatos.
