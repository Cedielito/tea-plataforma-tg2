'use strict';

/**
 * Valores permitidos de los campos con lista cerrada. M-02, M-03, M-04, M-05,
 * RF-03, RF-04, RF-05, RF-06, RF-10
 *
 * Secciones del Cuadro 11 que se gestionan como contenido (S1 a S5), tramos de
 * edad de RCN-04, estados de publicacion de RF-10, las respuestas de la ruta
 * de atencion (RF-04) y los tipos y ciudades del directorio (RF-05). Fuente
 * unica para los esquemas, la validacion de filtros y el orden de los
 * resultados.
 */

const SECCIONES = Object.freeze(['S1', 'S2', 'S3', 'S4', 'S5']);

/** En orden de edad, no alfabetico: es el orden en que se muestran. */
const TRAMOS_EDAD = Object.freeze(['4-7', '8-12', '13-17']);

const ESTADOS = Object.freeze({ BORRADOR: 'borrador', PUBLICADO: 'publicado' });

const TIPOS_RECURSO = Object.freeze(['archivo', 'enlace']);

const PERFILES = Object.freeze(['familia', 'docente']);

/** Regimen de afiliacion a salud, tercera pregunta de la ruta (RF-04). */
const REGIMENES = Object.freeze(['contributivo', 'subsidiado', 'sin-afiliacion']);

/**
 * Tipos de entidad del directorio (M-04). Cada paso de la ruta enlaza los
 * tipos de entidad a los que se acude en ese paso. `proteccion` es para la
 * Defensoria y las Personerias; `proteccion-ninez`, para el ICBF, que no debe
 * salir junto a los pasos de quejas sobre la EPS.
 */
const TIPOS_ENTIDAD = Object.freeze([
  'salud',
  'educacion',
  'proteccion',
  'proteccion-ninez',
  'quejas-salud',
  'linea-apoyo',
  'organizacion'
]);

/**
 * Ciudades del directorio (RF-05), en el orden en que se muestran. Las
 * entidades nacionales atienden en todo el pais: aparecen con cualquier
 * ciudad que se elija.
 */
const NACIONAL = 'Nacional';
const CIUDADES = Object.freeze([NACIONAL, 'Bogotá', 'Medellín', 'Cali', 'Barranquilla']);

module.exports = {
  SECCIONES,
  TRAMOS_EDAD,
  ESTADOS,
  TIPOS_RECURSO,
  PERFILES,
  REGIMENES,
  TIPOS_ENTIDAD,
  NACIONAL,
  CIUDADES
};
