'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { USUARIO_PROFESIONAL, crearAdministrador, crearProfesional, iniciarSesion } = require('./ayudas/administrador');
const { CONSTANCIA, crearAppRegistro, profesionalConSesion, crearSesion, sesionEntregada } = require('./ayudas/registro');
const { envioDe } = require('./ayudas/envioRegistro');
const { Administrador, SesionRegistro, EnsayoRegistro } = require('../src/datos/modelos');
const { MENSAJES: MENSAJES_SESION, MS_VIGENCIA } = require('../src/dominio/registro/sesionRegistro');
const { MENSAJES } = require('../src/dominio/autenticacion');
const { AVISO_NO_DIAGNOSTICO, buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { VERSION_ALGORITMO, VERSION_CATALOGO } = require('../src/dominio/registro/version');
const { COLUMNAS_ENSAYOS, COLUMNAS_VALORES } = require('../src/dominio/registro/exportacion');
const { esSeudonimoValido } = require('../src/dominio/registro/seudonimo');

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), SesionRegistro.init(), EnsayoRegistro.init()]);
});
afterEach(limpiar);
afterAll(bajar);

const RUTA = '/api/admin/registro/sesiones';
const RESPUESTAS_SUS = [4, 2, 5, 1, 3, 2, 4, 3, 2, 4];

let app;
let reloj;
beforeEach(async () => {
  ({ app, reloj } = crearAppRegistro());
  await crearProfesional();
});

/** El profesional con la sesion iniciada en un navegador nuevo (la entrega cierra la anterior). */
async function entrar() {
  const agente = request.agent(app);
  await iniciarSesion(agente, { usuario: USUARIO_PROFESIONAL });
  return agente;
}

/**
 * Sesion aplicada de punta a punta: las dos tareas y el SUS. Entre las dos
 * tareas pasan `minutos` en el reloj de la prueba. Devuelve su seudonimo.
 */
async function sesionCompleta({ minutos = 0 } = {}) {
  const agente = await entrar();
  const { sesion, estado } = await sesionEntregada(agente);
  for (const tarea of ['cambio-regla', 'navon']) {
    if (tarea === 'navon') reloj.avanzar(minutos);
    await agente.put(`/api/registro/aplicacion/tareas/${tarea}`).send(envioDe(tarea, { semilla: estado.semilla })).expect(200);
  }
  await agente.put('/api/registro/aplicacion/sus').send({ version: estado.cuestionarioSus.version, respuestas: RESPUESTAS_SUS }).expect(200);
  return sesion.seudonimo;
}

describe('RS-05 las rutas del registro exigen sesion y rol profesional', () => {
  const RUTAS = [
    ['get', RUTA],
    ['post', RUTA],
    ['get', `${RUTA}/ABCD-2345`],
    ['post', `${RUTA}/ABCD-2345/entrega`],
    ['delete', `${RUTA}/ABCD-2345`],
    ['get', '/api/admin/registro/exportacion/ensayos.csv'],
    ['get', '/api/admin/registro/exportacion/valores.csv'],
    ['get', '/api/admin/registro/no-existe']
  ];

  test.each(RUTAS)('%s %s responde 401 sin sesion', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta).send(CONSTANCIA);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: MENSAJES.SIN_SESION });
  });

  test.each(RUTAS)('%s %s responde 403 a una cuenta de administrador', async (metodo, ruta) => {
    await crearAdministrador();
    const agente = request.agent(app);
    await iniciarSesion(agente);
    const res = await agente[metodo](ruta).send(CONSTANCIA);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: MENSAJES.SIN_PERMISO });
    expect(await SesionRegistro.countDocuments()).toBe(0);
  });

  test.each([
    ['get', '/api/admin/contenidos'],
    ['post', '/api/admin/contenidos'],
    ['get', '/api/admin/pasos-ruta'],
    ['get', '/api/admin/directorio'],
    ['get', '/api/admin/preguntas'],
    ['get', '/api/admin/recursos'],
    ['get', '/api/admin/mensajes'],
    ['delete', '/api/admin/mensajes/66f000000000000000000000'],
    ['get', '/api/admin/ruta-que-no-existe']
  ])('%s %s responde 403 a una cuenta de profesional', async (metodo, ruta) => {
    const agente = await entrar();
    const res = await agente[metodo](ruta).send({ titulo: 'x' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: MENSAJES.SIN_PERMISO });
  });

  test('con la cuenta de profesional, una ruta del registro que no existe responde 404', async () => {
    const agente = await entrar();
    expect((await agente.get('/api/admin/registro/no-existe')).status).toBe(404);
  });

  test('las dos cuentas ven su usuario y su rol, y cierran sesion igual', async () => {
    const agente = await entrar();
    expect((await agente.get('/api/admin/sesion')).body).toEqual({ usuario: 'profesional.registro', rol: 'profesional' });
    expect((await agente.delete('/api/admin/sesion')).status).toBe(204);
    expect((await agente.get('/api/admin/sesion')).status).toBe(401);
  });
});

