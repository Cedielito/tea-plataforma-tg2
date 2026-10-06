'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { crearServidor } = require('../src/api/servidor');
const { Contenido } = require('../src/datos/modelos');
const repoContenidos = require('../src/datos/repositorios/contenidos');
const repoPreguntas = require('../src/datos/repositorios/preguntas');
const repoRecursos = require('../src/datos/repositorios/recursos');
const { MENSAJES: MENSAJES_CONTENIDOS } = require('../src/dominio/contenidos');
const { MENSAJES: MENSAJES_BUSQUEDA } = require('../src/dominio/busqueda');

const app = crearServidor();

beforeAll(async () => {
  await levantar();
  await Contenido.init();
});
afterEach(limpiar);
afterAll(bajar);

const borrador = { estado: 'borrador', fuentes: [], fechaRevision: null };
const titulos = (lista) => lista.map((c) => c.titulo);

describe('RCN-01 y RCN-02 las rutas publicas solo devuelven lo publicado, con fuente y fecha', () => {
  test('GET /api/contenidos no incluye borradores', async () => {
    await repoContenidos.crear(datos.contenido({ titulo: 'Publicado' }));
    await repoContenidos.crear(datos.contenido({ titulo: 'En borrador', ...borrador }));
    const res = await request(app).get('/api/contenidos');
    expect(res.status).toBe(200);
    expect(titulos(res.body)).toEqual(['Publicado']);
  });

  test('cada contenido trae fuentes y fecha de revision, y no expone datos internos', async () => {
    await repoContenidos.crear(datos.contenido({ titulo: 'Qué es el TEA', slug: 'que-es-el-tea' }));
    const [contenido] = (await request(app).get('/api/contenidos')).body;
    expect(contenido).toMatchObject({
      titulo: 'Qué es el TEA',
      slug: 'que-es-el-tea',
      seccion: 'S1',
      tramoEdad: null,
      cuerpo: expect.any(String),
      fuentes: [datos.FUENTE],
      fechaRevision: `${datos.FECHA_REVISION}T00:00:00.000Z`
    });
    for (const interno of ['estado', '__v', 'createdAt', 'updatedAt']) {
      expect(contenido).not.toHaveProperty(interno);
    }
  });

  test('GET /api/contenidos/:slug devuelve el contenido publicado con fuentes y fecha', async () => {
    await repoContenidos.crear(datos.contenido({ slug: 'mitos-y-realidades', seccion: 'S3' }));
    const res = await request(app).get('/api/contenidos/mitos-y-realidades');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ seccion: 'S3', fuentes: [datos.FUENTE], fechaRevision: expect.any(String) });
    expect(res.body).not.toHaveProperty('estado');
  });

  test('GET /api/contenidos/:slug de un borrador responde 404', async () => {
    await repoContenidos.crear(datos.contenido({ slug: 'derechos', ...borrador }));
    const res = await request(app).get('/api/contenidos/derechos');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Contenido no encontrado.');
  });

  test('GET /api/contenidos/:slug inexistente o con formato invalido responde 404', async () => {
    expect((await request(app).get('/api/contenidos/no-existe')).status).toBe(404);
    expect((await request(app).get('/api/contenidos/Con%20Espacios')).status).toBe(404);
  });

  test('GET /api/preguntas no incluye borradores y trae fuentes y fecha', async () => {
    await repoPreguntas.crear(datos.pregunta({ pregunta: '¿Publicada?' }));
    await repoPreguntas.crear(datos.pregunta({ pregunta: '¿En borrador?', ...borrador }));
    const res = await request(app).get('/api/preguntas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      pregunta: '¿Publicada?',
      respuesta: expect.any(String),
      fuentes: [datos.FUENTE],
      fechaRevision: expect.any(String)
    });
    expect(res.body[0]).not.toHaveProperty('estado');
  });

  test('GET /api/recursos no incluye borradores y trae fuentes y fecha', async () => {
    await repoRecursos.crear(datos.recurso({ titulo: 'Publicado' }));
    await repoRecursos.crear(datos.recurso({ titulo: 'En borrador', ...borrador }));
    const res = await request(app).get('/api/recursos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        _id: expect.any(String),
        titulo: 'Publicado',
        descripcion: expect.any(String),
        tipo: 'enlace',
        url: expect.any(String),
        perfiles: ['docente'],
        fuentes: [datos.FUENTE],
        fechaRevision: expect.any(String)
      }
    ]);
  });

  test('sin nada publicado las listas llegan vacias', async () => {
    for (const ruta of ['/api/contenidos', '/api/preguntas', '/api/recursos']) {
      const res = await request(app).get(ruta);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    }
  });
});

