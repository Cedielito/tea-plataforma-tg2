/**
 * Reloj del registro conductual (M-09, CT-07). Marca la aparición del
 * estímulo y el momento de la respuesta; el tiempo de reacción es la
 * diferencia, en milisegundos con decimales. Dos variantes intercambiables
 * por configuración (VITE_RELOJ_REGISTRO, o ?reloj= en /registro/prueba), que
 * el experimento de precisión temporal (T16) compara:
 *
 * - 'animacion' (por defecto): la aparición es performance.now() dentro del
 *   requestAnimationFrame pedido después de que React pone el estímulo en la
 *   página, es decir, el fotograma en que se dibuja. La respuesta es
 *   event.timeStamp del keydown o pointerdown, en la misma escala que
 *   performance.now(). Si un navegador antiguo entrega timeStamp en época
 *   Unix, se usa performance.now() al atender el evento.
 * - 'referencia': la aparición es Date.now() en un setTimeout(0) después de
 *   poner el estímulo y la respuesta, Date.now() al atender el evento.
 *
 * `ahora()` es la escala de cada variante; con ella se miden las pausas por
 * pestaña oculta (motorEnsayo.js). Todas las funciones del navegador se pueden
 * inyectar: las pruebas corren sin navegador.
 */

export const VARIANTES_RELOJ = Object.freeze({ ANIMACION: 'animacion', REFERENCIA: 'referencia' });

export const VARIANTE_POR_DEFECTO = VARIANTES_RELOJ.ANIMACION;

/** Un timeStamp mayor viene contado desde 1970 y no desde que abrió la página. */
const MARCA_EPOCA_UNIX = 1e12;

/** La primera variante válida de las que llegan (dirección, configuración), o la de por defecto. */
export function elegirVariante(...candidatas) {
  const validas = Object.values(VARIANTES_RELOJ);
  return candidatas.find((v) => validas.includes(v)) || VARIANTE_POR_DEFECTO;
}

function relojAnimacion({
  pedirFotograma = (fn) => globalThis.requestAnimationFrame(fn),
  cancelarFotograma = (id) => globalThis.cancelAnimationFrame(id),
  ahora = () => globalThis.performance.now()
}) {
  return {
    variante: VARIANTES_RELOJ.ANIMACION,
    ahora,
    marcarAparicion(alMarcar) {
      const id = pedirFotograma(() => alMarcar(ahora()));
      return () => cancelarFotograma(id);
    },
    momentoDeRespuesta(evento) {
      const t = evento && evento.timeStamp;
      return Number.isFinite(t) && t > 0 && t < MARCA_EPOCA_UNIX ? t : ahora();
    }
  };
}

function relojReferencia({
  programar = (fn, ms) => globalThis.setTimeout(fn, ms),
  cancelar = (id) => globalThis.clearTimeout(id),
  ahora = () => Date.now()
}) {
  return {
    variante: VARIANTES_RELOJ.REFERENCIA,
    ahora,
    marcarAparicion(alMarcar) {
      const id = programar(() => alMarcar(ahora()), 0);
      return () => cancelar(id);
    },
    momentoDeRespuesta() {
      return ahora();
    }
  };
}

/**
 * @param {string} variante 'animacion' o 'referencia'
 * @param {object} dependencias funciones del navegador que se reemplazan en las pruebas
 */
export function crearReloj(variante = VARIANTE_POR_DEFECTO, dependencias = {}) {
  if (variante === VARIANTES_RELOJ.ANIMACION) return relojAnimacion(dependencias);
  if (variante === VARIANTES_RELOJ.REFERENCIA) return relojReferencia(dependencias);
  throw new RangeError(`variante de reloj desconocida: ${variante}`);
}
