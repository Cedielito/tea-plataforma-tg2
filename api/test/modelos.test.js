'use strict';
const mongoose = require('mongoose');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { COLECCIONES, Contenido, PreguntaFrecuente, Recurso } = require('../src/datos/modelos');
const { MENSAJE_ESCRITURA_DIRECTA } = require('../src/datos/modelos/comunes');
const { MENSAJES } = require('../src/dominio/publicacion');
const repoContenidos = require('../src/datos/repositorios/contenidos');
const repoPreguntas = require('../src/datos/repositorios/preguntas');
const repoRecursos = require('../src/datos/repositorios/recursos');

beforeAll(async () => {
  await levantar();
  await Promise.all([Contenido.init(), PreguntaFrecuente.init(), Recurso.init()]);
});
afterEach(limpiar);
afterAll(bajar);

/** Espera un ValidationError de Mongoose y devuelve sus errores por campo. */
async function erroresAlGuardar(promesa) {
  const error = await promesa.then(
    () => null,
    (e) => e
  );
  expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
  return error.errors;
}

const MODELOS = [
  ['contenido', Contenido, repoContenidos, datos.contenido],
  ['pregunta_frecuente', PreguntaFrecuente, repoPreguntas, datos.pregunta],
  ['recurso', Recurso, repoRecursos, datos.recurso]
];

