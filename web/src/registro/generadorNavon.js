/**
 * Generador de los ensayos de la tarea de Navon (M-09, CC-10, CP-01, CP-04,
 * CT-13). Parte de la secuencia 'navon' del plan (GET /api/registro/plan): 2
 * ensayos de práctica y los bloques del catálogo en su orden (global, local,
 * local, global), con `ensayos` ensayos cada uno.
 *
 * - Práctica: un ensayo de cada condición, en el orden de los bloques
 *   (primero la del primer bloque). Los dos son incongruentes, para que la
 *   instrucción de mirar un nivel se ponga a prueba, y con letras correctas
 *   distintas (la primera sale de la semilla).
 * - Cada bloque: congruentes e incongruentes mitad y mitad (3 y 4 con 7
 *   ensayos) y, dentro de cada grupo, la letra correcta lo más pareja
 *   posible; en el bloque, 4 de una letra y 3 de la otra. Barajados.
 * - Entre los bloques de una misma condición se alterna quién lleva un
 *   congruente más y qué letra es la correcta una vez más (la semilla decide
 *   el primero). Con dos bloques por condición, cada condición queda con 7
 *   congruentes, 7 incongruentes, 7 H y 7 S: la congruencia y la letra no se
 *   confunden con la diferencia global-local (CC-10).
 *
 * Todo sale de una sola secuencia seudoaleatoria con la semilla de la sesión
 * (azar.js): con la misma semilla y el mismo plan, los mismos ensayos.
 */
import { barajar, crearAzar } from './azar.js';
import { CONDICIONES, CONGRUENCIAS, congruenciaDe, estimuloPara, LETRAS, otraLetra } from './estimulosNavon.js';

export const BLOQUE_PRACTICA_NAVON = 'NV-PRACTICA';

const elegir = (lista, azar) => lista[Math.floor(azar() * lista.length)];

/** n letras: la mitad más uno (si n es impar) de `primera` y el resto de la otra. */
function repartirLetras(n, primera) {
  return Array.from({ length: n }, (_, i) => (i < Math.ceil(n / 2) ? primera : otraLetra(primera)));
}

/**
 * Ensayos de un bloque: `congruentes` congruentes y el resto incongruentes, y
 * la letra `mayoritaria` una vez más que la otra si el bloque es impar.
 */
function ensayosDeBloque(bloque, congruentes, mayoritaria, azar) {
  const incongruentes = bloque.ensayos - congruentes;
  // Si el grupo congruente es impar, ya le dio la letra de más a la mayoritaria.
  const primeraIncongruente = congruentes % 2 === 1 ? otraLetra(mayoritaria) : mayoritaria;
  const lista = [
    ...repartirLetras(congruentes, mayoritaria).map((letra) => estimuloPara(bloque.condicion, letra, CONGRUENCIAS.CONGRUENTE)),
    ...repartirLetras(incongruentes, primeraIncongruente).map((letra) =>
      estimuloPara(bloque.condicion, letra, CONGRUENCIAS.INCONGRUENTE)
    )
  ];
  return barajar(lista, azar);
}

/** Cuántos congruentes y qué letra mayoritaria lleva cada bloque, alternando dentro de cada condición. */
function repartoPorBloque(bloques, azar) {
  const inicio = {};
  for (const condicion of Object.values(CONDICIONES)) {
    inicio[condicion] = { masCongruentes: azar() < 0.5, mayoritaria: elegir(LETRAS, azar) };
  }
  const vistos = {};
  return bloques.map((b) => {
    const k = vistos[b.condicion] || 0;
    vistos[b.condicion] = k + 1;
    const { masCongruentes, mayoritaria } = inicio[b.condicion];
    const alterna = k % 2 === 1;
    return {
      congruentes: masCongruentes !== alterna ? Math.ceil(b.ensayos / 2) : Math.floor(b.ensayos / 2),
      mayoritaria: alterna ? otraLetra(mayoritaria) : mayoritaria
    };
  });
}

/** Condiciones de la práctica: la del primer bloque y después la otra. */
function condicionesPractica(secuencia) {
  const primera = secuencia.bloques[0].condicion;
  const orden = [primera, ...Object.values(CONDICIONES).filter((c) => c !== primera)];
  return Array.from({ length: secuencia.ensayosPractica }, (_, i) => orden[i % orden.length]);
}

/**
 * Ensayos de la tarea, en el orden en que se presentan, con su número, su
 * bloque, su condición, su congruencia, su estímulo y la semilla. `fase` y
 * `regla` van en null: son de la tarea de cambio de regla.
 *
 * @param {object} secuencia la secuencia de la tarea de Navon del plan
 * @param {number} semilla entero de 32 bits
 */
export function generarEnsayosNavon(secuencia, semilla) {
  const azar = crearAzar(semilla);
  const ensayos = [];
  const agregar = (bloque, condicion, estimulo, practica) =>
    ensayos.push({
      numero: ensayos.length + 1,
      tarea: secuencia.tarea,
      bloque,
      fase: null,
      regla: null,
      condicion,
      congruencia: congruenciaDe(estimulo),
      practica,
      estimulo: { ...estimulo },
      semilla
    });

  let letra = elegir(LETRAS, azar);
  for (const condicion of condicionesPractica(secuencia)) {
    agregar(BLOQUE_PRACTICA_NAVON, condicion, estimuloPara(condicion, letra, CONGRUENCIAS.INCONGRUENTE), true);
    letra = otraLetra(letra);
  }

  const reparto = repartoPorBloque(secuencia.bloques, azar);
  secuencia.bloques.forEach((bloque, i) => {
    for (const estimulo of ensayosDeBloque(bloque, reparto[i].congruentes, reparto[i].mayoritaria, azar)) {
      agregar(bloque.id, bloque.condicion, estimulo, false);
    }
  });
  return ensayos;
}