describe('RF-03 filtro de contenidos por seccion y tramo de edad', () => {
  beforeEach(async () => {
    const crear = (titulo, seccion, tramoEdad) => repoContenidos.crear(datos.contenido({ titulo, seccion, tramoEdad }));
    await crear('S2 13-17', 'S2', '13-17');
    await crear('S2 4-7', 'S2', '4-7');
    await crear('S2 introducción', 'S2', null);
    await crear('S2 8-12', 'S2', '8-12');
    await crear('S1 definición', 'S1', null);
    await crear('S2 4-7 segunda', 'S2', '4-7');
    await repoContenidos.crear(datos.contenido({ titulo: 'Borrador 4-7', seccion: 'S2', tramoEdad: '4-7', ...borrador }));
  });

  test('?seccion=S2&edad=4-7 devuelve la introduccion sin tramo arriba y luego el tramo 4-7', async () => {
    const res = await request(app).get('/api/contenidos?seccion=S2&edad=4-7');
    expect(res.status).toBe(200);
    expect(titulos(res.body)).toEqual(['S2 introducción', 'S2 4-7', 'S2 4-7 segunda']);
  });

  test('?seccion=S2 devuelve toda la seccion: sin tramo y luego de menor a mayor edad', async () => {
    const res = await request(app).get('/api/contenidos?seccion=S2');
    expect(titulos(res.body)).toEqual(['S2 introducción', 'S2 4-7', 'S2 4-7 segunda', 'S2 8-12', 'S2 13-17']);
  });

  test('sin filtros devuelve todo lo publicado, por seccion', async () => {
    const res = await request(app).get('/api/contenidos?seccion=&edad=');
    expect(res.status).toBe(200);
    expect(titulos(res.body)[0]).toBe('S1 definición');
    expect(res.body).toHaveLength(6);
  });

  test.each([
    ['seccion=S9', MENSAJES_CONTENIDOS.SECCION_INVALIDA],
    ['seccion=S1&seccion=S2', MENSAJES_CONTENIDOS.SECCION_INVALIDA],
    ['seccion[$ne]=S1', MENSAJES_CONTENIDOS.SECCION_INVALIDA],
    ['edad=1-3', MENSAJES_CONTENIDOS.EDAD_INVALIDA],
    ['edad[$gt]=', MENSAJES_CONTENIDOS.EDAD_INVALIDA]
  ])('?%s responde 400 con un mensaje en espanol', async (consulta, mensaje) => {
    const res = await request(app).get(`/api/contenidos?${consulta}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: mensaje });
  });
});

describe('RF-07 preguntas frecuentes en orden', () => {
  test('GET /api/preguntas las devuelve de menor a mayor orden', async () => {
    await repoPreguntas.crear(datos.pregunta({ pregunta: 'Tercera', orden: 3 }));
    await repoPreguntas.crear(datos.pregunta({ pregunta: 'Primera', orden: 1 }));
    await repoPreguntas.crear(datos.pregunta({ pregunta: 'Segunda', orden: 2 }));
    const res = await request(app).get('/api/preguntas');
    expect(res.body.map((p) => p.pregunta)).toEqual(['Primera', 'Segunda', 'Tercera']);
  });
});

describe('RF-02 buscador de contenidos y preguntas frecuentes', () => {
  beforeEach(async () => {
    await repoContenidos.crear(
      datos.contenido({ titulo: 'Ruta de atención', seccion: 'S4', cuerpo: 'Pasos hasta el diagnóstico.' })
    );
    await repoContenidos.crear(datos.contenido({ titulo: 'Derechos', seccion: 'S5', cuerpo: 'Educación inclusiva.' }));
    await repoContenidos.crear(
      datos.contenido({ titulo: 'Diagnóstico en borrador', seccion: 'S1', cuerpo: 'x', ...borrador })
    );
    await repoPreguntas.crear(
      datos.pregunta({ pregunta: '¿Quién hace el DIAGNÓSTICO?', respuesta: 'Un equipo especializado.' })
    );
    await repoPreguntas.crear(datos.pregunta({ pregunta: '¿Diagnóstico borrador?', respuesta: 'x', ...borrador }));
  });

  test('encuentra contenidos y preguntas publicados sin importar tildes ni mayusculas', async () => {
    const res = await request(app).get('/api/buscar?q=diagnostico');
    expect(res.status).toBe(200);
    expect(titulos(res.body.contenidos)).toEqual(['Ruta de atención']);
    expect(res.body.preguntas.map((p) => p.pregunta)).toEqual(['¿Quién hace el DIAGNÓSTICO?']);
  });

  test('los resultados de contenidos traen lo necesario para enlazar la pagina', async () => {
    const res = await request(app).get('/api/buscar?q=ruta');
    expect(res.body.contenidos).toEqual([
      { _id: expect.any(String), titulo: 'Ruta de atención', slug: 'ruta-de-atencion', seccion: 'S4', tramoEdad: null }
    ]);
  });

  test('las preguntas encontradas traen su respuesta, fuentes y fecha', async () => {
    const res = await request(app).get('/api/buscar?q=equipo');
    expect(res.body.preguntas[0]).toMatchObject({
      respuesta: 'Un equipo especializado.',
      fuentes: [datos.FUENTE],
      fechaRevision: expect.any(String)
    });
    expect(res.body.preguntas[0]).not.toHaveProperty('estado');
  });

  test('con varias palabras, todas deben aparecer', async () => {
    expect((await request(app).get('/api/buscar').query({ q: 'pasos diagnóstico' })).body.contenidos).toHaveLength(1);
    expect((await request(app).get('/api/buscar').query({ q: 'pasos derechos' })).body.contenidos).toHaveLength(0);
  });

  test('sin coincidencias devuelve listas vacias', async () => {
    const res = await request(app).get('/api/buscar?q=inexistente');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ contenidos: [], preguntas: [] });
  });

  test.each(['', '?q=', '?q=a', '?q=.*', '?q[$ne]=x'])('/api/buscar%s responde 400', async (consulta) => {
    const res = await request(app).get(`/api/buscar${consulta}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: MENSAJES_BUSQUEDA.MUY_CORTA });
  });
});

describe('Errores de las rutas publicas', () => {
  test('una falla de la base responde 500 sin exponer detalles', async () => {
    const espia = jest.spyOn(repoContenidos, 'listarPublicados').mockRejectedValue(new Error('cadena secreta'));
    try {
      const res = await request(app).get('/api/contenidos');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Error interno del servidor' });
    } finally {
      espia.mockRestore();
    }
  });

  test('no hay rutas de escritura publicas', async () => {
    expect((await request(app).post('/api/contenidos').send(datos.contenido())).status).toBe(404);
    expect((await request(app).put('/api/contenidos/que-es-el-tea').send({})).status).toBe(404);
    expect((await request(app).delete('/api/preguntas')).status).toBe(404);
  });
});
