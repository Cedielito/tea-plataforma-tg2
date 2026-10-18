/**
 * Acierto y clase de error de la tarea de Navon (M-09, CC-10, RF-14): la
 * respuesta correcta es la letra del nivel que pide el bloque; en Navon no
 * hay errores perseverativos y la omisión no es un error.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarRespuestaNavon } from './clasificacionNavon.js';

const H_DE_S = { global: 'H', local: 'S' };
const ensayo = (condicion, estimulo = H_DE_S) => ({ condicion, estimulo });

describe('CC-10 aciertos según el nivel del bloque', () => {
  test('la misma figura es correcta con H en un bloque global y con S en uno local', () => {
    assert.deepEqual(evaluarRespuestaNavon(ensayo('global'), 'H'), { acierto: true, claseError: 'correcta' });
    assert.deepEqual(evaluarRespuestaNavon(ensayo('local'), 'S'), { acierto: true, claseError: 'correcta' });
  });

  test('la letra del otro nivel es un error aleatorio, no perseverativo', () => {
    assert.deepEqual(evaluarRespuestaNavon(ensayo('global'), 'S'), { acierto: false, claseError: 'aleatoria' });
    assert.deepEqual(evaluarRespuestaNavon(ensayo('local'), 'H'), { acierto: false, claseError: 'aleatoria' });
  });

  test('en un ensayo congruente las dos condiciones piden la misma letra', () => {
    const s = { global: 'S', local: 'S' };
    for (const condicion of ['global', 'local']) {
      assert.equal(evaluarRespuestaNavon(ensayo(condicion, s), 'S').acierto, true);
      assert.equal(evaluarRespuestaNavon(ensayo(condicion, s), 'H').claseError, 'aleatoria');
    }
  });

  test('RF-14 una omisión no es un error: acierto false y claseError null', () => {
    assert.deepEqual(evaluarRespuestaNavon(ensayo('global'), null), { acierto: false, claseError: null });
  });
});
