'use strict';
const mongoose = require('mongoose');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { conectar, MENSAJE_SIN_URI } = require('../src/datos/conexion');
const { esquemas, COLECCIONES } = require('../src/datos/modelos');
const { puntuar } = require('../src/dominio/puntuacion/motor');
const { VERSION_ALGORITMO, VERSION_CATALOGO } = require('../src/dominio/puntuacion/version');

/**
 * Pruebas de la capa de datos contra una base real en memoria.
 * CT-11 CT-12 CT-13 RF-20 RF-23 RF-28 RF-42
 *
 * El timeout extendido vive aqui y no en jest.config.js: es el unico archivo
 * que levanta mongod, y la primera corrida descarga el binario.
 */
jest.setTimeout(120000);

const UUID = '11111111-2222-4333-8444-555555555555';
const OTRO_UUID = '99999999-8888-4777-8666-555555555555';

let repositorio;
let modelos;

beforeAll(async () => {
  await levantar();
  // Se requiere despues de conectar para que el registro de modelos y la
  // construccion de indices ocurran sobre la conexion ya abierta.
  repositorio = require('../src/datos/repositorio');
  modelos = mongoose.models;
  await Promise.all(Object.values(modelos).map((m) => m.init()));
});

afterEach(limpiar);
afterAll(bajar);

/** Documento crudo, leido con el driver y no con el modelo. */
function crudo(coleccion, filtro = {}) {
  return mongoose.connection.db.collection(coleccion).findOne(filtro);
}

function participante(extra = {}) {
  return { uuid: UUID, edad: 9, tramo: '8-17', ...extra };
}

function evento(extra = {}) {
  return {
    minijuego: 'MJ-1', bloque: 'bloque-1', numeroEnsayo: 1,
    presentado: 'estimulo-1', respuesta: 'estimulo-1', acierto: true,
    tiempoReaccionMs: 820, ...extra
  };
}

function respuestaCuidador(extra = {}) {
  return { escala: 'RC-01', item: 'RC-01-1', respuesta: 'a_veces', ...extra };
}

describe('CT-11 repositorio: participante', () => {
  test('guarda el participante y lo recupera por seudonimo como objeto plano', async () => {
    await repositorio.crearParticipante(participante({ sexo: 'f', region: 'Bogota' }));
    const leido = await repositorio.obtenerParticipante(UUID);
    expect(leido.uuid).toBe(UUID);
    expect(leido.edad).toBe(9);
    expect(leido.tramo).toBe('8-17');
    expect(leido).not.toBeInstanceOf(mongoose.Document);
  });

  test('aplica los ajustes sensoriales por defecto del Cuadro 19', async () => {
    await repositorio.crearParticipante(participante());
    const leido = await repositorio.obtenerParticipante(UUID);
    expect(leido.ajustesSensoriales).toEqual({
      volumen: 60, reduccionMovimiento: false, altoContraste: false, tamanoTipografico: 100
    });
  });

  test('devuelve null cuando el seudonimo no existe', async () => {
    expect(await repositorio.obtenerParticipante('no-existe')).toBeNull();
  });

  test.each([3, 18, 25])('rechaza la edad %i, fuera del alcance de 4 a 17', async (edad) => {
    await expect(repositorio.crearParticipante(participante({ edad }))).rejects.toThrow();
  });

  test('rechaza un seudonimo duplicado por el indice unico', async () => {
    await repositorio.crearParticipante(participante());
    await expect(repositorio.crearParticipante(participante({ edad: 10 }))).rejects.toThrow();
  });
});

describe('CT-12 repositorio: consentimiento', () => {
  const registro = {
    uuid: UUID,
    finalidades: { registro_conductual: true, devolucion_resultados: true, uso_academico_anonimizado: false },
    versionFormato: 'v1', fecha: new Date('2026-09-10'),
    asentimiento: { modalidad: 'pictografico', aceptado: true, fecha: new Date('2026-09-10') }
  };

  test('sin registro devuelve null, que es la puerta cerrada para exigirConsentimiento', async () => {
    expect(await repositorio.obtenerConsentimiento(UUID)).toBeNull();
  });

  test('recupera finalidades, asentimiento y estado de revocacion', async () => {
    await modelos.Consentimiento.create(registro);
    const leido = await repositorio.obtenerConsentimiento(UUID);
    expect(leido.finalidades.registro_conductual).toBe(true);
    expect(leido.finalidades.uso_academico_anonimizado).toBe(false);
    expect(leido.asentimiento.aceptado).toBe(true);
    expect(leido.asentimiento.modalidad).toBe('pictografico');
    expect(leido.revocado).toBe(false);
  });

  test('conserva la revocacion con su fecha', async () => {
    await modelos.Consentimiento.create({ ...registro, revocado: true, fechaRevocacion: new Date('2026-09-15') });
    const leido = await repositorio.obtenerConsentimiento(UUID);
    expect(leido.revocado).toBe(true);
    expect(leido.fechaRevocacion).toBeInstanceOf(Date);
  });
});

