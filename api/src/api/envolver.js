'use strict';

/**
 * Express 4 no atrapa los errores de los manejadores asincronos: este
 * envoltorio los pasa a `next` para que respondan por manejarError.
 */
function envolver(manejador) {
  return (req, res, next) => Promise.resolve(manejador(req, res, next)).catch(next);
}

module.exports = { envolver };
