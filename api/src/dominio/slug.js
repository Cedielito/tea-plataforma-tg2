'use strict';

/**
 * Identificador legible de cada contenido en la URL (/contenidos/que-es-el-tea).
 * M-02, RF-01
 */

const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LARGO_MAXIMO = 80;

/** «¿Qué es el TEA?» -> «que-es-el-tea». Quita tildes y la virgulilla de la ñ. */
function generarSlug(titulo) {
  if (typeof titulo !== 'string') return '';
  return titulo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, LARGO_MAXIMO)
    .replace(/^-+|-+$/g, '');
}

function esSlugValido(slug) {
  return typeof slug === 'string' && slug.length <= LARGO_MAXIMO && PATRON_SLUG.test(slug);
}

module.exports = { PATRON_SLUG, LARGO_MAXIMO, generarSlug, esSlugValido };
