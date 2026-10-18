'use strict';
const SESION_WEB = require('./sesionWebDosTareas.json');

/**
 * Envios de las tareas del registro conductual para las pruebas (T15). M-09
 *
 * Salen de la sesion simulada de las dos tareas con el formato de la web
 * (sesionWebDosTareas.json, de web/src/registro/sesionSimulada.js), con la
 * semilla de la sesion creada en la prueba: la API genera una semilla por
 * sesion y rechaza los ensayos con otra.
 */

const copia = (valor) => JSON.parse(JSON.stringify(valor));

/** Ensayos de una tarea, con la semilla dada. */
function ensayosDe(tarea, semilla = SESION_WEB.semilla) {
  return copia(SESION_WEB.ensayos.filter((e) => e.tarea === tarea)).map((e) => ({ ...e, semilla }));
}

/** Cuerpo de PUT /api/registro/aplicacion/tareas/:tarea. */
function envioDe(tarea, { semilla = SESION_WEB.semilla, ...cambios } = {}) {
  return {
    versionCatalogo: SESION_WEB.versionCatalogo,
    semilla,
    reloj: 'animacion',
    ensayos: ensayosDe(tarea, semilla),
    contexto: { pausas: tarea === 'navon' ? 2 : 1, repeticionesInstruccion: tarea === 'navon' ? 0 : 1 },
    ...cambios
  };
}

module.exports = { SESION_WEB, ensayosDe, envioDe };
