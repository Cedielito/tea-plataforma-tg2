/**
 * RS-05 aviso antes del vencimiento por inactividad (M-08, M-09; RA-10,
 * criterio 2.2.1 de WCAG): cuándo aparece, cuándo cambia, qué cuenta como
 * actividad y que la copia del límite es la de la API.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MS_INACTIVIDAD as INACTIVIDAD_API } from '../../../api/src/dominio/autenticacion.js';
import { buscarVocabularioProhibido } from '../../../api/src/dominio/registro/vocabularioProhibido.js';
import {
  ETAPAS,
  MS_AVISO_ANTES,
  MS_INACTIVIDAD,
  TEXTOS_VENCIMIENTO,
  cuentaComoActividad,
  etapaDeLaSesion,
  horaDeCierre,
  msHastaElCambio
} from './vencimiento.js';

const MINUTO = 60 * 1000;
const INICIO = Date.UTC(2026, 9, 25, 15, 0, 0);

describe('RS-05 aviso de vencimiento de la sesión', () => {
  test('el límite de inactividad es el mismo que el de la API (30 minutos) y el aviso sale 2 minutos antes', () => {
    assert.equal(MS_INACTIVIDAD, INACTIVIDAD_API);
    assert.equal(MS_INACTIVIDAD, 30 * MINUTO);
    assert.equal(MS_AVISO_ANTES, 2 * MINUTO);
    // WCAG 2.2.1 pide al menos 20 segundos para extender la sesión.
    assert.ok(MS_AVISO_ANTES >= 20 * 1000);
  });

  test('vigente hasta los 28 minutos, por vencer hasta los 30 y vencida después', () => {
    assert.equal(etapaDeLaSesion(INICIO, INICIO), ETAPAS.VIGENTE);
    assert.equal(etapaDeLaSesion(INICIO, INICIO + 28 * MINUTO - 1), ETAPAS.VIGENTE);
    assert.equal(etapaDeLaSesion(INICIO, INICIO + 28 * MINUTO), ETAPAS.POR_VENCER);
    assert.equal(etapaDeLaSesion(INICIO, INICIO + 30 * MINUTO - 1), ETAPAS.POR_VENCER);
    assert.equal(etapaDeLaSesion(INICIO, INICIO + 30 * MINUTO), ETAPAS.VENCIDA);
    assert.equal(etapaDeLaSesion(INICIO, INICIO + 9 * 60 * MINUTO), ETAPAS.VENCIDA);
  });

  test('el tiempo hasta el siguiente cambio de etapa lleva justo al borde de cada una', () => {
    for (const transcurrido of [0, 5 * MINUTO, 28 * MINUTO - 1, 28 * MINUTO, 29 * MINUTO + 30 * 1000]) {
      const ahora = INICIO + transcurrido;
      const espera = msHastaElCambio(INICIO, ahora);
      assert.ok(espera > 0);
      assert.notEqual(etapaDeLaSesion(INICIO, ahora + espera), etapaDeLaSesion(INICIO, ahora));
      assert.equal(etapaDeLaSesion(INICIO, ahora + espera - 1), etapaDeLaSesion(INICIO, ahora));
    }
    assert.equal(msHastaElCambio(INICIO, INICIO + 30 * MINUTO), null);
  });

  test('la hora de cierre es la de la última actividad más 30 minutos', () => {
    // 15:00 UTC son las 10:00 en Bogotá; cierra a las 10:30.
    assert.match(horaDeCierre(INICIO, 'America/Bogota'), /^10:30\s?a/);
  });

  test('cuentan como actividad las respuestas de /api/admin atendidas con sesión y el inicio de sesión aceptado', () => {
    assert.equal(cuentaComoActividad('/api/admin/contenidos', 'GET', 200), true);
    assert.equal(cuentaComoActividad('/api/admin/contenidos/1', 'PATCH', 400), true);
    assert.equal(cuentaComoActividad('/api/admin/registro/sesiones', 'GET', 403), true);
    assert.equal(cuentaComoActividad('/api/admin/sesion', 'DELETE', 204), true);
    assert.equal(cuentaComoActividad('/api/admin/contenidos', 'GET', 401), false);
    assert.equal(cuentaComoActividad('/api/admin/contenidos', 'GET', 503), false);
    assert.equal(cuentaComoActividad('/api/sesion', 'POST', 200), true);
    assert.equal(cuentaComoActividad('/api/sesion', 'POST', 401), false);
    assert.equal(cuentaComoActividad('/api/contenidos', 'GET', 200), false);
  });

  test('M-09 los textos del aviso, que también salen en la zona del profesional, no usan vocabulario prohibido', () => {
    const textos = [
      TEXTOS_VENCIMIENTO.porVencer('10:30 a. m.'),
      TEXTOS_VENCIMIENTO.vencida,
      TEXTOS_VENCIMIENTO.boton,
      TEXTOS_VENCIMIENTO.renovando,
      TEXTOS_VENCIMIENTO.renovada,
      TEXTOS_VENCIMIENTO.error
    ];
    for (const texto of textos) assert.deepEqual(buscarVocabularioProhibido(texto), [], texto);
  });
});
