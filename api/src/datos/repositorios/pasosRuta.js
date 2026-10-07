'use strict';
const mongoose = require('mongoose');
const { PasoRuta } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `paso_ruta`. M-03, M-08, RF-04, RF-10, RCN-01, RCN-02
 *
 * La lectura publica devuelve todos los pasos publicados, sin filtrar: la web
 * elige en el navegador los que coinciden con las respuestas (RF-04, RS-01).
 * Las del panel (listarTodos, obtenerPorId) incluyen tambien los borradores.
 */

const CAMPOS_PUBLICOS = 'slug titulo texto perfiles tramos regimenes orden tiposEntidad fuentes fechaRevision';
const CAMPOS_LISTA_PANEL = 'slug titulo perfiles tramos regimenes orden estado fechaRevision updatedAt';
const CAMPOS_PANEL = `${CAMPOS_LISTA_PANEL} texto tiposEntidad fuentes`;
const ORDEN = { orden: 1, createdAt: 1, _id: 1 };

function listarPublicados() {
  return PasoRuta.find({ estado: ESTADOS.PUBLICADO }).select(`${CAMPOS_PUBLICOS} -_id`).sort(ORDEN).lean();
}

/** Panel: todos los pasos, publicados y borradores, por orden. */
function listarTodos() {
  return PasoRuta.find().select(CAMPOS_LISTA_PANEL).sort(ORDEN).lean();
}

/** Panel: un paso, publicado o no. @returns null si no existe o el id no es valido. */
function obtenerPorId(id) {
  if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);
  return PasoRuta.findById(id).select(CAMPOS_PANEL).lean();
}

module.exports = { listarPublicados, listarTodos, obtenerPorId, ...crearEscritura(PasoRuta) };
