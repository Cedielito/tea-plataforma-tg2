'use strict';
const mongoose = require('mongoose');
const { MensajeContacto } = require('../modelos');

/**
 * Repositorio de la coleccion `mensaje_contacto`. M-06, M-08, RF-08, RF-11,
 * RS-02, RS-04
 *
 * - crear: guarda un mensaje del formulario de contacto (solo correo,
 *   mensaje, fecha y version de la politica).
 * - listar: la bandeja del panel, del mas reciente al mas antiguo. Los
 *   mensajes viven como maximo 180 dias, asi que la lista no crece sin fin;
 *   el limite es una proteccion por si alguien llena la bandeja.
 * - eliminar: RS-04, a solicitud de quien escribio o despues de responder.
 */

const LIMITE_BANDEJA = 1000;

function crear({ correo, mensaje, fecha, versionPolitica }) {
  return new MensajeContacto({ correo, mensaje, fecha, versionPolitica }).save();
}

function listar() {
  return MensajeContacto.find().sort({ fecha: -1, _id: -1 }).limit(LIMITE_BANDEJA).lean();
}

/** @returns {Promise<boolean>} true si el mensaje existia y se borro */
async function eliminar(id) {
  if (!mongoose.isValidObjectId(id)) return false;
  const { deletedCount } = await MensajeContacto.deleteOne({ _id: id });
  return deletedCount === 1;
}

module.exports = { LIMITE_BANDEJA, crear, listar, eliminar };
