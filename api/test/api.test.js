'use strict';
const request = require('supertest');
const { crearServidor } = require('../src/api/servidor');

function repositorioFalso(estado = {}) {
  const consentimientos = estado.consentimientos || {};
  const participantes = estado.participantes || {};
  const eventos = [];
  const reporte = [];
  return {
    eventos,
    reporte,
    async crearParticipante(p) { participantes[p.uuid] = { ...p, edad: p.edad }; return participantes[p.uuid]; },
    async obtenerParticipante(uuid) { return participantes[uuid] || null; },
    async obtenerConsentimiento(uuid) { return consentimientos[uuid] || null; },
    async guardarEventos(uuid, lote) { lote.forEach((e) => eventos.push({ uuid, ...e })); return lote.length; },
    async armarSesionParaPuntuar(uuid) { return estado.sesiones ? estado.sesiones[uuid] || null : null; },
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
