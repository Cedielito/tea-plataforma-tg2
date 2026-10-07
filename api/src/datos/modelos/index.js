'use strict';
const Administrador = require('./administrador');
const Contenido = require('./contenido');
const EntidadDirectorio = require('./entidadDirectorio');
const MensajeContacto = require('./mensajeContacto');
const PasoRuta = require('./pasoRuta');
const PreguntaFrecuente = require('./preguntaFrecuente');
const Recurso = require('./recurso');

/**
 * Registro de modelos Mongoose de la Fase I (Cuadro 13).
 *
 * Cada modelo nuevo debe sumar el nombre de su coleccion a COLECCIONES para
 * que las pruebas limpien la base entre casos.
 *
 * Los esquemas de la Fase II viven en la rama `fase-ii`.
 */
const COLECCIONES = [
  'contenido',
  'pregunta_frecuente',
  'recurso',
  'paso_ruta',
  'entidad_directorio',
  'administrador',
  'mensaje_contacto'
];

module.exports = {
  COLECCIONES,
  Administrador,
  Contenido,
  EntidadDirectorio,
  MensajeContacto,
  PasoRuta,
  PreguntaFrecuente,
  Recurso
};
