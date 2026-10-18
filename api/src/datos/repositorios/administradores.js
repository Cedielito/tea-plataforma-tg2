'use strict';
const { Administrador } = require('../modelos');
const { ROLES, rolDe, sesionesQueSeConservan } = require('../../dominio/autenticacion');

/**
 * Repositorio de la coleccion `administrador`. M-08, M-09, RF-09, RS-05
 *
 * Las sesiones se buscan por el hash del token; el token nunca llega aqui.
 * Las cuentas sin `rol` (anteriores a T15) se leen como de administrador.
 */

const filtroDeRol = (rol) => (rol === ROLES.PROFESIONAL ? { rol } : { rol: { $ne: ROLES.PROFESIONAL } });

/** Cuentas de administrador (sin contar las de profesional). */
function contar() {
  return Administrador.countDocuments(filtroDeRol(ROLES.ADMINISTRADOR));
}

function contarProfesionales() {
  return Administrador.countDocuments(filtroDeRol(ROLES.PROFESIONAL));
}

function crear({ usuario, claveCifrada, rol = ROLES.ADMINISTRADOR }) {
  return new Administrador({ usuario, claveCifrada, rol }).save();
}

/** @returns {Promise<{usuario: string, rol: string} | null>} */
async function buscarPorUsuario(usuario) {
  const encontrado = await Administrador.findOne({ usuario }).select({ usuario: 1, rol: 1 }).lean();
  return encontrado ? { usuario: encontrado.usuario, rol: rolDe(encontrado) } : null;
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
 * @returns {Promise<{_id, usuario: string, rol: string, fechaUltimoAcceso: Date|null,
 *   sesion: {creadaEn: Date, ultimaActividad: Date}} | null>}
 */
async function buscarPorSesion(tokenHash) {
  const encontrado = await Administrador.findOne({ 'sesiones.tokenHash': tokenHash })
    .select({ usuario: 1, rol: 1, fechaUltimoAcceso: 1, 'sesiones.$': 1 })
    .lean();
  if (!encontrado) return null;
  const { sesiones, ...administrador } = encontrado;
  return { ...administrador, rol: rolDe(administrador), sesion: sesiones[0] };
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

module.exports = {
  contar,
  contarProfesionales,
  crear,
  buscarPorUsuario,
  buscarParaAcceso,
  abrirSesion,
  buscarPorSesion,
  registrarActividad,
  cerrarSesion
};