describe.each(MODELOS)('RCN-01 y RCN-02 al guardar en la coleccion %s', (_nombre, Modelo, repo, ejemplo) => {
  test('un borrador se guarda sin fuentes ni fecha de revision', async () => {
    const doc = await repo.crear(ejemplo({ estado: 'borrador', fuentes: [], fechaRevision: null }));
    expect(doc.estado).toBe('borrador');
    expect(await Modelo.countDocuments()).toBe(1);
  });

  test('sin estado queda como borrador', async () => {
    const { estado: _estado, ...sinEstado } = ejemplo();
    expect((await repo.crear(sinEstado)).estado).toBe('borrador');
  });

  test('RCN-01 no se publica sin fuentes', async () => {
    const errores = await erroresAlGuardar(repo.crear(ejemplo({ fuentes: [] })));
    expect(errores.fuentes.message).toBe(MENSAJES.SIN_FUENTES);
    expect(await Modelo.countDocuments()).toBe(0);
  });

  test('RCN-02 no se publica sin fecha de revision', async () => {
    const errores = await erroresAlGuardar(repo.crear(ejemplo({ fechaRevision: null })));
    expect(errores.fechaRevision.message).toBe(MENSAJES.SIN_FECHA);
    expect(await Modelo.countDocuments()).toBe(0);
  });

  test('RCN-02 no se publica con una fecha de revision futura', async () => {
    const errores = await erroresAlGuardar(repo.crear(ejemplo({ fechaRevision: datos.fechaFutura() })));
    expect(errores.fechaRevision.message).toBe(MENSAJES.FECHA_FUTURA);
  });

  test('con fuente y fecha de revision se publica', async () => {
    const doc = await repo.crear(ejemplo());
    expect(doc.estado).toBe('publicado');
    expect(doc.fuentes[0].texto).toBe(datos.FUENTE.texto);
    expect(doc.fechaRevision.toISOString()).toBe(`${datos.FECHA_REVISION}T00:00:00.000Z`);
  });

  test('publicar un borrador incompleto con actualizar se rechaza y el borrador queda igual', async () => {
    const borrador = await repo.crear(ejemplo({ estado: 'borrador', fuentes: [] }));
    await erroresAlGuardar(repo.actualizar(borrador._id, { estado: 'publicado' }));
    expect((await Modelo.findById(borrador._id)).estado).toBe('borrador');
  });

  test('actualizar completa un borrador y lo publica, y luego lo despublica', async () => {
    const borrador = await repo.crear(ejemplo({ estado: 'borrador', fuentes: [], fechaRevision: null }));
    const publicado = await repo.actualizar(borrador._id, {
      estado: 'publicado',
      fuentes: [datos.FUENTE],
      fechaRevision: datos.FECHA_REVISION
    });
    expect(publicado.estado).toBe('publicado');
    const despublicado = await repo.actualizar(borrador._id, { estado: 'borrador' });
    expect(despublicado.estado).toBe('borrador');
  });

  test('actualizar devuelve null si el id no existe o no es valido', async () => {
    expect(await repo.actualizar(new mongoose.Types.ObjectId(), { estado: 'borrador' })).toBeNull();
    expect(await repo.actualizar('no-es-un-id', { estado: 'borrador' })).toBeNull();
  });

  test('las escrituras directas que se saltan la validacion estan bloqueadas', async () => {
    const borrador = await repo.crear(ejemplo({ estado: 'borrador', fuentes: [] }));
    const publicar = { $set: { estado: 'publicado' } };
    await expect(Modelo.updateOne({ _id: borrador._id }, publicar)).rejects.toThrow(MENSAJE_ESCRITURA_DIRECTA);
    await expect(Modelo.updateMany({}, publicar)).rejects.toThrow(MENSAJE_ESCRITURA_DIRECTA);
    await expect(Modelo.findOneAndUpdate({ _id: borrador._id }, publicar)).rejects.toThrow(
      MENSAJE_ESCRITURA_DIRECTA
    );
    await expect(Modelo.findByIdAndUpdate(borrador._id, publicar)).rejects.toThrow(MENSAJE_ESCRITURA_DIRECTA);
    await expect(Modelo.replaceOne({ _id: borrador._id }, { estado: 'publicado' })).rejects.toThrow(
      MENSAJE_ESCRITURA_DIRECTA
    );
    await expect(borrador.updateOne(publicar)).rejects.toThrow(MENSAJE_ESCRITURA_DIRECTA);
    expect((await Modelo.findById(borrador._id)).estado).toBe('borrador');
  });

  test('insertMany tambien aplica las reglas de publicacion', async () => {
    await erroresAlGuardar(Modelo.insertMany([ejemplo({ fuentes: [] })]));
    expect(await Modelo.countDocuments()).toBe(0);
  });

  test('una fuente con enlace inseguro se rechaza aunque sea borrador', async () => {
    const fuentes = [{ texto: 'OMS', url: 'javascript:alert(1)' }];
    const errores = await erroresAlGuardar(repo.crear(ejemplo({ estado: 'borrador', fuentes })));
    expect(errores['fuentes.0.url'].message).toBe(MENSAJES.FUENTE_URL_INSEGURA);
  });

  test('una fuente sin enlace se guarda sin el campo url', async () => {
    const doc = await repo.crear(ejemplo({ fuentes: [{ texto: 'DSM-5-TR', url: '  ' }] }));
    expect(doc.toObject().fuentes).toEqual([{ texto: 'DSM-5-TR' }]);
  });
});

