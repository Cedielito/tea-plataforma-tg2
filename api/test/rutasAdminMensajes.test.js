'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { crearAdministrador, crearAppDePrueba, iniciarSesion } = require('./ayudas/administrador');
const { Administrador, MensajeContacto } = require('../src/datos/modelos');
const mensajesContacto = require('../src/datos/repositorios/mensajesContacto');

/** Bandeja de mensajes en el panel (/api/admin/mensajes). M-06, M-08, RF-11, RS-04, RS-05 */

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), MensajeContacto.init()]);
});
afterEach(limpiar);
afterAll(bajar);

let app;
let agente;
beforeEach(async () => {
  ({ app } = crearAppDePrueba());
  agente = request.agent(app);
  await crearAdministrador();
  await iniciarSesion(agente);
});

const mensaje = (cambios = {}) => ({
  correo: 'familia@correo.com',
  mensaje: 'Hola.',
  fecha: new Date('2026-10-01T15:00:00Z'),
  versionPolitica: '1.0',
  ...cambios
});

describe('RS-05 la bandeja exige sesion', () => {
  test('sin sesion responde 401 y no lista ni elimina', async () => {
    const { _id } = await mensajesContacto.crear(mensaje());
    expect((await request(app).get('/api/admin/mensajes')).status).toBe(401);
    expect((await request(app).delete(`/api/admin/mensajes/${_id}`)).status).toBe(401);
    expect(await MensajeContacto.countDocuments()).toBe(1);
  });
});

describe('RF-11 bandeja de mensajes', () => {
  test('lista los mensajes del mas reciente al mas antiguo, con la fecha de supresion', async () => {
    await mensajesContacto.crear(mensaje({ mensaje: 'primero', fecha: new Date('2026-09-01T12:00:00Z') }));
    await mensajesContacto.crear(mensaje({ mensaje: '<b>segundo</b>', fecha: new Date('2026-10-01T12:00:00Z') }));

    const res = await agente.get('/api/admin/mensajes');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual([
      {
        _id: expect.any(String),
        correo: 'familia@correo.com',
        mensaje: '<b>segundo</b>',
        fecha: '2026-10-01T12:00:00.000Z',
        versionPolitica: '1.0',
        fechaSupresion: '2027-03-30T12:00:00.000Z'
      },
      expect.objectContaining({ mensaje: 'primero', fechaSupresion: '2027-02-28T12:00:00.000Z' })
    ]);
  });

  test('sin mensajes, la lista esta vacia', async () => {
    expect((await agente.get('/api/admin/mensajes')).body).toEqual([]);
  });
});

describe('RS-04 eliminar un mensaje', () => {
  test('lo borra de la base y responde 204', async () => {
    const { _id } = await mensajesContacto.crear(mensaje());
    const otro = await mensajesContacto.crear(mensaje({ mensaje: 'otro' }));

    const res = await agente.delete(`/api/admin/mensajes/${_id}`);

    expect(res.status).toBe(204);
    expect(await MensajeContacto.findById(_id)).toBeNull();
    expect(await MensajeContacto.findById(otro._id)).not.toBeNull();
  });

  test('un mensaje que no existe, o un id invalido, responde 404', async () => {
    const { _id } = await mensajesContacto.crear(mensaje());
    await agente.delete(`/api/admin/mensajes/${_id}`);
    expect((await agente.delete(`/api/admin/mensajes/${_id}`)).status).toBe(404);
    expect((await agente.delete('/api/admin/mensajes/no-es-un-id')).status).toBe(404);
  });
});
