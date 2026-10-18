/**
 * Números seudoaleatorios con semilla para generar los ensayos del registro
 * conductual (M-09, CT-13). Sin dependencias: mulberry32, un generador de 32
 * bits suficiente para barajar estímulos y reglas (no es criptográfico).
 *
 * La semilla de cada sesión se guarda en cada ensayo: con la misma semilla y
 * el mismo plan, el generador produce exactamente los mismos ensayos.
 */

const MAXIMO_SEMILLA = 2 ** 32 - 1;

/** Devuelve una función que entrega números en [0, 1) a partir de la semilla. */
export function crearAzar(semilla) {
  let estado = semilla >>> 0;
  return function siguiente() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Copia barajada de la lista (Fisher-Yates); no modifica la original. */
export function barajar(lista, azar) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Semilla nueva para una sesión, con el generador del navegador. */
export function semillaNueva(fuente = globalThis.crypto) {
  const valores = new Uint32Array(1);
  fuente.getRandomValues(valores);
  return valores[0];
}

/** Semilla escrita en la dirección (?semilla=): entero de 0 a 2^32 - 1, o null. */
export function leerSemilla(texto) {
  if (typeof texto !== 'string' || !/^\d{1,10}$/.test(texto.trim())) return null;
  const numero = Number(texto.trim());
  return numero <= MAXIMO_SEMILLA ? numero : null;
}
