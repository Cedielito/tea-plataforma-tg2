/**
 * Pruebas de la validación del formulario de contacto (M-06; RF-08, RS-02).
 * Se ejecutan con node --test, sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LARGO_MAXIMO_MENSAJE,
  MENSAJES,
  contarCaracteres,
  cuerpoDelEnvio,
  validarContacto
} from './validacion.js';
import { borrarBorrador, guardarBorrador, leerBorrador } from './borrador.js';

const valido = (cambios = {}) => ({
  correo: 'familia@correo.com',
  mensaje: '¿A quién consulto primero?',
  autorizacion: true,
  ...cambios
});

describe('RS-02 RF-08 validación del formulario de contacto', () => {
  test('un formulario completo no tiene errores', () => {
    assert.deepEqual(validarContacto(valido()), {});
  });

  test('sin la casilla de autorización no se envía', () => {
    assert.deepEqual(validarContacto(valido({ autorizacion: false })), { autorizacion: MENSAJES.SIN_AUTORIZACION });
  });

  test('acepta +, punto, guion y guion bajo en el correo', () => {
    for (const correo of ['nombre+algo@gmail.com', 'nombre.apellido@correo.edu.co', 'a_b-c@dominio.com']) {
      assert.deepEqual(validarContacto(valido({ correo })), {}, correo);
    }
  });

  test('rechaza correos vacíos, mal formados o que alterarían el enlace de respuesta', () => {
    assert.equal(validarContacto(valido({ correo: '  ' })).correo, MENSAJES.CORREO_FALTA);
    for (const correo of ['sin-arroba', 'a@b', 'a@correo.com?bcc=x@y.co', 'a..b@correo.com', 'ñandú@correo.com']) {
      assert.equal(validarContacto(valido({ correo })).correo, MENSAJES.CORREO_INVALIDO, correo);
    }
    assert.equal(validarContacto(valido({ correo: `${'a'.repeat(250)}@b.co` })).correo, MENSAJES.CORREO_LARGO);
  });

  test('el mensaje es obligatorio y tiene un máximo de caracteres', () => {
    assert.equal(validarContacto(valido({ mensaje: ' \n ' })).mensaje, MENSAJES.MENSAJE_FALTA);
    assert.deepEqual(validarContacto(valido({ mensaje: '😀'.repeat(LARGO_MAXIMO_MENSAJE) })), {});
    assert.equal(validarContacto(valido({ mensaje: 'a'.repeat(LARGO_MAXIMO_MENSAJE + 1) })).mensaje, MENSAJES.MENSAJE_LARGO);
    assert.equal(contarCaracteres(' a\r\nb '), 3);
  });

  test('el envío lleva solo correo, mensaje, autorización y versión de la política', () => {
    assert.deepEqual(cuerpoDelEnvio(valido({ correo: ' familia@correo.com ' }), '1.0'), {
      correo: 'familia@correo.com',
      mensaje: '¿A quién consulto primero?',
      autorizacion: true,
      versionPolitica: '1.0'
    });
  });
});

describe('RS-02 borrador en memoria', () => {
  test('guarda correo y mensaje, nunca la casilla, y se borra al enviar', () => {
    guardarBorrador({ correo: 'a@b.co', mensaje: 'Hola', autorizacion: true });
    assert.deepEqual(leerBorrador(), { correo: 'a@b.co', mensaje: 'Hola' });
    borrarBorrador();
    assert.deepEqual(leerBorrador(), { correo: '', mensaje: '' });
  });
});
