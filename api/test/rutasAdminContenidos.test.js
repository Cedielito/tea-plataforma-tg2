'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { crearAdministrador, crearAppDePrueba, iniciarSesion } = require('./ayudas/administrador');
const { Administrador, Contenido } = require('../src/datos/modelos');
const repoContenidos = require('../src/datos/repositorios/contenidos');
const { MENSAJES } = require('../src/dominio/publicacion');
const { MENSAJES: MENSAJES_EDICION } = require('../src/dominio/edicionContenido');
const { MENSAJES: MENSAJES_GUARDADO } = require('../src/api/erroresDeGuardado');

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), Contenido.init()]);
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
const crear = (cuerpo) => agente.post('/api/admin/contenidos').send(cuerpo);
const editar = (id, cambios) => agente.patch(`/api/admin/contenidos/${id}`).send(cambios);

describe('RF-10 lista y lectura de contenidos en el panel', () => {
  test('la lista incluye publicados y borradores, con su estado y en el orden del sitio', async () => {
    await repoContenidos.crear(datos.contenido({ titulo: 'Mitos', seccion: 'S3' }));
    await repoContenidos.crear(datos.contenido({ titulo: 'En borrador', seccion: 'S1', ...borrador }));
    const res = await agente.get('/api/admin/contenidos');
    expect(res.status).toBe(200);
    expect(res.body.map(({ titulo, estado }) => [titulo, estado])).toEqual([
      ['En borrador', 'borrador'],
      ['Mitos', 'publicado']
    ]);
    expect(res.body[0]).toEqual({
      _id: expect.any(String),
      titulo: 'En borrador',
      slug: 'en-borrador',
      seccion: 'S1',
      tramoEdad: null,
      estado: 'borrador',
      fechaRevision: null,
      updatedAt: expect.any(String),
      archivo: null
    });
  });

  test('GET /contenidos/:id trae el cuerpo y las fuentes; si no existe, 404', async () => {
    const creado = await repoContenidos.crear(datos.contenido({ ...borrador }));
    const res = await agente.get(`/api/admin/contenidos/${creado._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ cuerpo: expect.any(String), fuentes: [], estado: 'borrador' });
    expect((await agente.get('/api/admin/contenidos/66f000000000000000000000')).status).toBe(404);
    expect((await agente.get('/api/admin/contenidos/no-es-un-id')).status).toBe(404);
  });

  test('marca con `archivo` los contenidos que vienen de api/contenidos', async () => {
    await repoContenidos.crear(datos.contenido({ slug: 'que-es-el-tea' }));
    await repoContenidos.crear(datos.contenido({ titulo: 'Nuevo del panel', seccion: 'S2', tramoEdad: '4-7' }));
    const res = await agente.get('/api/admin/contenidos');
    expect(res.body.map(({ slug, archivo }) => [slug, archivo])).toEqual([
      ['que-es-el-tea', 's1-que-es-el-tea.md'],
      ['nuevo-del-panel', null]
    ]);
  });
});

describe('RF-10 RCN-01 RCN-02 crear desde el panel', () => {
  test('crea un borrador sin fuentes ni fecha', async () => {
    const res = await crear({ titulo: 'Borrador nuevo', seccion: 'S2', tramoEdad: '8-12', cuerpo: 'Texto.', ...borrador });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slug: 'borrador-nuevo', estado: 'borrador', tramoEdad: '8-12', archivo: null });
    expect(await Contenido.countDocuments()).toBe(1);
  });

  test('crea y publica con fuente y fecha de revision', async () => {
    const res = await crear(datos.contenido());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      estado: 'publicado',
      fuentes: [datos.FUENTE],
      fechaRevision: `${datos.FECHA_REVISION}T00:00:00.000Z`
    });
    expect((await request(app).get(`/api/contenidos/${res.body.slug}`)).status).toBe(200);
  });

  test('RCN-01 no publica sin fuente: 422 con el mensaje en el campo fuentes', async () => {
    const res = await crear(datos.contenido({ fuentes: [] }));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: MENSAJES_GUARDADO.REVISA_CAMPOS, campos: { fuentes: MENSAJES.SIN_FUENTES } });
    expect(await Contenido.countDocuments()).toBe(0);
  });

  test('RCN-02 no publica sin fecha de revision: 422 con el mensaje en el campo', async () => {
    const res = await crear(datos.contenido({ fechaRevision: '' }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.SIN_FECHA });
  });

  test('RCN-01 y RCN-02 sin fuente ni fecha devuelve los dos mensajes, mas los de otros campos', async () => {
    const res = await crear({ estado: 'publicado', seccion: 'S1', cuerpo: '', fuentes: [], fechaRevision: '' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toMatchObject({
      fuentes: MENSAJES.SIN_FUENTES,
      fechaRevision: MENSAJES.SIN_FECHA,
      titulo: 'El título es obligatorio.',
      cuerpo: 'El cuerpo es obligatorio.'
    });
  });

  test('al publicar, los problemas de las fuentes llegan juntos en el campo fuentes', async () => {
    const res = await crear(datos.contenido({ fuentes: [{ texto: '', url: 'javascript:alert(1)' }] }));
    expect(res.status).toBe(422);
    expect(res.body.campos.fuentes).toBe(`${MENSAJES.FUENTE_SIN_TEXTO} ${MENSAJES.FUENTE_URL_INSEGURA}`);
  });

  test('en un borrador, el enlace inseguro de una fuente llega con la ruta de su campo', async () => {
    const res = await crear(datos.contenido({ estado: 'borrador', fuentes: [{ texto: 'OMS', url: 'javascript:x' }] }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ 'fuentes.0.url': MENSAJES.FUENTE_URL_INSEGURA });
  });

  test('una fecha que no es fecha responde 422 en espanol, no 500', async () => {
    const res = await crear(datos.contenido({ fechaRevision: 'ayer' }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.FECHA_INVALIDA });
  });

  test('una fecha de revision futura no se publica', async () => {
    const res = await crear(datos.contenido({ fechaRevision: datos.fechaFutura() }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.FECHA_FUTURA });
  });

  test('un slug repetido responde 409 con el mensaje en el campo slug', async () => {
    await crear(datos.contenido({ slug: 'mitos' }));
    const res = await crear(datos.contenido({ slug: 'mitos', titulo: 'Otro' }));
    expect(res.status).toBe(409);
    expect(res.body.campos).toEqual({ slug: MENSAJES_GUARDADO.SLUG_REPETIDO });
  });

  test('un objeto en lugar de texto responde 422 y no llega a la base', async () => {
    const res = await crear({ ...datos.contenido(), titulo: { $gt: '' } });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ titulo: MENSAJES_EDICION.VALOR_INVALIDO });
    expect(await Contenido.countDocuments()).toBe(0);
  });

  test('ignora los campos internos que no son del formulario', async () => {
    const res = await crear({ ...datos.contenido(), _id: '66f000000000000000000000', createdAt: '2000-01-01' });
    expect(res.status).toBe(201);
    expect(res.body._id).not.toBe('66f000000000000000000000');
  });
});

describe('RF-10 RCN-01 RCN-02 editar, publicar y despublicar', () => {
  test('edita un contenido publicado y sigue publicado', async () => {
    const { body } = await crear(datos.contenido());
    const res = await editar(body._id, { titulo: 'Título corregido' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ titulo: 'Título corregido', estado: 'publicado' });
  });

  test('RCN-01 publicar un borrador sin fuente se rechaza y el borrador queda igual', async () => {
    const { body } = await crear(datos.contenido(borrador));
    const res = await editar(body._id, { estado: 'publicado', fechaRevision: datos.FECHA_REVISION });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fuentes: MENSAJES.SIN_FUENTES });
    expect((await Contenido.findById(body._id).lean()).estado).toBe('borrador');
  });

  test('RCN-02 publicar un borrador sin fecha se rechaza', async () => {
    const { body } = await crear(datos.contenido(borrador));
    const res = await editar(body._id, { estado: 'publicado', fuentes: [datos.FUENTE] });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.SIN_FECHA });
  });

  test('completar fuente y fecha publica el borrador; despublicar lo saca del sitio', async () => {
    const { body } = await crear(datos.contenido({ slug: 'derechos', ...borrador }));
    const publicado = await editar(body._id, {
      estado: 'publicado',
      fuentes: [datos.FUENTE],
      fechaRevision: datos.FECHA_REVISION
    });
    expect(publicado.status).toBe(200);
    expect(publicado.body.estado).toBe('publicado');
    expect((await request(app).get('/api/contenidos/derechos')).status).toBe(200);

    const despublicado = await editar(body._id, { estado: 'borrador' });
    expect(despublicado.status).toBe(200);
    expect(despublicado.body.estado).toBe('borrador');
    expect((await request(app).get('/api/contenidos/derechos')).status).toBe(404);
  });

  test('quitar las fuentes de un contenido publicado se rechaza', async () => {
    const { body } = await crear(datos.contenido());
    const res = await editar(body._id, { fuentes: [] });
    expect(res.status).toBe(422);
    expect((await Contenido.findById(body._id).lean()).fuentes).toHaveLength(1);
  });

  test('un id que no existe o no es valido responde 404', async () => {
    expect((await editar('66f000000000000000000000', { titulo: 'x' })).status).toBe(404);
    expect((await editar('no-es-un-id', { titulo: 'x' })).status).toBe(404);
  });

  test('un slug vacio se vuelve a generar a partir del titulo', async () => {
    const { body } = await crear(datos.contenido({ slug: 'provisional' }));
    const res = await editar(body._id, { slug: '', titulo: 'Nombre definitivo' });
    expect(res.body.slug).toBe('nombre-definitivo');
  });
});

describe('RF-10 contenidos que vienen de api/contenidos', () => {
  let id;
  beforeEach(async () => {
    id = (await repoContenidos.crear(datos.contenido({ slug: 'que-es-el-tea' })))._id;
  });

  test('se pueden editar y despublicar, y llevan el nombre del archivo', async () => {
    const res = await editar(id, { titulo: 'Corregido', slug: 'que-es-el-tea', estado: 'borrador' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ titulo: 'Corregido', estado: 'borrador', archivo: 's1-que-es-el-tea.md' });
  });

  test('su slug no se puede cambiar', async () => {
    const res = await editar(id, { slug: 'otro-slug' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ slug: MENSAJES_EDICION.SLUG_DE_ARCHIVO('s1-que-es-el-tea.md') });
    expect((await Contenido.findById(id).lean()).slug).toBe('que-es-el-tea');
  });
});
