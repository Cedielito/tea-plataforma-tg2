'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { USUARIO_PROFESIONAL, crearProfesional, iniciarSesion, cookieDeSesion } = require('./ayudas/administrador');
const { CONSTANCIA, crearAppRegistro, sesionEntregada } = require('./ayudas/registro');
const { envioDe } = require('./ayudas/envioRegistro');
const { Administrador, SesionRegistro, EnsayoRegistro } = require('../src/datos/modelos');
const { MENSAJES } = require('../src/api/rutas/aplicacionRegistro');
const { MENSAJES: MENSAJES_ENVIO } = require('../src/dominio/registro/envioTarea');
const { MS_VIGENCIA } = require('../src/dominio/registro/sesionRegistro');
const { planificarSesion } = require('../src/dominio/registro/secuenciador');
const { procesarSesion } = require('../src/dominio/registro/motor');
const { VERSION_ALGORITMO } = require('../src/dominio/registro/version');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { calcularValorSUS } = require('../src/dominio/registro/sus');

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), SesionRegistro.init(), EnsayoRegistro.init()]);
});
afterEach(limpiar);
afterAll(bajar);

const APLICACION = '/api/registro/aplicacion';
const RESPUESTAS_SUS = [5, 1, 5, 2, 4, 1, 5, 1, 4, 2];

let app;
let reloj;
beforeEach(async () => {
  ({ app, reloj } = crearAppRegistro());
  await crearProfesional();
});

async function entrar() {
  const agente = request.agent(app);
  await iniciarSesion(agente, { usuario: USUARIO_PROFESIONAL });
  return agente;
}

const enviarTarea = (agente, tarea, semilla, cambios) =>
  agente.put(`${APLICACION}/tareas/${tarea}`).send(envioDe(tarea, { semilla, ...cambios }));

