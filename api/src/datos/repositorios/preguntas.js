'use strict';
const { PreguntaFrecuente } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { construirFiltroBusqueda, LIMITE_RESULTADOS } = require('../../dominio/busqueda');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `pregunta_frecuente`. M-05, RF-02, RF-07, RCN-01, RCN-02
 * Las lecturas publicas solo devuelven lo publicado, ordenado por `orden`.
 */

const CAMPOS_PUBLICOS = 'pregunta respuesta fuentes fechaRevision';
const CAMPOS_BUSCABLES = ['pregunta', 'respuesta'];
const ORDEN = { orden: 1, createdAt: 1, _id: 1 };

function listarPublicadas() {
  return PreguntaFrecuente.find({ estado: ESTADOS.PUBLICADO }).select(CAMPOS_PUBLICOS).sort(ORDEN).lean();
}

function buscarPublicadas(palabras) {
  return PreguntaFrecuente.find({
    estado: ESTADOS.PUBLICADO,
    ...construirFiltroBusqueda(palabras, CAMPOS_BUSCABLES)
  })
    .select(CAMPOS_PUBLICOS)
    .sort(ORDEN)
    .limit(LIMITE_RESULTADOS)
    .lean();
}

module.exports = { listarPublicadas, buscarPublicadas, ...crearEscritura(PreguntaFrecuente) };
