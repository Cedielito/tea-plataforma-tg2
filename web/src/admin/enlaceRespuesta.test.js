/**
 * Pruebas del enlace para responder un mensaje de contacto (M-08; RF-11).
 * Se ejecutan con node --test, sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ASUNTO_RESPUESTA, enlaceRespuesta } from './enlaceRespuesta.js';

const asunto = encodeURIComponent(ASUNTO_RESPUESTA);

describe('RF-11 responder por correo desde la bandeja', () => {
  test('arma el mailto: con el correo y el asunto', () => {
    assert.equal(enlaceRespuesta('familia@correo.com'), `mailto:familia@correo.com?subject=${asunto}`);
    assert.ok(!asunto.includes(' '));
  });

  test('codifica el + del correo', () => {
    assert.equal(enlaceRespuesta('nombre+algo@gmail.com'), `mailto:nombre%2Balgo@gmail.com?subject=${asunto}`);
  });

  test('no arma el enlace si el correo podría agregar destinatarios o cambiar el asunto', () => {
    for (const correo of ['a@b.co?bcc=x@y.co', 'a@b.co&subject=x', 'a%3F@b.co', 'a @b.co', '', null]) {
      assert.equal(enlaceRespuesta(correo), null, String(correo));
    }
  });
});
