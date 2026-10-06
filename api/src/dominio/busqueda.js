'use strict';

/**
 * Buscador de contenidos y preguntas frecuentes por palabra clave. M-01, RF-02
 *
 * - No distingue tildes, mayusculas ni la ñ: «diagnostico» encuentra
 *   «diagnóstico» y «nino» encuentra «niño».
 * - Encuentra palabras incompletas («autis» encuentra «autismo»).
 * - Cada palabra de la busqueda debe aparecer en alguno de los campos.
 * - Los signos de puntuacion se descartan, asi que la expresion regular que
 *   llega a MongoDB solo contiene letras y numeros: no hay forma de inyectar
 *   un patron costoso.
 */

const LARGO_MINIMO = 2;
const LARGO_MAXIMO = 100;
const MAXIMO_PALABRAS = 8;
/** Maximo de contenidos y de preguntas por busqueda. */
const LIMITE_RESULTADOS = 20;

const MENSAJES = Object.freeze({
  MUY_CORTA: 'Escribe al menos 2 letras para buscar.',
  MUY_LARGA: 'La búsqueda puede tener como máximo 100 caracteres.'
});

const VARIANTES = Object.freeze({
  a: 'aáàâäAÁÀÂÄ',
  e: 'eéèêëEÉÈÊË',
  i: 'iíìîïIÍÌÎÏ',
  o: 'oóòôöOÓÒÔÖ',
  u: 'uúùûüUÚÙÛÜ',
  n: 'nñNÑ',
  c: 'cçCÇ'
});

const sinTildes = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '');
const escapar = (caracter) => caracter.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/**
 * @returns {{palabras: string[]} | {error: string}}
 */
function leerConsulta(q) {
  if (typeof q !== 'string') return { error: MENSAJES.MUY_CORTA };
  if (q.length > LARGO_MAXIMO) return { error: MENSAJES.MUY_LARGA };
  const limpia = sinTildes(q)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (limpia.replace(/ /g, '').length < LARGO_MINIMO) return { error: MENSAJES.MUY_CORTA };
  const palabras = [...new Set(limpia.split(' '))].slice(0, MAXIMO_PALABRAS);
  return { palabras };
}

/** «nino» -> «[nñNÑ][iíìîïIÍÌÎÏ][nñNÑ][oóòôöOÓÒÔÖ]» */
function patronSinTildes(palabra) {
  return [...palabra].map((c) => (VARIANTES[c] ? `[${VARIANTES[c]}]` : escapar(c))).join('');
}

/** Filtro de MongoDB: cada palabra aparece en al menos uno de los campos. */
function construirFiltroBusqueda(palabras, campos) {
  return {
    $and: palabras.map((palabra) => {
      const patron = patronSinTildes(palabra);
      return { $or: campos.map((campo) => ({ [campo]: { $regex: patron, $options: 'i' } })) };
    })
  };
}

module.exports = {
  LARGO_MINIMO,
  LARGO_MAXIMO,
  MAXIMO_PALABRAS,
  LIMITE_RESULTADOS,
  MENSAJES,
  leerConsulta,
  patronSinTildes,
  construirFiltroBusqueda
};
