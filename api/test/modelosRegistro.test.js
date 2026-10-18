'use strict';
const mongoose = require('mongoose');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { ensayosDe } = require('./ayudas/envioRegistro');
const { COLECCIONES, SesionRegistro, EnsayoRegistro } = require('../src/datos/modelos');
const { MENSAJE, sinDatosIdentificables } = require('../src/datos/modelos/sinDatosIdentificables');
const { CAMPOS_IDENTIFICABLES } = require('../src/dominio/registro/seudonimo');

beforeAll(async () => {
  await levantar();
  await Promise.all([SesionRegistro.init(), EnsayoRegistro.init()]);
});
afterEach(limpiar);
afterAll(bajar);

const sesionValida = (cambios = {}) => ({
  seudonimo: 'ABCD-2345',
  profesional: new mongoose.Types.ObjectId(),
  estado: 'en_curso',
  constancia: { consentimientoFirmado: true, versionConsentimiento: '1.0', mayorDeEdad: true },
  versionCatalogo: '1.1.0',
  semilla: 12345,
  reloj: 'animacion',
  creadaEn: new Date('2026-10-23T14:00:00Z'),
  ...cambios
});

/**
 * Error al crear y guardar. En el documento, strict: 'throw' lanza al crearlo;
 * en un subdocumento, Mongoose lo convierte en un error de validacion cuyo
 * motivo es StrictModeError, y el guardado falla igual.
 */
async function errorAlGuardar(crear) {
  try {
    await crear().save();
  } catch (error) {
    return error;
  }
  return null;
}

const esDeModoEstricto = (error) =>
  error instanceof mongoose.Error.StrictModeError ||
  (error instanceof mongoose.Error.ValidationError &&
    Object.values(error.errors).some((e) => e.reason instanceof mongoose.Error.StrictModeError));

const ensayoValido = (cambios = {}) => ({ ...ensayosDe('cambio-regla')[5], sesion: new mongoose.Types.ObjectId(), ...cambios });

describe('CT-11 las colecciones del registro no guardan datos identificables', () => {
  test('sesion_registro y ensayo_registro estan en COLECCIONES', () => {
    expect(COLECCIONES).toEqual(expect.arrayContaining(['sesion_registro', 'ensayo_registro']));
  });

  test('una sesion y un ensayo validos se guardan sin __v ni fechas de Mongoose', async () => {
    await new SesionRegistro(sesionValida()).save();
    await new EnsayoRegistro(ensayoValido()).save();
    const sesion = await SesionRegistro.findOne().lean();
    const ensayo = await EnsayoRegistro.findOne().lean();
    for (const doc of [sesion, ensayo]) {
      expect(doc).not.toHaveProperty('__v');
      expect(doc).not.toHaveProperty('createdAt');
    }
  });

  test.each([
    ['la sesion', () => new SesionRegistro(sesionValida({ nombre: 'Ana' }))],
    ['la constancia', () => new SesionRegistro(sesionValida({ constancia: { ...sesionValida().constancia, documento: '123' } }))],
    ['el ensayo', () => new EnsayoRegistro(ensayoValido({ correo: 'a@b.co' }))],
    ['el estimulo', () => new EnsayoRegistro(ensayoValido({ estimulo: { forma: 'barco', color: 'rojo', telefono: '300' } }))]
  ])('strict: throw: un campo de mas en %s hace fallar el guardado', async (_caso, crear) => {
    expect(esDeModoEstricto(await errorAlGuardar(crear))).toBe(true);
    expect(await SesionRegistro.countDocuments()).toBe(0);
    expect(await EnsayoRegistro.countDocuments()).toBe(0);
  });

  test('strict: throw tambien en insertMany, que no guarda ninguno', async () => {
    const ensayos = [ensayoValido(), ensayoValido({ numero: 7, comentario: 'x' })];
    await expect(EnsayoRegistro.insertMany(ensayos, { ordered: true })).rejects.toThrow();
    expect(await EnsayoRegistro.countDocuments()).toBe(0);
  });

  test('el plugin revisa el documento antes de validar, con cualquier clave identificable', async () => {
    const Prueba = mongoose.model(
      'PruebaSinDatos',
      new mongoose.Schema({ datos: mongoose.Schema.Types.Mixed }, { collection: 'prueba_sin_datos' }).plugin(
        sinDatosIdentificables
      )
    );
    for (const campo of CAMPOS_IDENTIFICABLES) {
      const doc = new Prueba({ datos: { anidado: [{ [campo]: 'x' }] } });
      await expect(doc.validate()).rejects.toMatchObject({ errors: { datosIdentificables: { message: MENSAJE } } });
    }
    await expect(new Prueba({ datos: { pausas: 1 } }).validate()).resolves.toBeUndefined();
  });

  test('la constancia debe tener las dos marcas en true', async () => {
    const sin = new SesionRegistro(sesionValida({ constancia: { consentimientoFirmado: true, versionConsentimiento: '1.0', mayorDeEdad: false } }));
    await expect(sin.save()).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });

  test('el reloj solo puede ser animacion y el navegador solo familia y version mayor', async () => {
    await expect(new SesionRegistro(sesionValida({ reloj: 'referencia' })).save()).rejects.toBeInstanceOf(
      mongoose.Error.ValidationError
    );
    const userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
    await expect(new SesionRegistro(sesionValida({ navegador: userAgent })).save()).rejects.toBeInstanceOf(
      mongoose.Error.ValidationError
    );
    await expect(new SesionRegistro(sesionValida({ navegador: 'Firefox 131' })).save()).resolves.toBeTruthy();
  });

  test('el seudonimo debe tener el formato XXXX-XXXX y es unico', async () => {
    await expect(new SesionRegistro(sesionValida({ seudonimo: 'abcd-2345' })).save()).rejects.toBeInstanceOf(
      mongoose.Error.ValidationError
    );
    await new SesionRegistro(sesionValida()).save();
    await expect(new SesionRegistro(sesionValida()).save()).rejects.toMatchObject({ code: 11000 });
  });

  test('un ensayo no se repite dentro de la misma tarea de una sesion', async () => {
    const sesion = new mongoose.Types.ObjectId();
    await new EnsayoRegistro(ensayoValido({ sesion })).save();
    await expect(new EnsayoRegistro(ensayoValido({ sesion })).save()).rejects.toMatchObject({ code: 11000 });
  });

  test('el SUS guarda 10 respuestas de 1 a 5 y el valorSUS de 0 a 100', async () => {
    const sus = { respuestas: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], valorSUS: 50, version: 'v1', respondidoEn: new Date() };
    await expect(new SesionRegistro(sesionValida({ sus })).save()).resolves.toBeTruthy();
    await limpiar();
    for (const malo of [{ ...sus, respuestas: [3, 3] }, { ...sus, respuestas: Array(10).fill(6) }, { ...sus, valorSUS: 120 }]) {
      await expect(new SesionRegistro(sesionValida({ sus: malo })).save()).rejects.toBeInstanceOf(
        mongoose.Error.ValidationError
      );
    }
  });
});
