/**
 * Elección de los pasos de la ruta según las respuestas de la guía (M-03,
 * RF-04, RS-01). Corre en el navegador: la web descarga todos los pasos
 * publicados y aquí se eligen los que corresponden. Las respuestas no salen
 * del navegador, no se guardan y no van en la dirección de la página.
 *
 * Función pura, sin React ni fetch, para probarla con node --test
 * (filtroPasos.test.js).
 */

/**
 * Respuesta «No lo sé» a la pregunta del régimen (solo para docentes): se
 * muestran los pasos de todos los regímenes. Los pasos que dependen del
 * régimen están escritos como condicionales («Si el estudiante no tiene EPS»).
 */
export const NO_LO_SE = 'no-lo-se';

const incluye = (lista, valor) => Array.isArray(lista) && lista.includes(valor);

/**
 * @param {{perfiles: string[], tramos: string[], regimenes: string[], orden: number}[]} pasos
 * @param {{perfil?: string, tramo?: string, regimen?: string}} respuestas
 * @returns los pasos que coinciden con las tres respuestas, de menor a mayor
 *   orden; con un empate se conserva el orden en que llegaron. Si falta una
 *   respuesta, ninguno.
 */
export function filtrarPasos(pasos, { perfil, tramo, regimen } = {}) {
  if (!Array.isArray(pasos) || !perfil || !tramo || !regimen) return [];
  return pasos
    .filter(
      (paso) =>
        incluye(paso.perfiles, perfil) &&
        incluye(paso.tramos, tramo) &&
        (regimen === NO_LO_SE || incluye(paso.regimenes, regimen))
    )
    .sort((a, b) => a.orden - b.orden);
}
