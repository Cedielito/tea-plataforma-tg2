'use strict';
const Contenido = require('./contenido');
const PreguntaFrecuente = require('./preguntaFrecuente');
const Recurso = require('./recurso');

/**
 * Registro de modelos Mongoose de la Fase I (Cuadro 13).
 *
 * Cada modelo nuevo debe sumar el nombre de su coleccion a COLECCIONES para
 * que las pruebas limpien la base entre casos. Faltan las colecciones de las
 * tareas T4 (administrador), T5 (paso_ruta), T6 (entidad_directorio) y T8
 * (mensaje_contacto).
 *
 * Los esquemas de la Fase II viven en la rama `fase-ii`.
 */
const COLECCIONES = ['contenido', 'pregunta_frecuente', 'recurso'];

module.exports = { COLECCIONES, Contenido, PreguntaFrecuente, Recurso };
