'use strict';
const request = require('supertest');
const { crearServidor, manejarError } = require('../src/api/servidor');

describe('Servidor base de la Fase I', () => {
  const app = crearServidor();

  test('GET /salud responde ok', async () => {
    const res = await request(app).get('/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok' });
  });

  test('GET /api/salud responde ok (ruta usada por el proxy de Vite y el despliegue)', async () => {
    const res = await request(app).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok' });
  });

  test('una ruta /api inexistente responde 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('no anuncia la tecnologia del servidor', async () => {
    const res = await request(app).get('/salud');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('un JSON mal formado responde 400 y no 500', async () => {
    const res = await request(app)
      .post('/api/salud')
      .set('Content-Type', 'application/json')
      .send('{"mal": ');
    expect(res.status).toBe(400);
  });
});

describe('manejarError', () => {
  function respuestaFalsa() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  }

  test('un error del cliente conserva su codigo y su mensaje', () => {
    const res = respuestaFalsa();
    const err = Object.assign(new Error('Falta la fuente'), { status: 422 });
    manejarError(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Falta la fuente' });
  });

  test('un error inesperado responde 500 sin exponer el mensaje interno', () => {
    const res = respuestaFalsa();
    manejarError(new Error('cadena de conexion secreta'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });

  test('un status fuera del rango 4xx se trata como error interno', () => {
    const res = respuestaFalsa();
    manejarError(Object.assign(new Error('x'), { status: 503 }), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
