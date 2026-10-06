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

/** Un dia despues de hoy, en formato AAAA-MM-DD. */
function fechaFutura() {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = { FUENTE, FECHA_REVISION, contenido, pregunta, recurso, fechaFutura };