describe('CT-13 repositorio: sesion', () => {
  test('crea la sesion con la version del catalogo vigente y en curso', async () => {
    await repositorio.crearSesion({ uuid: UUID });
    const leida = await crudo('sesion', { uuid: UUID });
    expect(leida.versionCatalogo).toBe(VERSION_CATALOGO);
    expect(leida.estadoSesion).toBe('en_curso');
    expect(leida.repeticionesInstruccion).toBe(0);
  });

  test('respeta la version del catalogo que se le entrega', async () => {
    await repositorio.crearSesion({ uuid: UUID, versionCatalogo: '0.9.0-piloto' });
    const leida = await crudo('sesion', { uuid: UUID });
    expect(leida.versionCatalogo).toBe('0.9.0-piloto');
  });

  test('rechaza un estado de sesion que no este en RF-24', async () => {
    await expect(repositorio.crearSesion({ uuid: UUID, estadoSesion: 'pausada' })).rejects.toThrow();
  });
});

describe('RF-23 repositorio: eventos conductuales', () => {
  test('inserta el lote, cuenta los guardados e inyecta el seudonimo', async () => {
    const guardados = await repositorio.guardarEventos(UUID, [evento(), evento({ numeroEnsayo: 2 })]);
    expect(guardados).toBe(2);
    const todos = await modelos.EventoConductual.find({}).lean();
    expect(todos).toHaveLength(2);
    expect(todos.every((e) => e.uuid === UUID)).toBe(true);
  });

  test('el evento omitido se guarda como omitido y sin acierto', async () => {
    await repositorio.guardarEventos(UUID, [
      evento({ estadoItem: 'omitido', respuesta: undefined, acierto: undefined, tiempoReaccionMs: undefined })
    ]);
    const leido = await crudo('evento_conductual');
    expect(leido.estadoItem).toBe('omitido');
    expect(leido.acierto).toBeUndefined();
    expect(leido.respuesta).toBeUndefined();
  });

  test('RF-20 conserva las pausas ocurridas durante el item', async () => {
    await repositorio.guardarEventos(UUID, [evento({ tiempoReaccionMs: 1500, pausasDuranteItemMs: 400 })]);
    const leido = await crudo('evento_conductual');
    expect(leido.tiempoReaccionMs).toBe(1500);
    expect(leido.pausasDuranteItemMs).toBe(400);
  });

  test('CC-08 conserva la clasificacion perseverativa del error', async () => {
    await repositorio.guardarEventos(UUID, [
      evento({ minijuego: 'MJ-3', acierto: false, posteriorACambio: true, claseError: 'perseverativa' })
    ]);
    const leido = await crudo('evento_conductual');
    expect(leido.claseError).toBe('perseverativa');
    expect(leido.posteriorACambio).toBe(true);
  });

  test('rechaza una clase de error fuera del enum y no guarda nada', async () => {
    await expect(repositorio.guardarEventos(UUID, [evento({ claseError: 'inventada' })])).rejects.toThrow();
    expect(await modelos.EventoConductual.countDocuments()).toBe(0);
  });

  test('un lote vacio no guarda nada', async () => {
    expect(await repositorio.guardarEventos(UUID, [])).toBe(0);
  });
});

describe('RC-01 repositorio: reporte del cuidador', () => {
  test('inserta el lote, lo cuenta e inyecta el seudonimo', async () => {
    const guardadas = await repositorio.guardarReporteCuidador(UUID, [
      respuestaCuidador(), respuestaCuidador({ escala: 'RC-05', item: 'RC-05-1', respuesta: 'nunca' })
    ]);
    expect(guardadas).toBe(2);
    const todas = await modelos.RespuestaCuidador.find({}).lean();
    expect(todas.every((r) => r.uuid === UUID)).toBe(true);
    expect(todas[0].fecha).toBeInstanceOf(Date);
  });

  test('rechaza una escala que no sea RC-01 a RC-05', async () => {
    await expect(repositorio.guardarReporteCuidador(UUID, [respuestaCuidador({ escala: 'RC-09' })])).rejects.toThrow();
  });

  test('rechaza una respuesta fuera de las cuatro opciones de frecuencia', async () => {
    await expect(repositorio.guardarReporteCuidador(UUID, [respuestaCuidador({ respuesta: 'siempre' })])).rejects.toThrow();
  });
});

