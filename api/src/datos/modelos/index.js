'use strict';
const Administrador = require('./administrador');
const Contenido = require('./contenido');
const EntidadDirectorio = require('./entidadDirectorio');
const MensajeContacto = require('./mensajeContacto');
const PasoRuta = require('./pasoRuta');
const PreguntaFrecuente = require('./preguntaFrecuente');
const Recurso = require('./recurso');
const SesionRegistro = require('./sesionRegistro');
const EnsayoRegistro = require('./ensayoRegistro');

/**
 * Registro de modelos Mongoose de la Fase I (Cuadro 13).
 *
 * Cada modelo nuevo debe sumar el nombre de su coleccion a COLECCIONES para
 * que las pruebas limpien la base entre casos.
 *
 * Las colecciones del registro conductual (M-09, T15) son `sesion_registro`
 * y `ensayo_registro`. Los esquemas de la Fase II viven en la rama `fase-ii`.
 */
const COLECCIONES = [
  'contenido',
  'pregunta_frecuente',
  'recurso',
  'paso_ruta',
  'entidad_directorio',
  'administrador',
  'mensaje_contacto',
  'sesion_registro',
  'ensayo_registro'
];

module.exports = {
  COLECCIONES,
  Administrador,
  Contenido,
  EntidadDirectorio,
  MensajeContacto,
  PasoRuta,
  PreguntaFrecuente,
  Recurso,
  SesionRegistro,
  EnsayoRegistro
};
