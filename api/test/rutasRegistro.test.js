'use strict';
const request = require('supertest');
const { crearServidor } = require('../src/api/servidor');
const { planificarSesion } = require('../src/dominio/registro/secuenciador');
const { contieneDatoIdentificable } = require('../src/dominio/registro/seudonimo');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { VERSION_CATALOGO } = require('../src/dominio/registro/version');

/**
 * Plan de la sesion del registro conductual (T13). M-09, CT-08, CT-11
 */

describe('M-09 GET /api/registro/plan', () => {
  const app = crearServidor();

  test('devuelve el plan del secuenciador, sin cambios', async () => {
    const res = await request(app).get('/api/registro/plan');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(planificarSesion());
    expect(res.body.versionCatalogo).toBe(VERSION_CATALOGO);
    expect(res.body.cumpleCT08).toBe(true);
  });

  test('trae lo que necesita el motor de ensayos de la web', async () => {
    const { body } = await request(app).get('/api/registro/plan');
    const cambioRegla = body.secuencias.find((s) => s.tarea === 'cambio-regla');
    expect(cambioRegla).toMatchObject({ ensayosPractica: 2, limiteRespuestaMs: 5000, intervaloEntreEnsayosMs: 500 });
    expect(cambioRegla.bloques.filter((b) => b.fase === 'mixto').every((b) => b.cambios === 3)).toBe(true);
  });

  test('ignora los parametros de la consulta', async () => {
    const res = await request(app).get('/api/registro/plan?orden=navon&seudonimo=K7QM-3XRA');
    expect(res.body).toEqual(planificarSesion());
  });

  test('CT-11 no trae datos identificables', async () => {
    const { body } = await request(app).get('/api/registro/plan');
    expect(contieneDatoIdentificable(body)).toBe(false);
  });

  test('M-09 / RCN-03 no trae vocabulario prohibido', async () => {
    const { body } = await request(app).get('/api/registro/plan');
    expect(buscarVocabularioProhibido(body)).toEqual([]);
  });

  test('es de solo lectura', async () => {
    const res = await request(app).post('/api/registro/plan').send({});
    expect(res.status).toBe(404);
  });
});
