'use strict';

/**
 * Versiones del registro conductual. M-09, CT-13
 *
 * Cada resultado guarda la version del algoritmo con que se calculo: la misma
 * entrada con la misma version produce la misma salida. Cualquier cambio en un
 * calculo de indicadores.js o motor.js sube VERSION_ALGORITMO; cualquier cambio
 * en las cantidades del catalogo sube VERSION_CATALOGO. Las pruebas guardan los
 * valores esperados de cada version, asi que un cambio sin subirla las rompe.
 *
 * Traido de fase-ii (api/src/dominio/puntuacion/version.js). Empieza en 1.0.0
 * porque CC-09 cambio de definicion y el catalogo se redujo a dos tareas.
 */

module.exports = Object.freeze({
  VERSION_ALGORITMO: '1.0.0',
  VERSION_CATALOGO: '1.0.0'
});
