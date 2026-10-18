/**
 * Pasos de la aplicación (M-09, HU-17, RF-15): qué pantalla toca al abrir la
 * página, el reloj fijo y la forma de los envíos.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { leerEnvioTarea } from '../../../api/src/dominio/registro/envioTarea.js';
import { leerRespuestasSus } from '../../../api/src/dominio/registro/sus.js';
import { RELOJ_APLICACION, PASOS, pasoInicial, envioDeTarea, envioDeSus, enunciadosSinRespuesta, tareasDelPlan } from './aplicacion.js';
import { armarSesion } from './sesionLocal.js';

const PLAN = planificarSesion();
const DISPONIBLES = ['cambio-regla', 'navon'];
const SESION_WEB = JSON.parse(
  readFileSync(new URL('../../../api/test/ayudas/sesionWebDosTareas.json', import.meta.url), 'utf8')
);

const aplicacion = (cambios = {}) => ({
  estado: 'en_curso',
  tareasRecibidas: [],
  susRespondido: false,
  plan: PLAN,
  cuestionarioSus: { version: 'v1', items: [] },
  ...cambios
});

describe('M-09 / RF-15 pantalla al abrir la aplicación', () => {
  test('recién entregado el dispositivo empiezan las tareas, en el orden del plan', () => {
    assert.equal(pasoInicial({ aplicacion: aplicacion(), recienEntregada: true, disponibles: DISPONIBLES }), PASOS.TAREAS);
    assert.deepEqual(tareasDelPlan(PLAN, DISPONIBLES).map((s) => s.tarea), ['cambio-regla', 'navon']);
  });

  test('si se abre de nuevo con una tarea pendiente, la sesión se interrumpe', () => {
    const casos = [
      aplicacion(),
      aplicacion({ tareasRecibidas: ['cambio-regla'] }),
      aplicacion({ tareasRecibidas: ['navon'] })
    ];
    for (const caso of casos) {
      assert.equal(pasoInicial({ aplicacion: caso, recienEntregada: false, disponibles: DISPONIBLES }), PASOS.INTERRUMPIDA);
    }
    // Aunque diga recién entregada, si ya llegó una tarea no se vuelve a empezar.
    const conTarea = aplicacion({ tareasRecibidas: ['cambio-regla'] });
    assert.equal(pasoInicial({ aplicacion: conTarea, recienEntregada: true, disponibles: DISPONIBLES }), PASOS.INTERRUMPIDA);
  });

  test('con las dos tareas recibidas falta solo el SUS; después, el agradecimiento', () => {
    const recibidas = ['cambio-regla', 'navon'];
    const completa = aplicacion({ estado: 'completada', tareasRecibidas: recibidas });
    assert.equal(pasoInicial({ aplicacion: completa, recienEntregada: false, disponibles: DISPONIBLES }), PASOS.SUS);
    const conSus = { ...completa, susRespondido: true };
    assert.equal(pasoInicial({ aplicacion: conSus, recienEntregada: false, disponibles: DISPONIBLES }), PASOS.GRACIAS);
    const sinCuestionario = { ...completa, cuestionarioSus: null };
    assert.equal(pasoInicial({ aplicacion: sinCuestionario, recienEntregada: false, disponibles: DISPONIBLES }), PASOS.GRACIAS);
  });

  test('el reloj de la aplicación es siempre la variante animacion', () => {
    assert.equal(RELOJ_APLICACION, 'animacion');
    const pagina = readFileSync(new URL('./PaginaAplicacion.jsx', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert.match(pagina, /crearReloj\(RELOJ_APLICACION\)/);
    assert.doesNotMatch(pagina, /VITE_RELOJ_REGISTRO|elegirVariante|searchParams|useSearchParams/);
  });
});

describe('M-09 envíos de la aplicación con la forma que valida la API', () => {
  for (const tarea of DISPONIBLES) {
    test(`la tarea ${tarea} sale como PUT /api/registro/aplicacion/tareas/${tarea}`, () => {
      const ensayos = SESION_WEB.ensayos.filter((e) => e.tarea === tarea);
      const sesionTarea = armarSesion({
        ensayos,
        semilla: SESION_WEB.semilla,
        reloj: 'animacion',
        versionCatalogo: SESION_WEB.versionCatalogo,
        pausas: 2,
        repeticionesInstruccion: 1
      });
      const envio = envioDeTarea(sesionTarea);
      assert.equal(envio.clave, tarea);
      assert.equal(envio.ruta, `/api/registro/aplicacion/tareas/${tarea}`);
      assert.equal(envio.metodo, 'PUT');
      const secuencia = PLAN.secuencias.find((s) => s.tarea === tarea);
      const sesion = { versionCatalogo: PLAN.versionCatalogo, semilla: SESION_WEB.semilla, reloj: 'animacion' };
      const leido = leerEnvioTarea(envio.datos, { tarea, secuencia, sesion });
      assert.equal(leido.error, undefined);
      assert.deepEqual(leido.contexto, { pausas: 2, repeticionesInstruccion: 1 });
    });
  }

  test('el SUS sale con la versión y las 10 respuestas', () => {
    const respuestas = [3, 3, 4, 2, 5, 1, 4, 2, 3, 3];
    const envio = envioDeSus('v1', respuestas);
    assert.equal(envio.ruta, '/api/registro/aplicacion/sus');
    assert.deepEqual(leerRespuestasSus(envio.datos, { version: 'v1' }), { respuestas, version: 'v1' });
  });

  test('dice qué enunciados del SUS faltan', () => {
    assert.deepEqual(enunciadosSinRespuesta([], 3), [1, 2, 3]);
    assert.deepEqual(enunciadosSinRespuesta([1, undefined, 5], 3), [2]);
    assert.deepEqual(enunciadosSinRespuesta([1, 2, 3], 3), []);
  });
});
