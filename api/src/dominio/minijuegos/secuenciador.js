'use strict';
const { CATALOGO, tramoDeEdad } = require('./catalogo');

/** Limites de la matriz de criterios que el secuenciador debe respetar. */
const LIMITES = {
  ENSAYOS_POR_BLOQUE: 7,      // CP-01
  PRACTICA_MINIMA: 2,         // CP-04
  DURACION_MAXIMA_MIN: 20,    // CT-08
  MINUTOS_ENTRE_PAUSAS: 5     // CT-08
};

/**
 * Construye la secuencia de una sesion para un minijuego y un tramo de edad.
 * Devuelve los bloques efectivos, los ensayos de practica y los puntos de pausa.
 */
function construirSecuencia(codigoMinijuego, edad) {
  const cfg = CATALOGO[codigoMinijuego];
  if (!cfg) throw new RangeError('minijuego desconocido: ' + codigoMinijuego);
  const tramo = tramoDeEdad(edad);
  const ajuste = cfg.porTramo[tramo] || {};
  const omitidos = ajuste.bloquesOmitidos || [];

  const bloques = cfg.bloques
    .filter((b) => !omitidos.includes(b.id))
    .map((b, i) => ({ ...b, orden: i + 1, pausaDisponible: true }));

  for (const b of bloques) {
    if (b.ensayos > LIMITES.ENSAYOS_POR_BLOQUE) {
      throw new Error('CP-01 incumplido en el bloque ' + b.id);
    }
  }
  if (cfg.ensayosPractica < LIMITES.PRACTICA_MINIMA) {
    throw new Error('CP-04 incumplido en ' + codigoMinijuego);
  }

  return {
    minijuego: codigoMinijuego,
    nombre: cfg.nombre,
    tramo,
    ajuste,
    ensayosPractica: cfg.ensayosPractica,
    bloques,
    ensayosPuntuados: bloques.reduce((s, b) => s + b.ensayos, 0),
    duracionEstimadaMin: cfg.duracionEstimadaMin
  };
}

/** CT-08. Verifica que la sesion completa del menor no supere los 20 minutos. */
function planificarSesion(edad, orden) {
  const codigos = orden && orden.length ? orden : Object.keys(CATALOGO);
  const secuencias = codigos.map((c) => construirSecuencia(c, edad));
  const duracionMinijuegos = secuencias.reduce((s, x) => s + x.duracionEstimadaMin, 0);
  const duracionTotal = duracionMinijuegos + 2; // configuracion sensorial e instrucciones
  const pausas = [];
  let acumulado = 0;
  for (const s of secuencias) {
    acumulado += s.duracionEstimadaMin;
    if (acumulado >= LIMITES.MINUTOS_ENTRE_PAUSAS) {
      pausas.push({ despuesDe: s.minijuego, minutoAproximado: acumulado });
      acumulado = 0;
    }
  }
  return {
    secuencias,
    duracionTotalMin: duracionTotal,
    pausas,
    cumpleCT08: duracionTotal <= LIMITES.DURACION_MAXIMA_MIN
  };
}

/** CT-03. El ensayo nunca expone temporizador ni marcador al participante. */
function vistaDeEnsayo(ensayo) {
  const { tiempoReaccionMs, acierto, ...visible } = ensayo;
  return { ...visible, mostrarTemporizador: false, mostrarMarcador: false };
}

module.exports = { LIMITES, construirSecuencia, planificarSesion, vistaDeEnsayo };
