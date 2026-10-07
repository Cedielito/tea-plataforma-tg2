'use strict';
const mongoose = require('mongoose');
const { EntidadDirectorio } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `entidad_directorio`. M-04, M-08, RF-05, RF-10,
 * RS-01, RS-07, RCN-01, RCN-02
 *
 * La lectura publica devuelve todas las entidades publicadas, sin filtrar: la
 * web filtra por ciudad y tipo en el navegador, tanto en /directorio como en
 * la guia de la ruta, donde la ciudad que elige la persona no sale del
 * navegador (RF-04, RS-01). Nunca incluye la constancia de autorizacion
 * (RS-07). Las del panel (listarTodas, obtenerPorId) incluyen tambien los
 * borradores y la constancia.
 */

const CAMPOS_PUBLICOS = 'slug nombre tipo ciudad descripcion contacto esProfesional fuentes fechaVerificacion';
const CAMPOS_LISTA_PANEL = 'slug nombre tipo ciudad esProfesional estado fechaVerificacion updatedAt';
const CAMPOS_PANEL = `${CAMPOS_LISTA_PANEL} descripcion contacto constanciaAutorizacion fuentes`;

/** Por nombre, como se ordena en espanol (las tildes no mandan una entidad al final). */
const ORDEN = { nombre: 1, _id: 1 };
const COLACION = { locale: 'es' };

function listarPublicadas() {
  return EntidadDirectorio.find({ estado: ESTADOS.PUBLICADO })
    .select(`${CAMPOS_PUBLICOS} -_id`)
    .sort(ORDEN)
    .collation(COLACION)
    .lean();
}

/** Panel: todas las entidades, publicadas y borradores, por nombre. */
function listarTodas() {
  return EntidadDirectorio.find().select(CAMPOS_LISTA_PANEL).sort(ORDEN).collation(COLACION).lean();
}

/** Panel: una entidad, publicada o no. @returns null si no existe o el id no es valido. */
function obtenerPorId(id) {
  if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);
  return EntidadDirectorio.findById(id).select(CAMPOS_PANEL).lean();
}

module.exports = { listarPublicadas, listarTodas, obtenerPorId, ...crearEscritura(EntidadDirectorio) };
