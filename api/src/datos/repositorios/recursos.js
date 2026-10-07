'use strict';
const mongoose = require('mongoose');
const { Recurso } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `recurso`. M-05, M-08, RF-06, RF-10, RCN-01, RCN-02
 *
 * La lectura publica solo devuelve lo publicado, con el slug y sin el _id, en
 * el orden en que se crearon (el del archivo recursos.yaml). Las del panel
 * (listarTodos, obtenerPorId) incluyen tambien los borradores.
 */

const CAMPOS_PUBLICOS = 'slug titulo descripcion tipo url perfiles fuentes fechaRevision';
const CAMPOS_LISTA_PANEL = 'slug titulo tipo perfiles estado fechaRevision updatedAt';
const CAMPOS_PANEL = `${CAMPOS_LISTA_PANEL} descripcion url fuentes`;
const ORDEN = { createdAt: 1, _id: 1 };

function listarPublicados() {
  return Recurso.find({ estado: ESTADOS.PUBLICADO }).select(`${CAMPOS_PUBLICOS} -_id`).sort(ORDEN).lean();
}

/** Panel: todos los recursos, publicados y borradores, en el orden del sitio. */
function listarTodos() {
  return Recurso.find().select(CAMPOS_LISTA_PANEL).sort(ORDEN).lean();
}

/** Panel: un recurso, publicado o no. @returns null si no existe o el id no es valido. */
function obtenerPorId(id) {
  if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);
  return Recurso.findById(id).select(CAMPOS_PANEL).lean();
}

module.exports = { listarPublicados, listarTodos, obtenerPorId, ...crearEscritura(Recurso) };
