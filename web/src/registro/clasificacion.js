/**
 * Acierto y clase de error de cada ensayo de la tarea de cambio de regla
 * (M-09, CC-08), al registrarlo (así lo espera api/src/dominio/registro/
 * indicadores.js).
 *
 * - 'correcta': la respuesta es la caja de la regla del ensayo.
 * - 'perseverativa': habría sido correcta con la regla anterior. En el bloque
 *   posterior al cambio (forma), la regla anterior es la del bloque previo al
 *   cambio (color); en un bloque mixto, la del ensayo anterior del mismo
 *   bloque. El primer ensayo de cada bloque mixto no tiene regla anterior.
 * - 'aleatoria': cualquier otro error.
 * - Una omisión no es un error (RF-14): acierto false y claseError null.
 *
 * Con dos cajas y estímulos siempre en conflicto, todo error del bloque de
 * forma es perseverativo (docs/decisiones/0008-motor-ensayos.md).
 */
import { ladoCorrecto } from './estimulos.js';

/** Regla con la que se compara un error, o null si no hay regla anterior. */
export function reglaAnterior(ensayo, anterior, secuencia) {
  if (ensayo.practica) return null;
  if (ensayo.fase === 'post-cambio') {
    const previo = secuencia.bloques.find((b) => b.fase === 'pre-cambio');
    return previo ? previo.regla : null;
  }
  if (ensayo.fase === 'mixto') {
    return anterior && anterior.bloque === ensayo.bloque ? anterior.regla : null;
  }
  return null;
}

/**
 * @param {object} ensayo el ensayo planeado (regla y estímulo)
 * @param {string|null} lado la caja elegida; null si se omitió
 * @param {string|null} anterior la regla anterior (reglaAnterior)
 */
export function evaluarRespuesta(ensayo, lado, anterior) {
  if (lado === null) return { acierto: false, claseError: null };
  const acierto = lado === ladoCorrecto(ensayo.estimulo, ensayo.regla);
  if (acierto) return { acierto, claseError: 'correcta' };
  const perseverativa = anterior !== null && lado === ladoCorrecto(ensayo.estimulo, anterior);
  return { acierto, claseError: perseverativa ? 'perseverativa' : 'aleatoria' };
}
