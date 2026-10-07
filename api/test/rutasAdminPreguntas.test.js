'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { crearAdministrador, crearAppDePrueba, iniciarSesion } = require('./ayudas/administrador');
const { Administrador, PreguntaFrecuente } = require('../src/datos/modelos');
const repoPreguntas = require('../src/datos/repositorios/preguntas');
const { MENSAJES } = require('../src/dominio/publicacion');
const { MENSAJES: MENSAJES_EDICION } = require('../src/dominio/edicionPregunta');
const { MENSAJES: MENSAJES_GUARDADO } = require('../src/api/erroresDeGuardado');

/**
 * Preguntas frecuentes en el panel (/api/admin/preguntas). M-05, M-08,
 * RF-07, RF-10, RS-05, RCN-01, RCN-02
 */

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), PreguntaFrecuente.init()]);
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

const borrador = { estado: 'borrador', fuentes: [], fechaRevision: null };
const crear = (cuerpo) => agente.post('/api/admin/preguntas').send(cuerpo);
const editar = (id, cambios) => agente.patch(`/api/admin/preguntas/${id}`).send(cambios);
const publicas = async () => (await request(app).get('/api/preguntas')).body.map((p) => p.slug);

describe('RS-05 las preguntas frecuentes en el panel exigen sesion', () => {
  test('sin sesion responde 401 y no crea ni lista nada', async () => {
    expect((await request(app).post('/api/admin/preguntas').send(datos.pregunta())).status).toBe(401);
    expect((await request(app).get('/api/admin/preguntas')).status).toBe(401);
    expect(await PreguntaFrecuente.countDocuments()).toBe(0);
  });
});