describe('Esquema de contenido', () => {
  test('genera el slug a partir del titulo si no llega', async () => {
    const doc = await repoContenidos.crear(datos.contenido({ titulo: '¿Qué es el TEA?' }));
    expect(doc.slug).toBe('que-es-el-tea');
  });

  test('el slug es unico', async () => {
    await repoContenidos.crear(datos.contenido({ slug: 'mitos' }));
    await expect(repoContenidos.crear(datos.contenido({ slug: 'mitos', titulo: 'Otro' }))).rejects.toMatchObject({
      code: 11000
    });
  });

  test('rechaza un slug con formato invalido', async () => {
    const errores = await erroresAlGuardar(repoContenidos.crear(datos.contenido({ slug: 'con espacios' })));
    expect(errores.slug).toBeDefined();
  });

  test('exige titulo, seccion y cuerpo', async () => {
    const errores = await erroresAlGuardar(repoContenidos.crear({ estado: 'borrador' }));
    expect(Object.keys(errores)).toEqual(expect.arrayContaining(['titulo', 'seccion', 'cuerpo', 'slug']));
  });

  test('rechaza una seccion o un tramo de edad fuera de la lista', async () => {
    let errores = await erroresAlGuardar(repoContenidos.crear(datos.contenido({ seccion: 'S6' })));
    expect(errores.seccion).toBeDefined();
    errores = await erroresAlGuardar(repoContenidos.crear(datos.contenido({ tramoEdad: '1-3' })));
    expect(errores.tramoEdad.message).toBe('El tramo de edad debe ser 4-7, 8-12 o 13-17.');
  });

  test('el tramo de edad es opcional', async () => {
    expect((await repoContenidos.crear(datos.contenido())).tramoEdad).toBeNull();
    const conTramo = await repoContenidos.crear(datos.contenido({ titulo: 'Señales 4-7', tramoEdad: '4-7' }));
    expect(conTramo.tramoEdad).toBe('4-7');
  });

  test('rechaza un estado distinto de borrador o publicado', async () => {
    const errores = await erroresAlGuardar(repoContenidos.crear(datos.contenido({ estado: 'archivado' })));
    expect(errores.estado).toBeDefined();
  });

  test('guarda el texto en forma NFC para que el buscador lo encuentre', async () => {
    const doc = await repoContenidos.crear(datos.contenido({ cuerpo: 'diagnóstico' }));
    expect(doc.cuerpo).toBe('diagnóstico');
  });
});

describe('Esquema de pregunta frecuente', () => {
  test('exige pregunta y respuesta', async () => {
    const errores = await erroresAlGuardar(repoPreguntas.crear({ estado: 'borrador' }));
    expect(Object.keys(errores)).toEqual(expect.arrayContaining(['pregunta', 'respuesta']));
  });

  test('el orden es un entero no negativo', async () => {
    let errores = await erroresAlGuardar(repoPreguntas.crear(datos.pregunta({ orden: -1 })));
    expect(errores.orden).toBeDefined();
    errores = await erroresAlGuardar(repoPreguntas.crear(datos.pregunta({ orden: 1.5 })));
    expect(errores.orden).toBeDefined();
  });
});

describe('Esquema de recurso', () => {
  test('acepta un enlace absoluto o una ruta de archivo del sitio', async () => {
    const archivo = await repoRecursos.crear(datos.recurso({ tipo: 'archivo', url: '/recursos/guia.pdf' }));
    expect(archivo.url).toBe('/recursos/guia.pdf');
  });

  test('rechaza un enlace inseguro o hacia otro dominio sin protocolo', async () => {
    for (const url of ['javascript:alert(1)', '//otro.com/guia.pdf']) {
      const errores = await erroresAlGuardar(repoRecursos.crear(datos.recurso({ url })));
      expect(errores.url).toBeDefined();
    }
  });

  test('exige al menos un perfil destinatario valido', async () => {
    let errores = await erroresAlGuardar(repoRecursos.crear(datos.recurso({ perfiles: [] })));
    expect(errores.perfiles).toBeDefined();
    errores = await erroresAlGuardar(repoRecursos.crear(datos.recurso({ perfiles: ['estudiante'] })));
    expect(Object.keys(errores).some((campo) => campo.startsWith('perfiles'))).toBe(true);
  });

  test('rechaza un tipo distinto de archivo o enlace', async () => {
    const errores = await erroresAlGuardar(repoRecursos.crear(datos.recurso({ tipo: 'video' })));
    expect(errores.tipo).toBeDefined();
  });
});

describe('Registro de colecciones', () => {
  test('COLECCIONES incluye la coleccion de cada modelo, para limpiar la base en las pruebas', () => {
    const registradas = mongoose.modelNames().map((nombre) => mongoose.model(nombre).collection.collectionName);
    expect([...COLECCIONES].sort()).toEqual([...registradas].sort());
  });
});
