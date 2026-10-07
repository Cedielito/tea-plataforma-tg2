'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { crearAppDePrueba } = require('./ayudas/administrador');
const { MensajeContacto } = require('../src/datos/modelos');
const mensajesContacto = require('../src/datos/repositorios/mensajesContacto');
const { MENSAJES } = require('../src/dominio/contacto');
const { crearServidor } = require('../src/api/servidor');

/**
 * POST /api/contacto: formulario de contacto. M-06, RF-08, RS-02, RS-03
 *
 * Las peticiones llegan como en produccion: con X-Forwarded-For de dos
 * saltos (la IP que escribe Vercel y la que agrega el balanceador de Render).
 */

beforeAll(async () => {
  await levantar();
  await MensajeContacto.init();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await limpiar();
});
afterAll(bajar);

const IP = '203.0.113.7';
const OTRA_IP = '198.51.100.23';
const PROXY_RENDER = '10.0.4.12';
const CORREO = 'familia+tea@correo.com';
const MENSAJE = '¿A quién consulto primero si mi hijo de 5 años no habla?';

const cuerpo = (cambios = {}) => ({
  correo: CORREO,
  mensaje: MENSAJE,
  autorizacion: true,
  versionPolitica: '1.0',
  ...cambios
});

let app;
let reloj;
let registro;
beforeEach(() => {
  ({ app, reloj, registro } = crearAppDePrueba());
});

const enviar = (datos = cuerpo(), ip = IP) =>
  request(app).post('/api/contacto').set('X-Forwarded-For', `${ip}, ${PROXY_RENDER}`).send(datos);

