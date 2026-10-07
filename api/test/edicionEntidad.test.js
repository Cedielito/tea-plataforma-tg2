'use strict';
const { MENSAJES, leerCambiosEntidad } = require('../src/dominio/edicionEntidad');
const { MENSAJES: MENSAJES_CONTENIDO } = require('../src/dominio/edicionContenido');

/**
 * Lectura de lo que envia el editor del directorio en el panel. M-04, M-08,
 * RF-10, RS-07
 */

describe('RF-10 datos del editor de entidades del directorio', () => {
  test('acepta los campos del formulario con su tipo', () => {
    const { cambios } = leerCambiosEntidad({
      nombre: 'Personería de Medellín',
      slug: 'personeria-medellin',
      tipo: 'proteccion',
      ciudad: 'Medellín',
      descripcion: 'Protege los derechos humanos.',
      estado: 'publicado',
      esProfesional: false,
      constanciaAutorizacion: '',
      contacto: {
        telefonos: ['(604) 384 9999', '  ', ' 01 8000 518 618 '],
        correo: ' info@x.gov.co ',
        web: '',
        horario: null
      },
      fuentes: [{ texto: 'Personería de Medellín. Sitio oficial.', url: 'https://www.personeriamedellin.gov.co' }],
      fechaVerificacion: '2026-10-06'
    });
    expect(cambios).toEqual({
      nombre: 'Personería de Medellín',
      slug: 'personeria-medellin',
      tipo: 'proteccion',
      ciudad: 'Medellín',
      descripcion: 'Protege los derechos humanos.',
      estado: 'publicado',
      esProfesional: false,
      constanciaAutorizacion: null,
      contacto: { telefonos: ['(604) 384 9999', '01 8000 518 618'], correo: 'info@x.gov.co' },
      fuentes: [{ texto: 'Personería de Medellín. Sitio oficial.', url: 'https://www.personeriamedellin.gov.co' }],
      fechaVerificacion: '2026-10-06'
    });
  });

  test('ignora los campos que no son del formulario y deja los que no llegan', () => {
    const { cambios } = leerCambiosEntidad({ _id: 'x', createdAt: 'hoy', fechaRevision: '2026-10-01', estado: 'borrador' });
    expect(cambios).toEqual({ estado: 'borrador' });
  });

  test('un slug vacio se quita para que el modelo lo genere desde el nombre', () => {
    const { cambios } = leerCambiosEntidad({ slug: '  ' });
    expect(cambios).toHaveProperty('slug', undefined);
  });

  test('RS-07 esProfesional solo acepta si o no', () => {
    expect(leerCambiosEntidad({ esProfesional: 'true' }).errores).toEqual({ esProfesional: MENSAJES.SI_O_NO });
    expect(leerCambiosEntidad({ esProfesional: true }).cambios).toEqual({ esProfesional: true });
  });

  test('rechaza tipos equivocados con un mensaje por campo', () => {
    const { errores } = leerCambiosEntidad({
      nombre: { $gt: '' },
      fechaVerificacion: 20261006,
      constanciaAutorizacion: ['x'],
      fuentes: 'Supersalud'
    });
    expect(errores).toEqual({
      nombre: MENSAJES.VALOR_INVALIDO,
      fechaVerificacion: MENSAJES.VALOR_INVALIDO,
      constanciaAutorizacion: MENSAJES.VALOR_INVALIDO,
      fuentes: MENSAJES_CONTENIDO.FUENTES_NO_LISTA
    });
  });

  test('contacto: solo sus campos, con texto; telefonos, una lista de textos', () => {
    expect(leerCambiosEntidad({ contacto: 'x' }).errores).toEqual({ contacto: MENSAJES.CONTACTO_INVALIDO });
    expect(leerCambiosEntidad({ contacto: { whatsapp: '300' } }).errores).toEqual({ contacto: MENSAJES.CONTACTO_INVALIDO });
    expect(leerCambiosEntidad({ contacto: { correo: { $ne: '' } } }).errores).toEqual({
      contacto: MENSAJES.CONTACTO_INVALIDO
    });
    expect(leerCambiosEntidad({ contacto: { telefonos: '106' } }).errores).toEqual({
      contacto: MENSAJES.TELEFONOS_INVALIDOS
    });
    expect(leerCambiosEntidad({ contacto: { telefonos: [106] } }).errores).toEqual({
      contacto: MENSAJES.TELEFONOS_INVALIDOS
    });
  });

  test('un cuerpo que no es un objeto es un error general', () => {
    expect(leerCambiosEntidad(null).errores).toEqual({ general: MENSAJES.CUERPO_INVALIDO });
    expect(leerCambiosEntidad([]).errores).toEqual({ general: MENSAJES.CUERPO_INVALIDO });
  });
});
