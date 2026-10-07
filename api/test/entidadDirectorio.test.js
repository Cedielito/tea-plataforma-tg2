'use strict';
const mongoose = require('mongoose');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const datos = require('./ayudas/datos');
const { EntidadDirectorio } = require('../src/datos/modelos');
const { MENSAJE_ESCRITURA_DIRECTA } = require('../src/datos/modelos/comunes');
const { MENSAJES: MENSAJES_PUBLICACION } = require('../src/dominio/publicacion');
const { MENSAJES } = require('../src/dominio/directorio');
const repo = require('../src/datos/repositorios/entidadesDirectorio');

/**
 * Esquema de `entidad_directorio` (Cuadro 13). M-04, RF-05, RF-10, RS-07,
 * RCN-01, RCN-02, HU-14
 */

beforeAll(async () => {
  await levantar();
  await EntidadDirectorio.init();
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

const profesional = (cambios = {}) =>
  datos.entidad({
    nombre: 'Consultorio de psicología infantil',
    ciudad: 'Medellín',
    esProfesional: true,
    contacto: { telefonos: ['300 000 0000'] },
    ...cambios
  });
const CONSTANCIA = 'Autorización firmada el 1 de octubre de 2026, archivada por el equipo como AUT-001.';

describe('RS-07 un profesional independiente no se publica sin constancia de autorizacion', () => {
  test('sin constancia se rechaza y no se guarda', async () => {
    const errores = await erroresAlGuardar(repo.crear(profesional()));
    expect(errores.constanciaAutorizacion.message).toBe(MENSAJES.SIN_CONSTANCIA);
    expect(await EntidadDirectorio.countDocuments()).toBe(0);
  });

  test('con constancia se publica', async () => {
    const doc = await repo.crear(profesional({ constanciaAutorizacion: CONSTANCIA }));
    expect(doc).toMatchObject({ estado: 'publicado', esProfesional: true, constanciaAutorizacion: CONSTANCIA });
  });

  test('en borrador se guarda sin constancia, pero no se puede publicar despues sin ella', async () => {
    const doc = await repo.crear(profesional({ estado: 'borrador' }));
    const errores = await erroresAlGuardar(repo.actualizar(doc._id, { estado: 'publicado' }));
    expect(errores.constanciaAutorizacion.message).toBe(MENSAJES.SIN_CONSTANCIA);
    expect((await EntidadDirectorio.findById(doc._id).lean()).estado).toBe('borrador');

    const publicado = await repo.actualizar(doc._id, { estado: 'publicado', constanciaAutorizacion: CONSTANCIA });
    expect(publicado.estado).toBe('publicado');
  });

  test('marcar como profesional una entidad publicada exige la constancia', async () => {
    const doc = await repo.crear(datos.entidad());
    const errores = await erroresAlGuardar(repo.actualizar(doc._id, { esProfesional: true }));
    expect(errores.constanciaAutorizacion.message).toBe(MENSAJES.SIN_CONSTANCIA);
  });

  test('una entidad institucional se publica sin constancia', async () => {
    const doc = await repo.crear(datos.entidad());
    expect(doc).toMatchObject({ estado: 'publicado', esProfesional: false });
    expect(doc.constanciaAutorizacion).toBeUndefined();
  });

  test('sin esProfesional queda como institucional', async () => {
    const { esProfesional: _sin, ...sinMarca } = datos.entidad();
    expect((await repo.crear(sinMarca)).esProfesional).toBe(false);
  });
});

describe('RCN-01 y RCN-02 al guardar en la coleccion entidad_directorio', () => {
  test('un borrador se guarda sin fuentes ni fecha de verificacion', async () => {
    const doc = await repo.crear(datos.entidad({ estado: 'borrador', fuentes: [], fechaVerificacion: null }));
    expect(doc.estado).toBe('borrador');
  });

  test('RCN-01 no se publica sin fuentes', async () => {
    const errores = await erroresAlGuardar(repo.crear(datos.entidad({ fuentes: [] })));
    expect(errores.fuentes.message).toBe(MENSAJES_PUBLICACION.SIN_FUENTES);
  });

  test('RCN-02 no se publica sin fecha de verificacion', async () => {
    const errores = await erroresAlGuardar(repo.crear(datos.entidad({ fechaVerificacion: null })));
    expect(errores.fechaVerificacion.message).toBe(MENSAJES_PUBLICACION.SIN_FECHA_VERIFICACION);
    expect(await EntidadDirectorio.countDocuments()).toBe(0);
  });

  test('RCN-02 una fechaRevision no cuenta: la entidad no tiene ese campo', async () => {
    const errores = await erroresAlGuardar(
      repo.crear(datos.entidad({ fechaVerificacion: null, fechaRevision: datos.FECHA_REVISION }))
    );
    expect(errores.fechaVerificacion.message).toBe(MENSAJES_PUBLICACION.SIN_FECHA_VERIFICACION);
  });

  test('RCN-02 no se publica con una fecha de verificacion futura', async () => {
    const errores = await erroresAlGuardar(repo.crear(datos.entidad({ fechaVerificacion: datos.fechaFutura() })));
    expect(errores.fechaVerificacion.message).toBe(MENSAJES_PUBLICACION.FECHA_VERIFICACION_FUTURA);
  });

  test('con fuente y fecha de verificacion se publica, con la fecha a medianoche UTC', async () => {
    const doc = await repo.crear(datos.entidad());
    expect(doc.fechaVerificacion.toISOString()).toBe(`${datos.FECHA_REVISION}T00:00:00.000Z`);
    expect(doc.toObject()).not.toHaveProperty('fechaRevision');
  });

  test('las escrituras directas que se saltan la validacion estan bloqueadas', async () => {
    const doc = await repo.crear(datos.entidad());
    await expect(EntidadDirectorio.updateOne({ _id: doc._id }, { fuentes: [] })).rejects.toThrow(
      MENSAJE_ESCRITURA_DIRECTA
    );
  });
});

describe('HU-14 esquema de entidad del directorio', () => {
  test('nombre, tipo, ciudad y descripcion son obligatorios, tambien en borrador', async () => {
    const errores = await erroresAlGuardar(
      repo.crear({ estado: 'borrador', contacto: { telefonos: ['106'] } })
    );
    expect(Object.keys(errores).sort()).toEqual(['ciudad', 'descripcion', 'nombre', 'slug', 'tipo']);
  });

  test('tipo y ciudad deben estar en los catalogos', async () => {
    const errores = await erroresAlGuardar(repo.crear(datos.entidad({ tipo: 'hospital', ciudad: 'Bogota' })));
    expect(errores.tipo.message).toBe(MENSAJES.TIPO_INVALIDO);
    expect(errores.ciudad.message).toBe(MENSAJES.CIUDAD_INVALIDA);
  });

  test('acepta el tipo proteccion-ninez y la ciudad Nacional', async () => {
    const doc = await repo.crear(datos.entidad({ tipo: 'proteccion-ninez', ciudad: 'Nacional' }));
    expect(doc).toMatchObject({ tipo: 'proteccion-ninez', ciudad: 'Nacional' });
  });

  test('una ciudad con la tilde escrita en dos partes (NFD) se guarda como la del catalogo', async () => {
    const doc = await repo.crear(datos.entidad({ ciudad: 'Medellín'.normalize('NFD') }));
    expect(doc.ciudad).toBe('Medellín');
  });

  test('sin canal de contacto no se guarda, ni siquiera en borrador', async () => {
    const errores = await erroresAlGuardar(
      repo.crear(datos.entidad({ estado: 'borrador', contacto: { direccion: 'Calle 1', horario: '24 horas' } }))
    );
    expect(errores.contacto.message).toBe(MENSAJES.SIN_CONTACTO);
  });

  test('correo y sitio web con formato valido; el correo se guarda en minusculas', async () => {
    const errores = await erroresAlGuardar(
      repo.crear(datos.entidad({ contacto: { telefonos: ['106'], correo: 'no es correo', web: 'javascript:alert(1)' } }))
    );
    expect(errores['contacto.correo'].message).toBe(MENSAJES.CORREO_INVALIDO);
    expect(errores['contacto.web'].message).toBe(MENSAJES.WEB_INSEGURA);

    const doc = await repo.crear(datos.entidad({ contacto: { correo: 'Contactenos@SaludCapital.gov.co' } }));
    expect(doc.contacto.correo).toBe('contactenos@saludcapital.gov.co');
  });

  test('los textos vacios de contacto no se guardan', async () => {
    const doc = await repo.crear(datos.entidad({ contacto: { telefonos: ['106'], correo: '', web: '  ', horario: '' } }));
    expect(doc.toObject().contacto).toEqual({ telefonos: ['106'] });
  });

  test('sin slug, se genera a partir del nombre', async () => {
    const doc = await repo.crear(datos.entidad({ nombre: 'Personería de Medellín' }));
    expect(doc.slug).toBe('personeria-de-medellin');
  });

  test('el slug es unico', async () => {
    await repo.crear(datos.entidad({ slug: 'supersalud' }));
    await expect(repo.crear(datos.entidad({ slug: 'supersalud' }))).rejects.toMatchObject({ code: 11000 });
  });
});

describe('Lecturas del repositorio del directorio', () => {
  test('la publica trae solo las publicadas, por nombre en espanol y sin la constancia', async () => {
    await repo.crear(datos.entidad({ nombre: 'Línea 106' }));
    await repo.crear(datos.entidad({ nombre: 'Instituto Colombiano de Bienestar Familiar' }));
    await repo.crear(datos.entidad({ nombre: 'Borrador', estado: 'borrador' }));
    await repo.crear(profesional({ constanciaAutorizacion: CONSTANCIA }));

    const publicadas = await repo.listarPublicadas();

    expect(publicadas.map((e) => e.nombre)).toEqual([
      'Consultorio de psicología infantil',
      'Instituto Colombiano de Bienestar Familiar',
      'Línea 106'
    ]);
    for (const entidad of publicadas) {
      expect(entidad).not.toHaveProperty('constanciaAutorizacion');
      expect(entidad).not.toHaveProperty('_id');
      expect(entidad).not.toHaveProperty('estado');
    }
  });

  test('las del panel traen borradores; obtenerPorId trae la constancia', async () => {
    await repo.crear(datos.entidad({ nombre: 'Borrador', estado: 'borrador' }));
    const creado = await repo.crear(profesional({ constanciaAutorizacion: CONSTANCIA }));

    expect((await repo.listarTodas()).map((e) => e.estado)).toEqual(['borrador', 'publicado']);
    expect((await repo.obtenerPorId(creado._id)).constanciaAutorizacion).toBe(CONSTANCIA);
    expect(await repo.obtenerPorId('no-es-un-id')).toBeNull();
  });
});
