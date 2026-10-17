/**
 * CT-03 en la interfaz de la tarea: durante los ensayos el participante no ve
 * temporizadores, marcadores ni puntajes, y el acierto solo aparece en la
 * práctica. La copia de vistaDeEnsayo es igual a la de api/.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { planificarSesion, vistaDeEnsayo as vistaDeLaApi } from '../../../api/src/dominio/registro/secuenciador.js';
import { retroalimentacion, vistaDeEnsayo } from './vista.js';
import { simularSesion } from './sesionSimulada.js';
import { RETROALIMENTACION } from './textos.js';

const { ensayos } = simularSesion(planificarSesion());
const OCULTOS = ['tiempoReaccionMs', 'pausasDuranteItemMs', 'claseError'];

describe('CT-03 vistaDeEnsayo en la web', () => {
  test('la copia de la web da lo mismo que la de la API con todos los ensayos de una sesión', () => {
    assert.ok(ensayos.length > 40);
    for (const e of ensayos) assert.deepEqual(vistaDeEnsayo(e), vistaDeLaApi(e));
    // También con ensayos sin medir y con campos de más
    const extra = { practica: true, acierto: true, tiempoReaccionMs: 1, claseError: 'correcta', otro: 1 };
    assert.deepEqual(vistaDeEnsayo(extra), vistaDeLaApi(extra));
    assert.deepEqual(vistaDeEnsayo({}), vistaDeLaApi({}));
  });

  test('fuera de la práctica no hay tiempo, acierto, clase de error, temporizador ni marcador', () => {
    for (const e of ensayos.filter((x) => !x.practica)) {
      const v = vistaDeEnsayo(e);
      for (const campo of [...OCULTOS, 'acierto']) assert.equal(campo in v, false, campo);
      assert.equal(v.mostrarTemporizador, false);
      assert.equal(v.mostrarMarcador, false);
      assert.equal(v.mostrarAcierto, false);
      assert.equal(retroalimentacion(e, RETROALIMENTACION), null);
    }
  });

  test('en la práctica muestra el acierto como retroalimentación, nunca el tiempo', () => {
    const practica = ensayos.filter((x) => x.practica);
    assert.equal(practica.length, 2);
    const [acierto, error] = practica.map((e) => retroalimentacion(e, RETROALIMENTACION));
    assert.deepEqual(acierto, { correcta: true, texto: RETROALIMENTACION.correcta });
    assert.equal(error.correcta, false);
    assert.match(error.texto, /COLOR/);
    for (const e of practica) for (const campo of OCULTOS) assert.equal(campo in vistaDeEnsayo(e), false);
    const omitido = { ...practica[0], estadoItem: 'omitido', acierto: false };
    assert.equal(retroalimentacion(omitido, RETROALIMENTACION).texto, RETROALIMENTACION.omitida);
  });

  test('las pantallas de la tarea no leen el tiempo, el acierto ni la clase de error', () => {
    // Solo la tabla final (para el equipo, después de terminar) muestra los ensayos completos.
    const pantallas = readdirSync(new URL('.', import.meta.url)).filter(
      (f) => f.endsWith('.jsx') && f !== 'TablaEnsayos.jsx'
    );
    assert.ok(pantallas.includes('TareaCambioRegla.jsx') && pantallas.includes('PantallaEnsayo.jsx'));
    for (const archivo of pantallas) {
      const codigo = readFileSync(new URL(archivo, import.meta.url), 'utf8');
      for (const campo of [...OCULTOS, '.acierto']) assert.equal(codigo.includes(campo), false, `${archivo}: ${campo}`);
      assert.doesNotMatch(codigo, /puntos|vidas|ranking|marcador|cron[oó]metro/i, archivo);
    }
  });
});
