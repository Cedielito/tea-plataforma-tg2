'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { crearAdministrador, crearAppDePrueba, iniciarSesion } = require('./ayudas/administrador');
const { Administrador, Recurso } = require('../src/datos/modelos');
const repoRecursos = require('../src/datos/repositorios/recursos');
const { MENSAJES } = require('../src/dominio/publicacion');
const { MENSAJES: MENSAJES_EDICION } = require('../src/dominio/edicionRecurso');
const { MENSAJES: MENSAJES_GUARDADO } = require('../src/api/erroresDeGuardado');

/**
 * Recursos en el panel (/api/admin/recursos). M-05, M-08, RF-06, RF-10,
 * RS-05, RCN-01, RCN-02
 */

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), Recurso.init()]);
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
const crear = (cuerpo) => agente.post('/api/admin/recursos').send(cuerpo);
const editar = (id, cambios) => agente.patch(`/api/admin/recursos/${id}`).send(cambios);
const publicos = async () => (await request(app).get('/api/recursos')).body.map((r) => r.slug);

describe('RS-05 los recursos en el panel exigen sesion', () => {
  test('sin sesion responde 401 y no crea ni lista nada', async () => {
    expect((await request(app).post('/api/admin/recursos').send(datos.recurso())).status).toBe(401);
    expect((await request(app).get('/api/admin/recursos')).status).toBe(401);
    expect(await Recurso.countDocuments()).toBe(0);
  });
});

