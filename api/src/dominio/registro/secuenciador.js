'use strict';
const { CATALOGO, ORDEN_TAREAS } = require('./catalogo');
const { VERSION_CATALOGO } = require('./version');

/**
 * Secuencia de bloques de cada tarea y plan de la sesion. M-09, CP-01, CP-04,
 * CT-03, CT-08
 *
 * - CP-01: cada bloque tiene como maximo 7 ensayos.
 * - CP-04: cada tarea empieza con al menos 2 ensayos de practica con
 *   retroalimentacion.
 * - CT-08: la aplicacion dura 20 minutos o menos, con una pausa al menos cada
 *   5 minutos. Se ofrece una pausa al terminar la practica y cada bloque.
 * - CT-03: durante los ensayos el participante no ve temporizadores,
 *   marcadores ni puntajes (vistaDeEnsayo).
 *
 * Solo arma los bloques: los ensayos y sus estimulos los genera el motor de
 * ensayos (T13).
 *
 * Traido de fase-ii (api/src/dominio/minijuegos/secuenciador.js), sin tramos de
 * edad y con los bloques mixtos expandidos desde el catalogo.
 */

const LIMITES = Object.freeze({
  ENSAYOS_POR_BLOQUE: 7, // CP-01
  PRACTICA_MINIMA: 2, // CP-04
  DURACION_MAXIMA_MIN: 20, // CT-08
  MINUTOS_ENTRE_PAUSAS: 5 // CT-08
});

/** Minutos de bienvenida e indicaciones generales, antes de la primera tarea. */
const MINUTOS_INICIO = 2;

function expandirBloques(cfg) {
  const bloques = [];
  for (const plantilla of cfg.bloques) {
    const { repetir, ...bloque } = plantilla;
    const veces = repetir ? cfg[repetir] : 1;
    for (let i = 1; i <= veces; i += 1) {
      bloques.push({ ...bloque, id: repetir ? `${bloque.id}-${i}` : bloque.id });
    }
  }
  return bloques.map((b, i) => ({ ...b, orden: i + 1, ensayos: cfg.ensayosPorBloque, pausaDisponible: true }));
}

const minutos = (ensayos, cfg) => (ensayos * cfg.segundosPorEnsayo) / 60;

/** Construye la secuencia de bloques de una tarea y comprueba CP-01 y CP-04. */
function construirSecuencia(tarea) {
  const cfg = CATALOGO[tarea];
  if (!cfg) throw new RangeError('tarea desconocida: ' + tarea);
  const bloques = expandirBloques(cfg);

  for (const b of bloques) {
    if (b.ensayos > LIMITES.ENSAYOS_POR_BLOQUE) throw new Error('CP-01 incumplido en el bloque ' + b.id);
  }
  if (cfg.ensayosPractica < LIMITES.PRACTICA_MINIMA) throw new Error('CP-04 incumplido en ' + tarea);

  const ensayosPuntuados = bloques.reduce((s, b) => s + b.ensayos, 0);
  return {
    tarea,
    titulo: cfg.titulo,
    ensayosPractica: cfg.ensayosPractica,
    practicaConRetroalimentacion: true,
    bloques,
    ensayosPuntuados,
    trMinimoMs: cfg.trMinimoMs,
    duracionEstimadaMin: cfg.minutosInstrucciones + minutos(cfg.ensayosPractica + ensayosPuntuados, cfg),
    // El tramo mas largo sin pausa: las instrucciones con la practica, o el bloque mas largo
    tramoSinPausaMaxMin: Math.max(
      cfg.minutosInstrucciones + minutos(cfg.ensayosPractica, cfg),
      ...bloques.map((b) => minutos(b.ensayos, cfg))
    ),
    versionCatalogo: VERSION_CATALOGO
  };
}

/** CT-08. Plan de la sesion completa con las dos tareas en el orden dado. */
function planificarSesion(orden) {
  const tareas = orden && orden.length ? orden : ORDEN_TAREAS;
  const secuencias = tareas.map(construirSecuencia);
  const duracionTotalMin = MINUTOS_INICIO + secuencias.reduce((s, x) => s + x.duracionEstimadaMin, 0);
  const tramoSinPausaMaxMin = Math.max(MINUTOS_INICIO, ...secuencias.map((s) => s.tramoSinPausaMaxMin));
  return {
    secuencias,
    duracionTotalMin,
    tramoSinPausaMaxMin,
    cumpleCT08:
      duracionTotalMin <= LIMITES.DURACION_MAXIMA_MIN && tramoSinPausaMaxMin <= LIMITES.MINUTOS_ENTRE_PAUSAS,
    versionCatalogo: VERSION_CATALOGO
  };
}

/**
 * CT-03. Lo que el participante puede ver de un ensayo. Nunca el tiempo, la
 * clase de error, un temporizador ni un marcador. El acierto solo se muestra
 * en la practica, como retroalimentacion (CP-04).
 */
function vistaDeEnsayo(ensayo) {
  const { tiempoReaccionMs, pausasDuranteItemMs, acierto, claseError, ...visible } = ensayo;
  const practica = ensayo.practica === true;
  return {
    ...visible,
    ...(practica ? { acierto } : {}),
    mostrarTemporizador: false,
    mostrarMarcador: false,
    mostrarAcierto: practica
  };
}

module.exports = { LIMITES, construirSecuencia, planificarSesion, vistaDeEnsayo };