describe('CT-13 repositorio: armado de la sesion para puntuar', () => {
  test('devuelve null si la sesion no existe', async () => {
    expect(await repositorio.armarSesionParaPuntuar(UUID)).toBeNull();
  });

  test('entrega la forma que consume el motor, con contexto y pausas fusionados', async () => {
    await repositorio.crearSesion({
      uuid: UUID, estadoSesion: 'completada', repeticionesInstruccion: 2,
      pausas: [{ inicio: new Date('2026-09-10T10:00:00Z'), fin: new Date('2026-09-10T10:01:00Z'), duracionMs: 60000 }],
      contexto: { dispositivo: 'tablet', tipoEntrada: 'tactil', audioDesactivado: true }
    });
    await repositorio.guardarEventos(UUID, [evento(), evento({ minijuego: 'MJ-3', numeroEnsayo: 2 })]);
    await repositorio.guardarReporteCuidador(UUID, [respuestaCuidador()]);

    const armada = await repositorio.armarSesionParaPuntuar(UUID);
    expect(armada.uuid).toBe(UUID);
    expect(armada.estadoSesion).toBe('completada');
    expect(armada.versionCatalogo).toBe(VERSION_CATALOGO);
    expect(armada.contexto.dispositivo).toBe('tablet');
    expect(armada.contexto.audioDesactivado).toBe(true);
    expect(armada.contexto.repeticionesInstruccion).toBe(2);
    expect(armada.contexto.pausas).toHaveLength(1);
    expect(armada.eventos).toHaveLength(2);
    expect(armada.reporteCuidador).toHaveLength(1);
  });

  test('reparte los eventos entre los indicadores segun el minijuego de origen', async () => {
    await repositorio.crearSesion({ uuid: UUID, estadoSesion: 'completada' });
    await repositorio.guardarEventos(UUID, [
      evento({ minijuego: 'MJ-1', numeroEnsayo: 1 }),
      evento({ minijuego: 'MJ-1', numeroEnsayo: 2 }),
      evento({ minijuego: 'MJ-3', numeroEnsayo: 3 })
    ]);

    const { entrada } = await repositorio.armarSesionParaPuntuar(UUID);
    expect(entrada['CC-01']).toHaveLength(2);
    expect(entrada['CC-01'].every((e) => e.minijuego === 'MJ-1')).toBe(true);
    expect(entrada['CC-08']).toHaveLength(1);
    expect(entrada['CC-08'][0].minijuego).toBe('MJ-3');
    expect(entrada['CC-04']).toEqual([]);
  });

  test('no mezcla los eventos de otra sesion', async () => {
    await repositorio.crearSesion({ uuid: UUID, estadoSesion: 'completada' });
    await repositorio.guardarEventos(UUID, [evento()]);
    await repositorio.guardarEventos(OTRO_UUID, [evento(), evento({ numeroEnsayo: 2 })]);
    const armada = await repositorio.armarSesionParaPuntuar(UUID);
    expect(armada.eventos).toHaveLength(1);
  });
});

describe('RF-42 repositorio: puntuacion', () => {
  async function resultadoDeSesion() {
    await repositorio.crearSesion({ uuid: UUID, estadoSesion: 'completada' });
    await repositorio.guardarEventos(UUID, [
      evento({ minijuego: 'MJ-1', constructo: 'reconocimiento', numeroEnsayo: 1 }),
      evento({ minijuego: 'MJ-1', numeroEnsayo: 2, acierto: false })
    ]);
    await repositorio.guardarReporteCuidador(UUID, [respuestaCuidador(), respuestaCuidador({ item: 'RC-01-2' })]);
    return puntuar(await repositorio.armarSesionParaPuntuar(UUID));
  }

  test('guarda una fila por indicador y por escala, declarando el origen de cada dato', async () => {
    const resultado = await resultadoDeSesion();
    await repositorio.guardarPuntuacion(resultado);

    const filas = await modelos.Puntuacion.find({}).lean();
    const porIndicador = Object.fromEntries(filas.map((f) => [f.indicador, f]));
    expect(filas).toHaveLength(
      Object.keys(resultado.indicadores).length + Object.keys(resultado.escalasReporte).length
    );
    expect(porIndicador['CC-01'].origen).toBe('desempeno');
    expect(porIndicador['RC-01'].origen).toBe('reporte_informante');
    expect(filas.every((f) => f.origen === 'desempeno' || f.origen === 'reporte_informante')).toBe(true);
    expect(filas.every((f) => f.uuid === UUID)).toBe(true);
  });

  test('registra las versiones de algoritmo y catalogo, y versionAlgoritmo es inmutable', async () => {
    const resultado = await resultadoDeSesion();
    await repositorio.guardarPuntuacion(resultado);

    const antes = await modelos.Puntuacion.findOne({ indicador: 'CC-01' }).lean();
    expect(antes.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    expect(antes.versionCatalogo).toBe(VERSION_CATALOGO);

    await modelos.Puntuacion.updateOne({ _id: antes._id }, { versionAlgoritmo: '0.0.0-falsa' });
    const despues = await modelos.Puntuacion.findById(antes._id).lean();
    expect(despues.versionAlgoritmo).toBe(VERSION_ALGORITMO);
  });

  test('sin muestra normativa el percentil queda nulo y la fila provisional', async () => {
    const resultado = await resultadoDeSesion();
    await repositorio.guardarPuntuacion(resultado);
    const filas = await modelos.Puntuacion.find({}).lean();
    expect(filas.every((f) => f.percentil === null || f.percentil === undefined)).toBe(true);
    expect(filas.every((f) => f.provisional === true)).toBe(true);
  });

  test('RF-28 ninguna fila almacenada emite diagnostico, severidad ni puntaje global', async () => {
    const resultado = await resultadoDeSesion();
    await repositorio.guardarPuntuacion(resultado);

    const prohibido = /diagnost|diagnos|severidad|gravedad|nivelApoyo|nivel_apoyo|riesgo|banda|puntajeGlobal|puntaje_global|puntoDeCorte|corte|clasificacion|trastorno|positivo|negativo/i;
    const filas = await mongoose.connection.db.collection('puntuacion').find({}).toArray();
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const claves = Object.keys(fila).filter((k) => prohibido.test(k));
      expect(claves).toEqual([]);
      expect(typeof fila.valorObservado === 'string' ? fila.valorObservado : '').not.toMatch(prohibido);
    }
  });
});

