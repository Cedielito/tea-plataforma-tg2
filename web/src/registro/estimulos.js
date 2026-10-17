/**
 * Estímulos de la tarea de cambio de regla (M-09, DCCS de dominio público).
 * Se dibujan por código en SVG (Figura.jsx): 2 formas y 2 colores.
 *
 * Las dos cajas objetivo cruzan color y forma: conejo rojo a la izquierda
 * (tecla F) y barco azul a la derecha (tecla J). Los estímulos de prueba son
 * los otros dos cruces, conejo azul y barco rojo: siempre están en conflicto,
 * porque con una regla van a una caja y con la otra, a la otra.
 *
 * La regla del plan ('color' o 'forma') es el nombre del atributo del
 * estímulo que decide la caja.
 */

export const LADOS = Object.freeze({ IZQUIERDA: 'izquierda', DERECHA: 'derecha' });

export const CAJAS = Object.freeze({
  [LADOS.IZQUIERDA]: Object.freeze({ forma: 'conejo', color: 'rojo', tecla: 'F' }),
  [LADOS.DERECHA]: Object.freeze({ forma: 'barco', color: 'azul', tecla: 'J' })
});

export const ESTIMULOS_PRUEBA = Object.freeze([
  Object.freeze({ forma: 'conejo', color: 'azul' }),
  Object.freeze({ forma: 'barco', color: 'rojo' })
]);

/** Tecla (event.code) de cada caja. El código no cambia con la distribución del teclado. */
export const TECLAS = Object.freeze({ KeyF: LADOS.IZQUIERDA, KeyJ: LADOS.DERECHA });

/** Caja que corresponde al estímulo con la regla dada. */
export function ladoCorrecto(estimulo, regla) {
  const lado = estimulo[regla] === undefined ? undefined : Object.keys(CAJAS).find((l) => CAJAS[l][regla] === estimulo[regla]);
  if (!lado) throw new RangeError(`regla o estímulo desconocido: ${regla}`);
  return lado;
}

/** Con una regla va a una caja y con la otra, a la otra. */
export function enConflicto(estimulo) {
  return ladoCorrecto(estimulo, 'color') !== ladoCorrecto(estimulo, 'forma');
}
