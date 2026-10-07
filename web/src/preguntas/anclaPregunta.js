/**
 * Ancla de cada pregunta frecuente (M-05; RF-02, RF-07, HU-10): la dirección
 * /preguntas-frecuentes#slug abre esa pregunta. La usan la página de
 * preguntas y los resultados del buscador. Lógica pura, sin React, para
 * probarla con node --test.
 */

export const RUTA_PREGUNTAS = '/api/preguntas';

/** El mismo formato de slug que valida la API (api/src/dominio/slug.js). */
const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LARGO_MAXIMO = 80;

/**
 * «#a-quien-consultar-primero» → «a-quien-consultar-primero».
 * @returns {string|null} null si no hay ancla o no tiene forma de slug
 */
export function slugDelAncla(hash) {
  if (typeof hash !== 'string') return null;
  let slug = hash.replace(/^#/, '');
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  slug = slug.trim().toLowerCase();
  return slug.length <= LARGO_MAXIMO && PATRON_SLUG.test(slug) ? slug : null;
}

/** Pregunta que pide el ancla, o null si no hay ancla o no corresponde a ninguna. */
export function preguntaDelAncla(hash, preguntas = []) {
  const slug = slugDelAncla(hash);
  return slug ? (preguntas.find((pregunta) => pregunta.slug === slug) ?? null) : null;
}
