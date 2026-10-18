/**
 * Sesión local con el formato de la web (M-09, CC-10, CT-11, CT-13, RF-15).
 * Las sesiones simuladas se guardan en api/test/ayudas/: la de cambio de
 * regla (sesionWebCambioRegla.json, T13), que procesa
 * registroSesionWeb.test.js, y la de las dos tareas (sesionWebDosTareas.json,
 * T14), que procesa registroSesionDosTareas.test.js. Si el formato cambia a
 * propósito, se regeneran con:
 *   ACTUALIZAR_SESION_SIMULADA=1 npm test -w web
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { contieneDatoIdentificable } from '../../../api/src/dominio/registro/seudonimo.js';
import { SEMILLA_SIMULADA, simularSesion, simularSesionDosTareas } from './sesionSimulada.js';
import {
  armarSesion,
  elegirSecuencias,
  nombreArchivo,
  tipoEntradaPredominante,
  unirSesiones
} from './sesionLocal.js';

const ARCHIVO = new URL('../../../api/test/ayudas/sesionWebCambioRegla.json', import.meta.url);
const ARCHIVO_DOS_TAREAS = new URL('../../../api/test/ayudas/sesionWebDosTareas.json', import.meta.url);
const sesion = simularSesion(planificarSesion());
const dosTareas = simularSesionDosTareas(planificarSesion());

/** Compara el archivo de api/test/ayudas con la sesión, o lo reescribe si se pide. */
function comprobarArchivo(archivo, valor) {
  const texto = `${JSON.stringify(valor, null, 2)}\n`;
  if (process.env.ACTUALIZAR_SESION_SIMULADA === '1') writeFileSync(archivo, texto);
  assert.equal(readFileSync(archivo, 'utf8'), texto);
}

const CAMPOS_ENSAYO = [
  // Los de indicadores.js
  'tarea', 'bloque', 'fase', 'regla', 'condicion', 'practica', 'estadoItem', 'acierto', 'claseError',
  'tiempoReaccionMs', 'pausasDuranteItemMs', 'rectificaciones',
  // Los que agrega el motor de ensayos
  'numero', 'estimulo', 'respuesta', 'aparicionMs', 'momentoRespuestaMs', 'semilla', 'tipoEntrada'
];

describe('M-09 sesión con el formato de la web', () => {
  test('el archivo de api/test/ayudas es lo que produce la web', () => {
    comprobarArchivo(ARCHIVO, sesion);
  });

  test('cada ensayo tiene exactamente los campos acordados', () => {
    for (const e of sesion.ensayos) assert.deepEqual(Object.keys(e), CAMPOS_ENSAYO);
  });

  test('la sesión está completada, con la versión del catálogo, la semilla y el reloj', () => {
    assert.equal(sesion.estado, 'completada');
    assert.equal(sesion.versionCatalogo, planificarSesion().versionCatalogo);
    assert.equal(sesion.semilla, SEMILLA_SIMULADA);
    assert.equal(sesion.reloj, 'animacion');
    assert.deepEqual(sesion.contexto, { tipoEntrada: 'teclado', pausas: 2, repeticionesInstruccion: 1 });
  });

  test('CT-11 sin datos identificables ni seudónimo', () => {
    assert.equal(contieneDatoIdentificable(sesion), false);
    assert.equal('seudonimo' in sesion, false);
  });

  test('la simulación pasó por la omisión, la anticipación, la pausa y los errores', () => {
    const e = sesion.ensayos;
    assert.equal(e.filter((x) => x.estadoItem === 'omitido').length, 1);
    assert.ok(e.some((x) => x.tiempoReaccionMs !== null && x.tiempoReaccionMs < 200));
    assert.equal(e.filter((x) => x.pausasDuranteItemMs > 0).length, 2);
    assert.equal(e.filter((x) => x.claseError === 'perseverativa').length, 2);
    assert.ok(e.every((x) => x.rectificaciones === 0));
  });
});