describe('RF-10 lista y lectura de preguntas frecuentes en el panel', () => {
  test('la lista incluye publicadas y borradores, por orden y con su estado', async () => {
    await repoPreguntas.crear(datos.pregunta({ pregunta: '¿Segunda?', orden: 20 }));
    await repoPreguntas.crear(datos.pregunta({ pregunta: '¿Primera?', orden: 10, ...borrador }));

    const res = await agente.get('/api/admin/preguntas');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        _id: expect.any(String),
        slug: 'primera',
        pregunta: '¿Primera?',
        orden: 10,
        estado: 'borrador',
        fechaRevision: null,
        updatedAt: expect.any(String),
        archivo: null
      },
      expect.objectContaining({ slug: 'segunda', estado: 'publicado' })
    ]);
  });

  test('GET /preguntas/:id trae la respuesta y las fuentes; si no existe, 404', async () => {
    const creada = await repoPreguntas.crear(datos.pregunta());
    const res = await agente.get(`/api/admin/preguntas/${creada._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ respuesta: expect.any(String), fuentes: [datos.FUENTE] });
    const noExiste = await agente.get('/api/admin/preguntas/66f000000000000000000000');
    expect(noExiste.status).toBe(404);
    expect(noExiste.body.error).toBe('Pregunta no encontrada.');
  });

  test('marca con `archivo` las preguntas que vienen de preguntas/preguntas.yaml', async () => {
    await repoPreguntas.crear(datos.pregunta({ slug: 'a-quien-consultar-primero', orden: 10 }));
    await repoPreguntas.crear(datos.pregunta({ pregunta: '¿Nueva del panel?', orden: 20 }));
    const res = await agente.get('/api/admin/preguntas');
    expect(res.body.map(({ slug, archivo }) => [slug, archivo])).toEqual([
      ['a-quien-consultar-primero', 'preguntas/preguntas.yaml'],
      ['nueva-del-panel', null]
    ]);
  });
});

describe('RF-10 RCN-01 RCN-02 crear preguntas frecuentes desde el panel', () => {
  test('crea un borrador sin fuentes ni fecha, que no aparece en el sitio', async () => {
    const res = await crear(datos.pregunta({ pregunta: '¿Borrador?', ...borrador }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slug: 'borrador', estado: 'borrador', archivo: null });
    expect(await publicas()).toEqual([]);
  });

  test('crea una pregunta publicada con fuente y fecha, que aparece en el sitio', async () => {
    const res = await crear(datos.pregunta({ slug: 'sin-eps' }));
    expect(res.status).toBe(201);
    expect(await publicas()).toEqual(['sin-eps']);
  });

  test('RCN-01 no publica una pregunta sin fuente', async () => {
    const res = await crear(datos.pregunta({ fuentes: [] }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fuentes: MENSAJES.SIN_FUENTES });
    expect(await PreguntaFrecuente.countDocuments()).toBe(0);
  });

  test('RCN-02 no publica una pregunta sin fecha de revision', async () => {
    const res = await crear(datos.pregunta({ fechaRevision: '' }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.SIN_FECHA });
  });

  test('sin orden responde que es obligatorio', async () => {
    const res = await crear(datos.pregunta({ orden: null }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ orden: 'El orden es obligatorio.' });
  });

  test('datos con un tipo equivocado responden 422 sin llegar al modelo', async () => {
    const res = await crear(datos.pregunta({ pregunta: { $gt: '' }, orden: '10' }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ pregunta: MENSAJES_EDICION.VALOR_INVALIDO, orden: MENSAJES_EDICION.ORDEN_INVALIDO });
  });

  test('un slug repetido responde 409', async () => {
    await crear(datos.pregunta({ slug: 'sin-eps' }));
    const res = await crear(datos.pregunta({ slug: 'sin-eps', pregunta: '¿Otra?' }));
    expect(res.status).toBe(409);
    expect(res.body.campos).toEqual({ slug: MENSAJES_GUARDADO.SLUG_REPETIDO_PREGUNTA });
  });
});

describe('RF-10 RCN-01 editar, publicar y despublicar preguntas frecuentes', () => {
  test('RCN-01 publicar un borrador sin fuente se rechaza y el borrador queda igual', async () => {
    const { _id } = await repoPreguntas.crear(datos.pregunta({ ...borrador }));
    const res = await editar(_id, { estado: 'publicado', fechaRevision: datos.FECHA_REVISION });
    expect(res.status).toBe(422);
    expect(res.body.campos.fuentes).toBe(MENSAJES.SIN_FUENTES);
    expect((await PreguntaFrecuente.findById(_id).lean()).estado).toBe('borrador');
  });

  test('completar fuente y fecha la publica; despublicar la saca del sitio', async () => {
    const { _id } = await repoPreguntas.crear(datos.pregunta({ slug: 'sin-eps', ...borrador }));
    const publicada = await editar(_id, { estado: 'publicado', fuentes: [datos.FUENTE], fechaRevision: datos.FECHA_REVISION });
    expect(publicada.status).toBe(200);
    expect(await publicas()).toEqual(['sin-eps']);

    expect((await editar(_id, { estado: 'borrador' })).body.estado).toBe('borrador');
    expect(await publicas()).toEqual([]);
  });

  test('un id que no existe o no es valido responde 404', async () => {
    expect((await editar('66f000000000000000000000', { orden: 1 })).status).toBe(404);
    expect((await editar('no-es-un-id', { orden: 1 })).status).toBe(404);
  });
});

describe('RF-10 preguntas que vienen de preguntas/preguntas.yaml', () => {
  let id;
  beforeEach(async () => {
    id = (await repoPreguntas.crear(datos.pregunta({ slug: 'a-quien-consultar-primero' })))._id;
  });

  test('se pueden editar y despublicar, y llevan el nombre del archivo', async () => {
    const res = await editar(id, { respuesta: 'Corregida.', slug: 'a-quien-consultar-primero', estado: 'borrador' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ respuesta: 'Corregida.', estado: 'borrador', archivo: 'preguntas/preguntas.yaml' });
  });

  test('su slug no se puede cambiar', async () => {
    const res = await editar(id, { slug: 'otro-slug' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ slug: MENSAJES_EDICION.SLUG_DE_ARCHIVO('preguntas/preguntas.yaml') });
    expect((await PreguntaFrecuente.findById(id).lean()).slug).toBe('a-quien-consultar-primero');
  });
});
