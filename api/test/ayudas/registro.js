'use strict';
const request = require('supertest');
const { crearProfesional, crearAppDePrueba, iniciarSesion, USUARIO_PROFESIONAL } = require('./administrador');
const { crearServidor } = require('../../src/api/servidor');

/**
 * Ayudas para las pruebas del flujo del profesional y de la aplicacion del
 * registro conductual (T15). M-09, HU-16 a HU-19
 *
 * Un agente de supertest hace de navegador: guarda las cookies con su ruta,
 * asi que despues de la entrega tiene la cookie de aplicacion y ya no la del
 * panel, como el dispositivo que recibe el participante.
 */

const CONSTANCIA = Object.freeze({ consentimientoFirmado: true, versionConsentimiento: '1.0', mayorDeEdad: true });

const USER_AGENT_FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';

/** Servidor con reloj controlable; las opciones cambian, por ejemplo, el cuestionario SUS. */
function crearAppRegistro(opciones = {}) {
  const prueba = crearAppDePrueba();
  if (Object.keys(opciones).length === 0) return prueba;
  const app = crearServidor({ ahora: () => prueba.reloj.ahora, registro: prueba.registro, ...opciones });
  return { ...prueba, app };
}

/** Profesional con la sesion iniciada en un agente nuevo. */
async function profesionalConSesion(app, { usuario = USUARIO_PROFESIONAL } = {}) {
  await crearProfesional({ usuario });
  const agente = request.agent(app);
  await iniciarSesion(agente, { usuario });
  return agente;
}

async function crearSesion(agente, constancia = CONSTANCIA) {
  const res = await agente.post('/api/admin/registro/sesiones').send(constancia);
  if (res.status !== 201) throw new Error(`No se creó la sesión: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Crea una sesion y entrega el dispositivo: el agente queda como el del participante. */
async function sesionEntregada(agente, { userAgent = USER_AGENT_FIREFOX } = {}) {
  const sesion = await crearSesion(agente);
  const res = await agente.post(`/api/admin/registro/sesiones/${sesion.seudonimo}/entrega`).set('User-Agent', userAgent);
  if (res.status !== 204) throw new Error(`No se entregó la sesión: ${res.status}`);
  const estado = await agente.get('/api/registro/aplicacion');
  return { sesion, entrega: res, estado: estado.body };
}

module.exports = {
  CONSTANCIA,
  USER_AGENT_FIREFOX,
  crearAppRegistro,
  profesionalConSesion,
  crearSesion,
  sesionEntregada
};
