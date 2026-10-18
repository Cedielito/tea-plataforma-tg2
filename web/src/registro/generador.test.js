/**
 * Generador de ensayos de la tarea de cambio de regla (M-09, CP-01, CP-04,
 * CT-13), con el plan de la API: planificarSesion se importa de api/, no se
 * copia.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { BLOQUE_PRACTICA, generarEnsayos, reglasDelPlan } from './generador.js';
import { enConflicto, ESTIMULOS_PRUEBA } from './estimulos.js';
import { barajar, crearAzar, leerSemilla, semillaNueva } from './azar.js';

const PLAN = planificarSesion();
const SECUENCIA = PLAN.secuencias.find((s) => s.tarea === 'cambio-regla');
const SEMILLA = 12345;

const porBloque = (ensayos) => {
  const grupos = new Map();
  for (const e of ensayos) grupos.set(e.bloque, [...(grupos.get(e.bloque) || []), e]);
  return grupos;
};
const clave = (e) => `${e.forma}-${e.color}`;

describe('M-09 generador de ensayos con semilla fija', () => {
  const ensayos = generarEnsayos(SECUENCIA, SEMILLA);
  const bloques = porBloque(ensayos);

  test('produce la estructura del catálogo: práctica y los bloques del plan, en orden', () => {
    assert.deepEqual([...bloques.keys()], [BLOQUE_PRACTICA, ...SECUENCIA.bloques.map((b) => b.id)]);
    assert.equal(ensayos.length, SECUENCIA.ensayosPractica + SECUENCIA.ensayosPuntuados);
    for (const b of SECUENCIA.bloques) {
      const propios = bloques.get(b.id);
      assert.equal(propios.length, b.ensayos);
      assert.ok(propios.every((e) => e.fase === b.fase && e.practica === false));
    }
    assert.deepEqual(ensayos.map((e) => e.numero), ensayos.map((_, i) => i + 1));
    assert.ok(ensayos.every((e) => e.tarea === 'cambio-regla' && e.condicion === null && e.semilla === SEMILLA));
  });

  test('CP-01 ningún bloque pasa de 7 ensayos', () => {
    for (const lista of bloques.values()) assert.ok(lista.length <= 7);
  });

  test('CP-04 la práctica tiene 2 ensayos con la regla del primer bloque (color), nunca la de forma', () => {
    const practica = bloques.get(BLOQUE_PRACTICA);
    assert.equal(practica.length, 2);
    assert.ok(practica.every((e) => e.practica && e.regla === 'color' && e.fase === null));
  });

  test('los bloques de una regla usan la regla del plan', () => {
    assert.ok(bloques.get('CR-COLOR').every((e) => e.regla === 'color'));
    assert.ok(bloques.get('CR-FORMA').every((e) => e.regla === 'forma'));
  });

  test('cada bloque mixto tiene 3 cambios y 3 repeticiones después del primer ensayo', () => {
    const mixtos = SECUENCIA.bloques.filter((b) => b.fase === 'mixto');
    assert.equal(mixtos.length, 4);
    for (const b of mixtos) {
      const reglas = bloques.get(b.id).map((e) => e.regla);
      const cambios = reglas.slice(1).filter((r, i) => r !== reglas[i]).length;
      assert.equal(cambios, 3, b.id);
      assert.equal(reglas.length - 1 - cambios, 3, b.id);
      assert.ok(reglas.every((r) => r === 'color' || r === 'forma'));
    }
  });

  test('todo estímulo está en conflicto, también los de práctica', () => {
    assert.ok(ensayos.every((e) => enConflicto(e.estimulo)));
    assert.ok(ESTIMULOS_PRUEBA.every(enConflicto));
  });

  test('cada bloque reparte los dos estímulos 4 y 3, también los mixtos; la práctica, 1 y 1', () => {
    for (const [id, lista] of bloques) {
      const cuentas = ESTIMULOS_PRUEBA.map((p) => lista.filter((e) => clave(e.estimulo) === clave(p)).length).sort();
      assert.deepEqual(cuentas, id === BLOQUE_PRACTICA ? [1, 1] : [3, 4], id);
    }
  });

  test('no guarda el tipo de ensayo: lo calcula el dominio', () => {
    assert.ok(ensayos.every((e) => !('tipoEnsayo' in e)));
  });

  test('la misma semilla da los mismos ensayos; otra semilla, otros', () => {
    assert.deepEqual(generarEnsayos(SECUENCIA, SEMILLA), ensayos);
    const otra = generarEnsayos(SECUENCIA, SEMILLA + 1);
    assert.notDeepEqual(otra.map((e) => [e.regla, clave(e.estimulo)]), ensayos.map((e) => [e.regla, clave(e.estimulo)]));
  });

  test('con muchas semillas se mantienen los 3 cambios, el balance y el conflicto', () => {
    for (let semilla = 0; semilla < 300; semilla += 1) {
      const lista = generarEnsayos(SECUENCIA, semilla * 7919);
      for (const [id, propios] of porBloque(lista)) {
        if (!id.startsWith('CR-MIXTO')) continue;
        const reglas = propios.map((e) => e.regla);
        assert.equal(reglas.slice(1).filter((r, i) => r !== reglas[i]).length, 3);
        const conejos = propios.filter((e) => e.estimulo.forma === 'conejo').length;
        assert.ok(conejos === 3 || conejos === 4);
      }
      assert.ok(lista.every((e) => enConflicto(e.estimulo)));
    }
  });

  test('las reglas salen del plan', () => {
    assert.deepEqual(reglasDelPlan(SECUENCIA), ['color', 'forma']);
  });
});

describe('M-09 números con semilla', () => {
  test('crearAzar es determinista y entrega valores en [0, 1)', () => {
    const a = crearAzar(7);
    const b = crearAzar(7);
    for (let i = 0; i < 1000; i += 1) {
      const x = a();
      assert.equal(x, b());
      assert.ok(x >= 0 && x < 1);
    }
  });

  test('barajar no modifica la lista y conserva sus elementos', () => {
    const lista = [1, 2, 3, 4, 5];
    const barajada = barajar(lista, crearAzar(3));
    assert.deepEqual(lista, [1, 2, 3, 4, 5]);
    assert.deepEqual([...barajada].sort(), lista);
  });

  test('leerSemilla acepta enteros de 32 bits y rechaza lo demás', () => {
    assert.equal(leerSemilla('42'), 42);
    assert.equal(leerSemilla('4294967295'), 4294967295);
    for (const malo of ['4294967296', '-1', '1.5', 'abc', '', null, undefined]) assert.equal(leerSemilla(malo), null);
  });

  test('semillaNueva usa el generador que recibe', () => {
    const fuente = { getRandomValues: (v) => { v[0] = 99; return v; } };
    assert.equal(semillaNueva(fuente), 99);
  });
});
