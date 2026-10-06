'use strict';
const { MENSAJES, leerCambiosContenido, validarCambioDeSlug } = require('../src/dominio/edicionContenido');

describe('RF-10 datos del editor de contenidos', () => {
  test('toma solo los campos del formulario', () => {
    const { cambios } = leerCambiosContenido({
      titulo: 'Qué es el TEA',
      slug: 'que-es-el-tea',
      seccion: 'S1',
      tramoEdad: '',
      cuerpo: 'Texto.',
      fuentes: [{ texto: 'OMS', url: 'https://www.who.int/' }],
      fechaRevision: ' 2026-09-30 ',
      estado: 'publicado',
      _id: 'otro',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
      __v: 3
    });
    expect(cambios).toEqual({
      titulo: 'Qué es el TEA',
      slug: 'que-es-el-tea',
      seccion: 'S1',
      tramoEdad: null,
      cuerpo: 'Texto.',
      fuentes: [{ texto: 'OMS', url: 'https://www.who.int/' }],
      fechaRevision: '2026-09-30',
      estado: 'publicado'
    });
  });

  test('un cambio parcial (publicar) solo trae ese campo', () => {
    expect(leerCambiosContenido({ estado: 'borrador' })).toEqual({ cambios: { estado: 'borrador' } });
  });

  test('vacios: el slug se genera del titulo; tramo y fecha quedan en null', () => {
    const { cambios } = leerCambiosContenido({ slug: '  ', tramoEdad: null, fechaRevision: '' });
    expect(cambios).toEqual({ slug: undefined, tramoEdad: null, fechaRevision: null });
    expect(Object.prototype.hasOwnProperty.call(cambios, 'slug')).toBe(true);
  });

  test('una fuente sin enlace queda sin url', () => {
    const { cambios } = leerCambiosContenido({ fuentes: [{ texto: 'DSM-5-TR', url: '' }, { texto: 'Ley', url: null }] });
    expect(cambios.fuentes).toEqual([
      { texto: 'DSM-5-TR', url: undefined },
      { texto: 'Ley', url: undefined }
    ]);
  });

  test.each([
    [{ titulo: { $gt: '' } }, 'titulo', MENSAJES.VALOR_INVALIDO],
    [{ estado: ['publicado'] }, 'estado', MENSAJES.VALOR_INVALIDO],
    [{ cuerpo: 5 }, 'cuerpo', MENSAJES.VALOR_INVALIDO],
    [{ fechaRevision: { $ne: null } }, 'fechaRevision', MENSAJES.VALOR_INVALIDO],
    [{ tramoEdad: 7 }, 'tramoEdad', MENSAJES.VALOR_INVALIDO],
    [{ fuentes: 'OMS' }, 'fuentes', MENSAJES.FUENTES_NO_LISTA],
    [{ fuentes: ['OMS'] }, 'fuentes', MENSAJES.FUENTE_INVALIDA],
    [{ fuentes: [{ texto: 'OMS', otro: 'x' }] }, 'fuentes', MENSAJES.FUENTE_INVALIDA],
    [{ fuentes: [{ texto: { $gt: '' } }] }, 'fuentes', MENSAJES.FUENTE_INVALIDA]
  ])('rechaza %p con un mensaje en el campo', (cuerpo, campo, mensaje) => {
    expect(leerCambiosContenido(cuerpo)).toEqual({ errores: { [campo]: mensaje } });
  });

  test.each([null, 'texto', ['titulo']])('rechaza un cuerpo que no es un objeto: %p', (cuerpo) => {
    expect(leerCambiosContenido(cuerpo)).toEqual({ errores: { general: MENSAJES.CUERPO_INVALIDO } });
  });
});

describe('RF-10 el slug de una pagina que viene de api/contenidos no cambia', () => {
  const archivo = 's1-que-es-el-tea.md';

  test('sin archivo de origen el slug se puede cambiar', () => {
    expect(validarCambioDeSlug('nuevo', { slug: 'otro' }, null)).toBeNull();
  });

  test('con archivo se acepta el mismo slug (aunque llegue con mayusculas o espacios)', () => {
    expect(validarCambioDeSlug('que-es-el-tea', { slug: ' Que-Es-El-TEA ' }, archivo)).toBeNull();
    expect(validarCambioDeSlug('que-es-el-tea', { titulo: 'Otro' }, archivo)).toBeNull();
  });

  test('con archivo se rechaza otro slug o un slug vacio', () => {
    expect(validarCambioDeSlug('que-es-el-tea', { slug: 'otro' }, archivo)).toBe(MENSAJES.SLUG_DE_ARCHIVO(archivo));
    expect(validarCambioDeSlug('que-es-el-tea', { slug: undefined }, archivo)).toContain(archivo);
  });
});