describe('HU-16 nueva sesion con la constancia del consentimiento', () => {
  test('con las dos marcas crea la sesion con un seudonimo XXXX-XXXX, reloj animacion y sin datos de la persona', async () => {
    const agente = await entrar();
    const res = await agente.post(RUTA).send(CONSTANCIA);
    expect(res.status).toBe(201);
    expect(esSeudonimoValido(res.body.seudonimo)).toBe(true);
    expect(res.body).toMatchObject({
      estado: 'en_curso',
      entregada: false,
      tareasRecibidas: [],
      susRespondido: false,
      versionConsentimiento: '1.0',
      versionCatalogo: VERSION_CATALOGO,
      reloj: 'animacion',
      navegador: null,
      valores: { procesada: false, avisos: { texto: AVISO_NO_DIAGNOSTICO } }
    });
    expect(res.body).not.toHaveProperty('semilla');
    expect(res.body).not.toHaveProperty('profesional');

    const guardada = await SesionRegistro.findOne().lean();
    expect(guardada.constancia).toEqual(CONSTANCIA);
    expect(guardada.reloj).toBe('animacion');
    expect(Number.isInteger(guardada.semilla)).toBe(true);
  });

  test.each([
    ['sin la marca del consentimiento', { consentimientoFirmado: false }, ['consentimientoFirmado']],
    ['sin la marca de mayoria de edad', { mayorDeEdad: false }, ['mayorDeEdad']],
    ['sin ninguna de las dos', { consentimientoFirmado: undefined, mayorDeEdad: undefined }, ['consentimientoFirmado', 'mayorDeEdad']],
    ['sin la version del formato', { versionConsentimiento: '' }, ['versionConsentimiento']]
  ])('%s no crea la sesion (422)', async (_caso, cambio, campos) => {
    const agente = await entrar();
    const res = await agente.post(RUTA).send({ ...CONSTANCIA, ...cambio });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.campos).sort()).toEqual(campos);
    expect(await SesionRegistro.countDocuments()).toBe(0);
  });

  test('CT-11 un campo identificable o cualquier otro campo responde 400', async () => {
    const agente = await entrar();
    for (const extra of [{ nombre: 'Ana' }, { documento: '123' }, { edad: 30 }]) {
      const res = await agente.post(RUTA).send({ ...CONSTANCIA, ...extra });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(MENSAJES_SESION.SOLO_CAMPOS);
    }
    expect(await SesionRegistro.countDocuments()).toBe(0);
  });

  test('CT-11 el seudonimo tiene indice unico: si el generado ya existe, se genera otro', async () => {
    const seudonimo = require('../src/dominio/registro/seudonimo');
    const agente = await entrar();
    const primera = await crearSesion(agente);
    const espia = jest
      .spyOn(seudonimo, 'generarSeudonimo')
      .mockReturnValueOnce(primera.seudonimo)
      .mockReturnValueOnce('WXYZ-2345');
    try {
      const segunda = await crearSesion(agente);
      expect(segunda.seudonimo).toBe('WXYZ-2345');
    } finally {
      espia.mockRestore();
    }
    const repetida = new SesionRegistro({ ...(await SesionRegistro.findOne().lean()), _id: undefined });
    await expect(repetida.save()).rejects.toMatchObject({ code: 11000 });
  });
});

