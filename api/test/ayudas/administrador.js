'use strict';
const administradores = require('../../src/datos/repositorios/administradores');
const { cifrarClave } = require('../../src/dominio/autenticacion');
const { crearServidor } = require('../../src/api/servidor');

/**
 * Ayudas para las pruebas del panel. M-08, RS-05
 *
 * Las claves de prueba se cifran con costo 4 para que las pruebas sean
 * rapidas; el hash guarda su costo, asi que la comparacion funciona igual.
 * El costo real (10) se prueba en autenticacion.test.js.
 */

const USUARIO = 'equipo.tea';
const CLAVE = 'clave de prueba suficientemente larga';
const INICIO = new Date('2026-10-01T15:00:00Z');
const MINUTO = 60 * 1000;

async function crearAdministrador({ usuario = USUARIO, clave = CLAVE } = {}) {
  return administradores.crear({ usuario, claveCifrada: await cifrarClave(clave, 4) });
}

/** Registro falso: guarda todo lo que se escribe para revisarlo. */
function crearRegistro() {
  const lineas = [];
  const guardar = (...partes) => lineas.push(partes.join(' '));
  return { log: jest.fn(guardar), warn: jest.fn(guardar), error: jest.fn(guardar), lineas };
}

/**
 * Servidor con reloj controlable: `reloj.avanzar(minutos)` mueve el tiempo
 * de las sesiones y de los limites sin esperar.
 */
function crearAppDePrueba({ produccion = false } = {}) {
  const reloj = {
    ahora: INICIO,
    avanzar(minutos) {
      this.ahora = new Date(this.ahora.getTime() + minutos * MINUTO);
    }
  };
  const registro = crearRegistro();
  const app = crearServidor({ ahora: () => reloj.ahora, produccion, registro });
  return { app, reloj, registro };
}

/** Inicia sesion con un agente de supertest, que guarda la cookie. */
function iniciarSesion(agente, { usuario = USUARIO, clave = CLAVE } = {}) {
  return agente.post('/api/sesion').send({ usuario, clave });
}

/** Valor de la cookie de sesion en una respuesta, o null. */
function cookieDeSesion(respuesta) {
  const cookies = respuesta.headers['set-cookie'] || [];
  return cookies.find((cookie) => cookie.startsWith('sesion_admin=')) || null;
}

module.exports = {
  USUARIO,
  CLAVE,
  INICIO,
  crearAdministrador,
  crearRegistro,
  crearAppDePrueba,
  iniciarSesion,
  cookieDeSesion
};
