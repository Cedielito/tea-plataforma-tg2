'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { crearAdministrador, crearAppDePrueba, iniciarSesion } = require('./ayudas/administrador');
const { Administrador, PasoRuta } = require('../src/datos/modelos');
const repoPasosRuta = require('../src/datos/repositorios/pasosRuta');
const { MENSAJES } = require('../src/dominio/publicacion');
const { LISTAS } = require('../src/dominio/pasosRuta');
const { MENSAJES: MENSAJES_EDICION } = require('../src/dominio/edicionPasoRuta');
const { MENSAJES: MENSAJES_GUARDADO } = require('../src/api/erroresDeGuardado');

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), PasoRuta.init()]);
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
const crear = (cuerpo) => agente.post('/api/admin/pasos-ruta').send(cuerpo);
const editar = (id, cambios) => agente.patch(`/api/admin/pasos-ruta/${id}`).send(cambios);
const publicos = async () => (await request(app).get('/api/pasos-ruta')).body.map((paso) => paso.slug);

describe('RS-05 los pasos de la ruta en el panel exigen sesion', () => {
  test('sin sesion responde 401 y no crea nada', async () => {
    const res = await request(app).post('/api/admin/pasos-ruta').send(datos.pasoRuta());
    expect(res.status).toBe(401);
    expect(await PasoRuta.countDocuments()).toBe(0);
  });
});

