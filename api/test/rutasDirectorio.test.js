'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { crearAdministrador, crearAppDePrueba, iniciarSesion } = require('./ayudas/administrador');
const { Administrador, EntidadDirectorio } = require('../src/datos/modelos');
const repoEntidades = require('../src/datos/repositorios/entidadesDirectorio');
const { MENSAJES } = require('../src/dominio/publicacion');
const { MENSAJES: MENSAJES_DIRECTORIO } = require('../src/dominio/directorio');
const { MENSAJES: MENSAJES_EDICION } = require('../src/dominio/edicionEntidad');
const { MENSAJES: MENSAJES_GUARDADO } = require('../src/api/erroresDeGuardado');

/**
 * Rutas del directorio: la publica (GET /api/directorio) y las del panel
 * (/api/admin/directorio). M-04, M-08, RF-05, RF-10, RS-01, RS-05, RS-07,
 * RCN-01, RCN-02
 */

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), EntidadDirectorio.init()]);
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

const CONSTANCIA = 'Autorización firmada el 1 de octubre de 2026, archivada como AUT-001.';
const borrador = { estado: 'borrador', fuentes: [], fechaVerificacion: null };
const crear = (cuerpo) => agente.post('/api/admin/directorio').send(cuerpo);
const editar = (id, cambios) => agente.patch(`/api/admin/directorio/${id}`).send(cambios);
const publicas = async () => (await request(app).get('/api/directorio')).body.map((e) => e.slug);

