'use strict';
const request = require('supertest');
const { crearServidor } = require('../src/api/servidor');
const { revocar } = require('../src/dominio/privacidad/consentimiento');
const { contieneDatoIdentificable } = require('../src/dominio/privacidad/seudonimo');

function repositorioFalso(estado = {}) {
  const consentimientos = estado.consentimientos || {};
  const participantes = estado.participantes || {};
  const sesiones = estado.sesiones || {};
  const eventos = estado.eventos || [];
  const reporte = estado.reporte || [];
  const puntuaciones = estado.puntuaciones || [];

  // Vacia en el sitio las filas del seudonimo y devuelve cuantas elimino.
  function vaciarFilas(arreglo, uuid) {
    const restantes = arreglo.filter((f) => f.uuid !== uuid);
    const borradas = arreglo.length - restantes.length;
    arreglo.splice(0, arreglo.length, ...restantes);
    return borradas;
  }
  function vaciarClave(mapa, uuid) {
    if (!Object.prototype.hasOwnProperty.call(mapa, uuid)) return 0;
    delete mapa[uuid];
    return 1;
  }

  return {
    eventos,
    reporte,
    puntuaciones,
    consentimientos,
    participantes,
    sesiones,
    async marcarConsentimientoRevocado(uuid, fecha) {
      const actual = consentimientos[uuid];
      if (!actual) return null;
      const yaEstabaRevocado = actual.revocado === true;
      consentimientos[uuid] = revocar(actual, fecha);
      return { consentimiento: consentimientos[uuid], yaEstabaRevocado };
    },
    async suprimirDatosSesion(uuid) {
      return {
        participante: vaciarClave(participantes, uuid),
        sesion: vaciarClave(sesiones, uuid),
        evento_conductual: vaciarFilas(eventos, uuid),
        respuesta_cuidador: vaciarFilas(reporte, uuid),
        puntuacion: vaciarFilas(puntuaciones, uuid)
      };
    },
    async crearParticipante(p) { participantes[p.uuid] = { ...p, edad: p.edad }; return participantes[p.uuid]; },
    async obtenerParticipante(uuid) { return participantes[uuid] || null; },
    async obtenerConsentimiento(uuid) { return consentimientos[uuid] || null; },
    async guardarEventos(uuid, lote) { lote.forEach((e) => eventos.push({ uuid, ...e })); return lote.length; },
    async armarSesionParaPuntuar(uuid) { return sesiones[uuid] || null; },
    async guardarPuntuacion() { return true; },
    async guardarReporteCuidador(uuid, lote) { lote.forEach((r) => reporte.push({ uuid, ...r })); return lote.length; }
  };
}

const consentimientoOk = {
  finalidades: { registro_conductual: true, devolucion_resultados: true, uso_academico_anonimizado: true },
  versionFormato: 'v1', fecha: '2026-09-10', asentimiento: { aceptado: true }
};

describe('servidor', () => {
  test('expone un endpoint de salud', async () => {
    const res = await request(crearServidor(repositorioFalso())).get('/salud');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
  });
});

describe('creacion de sesiones', () => {
  test('crea la sesion con seudonimo y modalidad de asentimiento', async () => {
    const res = await request(crearServidor(repositorioFalso())).post('/api/sesiones').send({ edad: 9, region: 'Bogota' });
    expect(res.status).toBe(201);
    expect(res.body.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.tramo).toBe('8-17');
    expect(res.body.modalidadAsentimiento).toBe('pictografico');
  });
  test('rechaza una edad fuera del alcance del proyecto', async () => {
    const res = await request(crearServidor(repositorioFalso())).post('/api/sesiones').send({ edad: 25 });
    expect(res.status).toBe(400);
  });
  test('devuelve 404 al pedir el plan de una sesion inexistente', async () => {
    const res = await request(crearServidor(repositorioFalso())).get('/api/sesiones/no-existe/plan');
    expect(res.status).toBe(404);
  });
  test('entrega el plan de la sesion respetando el orden pedido', async () => {
    const app = crearServidor(repositorioFalso());
    const creada = await request(app).post('/api/sesiones').send({ edad: 6 });
    const res = await request(app).get('/api/sesiones/' + creada.body.uuid + '/plan?orden=MJ-3,MJ-1');
    expect(res.status).toBe(200);
    expect(res.body.secuencias.map((s) => s.minijuego)).toEqual(['MJ-3', 'MJ-1']);
    expect(res.body.cumpleCT08).toBe(true);
  });
});