describe('CT-11 ninguna coleccion conductual admite datos identificables', () => {
  /** Campos de identidad que solo pueden existir en `consentimiento`. */
  const IDENTIFICABLES = {
    nombre: 'Juan Perez',
    apellidos: 'Perez Gomez',
    nombreCompleto: 'Juan Perez Gomez',
    documento: '1020304050',
    numeroDocumento: '1020304050',
    tipoDocumento: 'TI',
    correo: 'acudiente@ejemplo.com',
    telefono: '3001234567',
    direccion: 'Calle 1 # 2-3',
    nombreAcudiente: 'Maria Gomez',
    institucionEducativa: 'Colegio Ejemplo',
    eps: 'EPS Ejemplo'
  };

  /** Un documento valido minimo por coleccion conductual. */
  const CONDUCTUALES = {
    participante: () => ({ modelo: 'Participante', doc: participante() }),
    sesion: () => ({ modelo: 'Sesion', doc: { uuid: UUID, versionCatalogo: VERSION_CATALOGO } }),
    evento_conductual: () => ({ modelo: 'EventoConductual', doc: { uuid: UUID, ...evento() } }),
    respuesta_cuidador: () => ({ modelo: 'RespuestaCuidador', doc: { uuid: UUID, ...respuestaCuidador() } }),
    puntuacion: () => ({
      modelo: 'Puntuacion',
      doc: {
        uuid: UUID, indicador: 'CC-01', valorObservado: 0.5, dominio: 'A2',
        origen: 'desempeno', versionAlgoritmo: VERSION_ALGORITMO, versionCatalogo: VERSION_CATALOGO
      }
    })
  };

  test.each(Object.keys(CONDUCTUALES))(
    'la coleccion %s descarta los campos identificables al escribirlos',
    async (coleccion) => {
      const { modelo, doc } = CONDUCTUALES[coleccion]();
      await modelos[modelo].create({ ...doc, ...IDENTIFICABLES });

      const almacenado = await crudo(coleccion);
      expect(almacenado).not.toBeNull();
      expect(almacenado.uuid).toBe(UUID);
      for (const campo of Object.keys(IDENTIFICABLES)) {
        expect(almacenado).not.toHaveProperty(campo);
      }
    }
  );

  test('los esquemas conductuales conservan el modo estricto, que es lo que descarta esos campos', () => {
    const porColeccion = Object.fromEntries(
      Object.values(esquemas).map((s) => [s.options.collection, s])
    );
    for (const coleccion of Object.keys(CONDUCTUALES)) {
      expect(porColeccion[coleccion].options.strict).not.toBe(false);
    }
  });

  test('consentimiento es la unica coleccion del Cuadro 19 exenta del barrido', () => {
    const barridas = Object.keys(CONDUCTUALES);
    expect(COLECCIONES.filter((c) => !barridas.includes(c)).sort()).toEqual(['consentimiento', 'profesional']);
  });
});

describe('CT-11 conexion a la base de datos', () => {
  test('falla con un mensaje que explica que copiar api/.env cuando falta MONGODB_URI', async () => {
    const previo = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      await expect(conectar()).rejects.toThrow(/MONGODB_URI/);
      await expect(conectar()).rejects.toThrow(/api\/\.env/);
    } finally {
      if (previo === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previo;
    }
    expect(MENSAJE_SIN_URI).toContain('api/.env.example');
  });

  test('deja la conexion abierta cuando recibe el URI explicito', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});
