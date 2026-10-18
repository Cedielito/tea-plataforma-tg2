/**
 * Seudónimo de una sesión escrito a mano (M-09, HU-19, CT-11): la forma
 * canónica XXXX-XXXX, para confirmar qué sesión se va a eliminar. Copia de
 * normalizarSeudonimo (api/src/dominio/registro/seudonimo.js), que la web no
 * puede importar; seudonimo.test.js compara las dos. La API vuelve a
 * normalizar lo que recibe.
 */

const LARGO_GRUPO = 4;
const RE_SEUDONIMO = /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

/** Mayúsculas, sin espacios y con el guion en su lugar; null si no es válido. */
export function normalizarSeudonimo(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.toUpperCase().replace(/[\s-]/g, '');
  if (limpio.length !== 2 * LARGO_GRUPO) return null;
  const canonico = `${limpio.slice(0, LARGO_GRUPO)}-${limpio.slice(LARGO_GRUPO)}`;
  return RE_SEUDONIMO.test(canonico) ? canonico : null;
}
