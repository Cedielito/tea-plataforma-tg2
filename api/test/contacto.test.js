'use strict';
const {
  DIAS_CONSERVACION,
  LARGO_MAXIMO_MENSAJE,
  LIMITES,
  MENSAJES,
  SEGUNDOS_CONSERVACION,
  fechaDeSupresion,
  leerMensajeContacto
} = require('../src/dominio/contacto');

/** Reglas del formulario de contacto. M-06, RF-08, RS-02, RS-04 */

const valido = (cambios = {}) => ({
  correo: 'familia@correo.com',
  mensaje: '¿Dónde pido la valoración?',
  autorizacion: true,
  versionPolitica: '1.0',
  ...cambios
});

describe('RS-02 el formulario recibe solo los datos minimos', () => {
  test('acepta correo, mensaje, autorizacion y version, y devuelve solo lo que se guarda', () => {
    expect(leerMensajeContacto(valido())).toEqual({
      datos: { correo: 'familia@correo.com', mensaje: '¿Dónde pido la valoración?', versionPolitica: '1.0' }
    });
  });

  test('rechaza cualquier otro campo, como un nombre o un telefono', () => {
    expect(leerMensajeContacto(valido({ nombre: 'Ana' }))).toEqual({ errores: { general: MENSAJES.SOLO_CAMPOS } });
    expect(leerMensajeContacto(valido({ telefono: '300' }))).toEqual({ errores: { general: MENSAJES.SOLO_CAMPOS } });
  });

  test('un cuerpo que no es un objeto se rechaza', () => {
    for (const cuerpo of [null, undefined, 'texto', ['correo']]) {
      expect(leerMensajeContacto(cuerpo)).toEqual({ errores: { general: MENSAJES.SOLO_CAMPOS } });
    }
  });
});

describe('RS-02 RF-08 sin autorizacion expresa no se envia', () => {
  test('la autorizacion tiene que ser exactamente true', () => {
    for (const autorizacion of [undefined, false, 'true', 'si', 1, 'on']) {
      expect(leerMensajeContacto(valido({ autorizacion })).errores).toEqual({ autorizacion: MENSAJES.SIN_AUTORIZACION });
    }
  });

  test('sin la version de la politica no se envia', () => {
    expect(leerMensajeContacto(valido({ versionPolitica: ' ' })).errores).toEqual({ versionPolitica: MENSAJES.SIN_VERSION });
    expect(leerMensajeContacto(valido({ versionPolitica: 1 })).errores).toEqual({ versionPolitica: MENSAJES.SIN_VERSION });
  });
});

describe('RS-02 correo valido', () => {
  test('acepta +, punto, guion y guion bajo, y quita los espacios de los extremos', () => {
    for (const correo of ['nombre+algo@gmail.com', 'nombre.apellido@correo.edu.co', 'a_b-c@dominio-uno.com']) {
      expect(leerMensajeContacto(valido({ correo: ` ${correo} ` })).datos.correo).toBe(correo);
    }
  });

  test('rechaza correos mal formados o que podrian alterar el enlace mailto:', () => {
    const invalidos = [
      'sin-arroba',
      'a@b',
      'a b@correo.com',
      'a@correo.com?bcc=otro@correo.com',
      'a&b@correo.com',
      'a%3F@correo.com',
      'a..b@correo.com',
      'ñandú@correo.com',
      '<a@correo.com>'
    ];
    for (const correo of invalidos) {
      expect(leerMensajeContacto(valido({ correo })).errores).toEqual({ correo: MENSAJES.CORREO_INVALIDO });
    }
    expect(leerMensajeContacto(valido({ correo: '' })).errores).toEqual({ correo: MENSAJES.CORREO_FALTA });
    expect(leerMensajeContacto(valido({ correo: `${'a'.repeat(250)}@b.co` })).errores).toEqual({
      correo: MENSAJES.CORREO_LARGO
    });
  });
});

describe('RS-02 mensaje como texto plano', () => {
  test('quita caracteres de control y espacios de los extremos, y normaliza los saltos de linea', () => {
    const { datos } = leerMensajeContacto(valido({ mensaje: '  Hola\r\nequipo\u0000\u0007\tgracias  ' }));
    expect(datos.mensaje).toBe('Hola\nequipo\tgracias');
  });

  test('conserva el HTML escrito como texto, sin interpretarlo', () => {
    const mensaje = '<script>alert(1)</script> **negrita**';
    expect(leerMensajeContacto(valido({ mensaje })).datos.mensaje).toBe(mensaje);
  });

  test('el mensaje es obligatorio y tiene un maximo de caracteres (un emoji cuenta como uno)', () => {
    expect(leerMensajeContacto(valido({ mensaje: ' \n ' })).errores).toEqual({ mensaje: MENSAJES.MENSAJE_FALTA });
    expect(leerMensajeContacto(valido({ mensaje: 5 })).errores).toEqual({ mensaje: MENSAJES.MENSAJE_FALTA });
    expect(leerMensajeContacto(valido({ mensaje: '😀'.repeat(LARGO_MAXIMO_MENSAJE) })).datos).toBeDefined();
    expect(leerMensajeContacto(valido({ mensaje: 'a'.repeat(LARGO_MAXIMO_MENSAJE + 1) })).errores).toEqual({
      mensaje: MENSAJES.MENSAJE_LARGO
    });
  });

  test('devuelve todos los errores a la vez', () => {
    const { errores } = leerMensajeContacto({ correo: 'x', mensaje: '', autorizacion: false, versionPolitica: '' });
    expect(Object.keys(errores).sort()).toEqual(['autorizacion', 'correo', 'mensaje', 'versionPolitica']);
  });
});

describe('RS-04 plazo de conservacion y limites de envios', () => {
  test('los mensajes se conservan 180 dias, menos que los seis meses mas cortos (181 dias)', () => {
    expect(DIAS_CONSERVACION).toBe(180);
    expect(SEGUNDOS_CONSERVACION).toBe(180 * 24 * 60 * 60);
    const recibido = new Date('2026-09-01T12:00:00Z');
    const seisMeses = new Date('2027-03-01T12:00:00Z');
    expect(fechaDeSupresion(recibido)).toEqual(new Date('2027-02-28T12:00:00Z'));
    expect(fechaDeSupresion(recibido).getTime()).toBeLessThan(seisMeses.getTime());
  });

  test('5 envios por IP cada 15 minutos y 40 por hora en total', () => {
    expect(LIMITES.porIp).toEqual({ maximo: 5, ventanaMs: 15 * 60 * 1000 });
    expect(LIMITES.total).toEqual({ maximo: 40, ventanaMs: 60 * 60 * 1000 });
  });
});