describe('RF-10 lista y lectura de recursos en el panel', () => {
  test('la lista incluye publicados y borradores, en orden de creacion y con su estado', async () => {
    await repoRecursos.crear(datos.recurso({ titulo: 'Primero', ...borrador }));
    await repoRecursos.crear(datos.recurso({ titulo: 'Segundo' }));

    const res = await agente.get('/api/admin/recursos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        _id: expect.any(String),
        slug: 'primero',
        titulo: 'Primero',
        tipo: 'enlace',
        perfiles: ['docente'],
        estado: 'borrador',
        fechaRevision: null,
        updatedAt: expect.any(String),
        archivo: null
      },
      expect.objectContaining({ slug: 'segundo', estado: 'publicado' })
    ]);
  });

  test('GET /recursos/:id trae la descripcion, el enlace y las fuentes; si no existe, 404', async () => {
    const creado = await repoRecursos.crear(datos.recurso());
    const res = await agente.get(`/api/admin/recursos/${creado._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      descripcion: expect.any(String),
      url: 'https://www.mineducacion.gov.co/',
      fuentes: [datos.FUENTE]
    });
    const noExiste = await agente.get('/api/admin/recursos/66f000000000000000000000');
    expect(noExiste.status).toBe(404);
    expect(noExiste.body.error).toBe('Recurso no encontrado.');
  });

  test('marca con `archivo` los recursos que vienen de recursos/recursos.yaml', async () => {
    await repoRecursos.crear(datos.recurso({ slug: 'decreto-1421' }));
    await repoRecursos.crear(datos.recurso({ titulo: 'Nuevo del panel' }));
    const res = await agente.get('/api/admin/recursos');
    expect(res.body.map(({ slug, archivo }) => [slug, archivo])).toEqual([
      ['decreto-1421', 'recursos/recursos.yaml'],
      ['nuevo-del-panel', null]
    ]);
  });
});

describe('RF-10 RCN-01 RCN-02 crear recursos desde el panel', () => {
  test('crea un borrador sin fuentes ni fecha, que no aparece en el sitio', async () => {
    const res = await crear(datos.recurso({ titulo: 'Guía', ...borrador }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slug: 'guia', estado: 'borrador', archivo: null });
    expect(await publicos()).toEqual([]);
  });

  test('crea un recurso publicado con fuente y fecha, que aparece en el sitio', async () => {
    const res = await crear(datos.recurso({ slug: 'guia-docentes', perfiles: ['docente', 'familia', 'docente'] }));
    expect(res.status).toBe(201);
    expect(res.body.perfiles).toEqual(['docente', 'familia']);
    expect(await publicos()).toEqual(['guia-docentes']);
  });

  test('RCN-01 no publica un recurso sin fuente', async () => {
    const res = await crear(datos.recurso({ fuentes: [] }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fuentes: MENSAJES.SIN_FUENTES });
    expect(await Recurso.countDocuments()).toBe(0);
  });

  test('RCN-02 no publica un recurso sin fecha de revision', async () => {
    const res = await crear(datos.recurso({ fechaRevision: null }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.SIN_FECHA });
  });

  test('un tipo, un enlace o perfiles que no sirven responden 422 con un mensaje por campo', async () => {
    const res = await crear(datos.recurso({ tipo: 'video', url: 'javascript:alert(1)', perfiles: [] }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.campos).sort()).toEqual(['perfiles', 'tipo', 'url']);
  });

  test('datos con un tipo equivocado responden 422 sin llegar al modelo', async () => {
    const res = await crear(datos.recurso({ url: { $gt: '' }, perfiles: 'docente' }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ url: MENSAJES_EDICION.VALOR_INVALIDO, perfiles: MENSAJES_EDICION.LISTA_INVALIDA });
  });

  test('un slug repetido responde 409', async () => {
    await crear(datos.recurso({ slug: 'guia' }));
    const res = await crear(datos.recurso({ slug: 'guia', titulo: 'Otra' }));
    expect(res.status).toBe(409);
    expect(res.body.campos).toEqual({ slug: MENSAJES_GUARDADO.SLUG_REPETIDO_RECURSO });
  });
});

describe('RF-10 RCN-02 editar, publicar y despublicar recursos', () => {
  test('RCN-02 publicar un borrador sin fecha se rechaza y el borrador queda igual', async () => {
    const { _id } = await repoRecursos.crear(datos.recurso({ ...borrador }));
    const res = await editar(_id, { estado: 'publicado', fuentes: [datos.FUENTE] });
    expect(res.status).toBe(422);
    expect(res.body.campos.fechaRevision).toBe(MENSAJES.SIN_FECHA);
    expect((await Recurso.findById(_id).lean()).estado).toBe('borrador');
  });

  test('completar fuente y fecha lo publica; despublicar lo saca del sitio', async () => {
    const { _id } = await repoRecursos.crear(datos.recurso({ slug: 'guia', ...borrador }));
    const publicado = await editar(_id, { estado: 'publicado', fuentes: [datos.FUENTE], fechaRevision: datos.FECHA_REVISION });
    expect(publicado.status).toBe(200);
    expect(await publicos()).toEqual(['guia']);

    expect((await editar(_id, { estado: 'borrador' })).body.estado).toBe('borrador');
    expect(await publicos()).toEqual([]);
  });

  test('un id que no existe o no es valido responde 404', async () => {
    expect((await editar('66f000000000000000000000', { titulo: 'x' })).status).toBe(404);
    expect((await editar('no-es-un-id', { titulo: 'x' })).status).toBe(404);
  });
});

describe('RF-10 recursos que vienen de recursos/recursos.yaml', () => {
  let id;
  beforeEach(async () => {
    id = (await repoRecursos.crear(datos.recurso({ slug: 'decreto-1421' })))._id;
  });

  test('se pueden editar y despublicar, y llevan el nombre del archivo', async () => {
    const res = await editar(id, { titulo: 'Corregido', slug: 'decreto-1421', estado: 'borrador' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ titulo: 'Corregido', estado: 'borrador', archivo: 'recursos/recursos.yaml' });
  });

  test('su slug no se puede cambiar', async () => {
    const res = await editar(id, { slug: 'otro-slug' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ slug: MENSAJES_EDICION.SLUG_DE_ARCHIVO('recursos/recursos.yaml') });
    expect((await Recurso.findById(id).lean()).slug).toBe('decreto-1421');
  });
});
