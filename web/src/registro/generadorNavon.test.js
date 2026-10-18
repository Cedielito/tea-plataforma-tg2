/**
 * Generador de ensayos de la tarea de Navon (M-09, CC-10, CP-01, CP-04,
 * CT-13), con el plan de la API: planificarSesion se importa de api/, no se
 * copia.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { BLOQUE_PRACTICA_NAVON, generarEnsayosNavon } from './generadorNavon.js';
import { congruenciaDe, estimuloPara, letraCorrecta, OPCIONES_LETRA, PATRONES, posicionesDe } from './estimulosNavon.js';

const PLAN = planificarSesion();
const SECUENCIA = PLAN.secuencias.find((s) => s.tarea === 'navon');
const SEMILLA = 12345;

const porBloque = (ensayos) => {
  const grupos = new Map();
  for (const e of ensayos) grupos.set(e.bloque, [...(grupos.get(e.bloque) || []), e]);
  return grupos;
};
const contar = (lista, fn) => lista.filter(fn).length;
const correcta = (e) => letraCorrecta(e.estimulo, e.condicion);

describe('M-09 generador de la tarea de Navon con semilla fija', () => {
  const ensayos = generarEnsayosNavon(SECUENCIA, SEMILLA);
  const bloques = porBloque(ensayos);

  test('produce la estructura del plan: práctica y los 4 bloques en orden global, local, local, global', () => {
    assert.deepEqual([...bloques.keys()], [BLOQUE_PRACTICA_NAVON, ...SECUENCIA.bloques.map((b) => b.id)]);
    assert.deepEqual(
      SECUENCIA.bloques.map((b) => b.condicion),
      ['global', 'local', 'local', 'global']
    );
    assert.equal(ensayos.length, SECUENCIA.ensayosPractica + SECUENCIA.ensayosPuntuados);
    for (const b of SECUENCIA.bloques) {
      const propios = bloques.get(b.id);
      assert.equal(propios.length, 7);
      assert.ok(propios.every((e) => e.condicion === b.condicion && e.practica === false));
    }
    assert.deepEqual(ensayos.map((e) => e.numero), ensayos.map((_, i) => i + 1));
    assert.ok(
      ensayos.every((e) => e.tarea === 'navon' && e.fase === null && e.regla === null && e.semilla === SEMILLA)
    );
  });

  test('cada ensayo guarda su condición y su congruencia, que corresponde al estímulo', () => {
    for (const e of ensayos) {
      assert.ok(['global', 'local'].includes(e.condicion));
      assert.equal(e.congruencia, congruenciaDe(e.estimulo));
    }
  });

  test('CP-01 ningún bloque pasa de 7 ensayos', () => {
    for (const lista of bloques.values()) assert.ok(lista.length <= 7);
  });

  test('CP-04 la práctica tiene un ensayo de cada nivel, incongruentes y con letras correctas distintas', () => {
    const practica = bloques.get(BLOQUE_PRACTICA_NAVON);
    assert.equal(practica.length, 2);
    assert.deepEqual(practica.map((e) => e.condicion), ['global', 'local']);
    assert.ok(practica.every((e) => e.practica && e.congruencia === 'incongruente'));
    assert.notEqual(correcta(practica[0]), correcta(practica[1]));
  });

  test('cada bloque tiene 3 y 4 congruentes e incongruentes, y la letra correcta 4 y 3', () => {
    for (const b of SECUENCIA.bloques) {
      const propios = bloques.get(b.id);
      const congruentes = contar(propios, (e) => e.congruencia === 'congruente');
      assert.ok([3, 4].includes(congruentes), b.id);
      const h = contar(propios, (e) => correcta(e) === 'H');
      assert.ok([3, 4].includes(h), b.id);
      // Dentro de cada grupo de congruencia, la letra correcta lo más pareja posible
      for (const grupo of ['congruente', 'incongruente']) {
        const del = propios.filter((e) => e.congruencia === grupo);
        const hs = contar(del, (e) => correcta(e) === 'H');
        assert.ok(Math.abs(hs - (del.length - hs)) <= 1, `${b.id} ${grupo}`);
      }
    }
  });

  test('cada nivel queda con 7 congruentes y 7 incongruentes, 7 H y 7 S', () => {
    for (const condicion of ['global', 'local']) {
      const propios = ensayos.filter((e) => !e.practica && e.condicion === condicion);
      assert.equal(propios.length, 14);
      assert.equal(contar(propios, (e) => e.congruencia === 'congruente'), 7, condicion);
      assert.equal(contar(propios, (e) => correcta(e) === 'H'), 7, condicion);
    }
  });

  test('el balance se cumple con cualquier semilla', () => {
    for (let semilla = 0; semilla < 300; semilla += 1) {
      const lista = generarEnsayosNavon(SECUENCIA, semilla).filter((e) => !e.practica);
      for (const condicion of ['global', 'local']) {
        const propios = lista.filter((e) => e.condicion === condicion);
        assert.equal(contar(propios, (e) => e.congruencia === 'congruente'), 7);
        assert.equal(contar(propios, (e) => correcta(e) === 'H'), 7);
      }
    }
  });

  test('las semillas cambian el orden y aparecen los cuatro estímulos', () => {
    const clave = (e) => `${e.estimulo.global}${e.estimulo.local}`;
    const otros = generarEnsayosNavon(SECUENCIA, SEMILLA + 1);
    assert.notDeepEqual(ensayos.map(clave), otros.map(clave));
    assert.deepEqual([...new Set(ensayos.map(clave))].sort(), ['HH', 'HS', 'SH', 'SS']);
  });

  test('CT-13 la misma semilla y el mismo plan dan los mismos ensayos', () => {
    assert.deepEqual(generarEnsayosNavon(SECUENCIA, SEMILLA), ensayos);
  });

  test('el generador no modifica el plan', () => {
    const copia = JSON.parse(JSON.stringify(SECUENCIA));
    generarEnsayosNavon(SECUENCIA, 99);
    assert.deepEqual(SECUENCIA, copia);
  });
});

describe('M-09 estímulos de la tarea de Navon', () => {
  test('cada estímulo tiene la letra correcta del nivel pedido, congruente o no', () => {
    for (const condicion of ['global', 'local']) {
      for (const letra of ['H', 'S']) {
        for (const congruencia of ['congruente', 'incongruente']) {
          const e = estimuloPara(condicion, letra, congruencia);
          assert.equal(letraCorrecta(e, condicion), letra);
          assert.equal(congruenciaDe(e), congruencia);
        }
      }
    }
  });

  test('una condición o una letra desconocida es un error', () => {
    assert.throws(() => letraCorrecta({ global: 'H', local: 'S' }, 'color'), RangeError);
    assert.throws(() => letraCorrecta({ global: 'X', local: 'S' }, 'global'), RangeError);
  });

  test('F responde H y J responde S', () => {
    assert.deepEqual(
      OPCIONES_LETRA.map((o) => [o.code, o.valor]),
      [['KeyF', 'H'], ['KeyJ', 'S']]
    );
  });

  test('las letras grandes se dibujan en una cuadrícula de 5 × 7, distintas entre sí', () => {
    for (const patron of Object.values(PATRONES)) {
      assert.equal(patron.length, 7);
      assert.ok(patron.every((fila) => /^[#.]{5}$/.test(fila)));
    }
    assert.notDeepEqual(posicionesDe('H'), posicionesDe('S'));
    assert.equal(posicionesDe('H').length, 17);
    assert.equal(posicionesDe('S').length, 15);
  });
});
