'use strict';

/**
 * Valores permitidos de los campos con lista cerrada. M-02, M-05, RF-03, RF-06, RF-10
 *
 * Secciones del Cuadro 11 que se gestionan como contenido (S1 a S5), tramos de
 * edad de RCN-04 y estados de publicacion de RF-10. Fuente unica para los
 * esquemas, la validacion de filtros y el orden de los resultados.
 */

const SECCIONES = Object.freeze(['S1', 'S2', 'S3', 'S4', 'S5']);

/** En orden de edad, no alfabetico: es el orden en que se muestran. */
const TRAMOS_EDAD = Object.freeze(['4-7', '8-12', '13-17']);

const ESTADOS = Object.freeze({ BORRADOR: 'borrador', PUBLICADO: 'publicado' });

const TIPOS_RECURSO = Object.freeze(['archivo', 'enlace']);

const PERFILES = Object.freeze(['familia', 'docente']);

module.exports = { SECCIONES, TRAMOS_EDAD, ESTADOS, TIPOS_RECURSO, PERFILES };
