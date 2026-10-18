'use strict';
const { randomInt } = require('node:crypto');

/**
 * Seudonimo de la sesion y deteccion de datos identificables. M-09, CT-11
 *
 * - Cada sesion se identifica con un seudonimo aleatorio de 8 caracteres en
 *   formato XXXX-XXXX (unos 40 bits), generado con crypto. El alfabeto no
 *   tiene caracteres ambiguos (0, O, 1, I ni L): el profesional lo puede
 *   dictar o copiar a mano para eliminar una sesion (HU-19). Ningun dato de la
 *   persona participa en su construccion. El indice unico esta en
 *   sesion_registro (T15).
 * - Ninguna coleccion del registro guarda nombre, documento ni contacto:
 *   contieneDatoIdentificable revisa las claves de un objeto, tambien las de
 *   los objetos y arreglos anidados.
 *
 * Traido de fase-ii (api/src/dominio/privacidad/seudonimo.js): el UUID paso a
 * codigo corto y la deteccion paso a ser recursiva, con mas campos.
 */

const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LARGO_GRUPO = 4;
const RE_SEUDONIMO = /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

function grupo() {
  let texto = '';
  for (let i = 0; i < LARGO_GRUPO; i += 1) texto += ALFABETO[randomInt(ALFABETO.length)];
  return texto;
}

function generarSeudonimo() {
  return `${grupo()}-${grupo()}`;
}

function esSeudonimoValido(valor) {
  return typeof valor === 'string' && RE_SEUDONIMO.test(valor);
}

/**
 * Lleva un seudonimo escrito a mano a su forma canonica: mayusculas, sin
 * espacios y con el guion en su lugar. Devuelve null si no es valido.
 */
function normalizarSeudonimo(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.toUpperCase().replace(/[\s-]/g, '');
  if (limpio.length !== 2 * LARGO_GRUPO) return null;
  const canonico = `${limpio.slice(0, LARGO_GRUPO)}-${limpio.slice(LARGO_GRUPO)}`;
  return esSeudonimoValido(canonico) ? canonico : null;
}

/** Claves prohibidas en el registro, normalizadas (minusculas, sin tildes ni separadores). */
const CAMPOS_IDENTIFICABLES = Object.freeze([
  'nombre',
  'nombres',
  'nombrecompleto',
  'apellido',
  'apellidos',
  'documento',
  'numerodocumento',
  'cedula',
  'identificacion',
  'correo',
  'email',
  'telefono',
  'celular',
  'whatsapp',
  'direccion',
  'contacto',
  'fechanacimiento',
  'acudiente'
]);

function normalizarClave(clave) {
  return clave
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function contieneDatoIdentificable(valor, vistos = new WeakSet()) {
  if (valor === null || typeof valor !== 'object' || vistos.has(valor)) return false;
  vistos.add(valor);
  if (Array.isArray(valor)) return valor.some((v) => contieneDatoIdentificable(v, vistos));
  return Object.entries(valor).some(
    ([clave, v]) => CAMPOS_IDENTIFICABLES.includes(normalizarClave(clave)) || contieneDatoIdentificable(v, vistos)
  );
}

module.exports = {
  ALFABETO,
  CAMPOS_IDENTIFICABLES,
  generarSeudonimo,
  esSeudonimoValido,
  normalizarSeudonimo,
  contieneDatoIdentificable
};
