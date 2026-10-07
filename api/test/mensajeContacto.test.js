'use strict';
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MensajeContacto } = require('../src/datos/modelos');
const mensajesContacto = require('../src/datos/repositorios/mensajesContacto');
const { prepararSupresionAutomatica } = require('../src/datos/supresionAutomatica');
const { SEGUNDOS_CONSERVACION } = require('../src/dominio/contacto');
const { crearRegistro } = require('./ayudas/administrador');

/**
 * Coleccion mensaje_contacto y su supresion automatica. M-06, RF-11, RS-02, RS-04
 *
 * Esta suite levanta su propia base en memoria con el monitor TTL de MongoDB
 * revisando cada segundo (por defecto lo hace cada 60), para comprobar que
 * los mensajes vencidos de verdad desaparecen sin ninguna tarea en la API.
 */

let servidor;
beforeAll(async () => {
  servidor = await MongoMemoryServer.create({ instance: { args: ['--setParameter', 'ttlMonitorSleepSecs=1'] } });
  await mongoose.connect(servidor.getUri('tea_pruebas'));
  await MensajeContacto.init();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await MensajeContacto.deleteMany({});
});
afterAll(async () => {
  await mongoose.disconnect();
  await servidor.stop();
});

const DIA = 24 * 60 * 60 * 1000;
const datos = (cambios = {}) => ({
  correo: 'docente@colegio.edu.co',
  mensaje: 'Hola.',
  fecha: new Date(),
  versionPolitica: '1.0',
  ...cambios
});

async function esperarHasta(condicion, limiteMs = 10000) {
  const inicio = Date.now();
  while (!(await condicion())) {
    if (Date.now() - inicio > limiteMs) return false;
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
  return true;
}

describe('RS-02 mensaje_contacto guarda solo lo que dice la politica', () => {
  test('correo, mensaje, fecha y version, sin __v ni marcas de tiempo', async () => {
    await mensajesContacto.crear(datos());
    const [guardado] = await MensajeContacto.find().lean();
    expect(Object.keys(guardado).sort()).toEqual(['_id', 'correo', 'fecha', 'mensaje', 'versionPolitica']);
  });

  test('el repositorio descarta cualquier otro dato y el modelo rechaza un campo de mas', async () => {
    await mensajesContacto.crear({ ...datos(), ip: '203.0.113.7' });
    expect(JSON.stringify(await MensajeContacto.find().lean())).not.toContain('203.0.113.7');
    expect(() => new MensajeContacto({ ...datos(), ip: '203.0.113.7' })).toThrow(/ip/);
  });

  test('los cuatro campos son obligatorios y el error no repite lo escrito', async () => {
    const error = await new MensajeContacto({ mensaje: 'texto privado' }).save().catch((e) => e);
    expect(Object.keys(error.errors).sort()).toEqual(['correo', 'fecha', 'versionPolitica']);
    expect(error.message).not.toContain('texto privado');
  });
});

describe('RF-11 bandeja: lista y eliminacion', () => {
  test('lista del mas reciente al mas antiguo', async () => {
    await mensajesContacto.crear(datos({ mensaje: 'antiguo', fecha: new Date(Date.now() - 2 * DIA) }));
    await mensajesContacto.crear(datos({ mensaje: 'reciente' }));
    expect((await mensajesContacto.listar()).map((m) => m.mensaje)).toEqual(['reciente', 'antiguo']);
  });

  test('eliminar devuelve si existia', async () => {
    const { _id } = await mensajesContacto.crear(datos());
    expect(await mensajesContacto.eliminar(String(_id))).toBe(true);
    expect(await mensajesContacto.eliminar(String(_id))).toBe(false);
    expect(await mensajesContacto.eliminar('no-es-un-id')).toBe(false);
  });
});

describe('RS-04 supresion automatica a los 180 dias', () => {
  test('hay un indice TTL sobre la fecha con 180 dias', async () => {
    const indices = await MensajeContacto.collection.indexes();
    expect(indices).toContainEqual(
      expect.objectContaining({ key: { fecha: 1 }, expireAfterSeconds: SEGUNDOS_CONSERVACION })
    );
  });

  test('MongoDB borra el mensaje de hace 181 dias y conserva el de hace 179', async () => {
    const ahora = Date.now();
    await mensajesContacto.crear(datos({ mensaje: 'vencido', fecha: new Date(ahora - 181 * DIA) }));
    await mensajesContacto.crear(datos({ mensaje: 'vigente', fecha: new Date(ahora - 179 * DIA) }));

    const borrado = await esperarHasta(async () => (await MensajeContacto.countDocuments({ mensaje: 'vencido' })) === 0);

    expect(borrado).toBe(true);
    expect((await MensajeContacto.find().lean()).map((m) => m.mensaje)).toEqual(['vigente']);
  }, 15000);

  test('al arrancar, la API confirma el indice en el registro', async () => {
    const registro = crearRegistro();
    expect(await prepararSupresionAutomatica({ registro })).toBe(true);
    expect(registro.lineas).toEqual(['Mensajes de contacto: se suprimen automáticamente a los 180 días.']);
  });

  test('si el indice tiene otro plazo, lo avisa sin detener el arranque', async () => {
    const coleccion = MensajeContacto.collection;
    await mongoose.connection.db.command({
      collMod: coleccion.collectionName,
      index: { keyPattern: { fecha: 1 }, expireAfterSeconds: 60 }
    });
    const registro = crearRegistro();
    try {
      expect(await prepararSupresionAutomatica({ registro })).toBe(false);
      expect(registro.lineas[0]).toMatch(/no tiene el plazo de 180 días/);
    } finally {
      await mongoose.connection.db.command({
        collMod: coleccion.collectionName,
        index: { keyPattern: { fecha: 1 }, expireAfterSeconds: SEGUNDOS_CONSERVACION }
      });
    }
  });

  test('si no puede preparar el indice, lo registra sin lanzar', async () => {
    jest.spyOn(MensajeContacto, 'init').mockRejectedValueOnce(new Error('sin conexión'));
    const registro = crearRegistro();
    expect(await prepararSupresionAutomatica({ registro })).toBe(false);
    expect(registro.lineas).toEqual(['Mensajes de contacto: no se pudo preparar la supresión automática: sin conexión']);
  });
});
