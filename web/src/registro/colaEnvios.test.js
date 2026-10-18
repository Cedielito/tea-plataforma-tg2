/**
 * Cola de envíos de la aplicación (M-09, HU-17): si el envío falla, lo
 * registrado no se pierde y se reintenta en orden, sin duplicar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { crearColaEnvios, esTransitorio, SITUACIONES } from './colaEnvios.js';
import { ErrorApi } from '../api/cliente.js';

/** `enviar` falso: falla con los errores de la lista, en orden, y luego responde bien. */
function enviarFalso(fallas = []) {
  const recibidos = [];
  const intentos = [];
  const enviar = async (envio) => {
    intentos.push(envio.clave);
    const falla = fallas.shift();
    if (falla) throw falla;
    recibidos.push(envio);
  };
  return { enviar, recibidos, intentos };
}

const envio = (clave) => ({ clave, ruta: `/api/registro/aplicacion/${clave}`, metodo: 'PUT', datos: { clave } });
const sinRed = () => new TypeError('Failed to fetch');

describe('M-09 cola de envíos de la aplicación', () => {
  test('envía en orden y queda al día', async () => {
    const { enviar, recibidos } = enviarFalso();
    const cola = crearColaEnvios({ enviar });
    await cola.agregar(envio('cambio-regla'));
    const estado = await cola.agregar(envio('navon'));
    assert.deepEqual(recibidos.map((e) => e.clave), ['cambio-regla', 'navon']);
    assert.equal(estado.situacion, SITUACIONES.AL_DIA);
  });

  test('una falla de red se reintenta una vez de inmediato', async () => {
    const { enviar, intentos, recibidos } = enviarFalso([sinRed()]);
    const cola = crearColaEnvios({ enviar });
    const estado = await cola.agregar(envio('cambio-regla'));
    assert.deepEqual(intentos, ['cambio-regla', 'cambio-regla']);
    assert.equal(recibidos.length, 1);
    assert.equal(estado.situacion, SITUACIONES.AL_DIA);
  });

  test('si falla dos veces, lo registrado queda pendiente y sale con el siguiente envío, en orden', async () => {
    const { enviar, recibidos } = enviarFalso([sinRed(), new ErrorApi(503)]);
    const cola = crearColaEnvios({ enviar });
    let estado = await cola.agregar(envio('cambio-regla'));
    assert.equal(estado.situacion, SITUACIONES.PENDIENTE);
    assert.equal(estado.detenida, true);
    assert.deepEqual(estado.pendientes, ['cambio-regla']);

    estado = await cola.agregar(envio('navon'));
    assert.deepEqual(recibidos.map((e) => e.clave), ['cambio-regla', 'navon']);
    assert.deepEqual(recibidos[0].datos, { clave: 'cambio-regla' });
    assert.equal(estado.situacion, SITUACIONES.AL_DIA);
  });

  test('«Intentar de nuevo» (o la conexión que vuelve) envía lo pendiente', async () => {
    const { enviar, recibidos } = enviarFalso([sinRed(), sinRed(), sinRed(), sinRed()]);
    const cola = crearColaEnvios({ enviar });
    await cola.agregar(envio('sus'));
    assert.equal((await cola.procesar()).situacion, SITUACIONES.PENDIENTE);
    assert.equal((await cola.procesar()).situacion, SITUACIONES.AL_DIA);
    assert.equal(recibidos.length, 1);
  });

  test('un rechazo de la API no se reintenta y la cola sigue con el siguiente', async () => {
    const { enviar, intentos, recibidos } = enviarFalso([new ErrorApi(422, { error: 'x' })]);
    const cola = crearColaEnvios({ enviar });
    await cola.agregar(envio('cambio-regla'));
    const estado = await cola.agregar(envio('navon'));
    assert.deepEqual(intentos, ['cambio-regla', 'navon']);
    assert.deepEqual(recibidos.map((e) => e.clave), ['navon']);
    assert.equal(estado.situacion, SITUACIONES.RECHAZADO);
    assert.deepEqual(estado.rechazados, ['cambio-regla']);
  });

  test('la misma clave no se agrega dos veces', async () => {
    const { enviar, recibidos } = enviarFalso([sinRed(), sinRed()]);
    const cola = crearColaEnvios({ enviar });
    await cola.agregar(envio('navon'));
    await cola.agregar(envio('navon'));
    assert.deepEqual(recibidos.map((e) => e.clave), ['navon']);
  });

  test('lo que llega mientras se envía sale en la misma vuelta', async () => {
    let soltar;
    const recibidos = [];
    const enviar = (e) =>
      new Promise((resolver) => {
        recibidos.push(e.clave);
        if (e.clave === 'cambio-regla') soltar = resolver;
        else resolver();
      });
    const cambios = [];
    const cola = crearColaEnvios({ enviar, alCambiar: (estado) => cambios.push(estado.situacion) });
    const primera = cola.agregar(envio('cambio-regla'));
    const segunda = cola.agregar(envio('navon'));
    assert.equal(cola.estado().situacion, SITUACIONES.ENVIANDO);
    soltar();
    await Promise.all([primera, segunda]);
    assert.deepEqual(recibidos, ['cambio-regla', 'navon']);
    assert.equal(cambios.at(-1), SITUACIONES.AL_DIA);
  });

  test('qué errores son transitorios', () => {
    assert.equal(esTransitorio(sinRed()), true);
    for (const estado of [408, 429, 500, 502, 503, 504]) assert.equal(esTransitorio(new ErrorApi(estado)), true);
    for (const estado of [400, 401, 404, 409, 422]) assert.equal(esTransitorio(new ErrorApi(estado)), false);
  });
});
