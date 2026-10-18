/**
 * Estímulos de la tarea de figuras jerárquicas de Navon (M-09, CC-10, de
 * dominio público). Una letra grande, H o S, formada por letras pequeñas, H
 * o S, dibujadas por código en SVG (FiguraNavon.jsx).
 *
 * Cada estímulo es { global, local }: la letra grande y la de las letras
 * pequeñas. La condición del bloque ('global' o 'local') es el nombre de la
 * letra que se responde, igual que la regla en la tarea de cambio de regla.
 *
 * Respuesta con F = H y J = S (event.code, sin importar la distribución del
 * teclado), o con los dos botones.
 */

export const LETRAS = Object.freeze(['H', 'S']);

export const CONDICIONES = Object.freeze({ GLOBAL: 'global', LOCAL: 'local' });

export const CONGRUENCIAS = Object.freeze({ CONGRUENTE: 'congruente', INCONGRUENTE: 'incongruente' });

/** Botón y tecla de cada letra, en el orden en que se muestran (izquierda, derecha). */
export const OPCIONES_LETRA = Object.freeze([
  Object.freeze({ valor: 'H', code: 'KeyF', tecla: 'F' }),
  Object.freeze({ valor: 'S', code: 'KeyJ', tecla: 'J' })
]);

/**
 * Cuadrícula de 5 columnas por 7 filas de cada letra grande: cada «#» es una
 * letra pequeña.
 */
export const PATRONES = Object.freeze({
  H: Object.freeze(['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']),
  S: Object.freeze(['.####', '#....', '#....', '.###.', '....#', '....#', '####.'])
});

export const otraLetra = (letra) => LETRAS.find((l) => l !== letra);

/** La letra correcta: la del nivel que pide el bloque. */
export function letraCorrecta(estimulo, condicion) {
  const letra = Object.values(CONDICIONES).includes(condicion) ? estimulo[condicion] : undefined;
  if (!LETRAS.includes(letra)) throw new RangeError(`condición o estímulo desconocido: ${condicion}`);
  return letra;
}

export const congruenciaDe = (estimulo) =>
  estimulo.global === estimulo.local ? CONGRUENCIAS.CONGRUENTE : CONGRUENCIAS.INCONGRUENTE;

/** Estímulo cuya respuesta correcta en `condicion` es `letra`, congruente o no. */
export function estimuloPara(condicion, letra, congruencia) {
  const otra = congruencia === CONGRUENCIAS.CONGRUENTE ? letra : otraLetra(letra);
  return condicion === CONDICIONES.GLOBAL ? { global: letra, local: otra } : { global: otra, local: letra };
}

/** Posiciones (columna, fila) de las letras pequeñas de una letra grande. */
export function posicionesDe(letra) {
  const posiciones = [];
  PATRONES[letra].forEach((fila, y) => {
    [...fila].forEach((marca, x) => {
      if (marca === '#') posiciones.push({ x, y });
    });
  });
  return posiciones;
}
