'use strict';
const { TIPOS_ENTIDAD, CIUDADES, ESTADOS } = require('./catalogos');

/**
 * Reglas de las entidades del directorio de orientacion. M-04, RF-05, RF-10,
 * RS-07, HU-14
 *
 * - RS-07: el directorio solo publica datos institucionales publicos o de
 *   profesionales con su autorizacion expresa. Un profesional independiente
 *   (`esProfesional`) no se publica sin la constancia de esa autorizacion.
 *   La constancia dice donde esta archivada la autorizacion firmada y su
 *   fecha; nunca sale por la API publica. Un borrador se puede guardar sin
 *   ella, igual que sin fuentes ni fecha.
 * - HU-14: cada entidad tiene al menos un canal de contacto (telefono, correo
 *   o sitio web), tambien en borrador, como el nombre o el tipo.
 *
 * Fuentes y fecha de verificacion (RCN-01, RCN-02) las exige el plugin
 * `publicable` con dominio/publicacion.js. Funciones puras: el modelo las
 * aplica al guardar, igual para el panel que para directorio/entidades.yaml.
 */

const CAMPOS_CONTACTO = Object.freeze(['telefonos', 'correo', 'web', 'direccion', 'horario']);

const MENSAJES = Object.freeze({
  SIN_CONSTANCIA:
    'Para publicar a un profesional independiente hace falta la constancia de su autorización: dónde está ' +
    'archivada la autorización firmada y su fecha.',
  SIN_CONTACTO: 'Indica al menos un canal de contacto: teléfono, correo o sitio web.',
  CORREO_INVALIDO: 'El correo no tiene un formato válido, por ejemplo contacto@entidad.gov.co.',
  WEB_INSEGURA: 'El sitio web debe empezar por http:// o https://.',
  TIPO_INVALIDO: `El tipo debe ser uno de estos: ${TIPOS_ENTIDAD.join(', ')}.`,
  CIUDAD_INVALIDA: `La ciudad debe ser una de estas: ${CIUDADES.join(', ')}.`,
  CONTACTO_SIN_CAMPOS: 'contacto debe tener campos con nombre, como telefonos: y web:.',
  CONTACTO_CAMPO_DESCONOCIDO: 'Campo desconocido en contacto:',
  TELEFONOS_NO_LISTA: 'telefonos debe ser una lista, por ejemplo ["(601) 330 5000"].'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const conTexto = (valor) => typeof valor === 'string' && valor.trim() !== '';

/** Formato basico: algo@dominio.algo, sin espacios. */
const esCorreoValido = (valor) => typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());

function tieneCanalDeContacto(contacto) {
  if (!contacto) return false;
  const telefonos = Array.isArray(contacto.telefonos) ? contacto.telefonos : [];
  return telefonos.some(conTexto) || conTexto(contacto.correo) || conTexto(contacto.web);
}

/** RS-07: errores de autorizacion de un profesional que se quiere publicar. */
function validarAutorizacion({ estado, esProfesional, constanciaAutorizacion } = {}) {
  if (estado !== ESTADOS.PUBLICADO || esProfesional !== true) return [];
  return conTexto(constanciaAutorizacion) ? [] : [MENSAJES.SIN_CONSTANCIA];
}

/**
 * Errores que impiden guardar la entidad, ademas de los de cada campo del
 * esquema y los de RCN-01 y RCN-02.
 * @returns {{campo: string, mensaje: string}[]}
 */
function validarEntidad(doc) {
  if (!doc) return [];
  const errores = [];
  if (!tieneCanalDeContacto(doc.contacto)) errores.push({ campo: 'contacto', mensaje: MENSAJES.SIN_CONTACTO });
  for (const mensaje of validarAutorizacion(doc)) errores.push({ campo: 'constanciaAutorizacion', mensaje });
  return errores;
}

/**
 * Formato de `contacto` en directorio/entidades.yaml. Mongoose descartaria
 * en silencio un campo mal escrito (`telefono:`): aqui queda como error.
 * @returns {string[]} mensajes
 */
function erroresDeContactoEnArchivo({ contacto }) {
  if (contacto === undefined || contacto === null) return [];
  if (!esObjeto(contacto)) return [MENSAJES.CONTACTO_SIN_CAMPOS];
  const errores = [];
  const desconocidos = Object.keys(contacto).filter((campo) => !CAMPOS_CONTACTO.includes(campo));
  if (desconocidos.length > 0) errores.push(`${MENSAJES.CONTACTO_CAMPO_DESCONOCIDO} ${desconocidos.join(', ')}.`);
  if (contacto.telefonos !== undefined && !Array.isArray(contacto.telefonos)) errores.push(MENSAJES.TELEFONOS_NO_LISTA);
  return errores;
}

module.exports = {
  CAMPOS_CONTACTO,
  MENSAJES,
  esCorreoValido,
  tieneCanalDeContacto,
  validarAutorizacion,
  validarEntidad,
  erroresDeContactoEnArchivo
};