describe('RF-10 lista y lectura de pasos de la ruta en el panel', () => {
  test('la lista incluye publicados y borradores, por orden y con su estado', async () => {
    await repoPasosRuta.crear(datos.pasoRuta({ titulo: 'Segundo', orden: 20 }));
    await repoPasosRuta.crear(datos.pasoRuta({ titulo: 'Primero', orden: 10, ...borrador }));

    const res = await agente.get('/api/admin/pasos-ruta');

    expect(res.status).toBe(200);
    expect(res.body.map(({ titulo, estado }) => [titulo, estado])).toEqual([
      ['Primero', 'borrador'],
      ['Segundo', 'publicado']
    ]);
    expect(res.body[0]).toEqual({
      _id: expect.any(String),
      slug: 'primero',
      titulo: 'Primero',
      perfiles: ['familia'],
      tramos: ['4-7', '8-12', '13-17'],
      regimenes: ['contributivo', 'subsidiado', 'sin-afiliacion'],
      orden: 10,
      estado: 'borrador',
      fechaRevision: null,
      updatedAt: expect.any(String),
      archivo: null
    });
  });

  test('GET /pasos-ruta/:id trae el texto, los tipos de entidad y las fuentes; si no existe, 404', async () => {
    const creado = await repoPasosRuta.crear(datos.pasoRuta());
    const res = await agente.get(`/api/admin/pasos-ruta/${creado._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ texto: expect.any(String), tiposEntidad: ['salud'], fuentes: [datos.FUENTE] });
    expect((await agente.get('/api/admin/pasos-ruta/66f000000000000000000000')).status).toBe(404);
    expect((await agente.get('/api/admin/pasos-ruta/no-es-un-id')).status).toBe(404);
  });

  test('marca con `archivo` los pasos que vienen de ruta/pasos.yaml', async () => {
    await repoPasosRuta.crear(datos.pasoRuta({ slug: 'familia-cita-eps' }));
    await repoPasosRuta.crear(datos.pasoRuta({ titulo: 'Nuevo del panel' }));
    const res = await agente.get('/api/admin/pasos-ruta');
    expect(res.body.map(({ slug, archivo }) => [slug, archivo])).toEqual([
      ['familia-cita-eps', 'ruta/pasos.yaml'],
      ['nuevo-del-panel', null]
    ]);
  });
});

describe('RF-10 RCN-01 RCN-02 crear pasos de la ruta desde el panel', () => {
  test('crea un borrador sin fuentes ni fecha, que no aparece en la guia', async () => {
    const res = await crear(datos.pasoRuta({ titulo: 'Paso nuevo', ...borrador }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slug: 'paso-nuevo', estado: 'borrador', archivo: null });
    expect(await publicos()).toEqual([]);
  });

  test('crea un paso publicado con fuente y fecha, que aparece en la guia', async () => {
    const res = await crear(datos.pasoRuta({ slug: 'paso-publicado' }));
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('publicado');
    expect(await publicos()).toEqual(['paso-publicado']);
  });

  test('RCN-01 no publica un paso sin fuente', async () => {
    const res = await crear(datos.pasoRuta({ fuentes: [] }));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: MENSAJES_GUARDADO.REVISA_CAMPOS, campos: { fuentes: MENSAJES.SIN_FUENTES } });
    expect(await PasoRuta.countDocuments()).toBe(0);
  });

  test('RCN-02 no publica un paso sin fecha de revision', async () => {
    const res = await crear(datos.pasoRuta({ fechaRevision: null }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaRevision: MENSAJES.SIN_FECHA });
  });

  test('las listas vacias o con valores fuera del catalogo responden 422 con un mensaje por campo', async () => {
    const res = await crear(datos.pasoRuta({ perfiles: [], regimenes: ['especial'], orden: null }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({
      perfiles: LISTAS.perfiles.vacia,
      regimenes: LISTAS.regimenes.invalida,
      orden: 'El orden es obligatorio.'
    });
  });

  test('datos con un tipo equivocado responden 422 sin llegar al modelo', async () => {
    const res = await crear({ ...datos.pasoRuta(), orden: '10', tramos: '4-7' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ orden: MENSAJES_EDICION.ORDEN_INVALIDO, tramos: MENSAJES_EDICION.LISTA_INVALIDA });
  });

  test('un slug repetido responde 409', async () => {
    await crear(datos.pasoRuta({ slug: 'repetido' }));
    const res = await crear(datos.pasoRuta({ slug: 'repetido' }));
    expect(res.status).toBe(409);
    expect(res.body.campos).toEqual({ slug: MENSAJES_GUARDADO.SLUG_REPETIDO_PASO });
  });
});

describe('RF-10 RCN-01 RCN-02 editar, publicar y despublicar pasos de la ruta', () => {
  test('RCN-01 publicar un borrador sin fuente se rechaza y el borrador queda igual', async () => {
    const { body } = await crear(datos.pasoRuta(borrador));
    const res = await editar(body._id, { estado: 'publicado', fechaRevision: datos.FECHA_REVISION });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fuentes: MENSAJES.SIN_FUENTES });
    expect((await PasoRuta.findById(body._id).lean()).estado).toBe('borrador');
  });

  test('completar fuente y fecha lo publica en la guia; despublicar lo saca', async () => {
    const { body } = await crear(datos.pasoRuta({ slug: 'familia-anotar', ...borrador }));
    const publicado = await editar(body._id, { estado: 'publicado', fuentes: [datos.FUENTE], fechaRevision: '2026-10-01' });
    expect(publicado.status).toBe(200);
    expect(await publicos()).toEqual(['familia-anotar']);

    const despublicado = await editar(body._id, { estado: 'borrador' });
    expect(despublicado.body.estado).toBe('borrador');
    expect(await publicos()).toEqual([]);
  });

  test('cambia las respuestas a las que aplica el paso', async () => {
    const { body } = await crear(datos.pasoRuta());
    const res = await editar(body._id, { perfiles: ['docente'], regimenes: ['sin-afiliacion'], tiposEntidad: [] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ perfiles: ['docente'], regimenes: ['sin-afiliacion'], tiposEntidad: [] });
  });

  test('un id que no existe o no es valido responde 404', async () => {
    expect((await editar('66f000000000000000000000', { titulo: 'x' })).status).toBe(404);
    expect((await editar('no-es-un-id', { titulo: 'x' })).status).toBe(404);
  });
});

describe('RF-10 pasos que vienen de ruta/pasos.yaml', () => {
  let id;
  beforeEach(async () => {
    id = (await repoPasosRuta.crear(datos.pasoRuta({ slug: 'familia-cita-eps' })))._id;
  });

  test('se pueden editar y despublicar, y llevan el nombre del archivo', async () => {
    const res = await editar(id, { titulo: 'Corregido', slug: 'familia-cita-eps', estado: 'borrador' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ titulo: 'Corregido', estado: 'borrador', archivo: 'ruta/pasos.yaml' });
  });

  test('su slug no se puede cambiar', async () => {
    const res = await editar(id, { slug: 'otro-slug' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ slug: MENSAJES_EDICION.SLUG_DE_ARCHIVO('ruta/pasos.yaml') });
    expect((await PasoRuta.findById(id).lean()).slug).toBe('familia-cita-eps');
  });
});
