/**
 * Generador de los ensayos de la tarea de cambio de regla (M-09, CP-01, CP-04,
 * CT-13). Parte de la secuencia de bloques que entrega la API
 * (GET /api/registro/plan): la web no copia el catálogo ni el secuenciador.
 *
 * - Práctica: `ensayosPractica` ensayos con la regla del primer bloque
 *   (color). No se practica la regla de forma: verla antes del cambio
 *   alteraría la perseveración del bloque posterior al cambio (CC-08, CC-12).
 * - Cada bloque reparte los dos estímulos de prueba en mitades (4 y 3 con 7
 *   ensayos), barajadas; también los bloques mixtos.
 * - Bloques mixtos: la regla del primer ensayo sale de la semilla y después
 *   van `cambios` ensayos con la otra regla y el resto con la misma, en orden
 *   barajado. El tipo de cada ensayo (cambio o repetición) no se guarda: lo
 *   calcula el dominio (clasificarEnsayosMixtos, en api/).
 *
 * Todo sale de una sola secuencia seudoaleatoria con la semilla de la sesión
 * (azar.js): con la misma semilla y el mismo plan, los mismos ensayos.
 */
import { barajar, crearAzar } from './azar.js';
import { ESTIMULOS_PRUEBA } from './estimulos.js';

export const BLOQUE_PRACTICA = 'CR-PRACTICA';

/** Reglas que aparecen en los bloques del plan, en su orden ('color', 'forma'). */
export function reglasDelPlan(secuencia) {
  return [...new Set(secuencia.bloques.map((b) => b.regla).filter(Boolean))];
}

/** n estímulos de prueba, mitad y mitad (el que lleva uno más sale de la semilla), barajados. */
function estimulosBalanceados(n, azar) {
  const [primero, segundo] = azar() < 0.5 ? ESTIMULOS_PRUEBA : [...ESTIMULOS_PRUEBA].reverse();
  const lista = Array.from({ length: n }, (_, i) => (i < Math.ceil(n / 2) ? primero : segundo));
  return barajar(lista, azar);
}

/** Reglas de un bloque mixto: la inicial y, en orden barajado, los cambios y las repeticiones. */
function reglasMixtas(bloque, reglas, azar) {
  const otra = (regla) => reglas.find((r) => r !== regla);
  const repeticiones = bloque.ensayos - 1 - bloque.cambios;
  const transiciones = barajar(
    [...Array(bloque.cambios).fill(true), ...Array(repeticiones).fill(false)],
    azar
  );
  let regla = reglas[Math.floor(azar() * reglas.length)];
  const salida = [regla];
  for (const cambia of transiciones) {
    if (cambia) regla = otra(regla);
    salida.push(regla);
  }
  return salida;
}

/**
 * Ensayos de la sesión, en el orden en que se presentan, con su número, su
 * bloque, su fase, su regla, su estímulo y la semilla.
 *
 * @param {object} secuencia la secuencia de la tarea de cambio de regla del plan
 * @param {number} semilla entero de 32 bits
 */
export function generarEnsayos(secuencia, semilla) {
  const azar = crearAzar(semilla);
  const reglas = reglasDelPlan(secuencia);
  const ensayos = [];
  const agregar = (bloque, fase, regla, estimulo, practica) =>
    ensayos.push({
      numero: ensayos.length + 1,
      tarea: secuencia.tarea,
      bloque,
      fase,
      regla,
      condicion: null,
      practica,
      estimulo: { ...estimulo },
      semilla
    });

  const reglaPractica = secuencia.bloques[0].regla;
  for (const estimulo of estimulosBalanceados(secuencia.ensayosPractica, azar)) {
    agregar(BLOQUE_PRACTICA, null, reglaPractica, estimulo, true);
  }

  for (const bloque of secuencia.bloques) {
    const estimulos = estimulosBalanceados(bloque.ensayos, azar);
    const reglasBloque = bloque.regla ? estimulos.map(() => bloque.regla) : reglasMixtas(bloque, reglas, azar);
    estimulos.forEach((estimulo, i) => agregar(bloque.id, bloque.fase, reglasBloque[i], estimulo, false));
  }
  return ensayos;
}
