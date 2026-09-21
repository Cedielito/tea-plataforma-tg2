'use strict';
const { randomUUID } = require('node:crypto');

/**
 * CT-11. Genera el identificador seudonimo de la sesion. Ningun dato
 * directamente identificable participa en su construccion.
 */
function generarSeudonimo() {
  return randomUUID();
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function esSeudonimoValido(valor) {
  return typeof valor === 'string' && RE_UUID.test(valor);
}

/** Campos prohibidos en cualquier coleccion conductual (CT-11). */
const CAMPOS_IDENTIFICABLES = [
  'nombre', 'apellido', 'documento', 'cedula', 'correo', 'email',
  'telefono', 'direccion', 'acudiente'
];

function normalizar(clave) {
  return clave.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function contieneDatoIdentificable(objeto) {
  if (objeto === null || typeof objeto !== 'object') return false;
  return Object.keys(objeto).some((k) => CAMPOS_IDENTIFICABLES.includes(normalizar(k)));
}

module.exports = { generarSeudonimo, esSeudonimoValido, contieneDatoIdentificable, CAMPOS_IDENTIFICABLES };
