'use strict';
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

/**
 * Autenticacion del administrador del panel. M-08, RF-09, RS-05
 *
 * - La contrasena se guarda con bcrypt (funcion hash con sal), nunca en claro.
 *   Costo 10, el minimo que recomienda OWASP: bcryptjs es JavaScript puro y
 *   Render gratuito tiene 0,1 CPU, asi que un costo mayor tardaria varios
 *   segundos por intento y frenaria la API publica.
 * - La sesion es un token aleatorio: la cookie lleva el token y la base solo
 *   su hash SHA-256, asi que una copia de la base no sirve para entrar.
 * - La sesion vence tras 30 minutos sin actividad y, en todo caso, 8 horas
 *   despues de iniciada. Cada administrador guarda como maximo 5 sesiones.
 * - Cada cuenta tiene un rol (T15): `administrador` (contenidos, ruta,
 *   directorio, preguntas, recursos y mensajes) o `profesional` (registro
 *   conductual, M-09). Los roles no se mezclan. Una cuenta guardada antes de
 *   T15 no tiene rol y es de administrador.
 *
 * Nada de este modulo escribe en el registro: la clave y el token nunca se
 * muestran, ni siquiera en los mensajes de error.
 */

const COSTO_BCRYPT = 10;

const MINUTOS_INACTIVIDAD = 30;
const HORAS_DURACION_MAXIMA = 8;
const MS_INACTIVIDAD = MINUTOS_INACTIVIDAD * 60 * 1000;
const MS_DURACION_MAXIMA = HORAS_DURACION_MAXIMA * 60 * 60 * 1000;
const MAXIMO_SESIONES = 5;

const PATRON_USUARIO = /^[a-z0-9._-]{3,40}$/;
const LARGO_MAXIMO_USUARIO = 40;
const LARGO_MINIMO_CLAVE = 12;
/** bcrypt solo usa los primeros 72 bytes: una clave mas larga se recortaria sin aviso. */
const BYTES_MAXIMOS_CLAVE = 72;

const BYTES_TOKEN = 32;
const PATRON_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Hash bcrypt (costo 10) de un valor aleatorio que se descarto. Cuando el
 * usuario no existe se compara contra este hash, para que la respuesta tarde
 * lo mismo que con un usuario real y el tiempo no revele cuales existen.
 */
const HASH_FICTICIO = '$2b$10$q7Z5FXeE9m5WF7hWBI7g4uSfEZ2bxBfgGOvWCqL8a2OqfZamfFm2C';

const ROLES = Object.freeze({ ADMINISTRADOR: 'administrador', PROFESIONAL: 'profesional' });