describe('HU-18 / RF-15 sesiones del profesional y sus valores', () => {
  test('la lista trae solo las suyas, por seudonimo y con su estado, sin valores', async () => {
    const agente = await entrar();
    const otro = await profesionalConSesion(app, { usuario: 'otro.profesional' });
    const mia = await crearSesion(agente);
    reloj.avanzar(1);
    const segunda = await crearSesion(agente);
    const ajena = await crearSesion(otro);

    const res = await agente.get(RUTA);
    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.seudonimo)).toEqual([segunda.seudonimo, mia.seudonimo]);
    expect(res.body[0]).toEqual({
      seudonimo: segunda.seudonimo,
      estado: 'en_curso',
      creadaEn: expect.any(String),
      entregada: false,
      tareasRecibidas: [],
      susRespondido: false
    });
    expect((await agente.get(`${RUTA}/${ajena.seudonimo}`)).status).toBe(404);
    expect((await agente.delete(`${RUTA}/${ajena.seudonimo}`)).status).toBe(404);
    expect((await agente.post(`${RUTA}/${ajena.seudonimo}/entrega`)).status).toBe(404);
  });

  test('una sesion completa muestra los valores por tarea con el aviso y la version del algoritmo (CT-13)', async () => {
    const seudonimo = await sesionCompleta();
    const agente = await entrar();
    const res = await agente.get(`${RUTA}/${encodeURIComponent(seudonimo.toLowerCase().replace('-', ' '))}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      seudonimo,
      estado: 'completada',
      tareasRecibidas: ['cambio-regla', 'navon'],
      susRespondido: true,
      valorSUS: 65,
      navegador: 'Firefox 131',
      reloj: 'animacion'
    });
    const { valores } = res.body;
    expect(valores.procesada).toBe(true);
    expect(valores.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    expect(valores.avisos.texto).toBe(AVISO_NO_DIAGNOSTICO);
    expect(valores.tareas['cambio-regla'].indicadores.map((i) => i.codigo)).toEqual(['CC-08', 'CC-09', 'CC-12']);
    expect(valores.tareas.navon.indicadores.map((i) => i.codigo)).toEqual(['CC-10']);
    const cc12 = valores.tareas['cambio-regla'].indicadores.find((i) => i.codigo === 'CC-12');
    expect(cc12).toHaveProperty('criterioAlcanzado');
  });

  test('RF-15 una sesion incompleta se guarda pero no muestra valores', async () => {
    const agente = await entrar();
    const { sesion, estado } = await sesionEntregada(agente);
    await agente.put('/api/registro/aplicacion/tareas/cambio-regla').send(envioDe('cambio-regla', { semilla: estado.semilla })).expect(200);
    await agente.post('/api/registro/aplicacion/interrupcion').expect(200);

    const profesional = await entrar();
    const res = await profesional.get(`${RUTA}/${sesion.seudonimo}`);
    expect(res.body).toMatchObject({ estado: 'interrumpida', tareasRecibidas: ['cambio-regla'] });
    expect(res.body.valores).toEqual({
      procesada: false,
      motivo: 'sesion_no_completada',
      avisos: { texto: AVISO_NO_DIAGNOSTICO, soloValoresObservados: true }
    });
    expect(await EnsayoRegistro.countDocuments()).toBe(44);
  });

  test('una sesion en curso que no se completa en 2 horas queda abandonada', async () => {
    const agente = await entrar();
    const sesion = await crearSesion(agente);
    // La sesion del panel vence a los 30 minutos sin actividad: se vuelve a entrar.
    reloj.avanzar(MS_VIGENCIA / 60000 - 1);
    let profesional = await entrar();
    expect((await profesional.get(`${RUTA}/${sesion.seudonimo}`)).body.estado).toBe('en_curso');
    reloj.avanzar(1);
    profesional = await entrar();
    expect((await profesional.get(`${RUTA}/${sesion.seudonimo}`)).body.estado).toBe('abandonada');
    const entrega = await profesional.post(`${RUTA}/${sesion.seudonimo}/entrega`);
    expect(entrega.status).toBe(409);
  });

  test('un seudonimo mal escrito responde 400', async () => {
    const agente = await entrar();
    const res = await agente.get(`${RUTA}/ABCD-0000`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(MENSAJES_SESION.SEUDONIMO_INVALIDO);
  });

  test('M-09 / RCN-03 ninguna respuesta de las rutas del registro tiene vocabulario prohibido', async () => {
    const seudonimo = await sesionCompleta();
    const agente = await entrar();
    const incompleta = await crearSesion(agente);
    const respuestas = [
      await agente.get(RUTA),
      await agente.get(`${RUTA}/${seudonimo}`),
      await agente.get(`${RUTA}/${incompleta.seudonimo}`),
      await agente.post(RUTA).send({ ...CONSTANCIA, mayorDeEdad: false }),
      await agente.post(RUTA).send({ ...CONSTANCIA, nombre: 'x' }),
      await agente.get(`${RUTA}/ABCD-0000`)
    ];
    for (const res of respuestas) expect(buscarVocabularioProhibido(res.body)).toEqual([]);
    for (const archivo of ['ensayos.csv', 'valores.csv']) {
      const res = await agente.get(`/api/admin/registro/exportacion/${archivo}`);
      expect(buscarVocabularioProhibido(res.text)).toEqual([]);
    }
  });
});

describe('HU-19 exportacion en CSV', () => {
  const filas = (texto) => texto.trimEnd().split('\r\n').map((linea) => linea.split(','));

  test('ensayos.csv: un ensayo por fila con seudonimo, versiones, reloj y navegador', async () => {
    const seudonimo = await sesionCompleta();
    const agente = await entrar();
    const incompleta = await crearSesion(agente);
    const res = await agente.get('/api/admin/registro/exportacion/ensayos.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="registro-ensayos.csv"');
    expect(res.headers['cache-control']).toBe('no-store');

    const [cabecera, ...datos] = filas(res.text);
    expect(cabecera).toEqual([...COLUMNAS_ENSAYOS]);
    expect(datos).toHaveLength(74);
    const fila = Object.fromEntries(cabecera.map((c, i) => [c, datos[50][i]]));
    expect(fila).toMatchObject({
      seudonimo,
      estadoSesion: 'completada',
      versionAlgoritmo: VERSION_ALGORITMO,
      versionCatalogo: VERSION_CATALOGO,
      reloj: 'animacion',
      navegador: 'Firefox 131',
      tarea: 'navon'
    });
    expect(datos[0][cabecera.indexOf('tarea')]).toBe('cambio-regla');
    expect(datos[0][cabecera.indexOf('numero')]).toBe('1');
    // Punto decimal y vacio para null
    expect(datos.some((d) => /^\d+\.\d+$/.test(d[cabecera.indexOf('tiempoReaccionMs')]))).toBe(true);
    expect(datos[0][cabecera.indexOf('fase')]).toBe('');
    expect(res.text).not.toContain(incompleta.seudonimo);
  });

  test('valores.csv: una sesion por fila, con los valores, el SUS y las incompletas sin valores', async () => {
    const seudonimo = await sesionCompleta({ minutos: 12.5 });
    // Entregada, con una sola tarea recibida
    const participante = await entrar();
    const aMedias = await sesionEntregada(participante);
    await participante
      .put('/api/registro/aplicacion/tareas/cambio-regla')
      .send(envioDe('cambio-regla', { semilla: aMedias.estado.semilla }))
      .expect(200);
    const agente = await entrar();
    const incompleta = await crearSesion(agente);
    const res = await agente.get('/api/admin/registro/exportacion/valores.csv');
    expect(res.headers['content-disposition']).toBe('attachment; filename="registro-valores-sus.csv"');
    const [cabecera, ...datos] = filas(res.text);
    expect(cabecera).toEqual([...COLUMNAS_VALORES]);
    expect(cabecera).toEqual(expect.arrayContaining(['cc08', 'cc09', 'cc12', 'cc12CriterioAlcanzado', 'cc10', 'valorSUS']));
    expect(cabecera.join(',')).not.toMatch(/puntaje/i);
    const porSeudonimo = Object.fromEntries(datos.map((d) => [d[0], Object.fromEntries(cabecera.map((c, i) => [c, d[i]]))]));

    expect(porSeudonimo[seudonimo]).toMatchObject({
      estado: 'completada',
      entregada: 'true',
      duracionMin: '12.5',
      versionAlgoritmo: VERSION_ALGORITMO,
      versionCatalogo: VERSION_CATALOGO,
      reloj: 'animacion',
      navegador: 'Firefox 131',
      sus01: '4',
      sus10: '4',
      valorSUS: '65',
      tipoEntrada: 'teclado',
      pausas: '3',
      repeticionesInstruccion: '1'
    });
    expect(porSeudonimo[seudonimo].cc08).not.toBe('');
    expect(porSeudonimo[seudonimo].cc10).not.toBe('');
    // CT-08: la duracion solo existe en las completas; entregada separa las que nunca se aplicaron
    expect(porSeudonimo[aMedias.sesion.seudonimo]).toMatchObject({ estado: 'en_curso', entregada: 'true', duracionMin: '', cc08: '' });
    expect(porSeudonimo[incompleta.seudonimo]).toMatchObject({
      estado: 'en_curso',
      entregada: 'false',
      duracionMin: '',
      versionAlgoritmo: '',
      cc08: '',
      valorSUS: ''
    });
  });

  test('otro profesional no recibe sesiones ajenas', async () => {
    await sesionCompleta();
    const otro = await profesionalConSesion(app, { usuario: 'otro.profesional' });
    const ensayos = await otro.get('/api/admin/registro/exportacion/ensayos.csv');
    const valores = await otro.get('/api/admin/registro/exportacion/valores.csv');
    expect(ensayos.text).toBe(`${COLUMNAS_ENSAYOS.join(',')}\r\n`);
    expect(valores.text).toBe(`${COLUMNAS_VALORES.join(',')}\r\n`);
  });
});

describe('HU-19 eliminar una sesion por su seudonimo', () => {
  test('borra la sesion y todos sus ensayos; el seudonimo se puede escribir en minusculas y con espacio', async () => {
    const seudonimo = await sesionCompleta();
    const agente = await entrar();
    const otra = await crearSesion(agente);
    expect(await EnsayoRegistro.countDocuments()).toBe(74);

    const res = await agente.delete(`${RUTA}/${encodeURIComponent(` ${seudonimo.toLowerCase().replace('-', ' ')} `)}`);
    expect(res.status).toBe(204);
    expect(await EnsayoRegistro.countDocuments()).toBe(0);
    expect(await SesionRegistro.countDocuments({ seudonimo })).toBe(0);
    expect(await SesionRegistro.countDocuments({ seudonimo: otra.seudonimo })).toBe(1);
    expect((await agente.delete(`${RUTA}/${seudonimo}`)).status).toBe(404);
  });
});