describe('RF-05 GET /api/directorio', () => {
  beforeEach(async () => {
    await repoEntidades.crear(datos.entidad({ slug: 'secretaria-salud-bogota' }));
    await repoEntidades.crear(
      datos.entidad({ slug: 'supersalud', nombre: 'Supersalud', tipo: 'quejas-salud', ciudad: 'Nacional' })
    );
    await repoEntidades.crear(datos.entidad({ slug: 'en-borrador', nombre: 'Borrador', ...borrador }));
    await repoEntidades.crear(
      datos.entidad({
        slug: 'psicologa-cali',
        nombre: 'Consultorio de psicología',
        ciudad: 'Cali',
        esProfesional: true,
        constanciaAutorizacion: CONSTANCIA
      })
    );
  });

  test('devuelve las publicadas por nombre, con contacto, fuentes y fecha de verificacion', async () => {
    const res = await request(app).get('/api/directorio');
    expect(res.status).toBe(200);
    expect(res.body.map((e) => e.slug)).toEqual(['psicologa-cali', 'secretaria-salud-bogota', 'supersalud']);
    expect(res.body[1]).toEqual({
      slug: 'secretaria-salud-bogota',
      nombre: 'Secretaría Distrital de Salud de Bogotá',
      tipo: 'salud',
      ciudad: 'Bogotá',
      descripcion: 'Orienta sobre los servicios de salud en Bogotá.',
      contacto: {
        telefonos: ['(601) 329 5090'],
        correo: 'contactenos@saludcapital.gov.co',
        web: 'https://www.saludcapital.gov.co'
      },
      esProfesional: false,
      fuentes: [datos.FUENTE],
      fechaVerificacion: `${datos.FECHA_REVISION}T00:00:00.000Z`
    });
  });

  test('RS-07 nunca devuelve la constancia de autorizacion', async () => {
    const res = await request(app).get('/api/directorio');
    const profesional = res.body.find((e) => e.slug === 'psicologa-cali');
    expect(profesional.esProfesional).toBe(true);
    expect(profesional).not.toHaveProperty('constanciaAutorizacion');
    expect(JSON.stringify(res.body)).not.toContain('AUT-001');
  });

  test('RS-01 no filtra en el servidor: con ciudad o tipo en la consulta devuelve lo mismo', async () => {
    const todas = await request(app).get('/api/directorio');
    const conFiltros = await request(app).get('/api/directorio?ciudad=bogota&tipo=salud');
    expect(conFiltros.status).toBe(200);
    expect(conFiltros.body).toEqual(todas.body);
  });

  test('RS-01 no pone cookies', async () => {
    const res = await request(app).get('/api/directorio');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('RS-05 el directorio en el panel exige sesion', () => {
  test('sin sesion responde 401 y no crea nada', async () => {
    const res = await request(app).post('/api/admin/directorio').send(datos.entidad());
    expect(res.status).toBe(401);
    expect((await request(app).get('/api/admin/directorio')).status).toBe(401);
    expect(await EntidadDirectorio.countDocuments()).toBe(0);
  });
});

describe('RF-10 lista y lectura del directorio en el panel', () => {
  test('la lista incluye publicadas y borradores, por nombre, sin la constancia', async () => {
    await repoEntidades.crear(datos.entidad({ nombre: 'Supersalud', ciudad: 'Nacional' }));
    await repoEntidades.crear(datos.entidad({ nombre: 'Línea 106', ...borrador }));

    const res = await agente.get('/api/admin/directorio');

    expect(res.status).toBe(200);
    expect(res.body.map(({ nombre, estado }) => [nombre, estado])).toEqual([
      ['Línea 106', 'borrador'],
      ['Supersalud', 'publicado']
    ]);
    expect(res.body[0]).toEqual({
      _id: expect.any(String),
      slug: 'linea-106',
      nombre: 'Línea 106',
      tipo: 'salud',
      ciudad: 'Bogotá',
      esProfesional: false,
      estado: 'borrador',
      fechaVerificacion: null,
      updatedAt: expect.any(String),
      archivo: null
    });
  });

  test('GET /directorio/:id trae descripcion, contacto, constancia y fuentes; si no existe, 404', async () => {
    const creada = await repoEntidades.crear(datos.entidad({ esProfesional: true, constanciaAutorizacion: CONSTANCIA }));
    const res = await agente.get(`/api/admin/directorio/${creada._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      descripcion: expect.any(String),
      contacto: { telefonos: ['(601) 329 5090'] },
      constanciaAutorizacion: CONSTANCIA,
      fuentes: [datos.FUENTE]
    });
    expect((await agente.get('/api/admin/directorio/66f000000000000000000000')).status).toBe(404);
    expect((await agente.get('/api/admin/directorio/no-es-un-id')).body).toEqual({ error: 'Entidad no encontrada.' });
  });

  test('marca con `archivo` las entidades que vienen de directorio/entidades.yaml', async () => {
    await repoEntidades.crear(datos.entidad({ slug: 'supersalud', nombre: 'Supersalud' }));
    await repoEntidades.crear(datos.entidad({ nombre: 'Nueva del panel' }));
    const res = await agente.get('/api/admin/directorio');
    expect(res.body.map(({ slug, archivo }) => [slug, archivo])).toEqual([
      ['nueva-del-panel', null],
      ['supersalud', 'directorio/entidades.yaml']
    ]);
  });
});

describe('RF-10 RCN-01 RCN-02 RS-07 crear entidades desde el panel', () => {
  test('crea un borrador sin fuentes ni fecha, que no aparece en el directorio', async () => {
    const res = await crear(datos.entidad({ nombre: 'Entidad nueva', ...borrador }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slug: 'entidad-nueva', estado: 'borrador', archivo: null });
    expect(await publicas()).toEqual([]);
  });

  test('crea una entidad publicada con fuente y fecha de verificacion, que aparece en el directorio', async () => {
    const res = await crear(datos.entidad({ slug: 'entidad-publicada' }));
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('publicado');
    expect(await publicas()).toEqual(['entidad-publicada']);
  });

  test('RCN-01 no publica una entidad sin fuente', async () => {
    const res = await crear(datos.entidad({ fuentes: [] }));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: MENSAJES_GUARDADO.REVISA_CAMPOS, campos: { fuentes: MENSAJES.SIN_FUENTES } });
    expect(await EntidadDirectorio.countDocuments()).toBe(0);
  });

  test('RCN-02 no publica una entidad sin fecha de verificacion', async () => {
    const res = await crear(datos.entidad({ fechaVerificacion: null }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaVerificacion: MENSAJES.SIN_FECHA_VERIFICACION });
  });

  test('RCN-02 una fecha de verificacion que no es fecha responde con el mensaje de verificacion', async () => {
    const res = await crear(datos.entidad({ fechaVerificacion: '2026-13-45' }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ fechaVerificacion: MENSAJES.FECHA_VERIFICACION_INVALIDA });
  });

  test('RS-07 no publica a un profesional sin constancia; con constancia, si', async () => {
    const sinConstancia = await crear(datos.entidad({ esProfesional: true }));
    expect(sinConstancia.status).toBe(422);
    expect(sinConstancia.body.campos).toEqual({ constanciaAutorizacion: MENSAJES_DIRECTORIO.SIN_CONSTANCIA });
    expect(await EntidadDirectorio.countDocuments()).toBe(0);

    const conConstancia = await crear(datos.entidad({ esProfesional: true, constanciaAutorizacion: CONSTANCIA }));
    expect(conConstancia.status).toBe(201);
    expect(conConstancia.body.constanciaAutorizacion).toBe(CONSTANCIA);
  });

  test('sin canal de contacto, o con tipo y ciudad fuera del catalogo, responde 422 con un mensaje por campo', async () => {
    const res = await crear(datos.entidad({ tipo: 'hospital', ciudad: 'Pasto', contacto: { horario: '24 horas' } }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({
      tipo: MENSAJES_DIRECTORIO.TIPO_INVALIDO,
      ciudad: MENSAJES_DIRECTORIO.CIUDAD_INVALIDA,
      contacto: MENSAJES_DIRECTORIO.SIN_CONTACTO
    });
  });

  test('el correo y el sitio web invalidos se marcan en su campo', async () => {
    const res = await crear(datos.entidad({ contacto: { correo: 'sin arroba', web: 'ftp://x.co' } }));
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({
      'contacto.correo': MENSAJES_DIRECTORIO.CORREO_INVALIDO,
      'contacto.web': MENSAJES_DIRECTORIO.WEB_INSEGURA
    });
  });

  test('datos con un tipo equivocado responden 422 sin llegar al modelo', async () => {
    const res = await crear({ ...datos.entidad(), esProfesional: 'no', contacto: { telefonos: '106' } });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({
      esProfesional: MENSAJES_EDICION.SI_O_NO,
      contacto: MENSAJES_EDICION.TELEFONOS_INVALIDOS
    });
  });

  test('un slug repetido responde 409', async () => {
    await crear(datos.entidad({ slug: 'repetido' }));
    const res = await crear(datos.entidad({ slug: 'repetido' }));
    expect(res.status).toBe(409);
    expect(res.body.campos).toEqual({ slug: MENSAJES_GUARDADO.SLUG_REPETIDO_ENTIDAD });
  });
});

describe('RF-10 RS-07 editar, publicar y despublicar entidades', () => {
  test('completar fuente y fecha la publica en el directorio; despublicar la saca', async () => {
    const { body } = await crear(datos.entidad({ slug: 'supersalud-panel', ...borrador }));
    const cambios = { estado: 'publicado', fuentes: [datos.FUENTE], fechaVerificacion: '2026-10-01' };
    const publicada = await editar(body._id, cambios);
    expect(publicada.status).toBe(200);
    expect(await publicas()).toEqual(['supersalud-panel']);

    const despublicada = await editar(body._id, { estado: 'borrador' });
    expect(despublicada.body.estado).toBe('borrador');
    expect(await publicas()).toEqual([]);
  });

  test('RS-07 marcar como profesional una entidad publicada sin constancia se rechaza y queda como estaba', async () => {
    const { body } = await crear(datos.entidad());
    const res = await editar(body._id, { esProfesional: true });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ constanciaAutorizacion: MENSAJES_DIRECTORIO.SIN_CONSTANCIA });
    expect((await EntidadDirectorio.findById(body._id).lean()).esProfesional).toBe(false);
  });

  test('cambia el contacto completo', async () => {
    const { body } = await crear(datos.entidad());
    const res = await editar(body._id, { contacto: { telefonos: ['106'], horario: '24 horas' } });
    expect(res.status).toBe(200);
    expect(res.body.contacto).toEqual({ telefonos: ['106'], horario: '24 horas' });
  });

  test('un id que no existe o no es valido responde 404', async () => {
    expect((await editar('66f000000000000000000000', { nombre: 'x' })).status).toBe(404);
    expect((await editar('no-es-un-id', { nombre: 'x' })).status).toBe(404);
  });
});

describe('RF-10 entidades que vienen de directorio/entidades.yaml', () => {
  let id;
  beforeEach(async () => {
    id = (await repoEntidades.crear(datos.entidad({ slug: 'supersalud' })))._id;
  });

  test('se pueden editar y despublicar, y llevan el nombre del archivo', async () => {
    const res = await editar(id, { descripcion: 'Corregida', slug: 'supersalud', estado: 'borrador' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ descripcion: 'Corregida', estado: 'borrador', archivo: 'directorio/entidades.yaml' });
  });

  test('su slug no se puede cambiar', async () => {
    const res = await editar(id, { slug: 'otro-slug' });
    expect(res.status).toBe(422);
    expect(res.body.campos).toEqual({ slug: MENSAJES_EDICION.SLUG_DE_ARCHIVO('directorio/entidades.yaml') });
    expect((await EntidadDirectorio.findById(id).lean()).slug).toBe('supersalud');
  });
});
