'use strict';

/**
 * Datos de prueba de los modelos publicables. RCN-01, RCN-02
 * Cada funcion devuelve un documento que cumple las reglas para publicarse;
 * las pruebas quitan o cambian lo que necesitan.
 */

const FUENTE = Object.freeze({
  texto: 'Ministerio de Salud y Protección Social. Protocolo clínico para TEA.',
  url: 'https://www.minsalud.gov.co/'
});

/** Fecha de calendario pasada, como la envia el formulario (AAAA-MM-DD). */
const FECHA_REVISION = '2026-09-30';

const publicable = () => ({ fuentes: [{ ...FUENTE }], fechaRevision: FECHA_REVISION, estado: 'publicado' });

function contenido(cambios = {}) {
  return {
    titulo: 'Qué es el TEA',
    seccion: 'S1',
    cuerpo: 'El trastorno del espectro autista es una condición del neurodesarrollo.',
    ...publicable(),
    ...cambios
  };
}

function pregunta(cambios = {}) {
  return {
    pregunta: '¿A quién debo consultar primero?',
    respuesta: 'Al médico general o pediatra de tu EPS.',
    orden: 1,
    ...publicable(),
    ...cambios
  };
}

function recurso(cambios = {}) {
  return {
    titulo: 'Guía para docentes',
    descripcion: 'Ajustes razonables en el aula.',
    tipo: 'enlace',
    url: 'https://www.mineducacion.gov.co/',
    perfiles: ['docente'],
    ...publicable(),
    ...cambios
  };
}

function pasoRuta(cambios = {}) {
  return {
    titulo: 'Pide una cita en tu EPS',
    texto: 'Pide una cita de medicina general. No necesitas un diagnóstico.',
    perfiles: ['familia'],
    tramos: ['4-7', '8-12', '13-17'],
    regimenes: ['contributivo', 'subsidiado', 'sin-afiliacion'],
    orden: 40,
    tiposEntidad: ['salud'],
    ...publicable(),
    ...cambios
  };
}

/**
 * Entidad del directorio: la fecha de RCN-02 se llama fechaVerificacion.
 * Institucional (esProfesional: false), como las de directorio/entidades.yaml.
 */
function entidad(cambios = {}) {
  const { fechaRevision: _sinRevision, ...publicada } = publicable();
  return {
    nombre: 'Secretaría Distrital de Salud de Bogotá',
    tipo: 'salud',
    ciudad: 'Bogotá',
    descripcion: 'Orienta sobre los servicios de salud en Bogotá.',
    contacto: { telefonos: ['(601) 329 5090'], correo: 'contactenos@saludcapital.gov.co', web: 'https://www.saludcapital.gov.co' },
    esProfesional: false,
    ...publicada,
    fechaVerificacion: FECHA_REVISION,
    ...cambios
  };
}

/** Un dia despues de hoy, en formato AAAA-MM-DD. */
function fechaFutura() {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = { FUENTE, FECHA_REVISION, contenido, pregunta, recurso, pasoRuta, entidad, fechaFutura };
