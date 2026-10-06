'use strict';
const { Recurso } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `recurso`. M-05, RF-06, RCN-01, RCN-02
 * Las lecturas publicas solo devuelven lo publicado.
 */

const CAMPOS_PUBLICOS = 'titulo descripcion tipo url perfiles fuentes fechaRevision';

function listarPublicados() {
  return Recurso.find({ estado: ESTADOS.PUBLICADO })
    .select(CAMPOS_PUBLICOS)
    .sort({ createdAt: 1, _id: 1 })
    .lean();
}

module.exports = { listarPublicados, ...crearEscritura(Recurso) };
