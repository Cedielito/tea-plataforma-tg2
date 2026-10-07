/**
 * Pruebas de los enlaces de contacto del directorio (M-04, RF-05), con el
 * ejecutor de pruebas de Node (node --test), sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { enlaceDeSitioWeb, enlaceDeTelefono } from './contacto.js';

describe('RF-05 enlaces de teléfono del directorio', () => {
  test('marca solo los dígitos y muestra el número como está', () => {
    assert.deepEqual(enlaceDeTelefono('(601) 330 5000'), {
      texto: '(601) 330 5000',
      href: 'tel:6013305000',
      whatsapp: false
    });
    assert.equal(enlaceDeTelefono('01 8000 513 700').href, 'tel:018000513700');
    assert.equal(enlaceDeTelefono('106').href, 'tel:106');
    assert.equal(enlaceDeTelefono(' 318 335 5722 ').href, 'tel:3183355722');
  });

  test('con extensión, el enlace marca el número principal y el texto la muestra', () => {
    assert.deepEqual(enlaceDeTelefono('(604) 384 9999, ext. 300'), {
      texto: '(604) 384 9999, ext. 300',
      href: 'tel:6043849999',
      whatsapp: false
    });
  });

  test('WhatsApp: enlace a wa.me con el indicativo 57 y «Escribir por WhatsApp al …»', () => {
    assert.deepEqual(enlaceDeTelefono('300 754 8933 (WhatsApp)'), {
      texto: 'Escribir por WhatsApp al 300 754 8933',
      href: 'https://wa.me/573007548933',
      whatsapp: true
    });
  });

  test('un número de WhatsApp que no es un celular queda como texto, sin enlace', () => {
    assert.deepEqual(enlaceDeTelefono('106 (WhatsApp)'), { texto: '106 (WhatsApp)', href: null, whatsapp: true });
  });

  test('un teléfono sin dígitos o vacío no lleva enlace', () => {
    assert.equal(enlaceDeTelefono('sin número').href, null);
    assert.equal(enlaceDeTelefono(undefined).href, null);
  });
});

describe('RF-05 enlace del sitio web', () => {
  test('el texto es el dominio y el enlace la dirección completa', () => {
    assert.deepEqual(enlaceDeSitioWeb('https://www.icbf.gov.co/linea-141'), {
      texto: 'www.icbf.gov.co',
      href: 'https://www.icbf.gov.co/linea-141'
    });
  });

  test('solo http o https', () => {
    assert.equal(enlaceDeSitioWeb('javascript:alert(1)'), null);
    assert.equal(enlaceDeSitioWeb(''), null);
    assert.equal(enlaceDeSitioWeb(undefined), null);
  });
});