describe('CT-12 y CT-14 como puerta del registro conductual', () => {
  test('sin consentimiento el registro se rechaza con 403', async () => {
    const app = crearServidor(repositorioFalso());
    const res = await request(app).post('/api/sesiones/abc/eventos').send({ eventos: [{ acierto: true }] });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('consentimiento_invalido');
  });
  test('con asentimiento negado tampoco se registra', async () => {
    const app = crearServidor(repositorioFalso({
      consentimientos: { abc: { ...consentimientoOk, asentimiento: { aceptado: false } } }
    }));
    const res = await request(app).post('/api/sesiones/abc/eventos').send({ eventos: [] });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('asentimiento_negado');
  });
  test('con consentimiento y asentimiento validos registra el lote', async () => {
    const repo = repositorioFalso({ consentimientos: { abc: consentimientoOk } });
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/eventos')
      .send({ eventos: [{ minijuego: 'MJ-1', acierto: true, tiempoReaccionMs: 900 }] });
    expect(res.status).toBe(201);
    expect(res.body.registrados).toBe(1);
    expect(repo.eventos).toHaveLength(1);
  });
});

describe('CT-11 rechazo de datos identificables', () => {
  test('un evento con nombre se rechaza con 422', async () => {
    const repo = repositorioFalso({ consentimientos: { abc: consentimientoOk } });
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/eventos')
      .send({ eventos: [{ nombre: 'Juan', acierto: true }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('dato_identificable_en_evento_conductual');
    expect(repo.eventos).toHaveLength(0);
  });
});

describe('puntuacion por API', () => {
  test('una sesion inexistente devuelve 404', async () => {
    const res = await request(crearServidor(repositorioFalso())).get('/api/sesiones/x/puntuacion');
    expect(res.status).toBe(404);
  });
  test('una sesion interrumpida devuelve 409 y no se procesa', async () => {
    const app = crearServidor(repositorioFalso({ sesiones: { x: { uuid: 'x', estadoSesion: 'interrumpida' } } }));
    const res = await request(app).get('/api/sesiones/x/puntuacion');
    expect(res.status).toBe(409);
    expect(res.body.procesada).toBe(false);
  });
  test('una sesion completada devuelve perfil, cobertura y version, sin banda', async () => {
    const app = crearServidor(repositorioFalso({
      sesiones: { x: { uuid: 'x', estadoSesion: 'completada', versionCatalogo: '1.0.0', entrada: {}, eventos: [] } }
    }));
    const res = await request(app).get('/api/sesiones/x/puntuacion');
    expect(res.status).toBe(200);
    expect(res.body.versionAlgoritmo).toBeTruthy();
    expect(res.body.avisos.noDiagnostico).toBe(true);
    expect(res.body).not.toHaveProperty('banda');
    expect(res.body.cobertura.combinada).toBe(1);
  });
});

describe('modulo de reporte del cuidador por API', () => {
  test('publica el instrumento con sus cinco escalas', async () => {
    const res = await request(crearServidor(repositorioFalso())).get('/api/sesiones/reporte/instrumento');
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(15);
    expect(Object.keys(res.body.escalas)).toHaveLength(5);
  });
  test('rechaza una respuesta fuera de la escala ordinal', async () => {
    const repo = repositorioFalso({ consentimientos: { abc: consentimientoOk } });
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/reporte')
      .send({ respuestas: [{ item: 'B1-1', respuesta: 'siempre' }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('respuesta_fuera_de_escala');
    expect(repo.reporte).toHaveLength(0);
  });
  test('sin consentimiento tampoco se registra el reporte', async () => {
    const res = await request(crearServidor(repositorioFalso())).post('/api/sesiones/abc/reporte')
      .send({ respuestas: [] });
    expect(res.status).toBe(403);
  });
  test('registra las respuestas validas', async () => {
    const repo = repositorioFalso({ consentimientos: { abc: consentimientoOk } });
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/reporte')
      .send({ respuestas: [{ escala: 'RC-03', item: 'B1-1', respuesta: 'a_veces' }] });
    expect(res.status).toBe(201);
    expect(repo.reporte).toHaveLength(1);
  });
});

describe('CT-12 revocacion con supresion efectiva por API', () => {
  const sesionPoblada = () => ({
    consentimientos: { abc: { ...consentimientoOk } },
    participantes: { abc: { uuid: 'abc', edad: 9, tramo: '8-17' } },
    sesiones: { abc: { uuid: 'abc', estadoSesion: 'completada', versionCatalogo: '1.0.0' } },
    eventos: [{ uuid: 'abc', minijuego: 'MJ-1' }, { uuid: 'abc', minijuego: 'MJ-3' }],
    reporte: [{ uuid: 'abc', escala: 'RC-05', item: 'B4-1' }],
    puntuaciones: [{ uuid: 'abc', indicador: 'CC-01' }, { uuid: 'otro', indicador: 'CC-01' }]
  });

  test('suprime los datos conductuales y conserva solo el consentimiento', async () => {
    const repo = repositorioFalso(sesionPoblada());
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/revocacion').send({});
    expect(res.status).toBe(200);
    expect(res.body.revocado).toBe(true);
    expect(res.body.yaEstabaRevocado).toBe(false);
    expect(res.body.fechaRevocacion).toBeTruthy();
    expect(res.body.suprimido).toEqual({
      participante: 1, sesion: 1, evento_conductual: 2, respuesta_cuidador: 1, puntuacion: 1
    });
    expect(res.body.conservado).toEqual(['consentimiento']);
    expect(repo.eventos).toHaveLength(0);
    expect(repo.reporte).toHaveLength(0);
    expect(repo.participantes.abc).toBeUndefined();
    expect(repo.sesiones.abc).toBeUndefined();
    expect(repo.consentimientos.abc.revocado).toBe(true);
    expect(repo.consentimientos.abc.finalidades.registro_conductual).toBe(false);
  });

  test('no toca los datos de otro seudonimo', async () => {
    const repo = repositorioFalso(sesionPoblada());
    await request(crearServidor(repo)).post('/api/sesiones/abc/revocacion').send({});
    expect(repo.puntuaciones).toEqual([{ uuid: 'otro', indicador: 'CC-01' }]);
  });

  test('revocar dos veces no falla y conserva la fecha de la primera', async () => {
    const repo = repositorioFalso(sesionPoblada());
    const app = crearServidor(repo);
    const primera = await request(app).post('/api/sesiones/abc/revocacion').send({});
    const segunda = await request(app).post('/api/sesiones/abc/revocacion').send({});
    expect(segunda.status).toBe(200);
    expect(segunda.body.yaEstabaRevocado).toBe(true);
    expect(segunda.body.fechaRevocacion).toBe(primera.body.fechaRevocacion);
    expect(segunda.body.suprimido).toEqual({
      participante: 0, sesion: 0, evento_conductual: 0, respuesta_cuidador: 0, puntuacion: 0
    });
  });

  test('un reintento termina de limpiar lo que quedo de un borrado a medias', async () => {
    const estado = sesionPoblada();
    // Simula una revocacion previa cuyo borrado no llego a ejecutarse.
    estado.consentimientos.abc = revocar(estado.consentimientos.abc, new Date('2026-09-20'));
    const repo = repositorioFalso(estado);
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/revocacion').send({});
    expect(res.status).toBe(200);
    expect(res.body.yaEstabaRevocado).toBe(true);
    expect(res.body.suprimido.evento_conductual).toBe(2);
    expect(repo.eventos).toHaveLength(0);
    expect(repo.participantes.abc).toBeUndefined();
  });

  test('tras revocar, el registro conductual queda cerrado con 403', async () => {
    const repo = repositorioFalso(sesionPoblada());
    const app = crearServidor(repo);
    await request(app).post('/api/sesiones/abc/revocacion').send({});
    const evento = await request(app).post('/api/sesiones/abc/eventos')
      .send({ eventos: [{ minijuego: 'MJ-1', acierto: true }] });
    expect(evento.status).toBe(403);
    expect(evento.body.error).toBe('consentimiento_revocado');
    expect(repo.eventos).toHaveLength(0);
    const reporte = await request(app).post('/api/sesiones/abc/reporte')
      .send({ respuestas: [{ escala: 'RC-03', item: 'B1-1', respuesta: 'a_veces' }] });
    expect(reporte.status).toBe(403);
  });

  test('un seudonimo sin consentimiento devuelve 404', async () => {
    const res = await request(crearServidor(repositorioFalso())).post('/api/sesiones/no-existe/revocacion').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('consentimiento_no_encontrado');
  });

  test('CT-11 la constancia devuelta no expone datos identificables', async () => {
    const repo = repositorioFalso(sesionPoblada());
    const res = await request(crearServidor(repo)).post('/api/sesiones/abc/revocacion').send({});
    expect(contieneDatoIdentificable(res.body)).toBe(false);
    expect(res.body.uuid).toBe('abc');
  });
});
