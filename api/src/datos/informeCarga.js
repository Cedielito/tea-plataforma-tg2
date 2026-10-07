'use strict';
const mongoose = require('mongoose');

/**
 * Mensajes de las cargas de api/contenidos al arrancar la API: textos de S1 a
 * S5 (sincronizacionContenidos.js) y listas YAML como los pasos de la ruta
 * (sincronizacionListas.js). M-02, M-03, RF-10
 *
 * Quedan en el registro (los logs de Render), en espanol y sin trazas.
 */

/**
 * Mensaje legible de un error al guardar: validacion, identificador repetido u otro.
 * @param {string} repetido mensaje para el indice unico (codigo 11000)
 */
function describirError(error, repetido) {
  if (error instanceof mongoose.Error.ValidationError) {
    return Object.values(error.errors)
      .map((detalle) => detalle.message)
      .join(' ');
  }
  if (error && error.code === 11000) return repetido;
  return error && error.message ? error.message : String(error);
}

const contar = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

/** «Contenidos: 0 creados, 1 actualizado, 7 sin cambios, 0 con errores.» */
function resumirInforme({ creados, actualizados, sinCambios, errores }, nombre = 'Contenidos') {
  return [
    `${nombre}: ${contar(creados.length, 'creado', 'creados')}`,
    contar(actualizados.length, 'actualizado', 'actualizados'),
    `${sinCambios.length} sin cambios`,
    `${contar(errores.length, 'con error', 'con errores')}.`
  ].join(', ');
}

module.exports = { describirError, resumirInforme };
