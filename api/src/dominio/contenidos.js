'use strict';
const { SECCIONES, TRAMOS_EDAD, ESTADOS } = require('./catalogos');

/**
 * Consulta publica de contenidos por seccion y tramo de edad. M-02, RF-03, RCN-04
 *
 * Con un tramo de edad se devuelven los contenidos de ese tramo y tambien los
 * que no tienen tramo (por ejemplo, la introduccion general de S2), que la
 * pagina de senales muestra arriba en todas las pestanas.
 */

const MENSAJES = Object.freeze({
  SECCION_INVALIDA: 'La sección debe ser S1, S2, S3, S4 o S5.',
  EDAD_INVALIDA: 'La edad debe ser 4-7, 8-12 o 13-17.',
  TRAMO_INVALIDO: 'El tramo de edad debe ser 4-7, 8-12 o 13-17.'
});

const vacio = (valor) => valor === undefined || valor === '';

/**
 * Lee `seccion` y `edad` de la cadena de consulta. Solo acepta valores de la
 * lista: un arreglo o un objeto (?seccion[$ne]=S1) se rechaza.
 * @returns {{filtros: {seccion?: string, tramoEdad?: string}} | {error: string}}
 */
function leerFiltrosContenidos({ seccion, edad } = {}) {
  const filtros = {};
  if (!vacio(seccion)) {
    if (!SECCIONES.includes(seccion)) return { error: MENSAJES.SECCION_INVALIDA };
    filtros.seccion = seccion;
  }
  if (!vacio(edad)) {
    if (!TRAMOS_EDAD.includes(edad)) return { error: MENSAJES.EDAD_INVALIDA };
    filtros.tramoEdad = edad;
  }
  return { filtros };
}

/** Filtro de MongoDB: solo lo publicado, y con tramo, ese tramo o ninguno. */
function construirFiltroContenidos({ seccion, tramoEdad } = {}) {
  const filtro = { estado: ESTADOS.PUBLICADO };
  if (seccion) filtro.seccion = seccion;
  if (tramoEdad) filtro.tramoEdad = { $in: [tramoEdad, null] };
  return filtro;
}

const posicionTramo = (tramo) => (tramo ? TRAMOS_EDAD.indexOf(tramo) : -1);

/**
 * Por seccion y, dentro de ella, primero lo que no tiene tramo y luego los
 * tramos de menor a mayor edad. El orden es estable: se conserva el orden de
 * llegada (fecha de creacion) dentro de cada grupo.
 */
function ordenarContenidos(contenidos) {
  return [...contenidos].sort(
    (a, b) =>
      SECCIONES.indexOf(a.seccion) - SECCIONES.indexOf(b.seccion) ||
      posicionTramo(a.tramoEdad) - posicionTramo(b.tramoEdad)
  );
}

module.exports = { MENSAJES, leerFiltrosContenidos, construirFiltroContenidos, ordenarContenidos };
