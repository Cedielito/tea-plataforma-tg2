'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { USUARIO_PROFESIONAL, crearProfesional, iniciarSesion } = require('./ayudas/administrador');
const { crearAppRegistro, sesionEntregada } = require('./ayudas/registro');
const { Administrador, SesionRegistro, EnsayoRegistro } = require('../src/datos/modelos');
const sesionesRegistro = require('../src/datos/repositorios/sesionesRegistro');
const { procesarSesion } = require('../src/dominio/registro/motor');
const { procesarSesionGuardada, deGuardado } = require('../src/dominio/registro/resultado');
const { VERSION_ALGORITMO } = require('../src/dominio/registro/version');
const { perfiles } = require('./ayudas/perfilesSimulados.json');

/**
 * Reproducibilidad por version al pasar por la API de T15 (T16). M-09, CT-13
 *
 * Cada perfil simulado (ayudas/perfilesSimulados.json) se aplica como lo haria
 * la web: el profesional crea la sesion, entrega el dispositivo y llegan las
 * dos tareas. Con la misma entrada y la misma version:
 * - el resultado guardado es exactamente el de procesarSesion con la sesion
 *   de la web;
 * - leer de la base la sesion y sus ensayos y volver a procesarlos da el
 *   mismo resultado;
 * - otra sesion con los mismos ensayos, aplicada mas tarde y con otra
 *   semilla, da los mismos valores, tambien en valores.csv (salvo el
 *   seudonimo).
 */

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), SesionRegistro.init(), EnsayoRegistro.init()]);
});
afterEach(limpiar);
afterAll(bajar);

const APLICACION = '/api/registro/aplicacion';
const copia = (valor) => JSON.parse(JSON.stringify(valor));

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

/** Aplica la sesion de la web de un perfil por la API y devuelve su seudonimo. */
async function aplicarPorLaApi(sesionWeb) {
  const agente = await entrar();
  const { sesion, estado } = await sesionEntregada(agente);
  for (const tarea of ['cambio-regla', 'navon']) {
    // La API genera la semilla de cada sesion; los valores no dependen de ella.
    const ensayos = copia(sesionWeb.ensayos.filter((e) => e.tarea === tarea)).map((e) => ({ ...e, semilla: estado.semilla }));
    await agente
      .put(`${APLICACION}/tareas/${tarea}`)
      .send({
        versionCatalogo: sesionWeb.versionCatalogo,
        semilla: estado.semilla,
        reloj: sesionWeb.reloj,
        ensayos,
        contexto: { pausas: 0, repeticionesInstruccion: 0 }
      })
      .expect(200);
  }
  return sesion.seudonimo;
}

/** Valores que ve el profesional (HU-18). */
async function valoresVistos(seudonimo) {
  const agente = await entrar();
  const { body } = await agente.get(`/api/admin/registro/sesiones/${seudonimo}`).expect(200);
  return body.valores;
}

/** valores.csv sin la columna del seudonimo, una linea por sesion. */
async function valoresCsvSinSeudonimo() {
  const agente = await entrar();
  const { text } = await agente.get('/api/admin/registro/exportacion/valores.csv').expect(200);
  return text
    .trim()
    .split('\r\n')
    .slice(1)
    .map((linea) => linea.split(',').slice(1).join(','));
}

describe('CT-13 misma entrada y misma versión dan la misma salida al pasar por la API', () => {
  test.each(perfiles.map((p) => [p.id, p]))('perfil %s', async (_id, { sesion: sesionWeb }) => {
    const seudonimo = await aplicarPorLaApi(sesionWeb);

    // 1. Lo guardado es procesarSesion con la sesion de la web.
    const esperado = procesarSesion({ ...copia(sesionWeb), seudonimo });
    expect(esperado.procesada).toBe(true);
    expect(await valoresVistos(seudonimo)).toEqual(esperado);

    // 2. Leer la sesion y sus ensayos de la base y volver a procesarlos da lo mismo.
    const guardada = await SesionRegistro.findOne({ seudonimo }).lean();
    expect(guardada.resultado.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    const ensayos = await sesionesRegistro.ensayosDe([guardada._id]);
    expect(ensayos).toHaveLength(sesionWeb.ensayos.length);
    const otraVez = procesarSesionGuardada(guardada, ensayos);
    expect(otraVez).toEqual(deGuardado(guardada));
    expect(otraVez).toEqual(esperado);

    // 3. Otra sesion con los mismos ensayos, mas tarde y con otra semilla: los mismos valores.
    reloj.avanzar(20);
    const segunda = await aplicarPorLaApi(sesionWeb);
    expect(segunda).not.toBe(seudonimo);
    const { seudonimo: _a, ...primeros } = await valoresVistos(seudonimo);
    const { seudonimo: _b, ...segundos } = await valoresVistos(segunda);
    expect(segundos).toEqual(primeros);
    const [filaA, filaB] = await valoresCsvSinSeudonimo();
    expect(filaB).toBe(filaA);
  });
});
