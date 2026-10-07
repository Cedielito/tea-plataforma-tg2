'use strict';
const {
  MENSAJES,
  esCorreoValido,
  tieneCanalDeContacto,
  validarAutorizacion,
  validarEntidad,
  erroresDeContactoEnArchivo
} = require('../src/dominio/directorio');
const {
  MENSAJES: MENSAJES_PUBLICACION,
  validarFechaRevision,
  validarPublicacion,
  mensajesDeFecha
} = require('../src/dominio/publicacion');

/**
 * Reglas puras del directorio (M-04, RF-05): autorizacion de los
 * profesionales (RS-07), canal de contacto (HU-14) y fecha de verificacion
 * (RCN-02).
 */

const contacto = { telefonos: ['(601) 329 5090'] };

describe('RS-07 un profesional independiente no se publica sin constancia de autorizacion', () => {
  test('profesional publicado sin constancia: error', () => {
    expect(validarAutorizacion({ estado: 'publicado', esProfesional: true })).toEqual([MENSAJES.SIN_CONSTANCIA]);
    expect(validarAutorizacion({ estado: 'publicado', esProfesional: true, constanciaAutorizacion: '   ' })).toEqual([
      MENSAJES.SIN_CONSTANCIA
    ]);
    expect(validarAutorizacion({ estado: 'publicado', esProfesional: true, constanciaAutorizacion: null })).toEqual([
      MENSAJES.SIN_CONSTANCIA
    ]);
  });

  test('profesional publicado con constancia: se publica', () => {
    const constancia = 'Autorización firmada el 1 de octubre de 2026, archivada como AUT-001.';
    expect(validarAutorizacion({ estado: 'publicado', esProfesional: true, constanciaAutorizacion: constancia })).toEqual(
      []
    );
  });

  test('un profesional en borrador se guarda sin constancia', () => {
    expect(validarAutorizacion({ estado: 'borrador', esProfesional: true })).toEqual([]);
  });

  test('una entidad institucional no necesita constancia', () => {
    expect(validarAutorizacion({ estado: 'publicado', esProfesional: false })).toEqual([]);
    expect(validarAutorizacion({ estado: 'publicado' })).toEqual([]);
    expect(validarAutorizacion()).toEqual([]);
  });

  test('validarEntidad lo reporta en el campo constanciaAutorizacion', () => {
    expect(validarEntidad({ estado: 'publicado', esProfesional: true, contacto })).toEqual([
      { campo: 'constanciaAutorizacion', mensaje: MENSAJES.SIN_CONSTANCIA }
    ]);
  });
});

describe('HU-14 cada entidad tiene al menos un canal de contacto', () => {
  test('basta un telefono, un correo o un sitio web', () => {
    expect(tieneCanalDeContacto({ telefonos: ['106'] })).toBe(true);
    expect(tieneCanalDeContacto({ correo: 'contacto@entidad.gov.co' })).toBe(true);
    expect(tieneCanalDeContacto({ web: 'https://www.icbf.gov.co' })).toBe(true);
  });

  test('sin canales, con telefonos vacios o solo con direccion y horario no hay contacto', () => {
    expect(tieneCanalDeContacto(undefined)).toBe(false);
    expect(tieneCanalDeContacto({})).toBe(false);
    expect(tieneCanalDeContacto({ telefonos: ['', '  '] })).toBe(false);
    expect(tieneCanalDeContacto({ direccion: 'Carrera 13 No. 32-76', horario: 'Lunes a viernes' })).toBe(false);
  });

  test('validarEntidad lo exige tambien en borrador', () => {
    expect(validarEntidad({ estado: 'borrador', contacto: {} })).toEqual([
      { campo: 'contacto', mensaje: MENSAJES.SIN_CONTACTO }
    ]);
    expect(validarEntidad({ estado: 'borrador', contacto })).toEqual([]);
    expect(validarEntidad(null)).toEqual([]);
  });

  test('formato basico del correo', () => {
    expect(esCorreoValido('contactenos@saludcapital.gov.co')).toBe(true);
    expect(esCorreoValido('sin-arroba.gov.co')).toBe(false);
    expect(esCorreoValido('con espacio@entidad.gov.co')).toBe(false);
    expect(esCorreoValido(42)).toBe(false);
  });
});

describe('RCN-02 fecha de verificacion obligatoria para publicar en el directorio', () => {
  const ahora = new Date('2026-10-06T15:00:00Z');
  const opciones = { campoFecha: 'fechaVerificacion' };
  const completa = { estado: 'publicado', fuentes: [{ texto: 'Supersalud. Contáctenos.' }] };

  test('sin fecha de verificacion no se publica, con su propio mensaje', () => {
    expect(validarPublicacion(completa, ahora, opciones)).toEqual([
      { campo: 'fechaVerificacion', mensaje: MENSAJES_PUBLICACION.SIN_FECHA_VERIFICACION }
    ]);
  });

  test('una fechaRevision no reemplaza a la fecha de verificacion', () => {
    expect(validarPublicacion({ ...completa, fechaRevision: '2026-10-01' }, ahora, opciones)).toEqual([
      { campo: 'fechaVerificacion', mensaje: MENSAJES_PUBLICACION.SIN_FECHA_VERIFICACION }
    ]);
  });

  test('ni con una fecha posterior a hoy, ni con una que no es fecha', () => {
    expect(validarFechaRevision('2026-10-07', ahora, 'fechaVerificacion')).toEqual([
      MENSAJES_PUBLICACION.FECHA_VERIFICACION_FUTURA
    ]);
    expect(validarFechaRevision('no es fecha', ahora, 'fechaVerificacion')).toEqual([
      MENSAJES_PUBLICACION.FECHA_VERIFICACION_INVALIDA
    ]);
  });

  test('con fuente y fecha de verificacion se publica', () => {
    expect(validarPublicacion({ ...completa, fechaVerificacion: '2026-10-06' }, ahora, opciones)).toEqual([]);
  });

  test('un campo de fecha que no esta en el catalogo es un error de programacion', () => {
    expect(() => mensajesDeFecha('fechaCualquiera')).toThrow('Campo de fecha desconocido: fechaCualquiera');
  });
});

describe('Formato de contacto en directorio/entidades.yaml', () => {
  test('sin contacto no hay error de formato: el modelo pide el canal', () => {
    expect(erroresDeContactoEnArchivo({})).toEqual([]);
    expect(erroresDeContactoEnArchivo({ contacto: null })).toEqual([]);
  });

  test('un campo mal escrito no se descarta en silencio', () => {
    expect(erroresDeContactoEnArchivo({ contacto: { telefono: ['106'], whatsapp: 'x' } })).toEqual([
      `${MENSAJES.CONTACTO_CAMPO_DESCONOCIDO} telefono, whatsapp.`
    ]);
  });

  test('contacto debe tener campos y telefonos debe ser una lista', () => {
    expect(erroresDeContactoEnArchivo({ contacto: '106' })).toEqual([MENSAJES.CONTACTO_SIN_CAMPOS]);
    expect(erroresDeContactoEnArchivo({ contacto: { telefonos: '106' } })).toEqual([MENSAJES.TELEFONOS_NO_LISTA]);
    expect(erroresDeContactoEnArchivo({ contacto: { telefonos: ['106'], web: 'https://x.co' } })).toEqual([]);
  });
});
