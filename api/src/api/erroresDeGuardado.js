'use strict';
const mongoose = require('mongoose');
const { MENSAJES: MENSAJES_PUBLICACION, CAMPOS_FECHA } = require('../dominio/publicacion');

/**
 * Respuesta del panel cuando el modelo rechaza guardar. M-08, RF-10, RCN-01, RCN-02
 * La usan los editores de contenidos, pasos de la ruta, directorio, preguntas
 * frecuentes y recursos.
 *
 * Devuelve un mensaje por campo ({ campos: { fuentes: '...' } }) para que el
 * editor lo muestre junto a cada uno. Los mensajes son los de los esquemas y
 * los de dominio/publicacion.js; los errores de conversion de Mongoose
 * («Cast to date failed for value ...») se cambian por un texto en espanol.
 */

const MENSAJES = Object.freeze({
  REVISA_CAMPOS: 'No se pudo guardar. Revisa los campos marcados.',
  SLUG_REPETIDO: 'Ya existe otro contenido con este slug. Escribe uno distinto.',
  SLUG_REPETIDO_PASO: 'Ya existe otro paso con este slug. Escribe uno distinto.',
  SLUG_REPETIDO_ENTIDAD: 'Ya existe otra entidad con este slug. Escribe uno distinto.',
  SLUG_REPETIDO_PREGUNTA: 'Ya existe otra pregunta con este slug. Escribe uno distinto.',
  SLUG_REPETIDO_RECURSO: 'Ya existe otro recurso con este slug. Escribe uno distinto.',
  VALOR_INVALIDO: 'El valor no es válido.'
});

function mensajeDe(detalle) {
  if (detalle instanceof mongoose.Error.CastError) {
    if (detalle.kind !== 'date') return MENSAJES.VALOR_INVALIDO;
    return CAMPOS_FECHA[detalle.path]?.invalida ?? MENSAJES_PUBLICACION.FECHA_INVALIDA;
  }
  return detalle.message;
}

/** @returns {Object<string, string>} mensaje por ruta del campo (titulo, fuentes.0.url, ...) */
function camposDe(error) {
  const campos = {};
  for (const [ruta, detalle] of Object.entries(error.errors)) campos[ruta] = mensajeDe(detalle);
  return campos;
}

/**
 * Responde 422 (validacion) o 409 (slug repetido). Cualquier otro error se
 * vuelve a lanzar para que responda manejarError, sin exponer detalles.
 * @param {{slugRepetido?: string}} opciones mensaje del slug repetido en cada editor
 */
function responderErrorDeGuardado(error, res, { slugRepetido = MENSAJES.SLUG_REPETIDO } = {}) {
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(422).json({ error: MENSAJES.REVISA_CAMPOS, campos: camposDe(error) });
  }
  if (error && error.code === 11000) {
    return res.status(409).json({ error: MENSAJES.REVISA_CAMPOS, campos: { slug: slugRepetido } });
  }
  throw error;
}

module.exports = { MENSAJES, responderErrorDeGuardado };