describe('M-09 la entrega del dispositivo separa al participante del panel', () => {
  test('cierra la sesion del profesional y entrega una cookie solo para la aplicacion', async () => {
    const agente = await entrar();
    const { entrega } = await sesionEntregada(agente);

    const panel = cookieDeSesion(entrega);
    expect(panel).toMatch(/^sesion_admin=;/);
    const aplicacion = cookieDeSesion(entrega, 'aplicacion_registro');
    expect(aplicacion).toContain('HttpOnly');
    expect(aplicacion).toContain('SameSite=Strict');
    expect(aplicacion).toContain('Path=/api/registro/aplicacion');
    expect(aplicacion).not.toMatch(/Max-Age|Expires/);

    // El navegador del participante ya no entra al panel, ni a la lista de sesiones.
    expect((await agente.get('/api/admin/sesion')).status).toBe(401);
    expect((await agente.get('/api/admin/registro/sesiones')).status).toBe(401);
    const cuenta = await Administrador.findOne({ usuario: USUARIO_PROFESIONAL }).lean();
    expect(cuenta.sesiones).toEqual([]);
  });

  test('en produccion la cookie de aplicacion lleva Secure', async () => {
    const { app: appProduccion } = crearAppRegistro({ produccion: true });
    // Con Secure, supertest (http) no devuelve la cookie sola: se envia a mano.
    const acceso = await iniciarSesion(request(appProduccion), { usuario: USUARIO_PROFESIONAL });
    const cookie = cookieDeSesion(acceso).split(';')[0];
    const creada = await request(appProduccion).post('/api/admin/registro/sesiones').set('Cookie', cookie).send(CONSTANCIA);
    const res = await request(appProduccion)
      .post(`/api/admin/registro/sesiones/${creada.body.seudonimo}/entrega`)
      .set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(cookieDeSesion(res, 'aplicacion_registro')).toContain('Secure');
  });

  test('el estado de la aplicacion trae el plan, la semilla y el SUS, sin seudonimo ni valores', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);
    const guardada = await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).lean();
    expect(estado).toEqual({
      estado: 'en_curso',
      tareasRecibidas: [],
      susRespondido: false,
      plan: planificarSesion(),
      versionCatalogo: guardada.versionCatalogo,
      semilla: guardada.semilla,
      reloj: 'animacion',
      cuestionarioSus: {
        version: expect.any(String),
        escala: expect.objectContaining({ minimo: 1, maximo: 5 }),
        items: expect.any(Array)
      }
    });
    expect(estado.cuestionarioSus.items).toHaveLength(10);
    expect(JSON.stringify(estado)).not.toContain(sesion.seudonimo);
    expect(buscarVocabularioProhibido(estado)).toEqual([]);
  });

  test('CT-11 del navegador se guardan solo la familia y la version mayor', async () => {
    const agente = await entrar();
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68';
    const { sesion } = await sesionEntregada(agente, { userAgent });
    const guardada = await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).lean();
    expect(guardada.navegador).toBe('Edge 130');
    expect(JSON.stringify(guardada)).not.toContain('Mozilla');
    expect(JSON.stringify(guardada)).not.toContain('Windows');
  });

  test('sin cookie, con una inventada o con la de otra sesion ya terminada, responde 401', async () => {
    expect((await request(app).get(APLICACION)).status).toBe(401);
    const res = await request(app).get(APLICACION).set('Cookie', `aplicacion_registro=${'a'.repeat(43)}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: MENSAJES.SIN_APLICACION });
    expect((await request(app).put(`${APLICACION}/sus`).send({})).status).toBe(401);
  });

  test('una nueva entrega antes de empezar reemplaza la cookie anterior; despues de una tarea no se puede', async () => {
    const primero = await entrar();
    const { sesion } = await sesionEntregada(primero);
    const segundo = await entrar();
    await segundo.post(`/api/admin/registro/sesiones/${sesion.seudonimo}/entrega`).expect(204);
    expect((await primero.get(APLICACION)).status).toBe(401);

    const { body: estado } = await segundo.get(APLICACION).expect(200);
    await enviarTarea(segundo, 'cambio-regla', estado.semilla).expect(200);
    const tercero = await entrar();
    expect((await tercero.post(`/api/admin/registro/sesiones/${sesion.seudonimo}/entrega`)).status).toBe(409);
  });
});

describe('M-09 envio de las tareas al terminar cada una', () => {
  test('cada tarea se guarda como ensayos y con la ultima la sesion queda completa y procesada (CT-13)', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);

    const primera = await enviarTarea(agente, 'cambio-regla', estado.semilla);
    expect(primera.status).toBe(200);
    expect(primera.body).toEqual({ estado: 'en_curso', tareasRecibidas: ['cambio-regla'], susRespondido: false });
    expect(await EnsayoRegistro.countDocuments()).toBe(44);

    const segunda = await enviarTarea(agente, 'navon', estado.semilla);
    expect(segunda.body).toEqual({ estado: 'completada', tareasRecibidas: ['cambio-regla', 'navon'], susRespondido: false });
    expect(await EnsayoRegistro.countDocuments()).toBe(74);

    const guardada = await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).lean();
    expect(guardada.contexto).toEqual({ tipoEntrada: 'teclado', pausas: 3, repeticionesInstruccion: 1 });
    expect(guardada.resultado.versionAlgoritmo).toBe(VERSION_ALGORITMO);

    // Lo guardado es lo mismo que procesarSesion con los ensayos de la web.
    const ensayos = [...envioDe('cambio-regla').ensayos, ...envioDe('navon').ensayos];
    const esperado = procesarSesion({ ...guardada, estado: 'completada', ensayos, contexto: guardada.contexto });
    const cc = (salida) =>
      Object.fromEntries(
        Object.values(salida.tareas).flatMap((t) => t.indicadores.map((i) => [i.codigo, i.observado]))
      );
    const guardadoPorCodigo = Object.fromEntries(
      guardada.resultado.tareas.flatMap((t) => t.indicadores.map((i) => [i.codigo, i.observado]))
    );
    expect(guardadoPorCodigo).toEqual(cc(esperado));
  });

  test('un envio repetido responde 200 y no duplica los ensayos', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'cambio-regla', estado.semilla).expect(200);
    const otraVez = await enviarTarea(agente, 'cambio-regla', estado.semilla);
    expect(otraVez.status).toBe(200);
    expect(otraVez.body.tareasRecibidas).toEqual(['cambio-regla']);
    expect(await EnsayoRegistro.countDocuments()).toBe(44);
  });

  test('si quedaron ensayos de un intento a medias, el reintento los reemplaza', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);
    const guardada = await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).lean();
    const ensayos = envioDe('navon', { semilla: estado.semilla }).ensayos.slice(0, 5);
    await EnsayoRegistro.insertMany(ensayos.map((e) => ({ ...e, sesion: guardada._id })));

    await enviarTarea(agente, 'navon', estado.semilla).expect(200);
    expect(await EnsayoRegistro.countDocuments({ tarea: 'navon' })).toBe(30);
  });

  test('las tareas pueden llegar en otro orden si un envio fallo', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'navon', estado.semilla).expect(200);
    const res = await enviarTarea(agente, 'cambio-regla', estado.semilla);
    expect(res.body.estado).toBe('completada');
  });

  test.each([
    ['otro reloj', { reloj: 'referencia' }, 422, MENSAJES_ENVIO.RELOJ_DISTINTO],
    ['otra version del catalogo', { versionCatalogo: '1.0.0' }, 409, MENSAJES_ENVIO.CATALOGO_DISTINTO],
    ['un campo de mas', { tipoEntrada: 'teclado' }, 400, MENSAJES_ENVIO.SOLO_CAMPOS],
    ['ensayos incompletos', { ensayos: [] }, 422, MENSAJES_ENVIO.ENSAYOS_INCOMPLETOS]
  ])('rechaza un envio con %s y no guarda nada', async (_caso, cambios, estadoHttp, error) => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    const res = await enviarTarea(agente, 'cambio-regla', estado.semilla, cambios);
    expect(res.status).toBe(estadoHttp);
    expect(res.body).toEqual({ error });
    expect(await EnsayoRegistro.countDocuments()).toBe(0);
    expect((await agente.get(APLICACION)).body.tareasRecibidas).toEqual([]);
  });

  test('una semilla distinta de la de la sesion responde 422', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    const res = await enviarTarea(agente, 'navon', estado.semilla === 1 ? 2 : 1);
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: MENSAJES_ENVIO.SEMILLA_DISTINTA });
  });

  test('CT-11 un dato identificable en un ensayo no se guarda (422)', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    const envio = envioDe('navon', { semilla: estado.semilla });
    envio.ensayos[3].nombre = 'Ana';
    const res = await agente.put(`${APLICACION}/tareas/navon`).send(envio);
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).not.toContain('Ana');
    expect(await EnsayoRegistro.countDocuments()).toBe(0);
  });

  test('CT-11 un campo que el esquema no conoce no se guarda, y la respuesta no repite lo enviado', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    const envio = envioDe('navon', { semilla: estado.semilla });
    envio.ensayos[3].comentario = 'texto libre';
    let res = await agente.put(`${APLICACION}/tareas/navon`).send(envio);
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: MENSAJES.NO_GUARDADO });

    const otro = envioDe('navon', { semilla: estado.semilla });
    otro.ensayos[4].estadoItem = 'adivinado';
    res = await agente.put(`${APLICACION}/tareas/navon`).send(otro);
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).not.toContain('adivinado');
    expect(await EnsayoRegistro.countDocuments()).toBe(0);
  });

  test('una tarea que no esta en el plan responde 404', async () => {
    const agente = await entrar();
    await sesionEntregada(agente);
    expect((await agente.put(`${APLICACION}/tareas/otra`).send({})).status).toBe(404);
  });
});

describe('M-09 cuestionario SUS al final', () => {
  test('guarda las respuestas y el valorSUS sin devolverlo; al terminar todo retira la cookie', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'cambio-regla', estado.semilla).expect(200);
    await enviarTarea(agente, 'navon', estado.semilla).expect(200);

    const res = await agente.put(`${APLICACION}/sus`).send({ version: estado.cuestionarioSus.version, respuestas: RESPUESTAS_SUS });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'completada', tareasRecibidas: ['cambio-regla', 'navon'], susRespondido: true });
    expect(JSON.stringify(res.body)).not.toMatch(/valor/i);
    expect(cookieDeSesion(res, 'aplicacion_registro')).toMatch(/^aplicacion_registro=;/);

    const guardada = await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).select('+tokenAplicacionHash').lean();
    expect(guardada.sus).toMatchObject({
      respuestas: RESPUESTAS_SUS,
      valorSUS: calcularValorSUS(RESPUESTAS_SUS),
      version: estado.cuestionarioSus.version
    });
    expect(guardada.tokenAplicacionHash).toBeUndefined();
    expect((await agente.get(APLICACION)).status).toBe(401);
  });

  test('si el SUS llega antes que una tarea, la cookie sigue sirviendo hasta que llegue', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'cambio-regla', estado.semilla).expect(200);
    await agente.put(`${APLICACION}/sus`).send({ version: estado.cuestionarioSus.version, respuestas: RESPUESTAS_SUS }).expect(200);
    const repetido = await agente.put(`${APLICACION}/sus`).send({ version: estado.cuestionarioSus.version, respuestas: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] });
    expect(repetido.status).toBe(200);
    expect((await SesionRegistro.findOne().lean()).sus.respuestas).toEqual(RESPUESTAS_SUS);

    const ultima = await enviarTarea(agente, 'navon', estado.semilla);
    expect(ultima.body).toEqual({ estado: 'completada', tareasRecibidas: ['cambio-regla', 'navon'], susRespondido: true });
    expect((await agente.get(APLICACION)).status).toBe(401);
  });

  test('respuestas incompletas responden 422 y otra version, 409', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    let res = await agente.put(`${APLICACION}/sus`).send({ version: estado.cuestionarioSus.version, respuestas: [3, 3] });
    expect(res.status).toBe(422);
    res = await agente.put(`${APLICACION}/sus`).send({ version: 'otra', respuestas: RESPUESTAS_SUS });
    expect(res.status).toBe(409);
    expect((await SesionRegistro.findOne().lean()).sus).toBeUndefined();
  });

  test('sin cuestionario disponible responde 503 y la aplicacion lo dice en el estado', async () => {
    const sinSus = { obtener: async () => null, cargar: async () => null };
    const prueba = crearAppRegistro({ cuestionarioSus: sinSus });
    const agente = request.agent(prueba.app);
    await iniciarSesion(agente, { usuario: USUARIO_PROFESIONAL });
    const { estado } = await sesionEntregada(agente);
    expect(estado.cuestionarioSus).toBeNull();
    const res = await agente.put(`${APLICACION}/sus`).send({ version: 'x', respuestas: RESPUESTAS_SUS });
    expect(res.status).toBe(503);
  });
});

describe('RF-15 recarga a mitad de una tarea y vencimiento', () => {
  test('con una tarea pendiente, la interrupcion deja la sesion interrumpida y retira la cookie', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'cambio-regla', estado.semilla).expect(200);
    const res = await agente.post(`${APLICACION}/interrupcion`);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('interrumpida');
    expect(cookieDeSesion(res, 'aplicacion_registro')).toMatch(/^aplicacion_registro=;/);
    expect((await enviarTarea(agente, 'navon', estado.semilla)).status).toBe(401);
    expect((await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).lean()).estado).toBe('interrumpida');
  });

  test('con las dos tareas recibidas, la interrupcion no cambia nada y el SUS sigue disponible', async () => {
    const agente = await entrar();
    const { estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'cambio-regla', estado.semilla).expect(200);
    await enviarTarea(agente, 'navon', estado.semilla).expect(200);
    const res = await agente.post(`${APLICACION}/interrupcion`);
    expect(res.body.estado).toBe('completada');
    expect((await agente.get(APLICACION)).status).toBe(200);
  });

  test('a las 2 horas de creada la cookie deja de servir y la sesion queda abandonada', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);
    await enviarTarea(agente, 'cambio-regla', estado.semilla).expect(200);
    reloj.avanzar(MS_VIGENCIA / 60000);
    const res = await enviarTarea(agente, 'navon', estado.semilla);
    expect(res.status).toBe(401);
    expect((await SesionRegistro.findOne({ seudonimo: sesion.seudonimo }).lean()).estado).toBe('abandonada');
  });
});
