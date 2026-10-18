'use strict';
const { randomInt } = require('node:crypto');
const { ORDEN_TAREAS } = require('./catalogo');
const { ESTADOS_SESION } = require('./motor');

/**
 * Sesion del registro conductual: creacion con la constancia del
 * consentimiento, estados y vistas para el profesional. M-09, HU-16, HU-18,
 * CT-11, RF-15
 *
 * - HU-16: la sesion se crea solo si el profesional marca que la persona firmo
 *   el consentimiento en papel (con la version del formato) y que es mayor de
 *   edad. De la persona no se guarda nada mas: el seudonimo (seudonimo.js) es
 *   lo unico que la une a su copia del consentimiento.
 * - El reloj de la aplicacion es siempre la variante 'animacion'
 *   (web/src/registro/reloj.js) y queda guardado en la sesion. La semilla de
 *   los ensayos la genera la API.
 * - Estados (ESTADOS_SESION de motor.js): `en_curso` al crearla; `completada`
 *   cuando llegan las dos tareas (el SUS no hace falta para procesarla);
 *   `interrumpida` si la pagina de la aplicacion se recargo a mitad de una
 *   tarea; `abandonada` si no se completo en las HORAS_VIGENCIA siguientes a
 *   su creacion. Las incompletas se guardan y no se procesan (RF-15).
 *
 * Funciones puras: la hora llega como parametro.
 */

const RELOJ_APLICACION = 'animacion';
const HORAS_VIGENCIA = 2;
const MS_VIGENCIA = HORAS_VIGENCIA * 60 * 60 * 1000;
const MAXIMA_SEMILLA = 2 ** 32 - 1;

const CAMPOS_NUEVA_SESION = Object.freeze(['consentimientoFirmado', 'versionConsentimiento', 'mayorDeEdad']);
const LARGO_MAXIMO_VERSION = 20;
const PATRON_VERSION = /^[0-9A-Za-z][0-9A-Za-z._-]{0,19}$/;

const MENSAJES = Object.freeze({
  SOLO_CAMPOS: 'La sesión solo recibe la constancia del consentimiento, su versión y la mayoría de edad.',
  SIN_CONSENTIMIENTO: 'Marca que la persona firmó el consentimiento informado en papel.',
  SIN_VERSION: 'Escribe la versión del formato de consentimiento que firmó la persona, por ejemplo 1.0.',
  VERSION_INVALIDA: `La versión puede tener hasta ${LARGO_MAXIMO_VERSION} caracteres: letras sin tildes, números, punto, guion o guion bajo.`,
  SIN_MAYORIA: 'Marca que la persona es mayor de edad. En esta fase solo participan personas adultas.',
  REVISA_CAMPOS: 'No pudimos crear la sesión. Revisa los campos marcados.',
  NO_ENCONTRADA: 'No encontramos una sesión con ese seudónimo.',
  SEUDONIMO_INVALIDO: 'El seudónimo tiene 8 caracteres en dos grupos de 4, por ejemplo ABCD-2345.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

/**
 * Lee el cuerpo de POST /api/admin/registro/sesiones (HU-16).
 * @returns {{constancia: {consentimientoFirmado: true, versionConsentimiento: string, mayorDeEdad: true}}
 *   | {errores: object}} `errores.general` si llegan otros campos
 */
function leerNuevaSesion(cuerpo) {
  if (!esObjeto(cuerpo) || Object.keys(cuerpo).some((campo) => !CAMPOS_NUEVA_SESION.includes(campo))) {
    return { errores: { general: MENSAJES.SOLO_CAMPOS } };
  }
  const errores = {};
  if (cuerpo.consentimientoFirmado !== true) errores.consentimientoFirmado = MENSAJES.SIN_CONSENTIMIENTO;
  const version = typeof cuerpo.versionConsentimiento === 'string' ? cuerpo.versionConsentimiento.trim() : '';
  if (version === '') errores.versionConsentimiento = MENSAJES.SIN_VERSION;
  else if (!PATRON_VERSION.test(version)) errores.versionConsentimiento = MENSAJES.VERSION_INVALIDA;
  if (cuerpo.mayorDeEdad !== true) errores.mayorDeEdad = MENSAJES.SIN_MAYORIA;
  if (Object.keys(errores).length > 0) return { errores };
  return { constancia: { consentimientoFirmado: true, versionConsentimiento: version, mayorDeEdad: true } };
}

/** Semilla de los ensayos: entero de 0 a 2^32 - 1, como la de web/src/registro/azar.js. */
function generarSemilla() {
  return randomInt(0, MAXIMA_SEMILLA + 1);
}

const milisegundos = (fecha) => new Date(fecha).getTime();

/** true si la sesion ya no se puede aplicar: pasaron HORAS_VIGENCIA desde su creacion. */
function sesionVencida(sesion, ahora) {
  return milisegundos(ahora) - milisegundos(sesion.creadaEn) >= MS_VIGENCIA;
}

/** Momento desde el que una sesion creada antes queda abandonada si sigue en curso. */
function limiteDeAbandono(ahora) {
  return new Date(milisegundos(ahora) - MS_VIGENCIA);
}

/** Tareas del plan que todavia no llegaron, en el orden de aplicacion. */
function tareasPendientes(sesion) {
  const recibidas = sesion.tareasRecibidas || [];
  return ORDEN_TAREAS.filter((tarea) => !recibidas.includes(tarea));
}

/** El tipo de entrada mas usado fuera de la practica (el primero que aparece, si empatan). */
function tipoEntradaPredominante(ensayos) {
  const cuentas = new Map();
  for (const e of ensayos) {
    if (e.practica || !e.tipoEntrada) continue;
    cuentas.set(e.tipoEntrada, (cuentas.get(e.tipoEntrada) || 0) + 1);
  }
  let elegido = null;
  for (const [tipo, n] of cuentas) if (elegido === null || n > cuentas.get(elegido)) elegido = tipo;
  return elegido;
}

/**
 * Contexto de la sesion completa (el que lee procesarSesion): las pausas y
 * las repeticiones de instrucciones de cada tarea sumadas, y el tipo de
 * entrada mas usado en todos los ensayos.
 * @param {{pausas: number, repeticionesInstruccion: number}[]} contextosDeTareas
 */
function unirContextos(contextosDeTareas, ensayos) {
  const sumar = (clave) => contextosDeTareas.reduce((s, c) => s + (c[clave] || 0), 0);
  return {
    tipoEntrada: tipoEntradaPredominante(ensayos),
    pausas: sumar('pausas'),
    repeticionesInstruccion: sumar('repeticionesInstruccion')
  };
}

/** Fila de la lista del profesional (HU-18): sin valores. */
function resumenSesion(sesion) {
  return {
    seudonimo: sesion.seudonimo,
    estado: sesion.estado,
    creadaEn: sesion.creadaEn,
    entregada: Boolean(sesion.entregadaEn),
    tareasRecibidas: [...(sesion.tareasRecibidas || [])],
    susRespondido: Boolean(sesion.sus)
  };
}

const esCompletada = (sesion) => sesion.estado === ESTADOS_SESION.COMPLETADA;

module.exports = {
  RELOJ_APLICACION,
  HORAS_VIGENCIA,
  MS_VIGENCIA,
  MAXIMA_SEMILLA,
  CAMPOS_NUEVA_SESION,
  PATRON_VERSION,
  MENSAJES,
  ESTADOS_SESION,
  leerNuevaSesion,
  generarSemilla,
  sesionVencida,
  limiteDeAbandono,
  tareasPendientes,
  tipoEntradaPredominante,
  unirContextos,
  resumenSesion,
  esCompletada
};
