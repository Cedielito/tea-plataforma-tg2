/**
 * Acierto y clase de error al registrar cada ensayo (M-09, CC-08).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { evaluarRespuesta, reglaAnterior } from './clasificacion.js';
import { generarEnsayos } from './generador.js';
import { ladoCorrecto } from './estimulos.js';

const SECUENCIA = planificarSesion().secuencias.find((s) => s.tarea === 'cambio-regla');
const CONEJO_AZUL = { forma: 'conejo', color: 'azul' }; // color: derecha · forma: izquierda
const ensayo = (o) => ({ practica: false, estimulo: CONEJO_AZUL, ...o });

describe('CC-08 clase de error', () => {
  test('las cajas: por color, a la del mismo color; por forma, a la de la misma forma', () => {
    assert.equal(ladoCorrecto(CONEJO_AZUL, 'color'), 'derecha');
    assert.equal(ladoCorrecto(CONEJO_AZUL, 'forma'), 'izquierda');
    assert.throws(() => ladoCorrecto(CONEJO_AZUL, 'tamano'), RangeError);
  });

  test('correcta si acierta', () => {
    const e = ensayo({ fase: 'post-cambio', regla: 'forma' });
    assert.deepEqual(evaluarRespuesta(e, 'izquierda', 'color'), { acierto: true, claseError: 'correcta' });
  });

  test('bloque de forma: el error con la regla de color es perseverativo', () => {
    const e = ensayo({ bloque: 'CR-FORMA', fase: 'post-cambio', regla: 'forma' });
    const anterior = reglaAnterior(e, null, SECUENCIA);
    assert.equal(anterior, 'color');
    assert.deepEqual(evaluarRespuesta(e, 'derecha', anterior), { acierto: false, claseError: 'perseverativa' });
  });

  test('bloque mixto: el error con la regla del ensayo anterior del mismo bloque es perseverativo', () => {
    const previo = ensayo({ bloque: 'CR-MIXTO-2', fase: 'mixto', regla: 'color' });
    const e = ensayo({ bloque: 'CR-MIXTO-2', fase: 'mixto', regla: 'forma' }); // cambio
    const anterior = reglaAnterior(e, previo, SECUENCIA);
    assert.equal(anterior, 'color');
    assert.equal(evaluarRespuesta(e, 'derecha', anterior).claseError, 'perseverativa');
  });

  test('bloque mixto: un error en una repetición es aleatorio', () => {
    const previo = ensayo({ bloque: 'CR-MIXTO-2', fase: 'mixto', regla: 'forma' });
    const e = ensayo({ bloque: 'CR-MIXTO-2', fase: 'mixto', regla: 'forma' });
    assert.equal(evaluarRespuesta(e, 'derecha', reglaAnterior(e, previo, SECUENCIA)).claseError, 'aleatoria');
  });

  test('el primer ensayo de un bloque mixto no tiene regla anterior: su error es aleatorio', () => {
    const ultimoDelBloquePrevio = ensayo({ bloque: 'CR-MIXTO-1', fase: 'mixto', regla: 'color' });
    const e = ensayo({ bloque: 'CR-MIXTO-2', fase: 'mixto', regla: 'forma' });
    const anterior = reglaAnterior(e, ultimoDelBloquePrevio, SECUENCIA);
    assert.equal(anterior, null);
    assert.equal(evaluarRespuesta(e, 'derecha', anterior).claseError, 'aleatoria');
  });

  test('en la práctica y en el bloque de color no hay regla anterior: el error es aleatorio', () => {
    const practica = ensayo({ bloque: 'CR-PRACTICA', practica: true, fase: null, regla: 'color' });
    const color = ensayo({ bloque: 'CR-COLOR', fase: 'pre-cambio', regla: 'color' });
    assert.equal(reglaAnterior(practica, null, SECUENCIA), null);
    assert.equal(reglaAnterior(color, practica, SECUENCIA), null);
    assert.equal(evaluarRespuesta(color, 'izquierda', null).claseError, 'aleatoria');
  });

  test('RF-14 la omisión no es un error', () => {
    const e = ensayo({ fase: 'post-cambio', regla: 'forma' });
    assert.deepEqual(evaluarRespuesta(e, null, 'color'), { acierto: false, claseError: null });
  });

  test('con dos cajas y estímulos en conflicto, todo error del bloque de forma es perseverativo', () => {
    for (let semilla = 0; semilla < 50; semilla += 1) {
      const lista = generarEnsayos(SECUENCIA, semilla);
      lista.forEach((e, i) => {
        if (e.fase !== 'post-cambio') return;
        const incorrecto = ladoCorrecto(e.estimulo, 'color');
        const anterior = reglaAnterior(e, lista[i - 1], SECUENCIA);
        assert.equal(evaluarRespuesta(e, incorrecto, anterior).claseError, 'perseverativa');
      });
    }
  });
});