const MENSAJES = Object.freeze({
  CREDENCIALES_INCOMPLETAS: 'Escribe tu usuario y tu contraseña.',
  CREDENCIALES_INCORRECTAS: 'Usuario o contraseña incorrectos.',
  USUARIO_INVALIDO:
    'El usuario debe tener de 3 a 40 caracteres: letras minúsculas sin tildes, números, punto, guion o guion bajo.',
  CLAVE_CORTA: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`,
  CLAVE_LARGA: `La contraseña puede tener como máximo ${BYTES_MAXIMOS_CLAVE} bytes (unos ${BYTES_MAXIMOS_CLAVE} caracteres sin tildes ni ñ).`,
  SIN_SESION: 'Inicia sesión para continuar.',
  SIN_PERMISO: 'Tu cuenta no tiene acceso a esta sección.'
});

/** Rol de una cuenta; las guardadas antes de T15 no lo tienen y son de administrador. */
function rolDe(cuenta) {
  return cuenta && cuenta.rol === ROLES.PROFESIONAL ? ROLES.PROFESIONAL : ROLES.ADMINISTRADOR;
}

const esTexto = (valor) => typeof valor === 'string';
const bytesDe = (texto) => Buffer.byteLength(texto, 'utf8');

/** Los usuarios se guardan y se comparan en minusculas y sin espacios alrededor. */
function normalizarUsuario(usuario) {
  return esTexto(usuario) ? usuario.trim().toLowerCase() : '';
}

/**
 * Lee el cuerpo de POST /api/sesion. Solo acepta textos: un objeto como
 * {"$gt": ""} se rechaza antes de llegar a la base.
 * @returns {{usuario: string, clave: string} | {error: string}}
 */
function leerCredenciales(cuerpo) {
  const { usuario, clave } = cuerpo && typeof cuerpo === 'object' ? cuerpo : {};
  if (!esTexto(usuario) || !esTexto(clave)) return { error: MENSAJES.CREDENCIALES_INCOMPLETAS };
  const normalizado = normalizarUsuario(usuario);
  if (normalizado === '' || clave === '') return { error: MENSAJES.CREDENCIALES_INCOMPLETAS };
  // Un usuario mas largo que el maximo no puede existir: se recorta para que
  // la clave del limite de intentos tenga un tamano acotado.
  return { usuario: normalizado.slice(0, LARGO_MAXIMO_USUARIO + 1), clave };
}

/**
 * Reglas para crear un administrador (ADMIN_USUARIO y ADMIN_CLAVE).
 * @returns {string[]} mensajes; vacio si se puede crear
 */
function validarCredencialesNuevas(usuario, clave) {
  const errores = [];
  if (!PATRON_USUARIO.test(normalizarUsuario(usuario))) errores.push(MENSAJES.USUARIO_INVALIDO);
  if (!esTexto(clave) || clave.length < LARGO_MINIMO_CLAVE) errores.push(MENSAJES.CLAVE_CORTA);
  else if (bytesDe(clave) > BYTES_MAXIMOS_CLAVE) errores.push(MENSAJES.CLAVE_LARGA);
  return errores;
}

function cifrarClave(clave, costo = COSTO_BCRYPT) {
  return bcrypt.hash(clave, costo);
}

/**
 * Compara la clave con el hash guardado. Sin hash (usuario inexistente) se
 * compara contra HASH_FICTICIO y se responde que no coincide. Una clave de mas
 * de 72 bytes nunca coincide: nadie pudo crearla (validarCredencialesNuevas).
 */
async function compararClave(clave, hashGuardado) {
  const hash = esTexto(hashGuardado) ? hashGuardado : HASH_FICTICIO;
  const largoValido = esTexto(clave) && bytesDe(clave) <= BYTES_MAXIMOS_CLAVE;
  const coincide = await bcrypt.compare(largoValido ? clave : '', hash);
  return coincide && largoValido && hash !== HASH_FICTICIO;
}

/** Token de sesion: 32 bytes aleatorios en base64url (43 caracteres). */
function generarToken() {
  return crypto.randomBytes(BYTES_TOKEN).toString('base64url');
}

const esTokenConFormato = (token) => esTexto(token) && PATRON_TOKEN.test(token);

/** Lo que se guarda en la base: el hash SHA-256 del token, nunca el token. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const milisegundos = (fecha) => (fecha instanceof Date ? fecha.getTime() : new Date(fecha).getTime());

/**
 * Una sesion sigue abierta si su ultima actividad fue hace menos de 30
 * minutos y empezo hace menos de 8 horas.
 * @param {{creadaEn: Date, ultimaActividad: Date}} sesion
 */
function sesionVigente(sesion, ahora) {
  if (!sesion) return false;
  const momento = milisegundos(ahora);
  const inactiva = momento - milisegundos(sesion.ultimaActividad);
  const duracion = momento - milisegundos(sesion.creadaEn);
  if (Number.isNaN(inactiva) || Number.isNaN(duracion)) return false;
  return inactiva < MS_INACTIVIDAD && duracion < MS_DURACION_MAXIMA;
}

/**
 * Sesiones que se conservan al abrir una nueva: las vigentes, de la mas
 * reciente a la mas antigua, dejando lugar para la nueva sin pasar de 5.
 */
function sesionesQueSeConservan(sesiones, ahora) {
  return (Array.isArray(sesiones) ? sesiones : [])
    .filter((sesion) => sesionVigente(sesion, ahora))
    .sort((a, b) => milisegundos(b.ultimaActividad) - milisegundos(a.ultimaActividad))
    .slice(0, MAXIMO_SESIONES - 1);
}

module.exports = {
  COSTO_BCRYPT,
  MINUTOS_INACTIVIDAD,
  HORAS_DURACION_MAXIMA,
  MS_INACTIVIDAD,
  MS_DURACION_MAXIMA,
  MAXIMO_SESIONES,
  LARGO_MINIMO_CLAVE,
  BYTES_MAXIMOS_CLAVE,
  HASH_FICTICIO,
  ROLES,
  MENSAJES,
  rolDe,
  normalizarUsuario,
  leerCredenciales,
  validarCredencialesNuevas,
  cifrarClave,
  compararClave,
  generarToken,
  esTokenConFormato,
  hashToken,
  sesionVigente,
  sesionesQueSeConservan
};
