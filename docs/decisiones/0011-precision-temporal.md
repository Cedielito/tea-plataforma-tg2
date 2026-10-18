# 0011 — Precisión temporal, perfiles simulados y reproducibilidad (T16)

**Estado:** aceptada (octubre de 2026)

**Contexto.** T13 a T15 dejaron M-09 completo: las dos tareas, el reloj con dos variantes
(`animacion` y `referencia`), el flujo del profesional y el resultado guardado con su
versión. Antes de la prueba con voluntarios faltaba la capa 1 de la evaluación, sin
participantes. Había que medir el error del registro del tiempo de reacción (CT-07),
comprobar con datos de parámetros conocidos que el motor recupera lo que debe, y comprobar
que la misma entrada con la misma versión da la misma salida, también al guardar y volver a
procesar (CT-13). Necesitábamos decidir cómo medir el tiempo sin hardware, cómo separar la
latencia del arnés, cómo simular a las personas y qué corre en el CI normal.

**Decisión.**

- **Arnés por fuera de la web.** Playwright 1.64.1 (dependencia de desarrollo de `web/`)
  recorre `/registro/prueba` sobre el build y la API local, sin cambiar `reloj.js`,
  `motorEnsayo.js` ni las pantallas. Un script inyectado antes de cargar la página
  (`web/evaluacion/precision/arnes.js`) guarda sus propias marcas. Node solo reacciona a
  los avisos de la página y no la consulta durante los ensayos.
- **Aparición de referencia: el final del fotograma que dibuja el estímulo.** Un
  `MutationObserver` ve el estímulo, un `requestAnimationFrame` cae en su fotograma y un
  mensaje de `MessageChannel` se atiende cuando el fotograma terminó. No usamos la marca
  que el navegador entrega a `requestAnimationFrame`: en Chromium queda antes de la
  inserción del estímulo y, con el hilo ocupado, hasta 90 ms antes del callback. Si una
  tarea larga se cuela antes del mensaje, la referencia es su inicio.
- **Pulsación de referencia: `event.timeStamp` del `keydown` real**, escuchado en fase de
  captura antes que la web. En Chromium no espera al hilo principal.
- **La latencia del arnés se mide, no se supone.** El error es el TR registrado menos la
  latencia efectiva (pulsación − aparición, las dos de referencia). Se informa además la
  cota superior (TR registrado − latencia programada) y el desvío del arnés. Si con la
  carga el percentil 95 del desvío sube más de 10 ms frente a la celda `normal` del mismo
  motor y reloj, la celda se lee con la cota superior: el motor entregó la tecla tarde y el
  arnés no pudo separar esa espera. Sin carga, un desvío variable no invalida el error,
  porque la pulsación se mide igual.
- **Diseño.** Motor (Chromium, Firefox y WebKit) × reloj (`animacion`, `referencia`) × carga
  (`normal`; `hilo-ocupado`, con tareas largas de 30 a 100 ms sorteadas con semilla;
  `cpu-x4`, solo en Chromium, por CDP): 14 celdas, con 3 sesiones de las dos tareas por
  celda (222 ensayos). Latencias de 300, 500 y 800 ms, balanceadas. Mismas semillas en
  todas las celdas.
- **Solo en el flujo manual.** El experimento corre en `.github/workflows/precision.yml`
  (`workflow_dispatch`), un trabajo por motor en `ubuntu-24.04` y un trabajo final que arma
  la tabla. No corre en el CI normal: dura media hora y sus números dependen de la máquina.
  En el CI normal sí corren las pruebas de sus cálculos (`web/evaluacion/**/*.test.js`).
- **Perfiles simulados con medias exactas.** Seis perfiles (`web/src/registro/perfilesSimulados.js`)
  con tiempo medio, costo de cambio, diferencia global-local, errores y omisiones por bloque,
  y dispersión. Pasan por el mismo camino que la página (generadores con semilla, motor de
  ensayos con reloj falso, evaluación) y se guardan en
  `api/test/ayudas/perfilesSimulados.json`, con un ensayo por línea. El ruido se centra en
  cada grupo que usan los indicadores, así que las medias son exactas y la recuperación se
  puede exigir con ±1 ms. En el bloque de forma los errores van primero, como
  perseveración: CC-08 es la tasa de error y CC-12, errores + 3.
- **Reproducibilidad por la API.** Cada perfil se aplica de punta a punta por la API de T15:
  el resultado guardado es exactamente el de `procesarSesion`, leer la sesión y sus ensayos
  de la base y volver a procesarlos da lo mismo, y otra sesión con los mismos ensayos, más
  tarde y con otra semilla, da los mismos valores, también en `valores.csv`.

**Consecuencias.** `docs/evaluacion/precision.md` trae el método y, por ahora, la tabla de
una corrida corta de comprobación con Chromium. Después de fusionar hay que lanzar el
flujo y pegar su tabla (pendiente en el backlog). El catálogo, el algoritmo y sus versiones
no cambian. `sesionSimulada.js` exporta su simulador para los perfiles, sin cambiar lo que
produce. La duración real de la sesión (CT-08) sigue pendiente: necesita a los
voluntarios. Si se agrega un perfil o cambia el formato de los ensayos, el archivo de los
perfiles se regenera con `ACTUALIZAR_SESION_SIMULADA=1 npm test -w web`.
