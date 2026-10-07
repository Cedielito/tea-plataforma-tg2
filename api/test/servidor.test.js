'use strict';
const request = require('supertest');
const { crearServidor, manejarError, leerSaltosProxy, SALTOS_PROXY_POR_DEFECTO } = require('../src/api/servidor');

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

describe('RS-02 IP de quien consulta detras de Vercel y Render', () => {
  test('SALTOS_PROXY acepta un entero de 0 a 10; si no, usa 2', () => {
    expect(SALTOS_PROXY_POR_DEFECTO).toBe(2);
    expect(leerSaltosProxy('3')).toBe(3);
    expect(leerSaltosProxy('0')).toBe(0);
    for (const valor of [undefined, '', ' ', 'dos', '1.5', '-1', '11']) expect(leerSaltosProxy(valor)).toBe(2);
  });

  test('con 2 saltos, req.ip es la direccion que escribio Vercel, contando desde la derecha', () => {
    const app = crearServidor();
    const confiar = app.get('trust proxy fn');
    // La conexion llega del balanceador de Render (salto 0); la ultima de
    // X-Forwarded-For es la de Vercel (salto 1); la anterior, la del visitante.
    expect(confiar('10.0.0.1', 0)).toBe(true);
    expect(confiar('76.76.21.1', 1)).toBe(true);
    expect(confiar('203.0.113.7', 2)).toBe(false);
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
