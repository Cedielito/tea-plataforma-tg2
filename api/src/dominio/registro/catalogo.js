'use strict';

/**
 * Catalogo de las dos tareas del registro conductual. M-09, CP-01, CP-04,
 * CT-08, RF-14
 *
 * Solo tareas de dominio publico, con estimulos generados por codigo (T13 y
 * T14): la clasificacion con cambio de regla (DCCS) y las figuras jerarquicas
 * de Navon. No hay tramos de edad: en esta fase solo participan adultos.
 *
 * - Cambio de regla: 2 ensayos de practica, un bloque con la regla de color
 *   (antes del cambio), uno con la de forma (despues del cambio) y
 *   `bloquesMixtos` bloques con la regla indicada en cada ensayo.
 * - Navon: 2 ensayos de practica y 4 bloques en orden ABBA (global, local,
 *   local, global).
 * - 7 ensayos por bloque.
 * - `trMinimoMs`: un tiempo de reaccion neto menor es una anticipacion y no
 *   entra al calculo (RF-14).
 * - `segundosPorEnsayo` y `minutosInstrucciones` son estimaciones para
 *   comprobar CT-08; T16 mide la duracion real.
 *
 * Cambiar cualquier cantidad exige subir VERSION_CATALOGO (version.js).
 *
 * Traido de fase-ii (api/src/dominio/minijuegos/catalogo.js), reducido a dos
 * tareas y sin tramos de edad.
 */

const TAREAS = Object.freeze({ CAMBIO_REGLA: 'cambio-regla', NAVON: 'navon' });

/** Orden de aplicacion de las tareas en la sesion. */
const ORDEN_TAREAS = Object.freeze([TAREAS.CAMBIO_REGLA, TAREAS.NAVON]);

/** Fases de un bloque de la tarea de cambio de regla. */
const FASES = Object.freeze({ PRE_CAMBIO: 'pre-cambio', POST_CAMBIO: 'post-cambio', MIXTO: 'mixto' });

const REGLAS = Object.freeze({ COLOR: 'color', FORMA: 'forma' });

const CONDICIONES = Object.freeze({ GLOBAL: 'global', LOCAL: 'local' });

const TR_MINIMO_MS = 200;

function congelar(objeto) {
  for (const valor of Object.values(objeto)) {
    if (valor && typeof valor === 'object') congelar(valor);
  }
  return Object.freeze(objeto);
}

const CATALOGO = congelar({
  [TAREAS.CAMBIO_REGLA]: {
    titulo: 'Clasificación con cambio de regla',
    paradigma: 'DCCS',
    ensayosPractica: 2,
    ensayosPorBloque: 7,
    bloquesMixtos: 4,
    trMinimoMs: TR_MINIMO_MS,
    segundosPorEnsayo: 4,
    minutosInstrucciones: 1,
    bloques: [
      { id: 'CR-COLOR', fase: FASES.PRE_CAMBIO, regla: REGLAS.COLOR, senal: 'por-bloque' },
      { id: 'CR-FORMA', fase: FASES.POST_CAMBIO, regla: REGLAS.FORMA, senal: 'por-bloque' },
      // Se repite `bloquesMixtos` veces (secuenciador.js)
      { id: 'CR-MIXTO', fase: FASES.MIXTO, regla: null, senal: 'por-ensayo', repetir: 'bloquesMixtos' }
    ]
  },
  [TAREAS.NAVON]: {
    titulo: 'Figuras jerárquicas de Navon',
    paradigma: 'Navon',
    ensayosPractica: 2,
    ensayosPorBloque: 7,
    trMinimoMs: TR_MINIMO_MS,
    segundosPorEnsayo: 4,
    minutosInstrucciones: 1,
    bloques: [
      { id: 'NV-GLOBAL-1', condicion: CONDICIONES.GLOBAL },
      { id: 'NV-LOCAL-1', condicion: CONDICIONES.LOCAL },
      { id: 'NV-LOCAL-2', condicion: CONDICIONES.LOCAL },
      { id: 'NV-GLOBAL-2', condicion: CONDICIONES.GLOBAL }
    ]
  }
});

module.exports = { TAREAS, ORDEN_TAREAS, FASES, REGLAS, CONDICIONES, TR_MINIMO_MS, CATALOGO };
