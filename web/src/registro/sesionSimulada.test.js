/**
 * Sesión local con el formato de la web (M-09, CT-11, CT-13, RF-15). La
 * sesión simulada se guarda en api/test/ayudas/sesionWebCambioRegla.json, que
 * registroSesionWeb.test.js (api/) procesa con procesarSesion. Si el formato
 * cambia a propósito, se regenera con:
 *   ACTUALIZAR_SESION_SIMULADA=1 npm test -w web
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { contieneDatoIdentificable } from '../../../api/src/dominio/registro/seudonimo.js';
import { SEMILLA_SIMULADA, simularSesion } from './sesionSimulada.js';
import { armarSesion, nombreArchivo, tipoEntradaPredominante } from './sesionLocal.js';

const ARCHIVO = new URL('../../../api/test/ayudas/sesionWebCambioRegla.json', import.meta.url);
const sesion = simularSesion(planificarSesion());

const CAMPOS_ENSAYO = [
  // Los de indicadores.js
  'tarea', 'bloque', 'fase', 'regla', 'condicion', 'practica', 'estadoItem', 'acierto', 'claseError',
  'tiempoReaccionMs', 'pausasDuranteItemMs', 'rectificaciones',
  // Los que agrega el motor de ensayos
  'numero', 'estimulo', 'respuesta', 'aparicionMs', 'momentoRespuestaMs', 'semilla', 'tipoEntrada'
];

describe('M-09 sesión con el formato de la web', () => {
  test('el archivo de api/test/ayudas es lo que produce la web', () => {
    const texto = `${JSON.stringify(sesion, null, 2)}\n`;
    if (process.env.ACTUALIZAR_SESION_SIMULADA === '1') writeFileSync(ARCHIVO, texto);
    assert.equal(readFileSync(ARCHIVO, 'utf8'), texto);
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

  test('el archivo se nombra con la semilla, sin fecha ni datos de nadie', () => {
    assert.equal(nombreArchivo({ semilla: 77 }), 'registro-prueba-cambio-regla-77.json');
  });
});
