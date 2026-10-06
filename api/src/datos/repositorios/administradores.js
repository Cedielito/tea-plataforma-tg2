'use strict';
const { Administrador } = require('../modelos');
const { sesionesQueSeConservan } = require('../../dominio/autenticacion');

/**
 * Repositorio de la coleccion `administrador`. M-08, RF-09, RS-05
 *
 * Las sesiones se buscan por el hash del token; el token nunca llega aqui.
 */

function contar() {
  return Administrador.countDocuments();
}

function crear({ usuario, claveCifrada }) {
  return new Administrador({ usuario, claveCifrada }).save();
}

/** Para el inicio de sesion: incluye el hash de la clave y las sesiones. */
function buscarParaAcceso(usuario) {
  return Administrador.findOne({ usuario }).select('+claveCifrada');
}

/**
 * Abre una sesion: descarta las vencidas, conserva como maximo 4 de las
 * anteriores (5 con la nueva) y anota la fecha del ultimo acceso.
 * @param {import('mongoose').Document} administrador resultado de buscarParaAcceso
 */
function abrirSesion(administrador, { tokenHash, ahora }) {
  administrador.sesiones = [
    ...sesionesQueSeConservan(administrador.sesiones, ahora),
    { tokenHash, creadaEn: ahora, ultimaActividad: ahora }
  ];
  administrador.fechaUltimoAcceso = ahora;
  return administrador.save();
}

/**
 * @returns {Promise<{_id, usuario: string, fechaUltimoAcceso: Date|null,
 *   sesion: {creadaEn: Date, ultimaActividad: Date}} | null>}
 */
async function buscarPorSesion(tokenHash) {
  const encontrado = await Administrador.findOne({ 'sesiones.tokenHash': tokenHash })
    .select({ usuario: 1, fechaUltimoAcceso: 1, 'sesiones.$': 1 })
    .lean();
  if (!encontrado) return null;
  const { sesiones, ...administrador } = encontrado;
  return { ...administrador, sesion: sesiones[0] };
}

function registrarActividad(tokenHash, ahora) {
  return Administrador.updateOne(
    { 'sesiones.tokenHash': tokenHash },
    { $set: { 'sesiones.$.ultimaActividad': ahora } }
  );
}

function cerrarSesion(tokenHash) {
  return Administrador.updateOne({ 'sesiones.tokenHash': tokenHash }, { $pull: { sesiones: { tokenHash } } });
}

module.exports = { contar, crear, buscarParaAcceso, abrirSesion, buscarPorSesion, registrarActividad, cerrarSesion };