describe('RS-02 RF-08 envio del formulario de contacto', () => {
  test('guarda solo correo, mensaje, fecha y version de la politica', async () => {
    const res = await enviar();

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ recibido: true });
    const guardados = await MensajeContacto.find().lean();
    expect(guardados).toHaveLength(1);
    expect(Object.keys(guardados[0]).sort()).toEqual(['_id', 'correo', 'fecha', 'mensaje', 'versionPolitica']);
    expect(guardados[0]).toMatchObject({ correo: CORREO, mensaje: MENSAJE, fecha: reloj.ahora, versionPolitica: '1.0' });
  });

  test('sin la casilla de autorizacion no se envia ni se guarda', async () => {
    for (const autorizacion of [false, 'true', undefined]) {
      const res = await enviar(cuerpo({ autorizacion }));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MENSAJES.REVISA_CAMPOS, campos: { autorizacion: MENSAJES.SIN_AUTORIZACION } });
    }
    expect(await MensajeContacto.countDocuments()).toBe(0);
  });

  test('rechaza datos de mas, como un nombre, y no guarda nada', async () => {
    const res = await enviar(cuerpo({ nombre: 'Ana Pérez' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(MENSAJES.SOLO_CAMPOS);
    expect(await MensajeContacto.countDocuments()).toBe(0);
  });

  test('un correo invalido se rechaza con su mensaje', async () => {
    const res = await enviar(cuerpo({ correo: 'a@correo.com?bcc=otro@correo.com' }));
    expect(res.status).toBe(400);
    expect(res.body.campos).toEqual({ correo: MENSAJES.CORREO_INVALIDO });
  });

  test('la respuesta no se guarda en cache', async () => {
    expect((await enviar()).headers['cache-control']).toBe('no-store');
  });
});

describe('RS-03 la version guardada es la de la politica vigente', () => {
  test('si la politica cambio, responde 409 con la version vigente y no guarda nada', async () => {
    const res = await enviar(cuerpo({ versionPolitica: '0.9' }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: MENSAJES.POLITICA_CAMBIO, version: '1.0' });
    expect(await MensajeContacto.countDocuments()).toBe(0);
  });

  test('sin la politica cargada, el formulario no recibe mensajes', async () => {
    const sinPolitica = { obtener: async () => null, politica: async () => null };
    const res = await request(crearServidor({ paginas: sinPolitica })).post('/api/contacto').send(cuerpo());
    expect(res.status).toBe(503);
    expect(res.body.error).toBe(MENSAJES.SIN_POLITICA);
    expect(await MensajeContacto.countDocuments()).toBe(0);
  });
});

describe('RS-02 limite de envios por IP y en total', () => {
  test('5 envios por IP cada 15 minutos; el sexto responde 429 con Retry-After', async () => {
    for (let i = 0; i < 5; i += 1) expect((await enviar()).status).toBe(201);

    const res = await enviar();
    expect(res.status).toBe(429);
    expect(res.body.error).toBe(MENSAJES.DEMASIADOS_POR_IP);
    expect(res.headers['retry-after']).toBe('900');
    expect(await MensajeContacto.countDocuments()).toBe(5);

    reloj.avanzar(15);
    expect((await enviar()).status).toBe(201);
  });

  test('cada IP tiene su propio cupo', async () => {
    for (let i = 0; i < 5; i += 1) await enviar();
    expect((await enviar()).status).toBe(429);
    expect((await enviar(cuerpo(), OTRA_IP)).status).toBe(201);
  });

  test('una IP agregada por el visitante a la izquierda de X-Forwarded-For no cambia la clave', async () => {
    for (let i = 0; i < 5; i += 1) await enviar(cuerpo(), `192.0.2.${i}, ${IP}`);
    expect((await enviar(cuerpo(), `192.0.2.99, ${IP}`)).status).toBe(429);
  });

  test('los envios rechazados por errores no cuentan', async () => {
    for (let i = 0; i < 8; i += 1) await enviar(cuerpo({ autorizacion: false }));
    for (let i = 0; i < 5; i += 1) expect((await enviar()).status).toBe(201);
  });

  test('como maximo 40 envios por hora en total, desde cualquier IP', async () => {
    for (let i = 0; i < 40; i += 1) expect((await enviar(cuerpo(), `198.51.100.${i}`)).status).toBe(201);

    const res = await enviar(cuerpo(), '192.0.2.200');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe(MENSAJES.DEMASIADOS_EN_TOTAL);

    reloj.avanzar(60);
    expect((await enviar(cuerpo(), '192.0.2.200')).status).toBe(201);
  });
});

describe('RS-02 ni la IP, ni el correo, ni el mensaje se escriben en el registro', () => {
  const METODOS = ['log', 'info', 'warn', 'error', 'debug'];

  function espiarConsola() {
    const lineas = [];
    for (const metodo of METODOS) {
      jest.spyOn(console, metodo).mockImplementation((...partes) => lineas.push(partes.map(String).join(' ')));
    }
    return lineas;
  }

  const contieneDatos = (texto) => [IP, CORREO, MENSAJE].some((dato) => texto.includes(dato));

  test('ni al guardar, ni al rechazar, ni al limitar', async () => {
    const lineas = espiarConsola();

    for (let i = 0; i < 6; i += 1) await enviar();
    await enviar(cuerpo({ autorizacion: false }));
    await enviar(cuerpo({ versionPolitica: '0.9' }));
    await enviar(cuerpo({ nombre: 'Ana' }));

    expect(lineas.filter(contieneDatos)).toEqual([]);
    expect(registro.lineas.filter(contieneDatos)).toEqual([]);
    const guardado = JSON.stringify(await MensajeContacto.find().lean());
    expect(guardado).not.toContain(IP);
    expect(guardado).not.toContain(PROXY_RENDER);
  });

  test('ni siquiera cuando guardar falla con un error que los incluye', async () => {
    const lineas = espiarConsola();
    jest
      .spyOn(mensajesContacto, 'crear')
      .mockRejectedValue(new Error(`No se pudo guardar ${CORREO} desde ${IP}: ${MENSAJE}`));

    const res = await enviar();

    expect(res.status).toBe(500);
    expect(contieneDatos(JSON.stringify(res.body))).toBe(false);
    expect(lineas.filter(contieneDatos)).toEqual([]);
    expect(registro.lineas.filter(contieneDatos)).toEqual([]);
  });
});