describe('M-09 armado de la sesión local', () => {
  test('el tipo de entrada predominante no cuenta la práctica ni las omisiones', () => {
    const e = (tipoEntrada, practica = false) => ({ tipoEntrada, practica });
    assert.equal(tipoEntradaPredominante([e('tactil', true), e('tactil', true), e('raton'), e(null), e(null)]), 'raton');
    assert.equal(tipoEntradaPredominante([e('teclado'), e('tactil')]), 'teclado');
    assert.equal(tipoEntradaPredominante([]), null);
  });

  test('armarSesion pone el estado completada y el contexto que lee el motor', () => {
    const s = armarSesion({ ensayos: [], semilla: 1, reloj: 'referencia', versionCatalogo: '1.1.0' });
    assert.deepEqual(s, {
      estado: 'completada',
      versionCatalogo: '1.1.0',
      semilla: 1,
      reloj: 'referencia',
      ensayos: [],
      contexto: { tipoEntrada: null, pausas: 0, repeticionesInstruccion: 0 }
    });
  });

  test('el archivo se nombra con la semilla y, si hay una sola tarea, con su nombre; sin fecha ni datos de nadie', () => {
    const de = (tarea) => ({ tarea });
    assert.equal(nombreArchivo({ semilla: 77, ensayos: [de('cambio-regla')] }), 'registro-prueba-cambio-regla-77.json');
    assert.equal(nombreArchivo({ semilla: 77, ensayos: [de('navon'), de('navon')] }), 'registro-prueba-navon-77.json');
    assert.equal(nombreArchivo({ semilla: 77, ensayos: [de('cambio-regla'), de('navon')] }), 'registro-prueba-77.json');
  });

  test('unirSesiones junta los ensayos en orden y suma el contexto de las tareas', () => {
    const a = armarSesion({
      ensayos: [{ tarea: 'cambio-regla', tipoEntrada: 'tactil', practica: false }],
      semilla: 5,
      reloj: 'animacion',
      versionCatalogo: '1.1.0',
      pausas: 2,
      repeticionesInstruccion: 1
    });
    const b = armarSesion({
      ensayos: [
        { tarea: 'navon', tipoEntrada: 'teclado', practica: false },
        { tarea: 'navon', tipoEntrada: 'teclado', practica: false }
      ],
      semilla: 5,
      reloj: 'animacion',
      versionCatalogo: '1.1.0',
      pausas: 1
    });
    const u = unirSesiones([a, b]);
    assert.deepEqual(u.ensayos.map((e) => e.tarea), ['cambio-regla', 'navon', 'navon']);
    assert.deepEqual(u.contexto, { tipoEntrada: 'teclado', pausas: 3, repeticionesInstruccion: 1 });
    assert.equal(u.estado, 'completada');
    assert.equal(u.semilla, 5);
  });

  test('la página de prueba hace las dos tareas en el orden del plan, o solo la de ?tarea=', () => {
    const plan = planificarSesion();
    const disponibles = ['cambio-regla', 'navon'];
    const tareas = (t) => elegirSecuencias(plan, t, disponibles).map((s) => s.tarea);
    assert.deepEqual(tareas(null), ['cambio-regla', 'navon']);
    assert.deepEqual(tareas('navon'), ['navon']);
    assert.deepEqual(tareas('cambio-regla'), ['cambio-regla']);
    assert.deepEqual(tareas('otra'), ['cambio-regla', 'navon']);
  });
});

const CAMPOS_ENSAYO_NAVON = [
  'tarea', 'bloque', 'fase', 'regla', 'condicion', 'congruencia', 'practica', 'estadoItem', 'acierto',
  'claseError', 'tiempoReaccionMs', 'pausasDuranteItemMs', 'rectificaciones',
  'numero', 'estimulo', 'respuesta', 'aparicionMs', 'momentoRespuestaMs', 'semilla', 'tipoEntrada'
];

describe('M-09 sesión simulada de las dos tareas (T14)', () => {
  const plan = planificarSesion();
  const navon = dosTareas.ensayos.filter((e) => e.tarea === 'navon');
  const total = (tarea) => {
    const s = plan.secuencias.find((x) => x.tarea === tarea);
    return s.ensayosPractica + s.ensayosPuntuados;
  };

  test('el archivo de api/test/ayudas es lo que produce la web', () => {
    comprobarArchivo(ARCHIVO_DOS_TAREAS, dosTareas);
  });

  test('tiene las dos tareas seguidas, cambio de regla primero, en un solo archivo', () => {
    assert.equal(dosTareas.ensayos.length, total('cambio-regla') + total('navon'));
    const orden = [...new Set(dosTareas.ensayos.map((e) => e.tarea))];
    assert.deepEqual(orden, ['cambio-regla', 'navon']);
    // La parte de cambio de regla es la misma sesión de T13
    assert.deepEqual(dosTareas.ensayos.filter((e) => e.tarea === 'cambio-regla'), sesion.ensayos);
    assert.deepEqual(dosTareas.contexto, { tipoEntrada: 'teclado', pausas: 3, repeticionesInstruccion: 1 });
    assert.equal(nombreArchivo(dosTareas), `registro-prueba-${SEMILLA_SIMULADA}.json`);
  });

  test('cada ensayo de Navon tiene los campos de T13 más condicion y congruencia', () => {
    for (const e of navon) assert.deepEqual(Object.keys(e), CAMPOS_ENSAYO_NAVON);
  });

  test('Navon empieza después de cambio de regla en el mismo reloj', () => {
    const ultimo = dosTareas.ensayos.filter((e) => e.tarea === 'cambio-regla').at(-1);
    assert.ok(navon[0].aparicionMs > ultimo.aparicionMs);
  });

  test('claseError: correcta si acierta, aleatoria si no, null si omite', () => {
    for (const e of navon) {
      if (e.estadoItem === 'omitido') assert.equal(e.claseError, null);
      else assert.equal(e.claseError, e.acierto ? 'correcta' : 'aleatoria');
    }
    assert.ok(navon.every((e) => ['H', 'S', null].includes(e.respuesta)));
  });

  test('la simulación de Navon pasó por la omisión, la anticipación, la pausa y el error', () => {
    const puntuados = navon.filter((e) => !e.practica);
    assert.equal(puntuados.filter((e) => e.estadoItem === 'omitido').length, 1);
    assert.equal(puntuados.filter((e) => e.tiempoReaccionMs !== null && e.tiempoReaccionMs < 200).length, 1);
    assert.equal(puntuados.filter((e) => e.pausasDuranteItemMs > 0).length, 1);
    assert.equal(puntuados.filter((e) => e.claseError === 'aleatoria').length, 1);
    assert.equal(contieneDatoIdentificable(dosTareas), false);
  });
});
