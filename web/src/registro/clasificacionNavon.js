/**
 * Acierto y clase de error de cada ensayo de la tarea de Navon (M-09, CC-10,
 * RF-14), al registrarlo.
 *
 * - 'correcta': la letra elegida es la del nivel que pide el bloque (la
 *   letra grande en los bloques globales, la de las letras pequeñas en los
 *   locales).
 * - 'aleatoria': cualquier otro error. En Navon no hay regla anterior, así
 *   que ningún error es perseverativo.
 * - Una omisión no es un error (RF-14): acierto false y claseError null,
 *   como en la tarea de cambio de regla.
 */
import { letraCorrecta } from './estimulosNavon.js';

/**
 * @param {object} ensayo el ensayo planeado (condición y estímulo)
 * @param {string|null} letra la letra elegida; null si se omitió
 */
export function evaluarRespuestaNavon(ensayo, letra) {
  if (letra === null) return { acierto: false, claseError: null };
  const acierto = letra === letraCorrecta(ensayo.estimulo, ensayo.condicion);
  return { acierto, claseError: acierto ? 'correcta' : 'aleatoria' };
}
