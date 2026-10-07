'use strict';
const mongoose = require('mongoose');
const { PreguntaFrecuente } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { construirFiltroBusqueda, LIMITE_RESULTADOS } = require('../../dominio/busqueda');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `pregunta_frecuente`. M-05, M-08, RF-02, RF-07,
 * RF-10, RCN-01, RCN-02
 *
 * Las lecturas publicas solo devuelven lo publicado, ordenado por `orden`, con
 * el slug (el ancla de la pregunta en la web) y sin el _id. Las del panel
 * (listarTodas, obtenerPorId) incluyen tambien los borradores.
 */

const CAMPOS_PUBLICOS = 'slug pregunta respuesta fuentes fechaRevision';
const CAMPOS_BUSCABLES = ['pregunta', 'respuesta'];
const CAMPOS_LISTA_PANEL = 'slug pregunta orden estado fechaRevision updatedAt';
const CAMPOS_PANEL = `${CAMPOS_LISTA_PANEL} respuesta fuentes`;
const ORDEN = { orden: 1, createdAt: 1, _id: 1 };

function listarPublicadas() {
  return PreguntaFrecuente.find({ estado: ESTADOS.PUBLICADO }).select(`${CAMPOS_PUBLICOS} -_id`).sort(ORDEN).lean();
}

function buscarPublicadas(palabras) {
  return PreguntaFrecuente.find({
    estado: ESTADOS.PUBLICADO,
    ...construirFiltroBusqueda(palabras, CAMPOS_BUSCABLES)
  })
    .select(`${CAMPOS_PUBLICOS} -_id`)
    .sort(ORDEN)
    .limit(LIMITE_RESULTADOS)
    .lean();
}

/** Panel: todas las preguntas, publicadas y borradores, por orden. */
function listarTodas() {
  return PreguntaFrecuente.find().select(CAMPOS_LISTA_PANEL).sort(ORDEN).lean();
}

/** Panel: una pregunta, publicada o no. @returns null si no existe o el id no es valido. */
function obtenerPorId(id) {
  if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);
  return PreguntaFrecuente.findById(id).select(CAMPOS_PANEL).lean();
}

module.exports = { listarPublicadas, buscarPublicadas, listarTodas, obtenerPorId, ...crearEscritura(PreguntaFrecuente) };
