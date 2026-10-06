'use strict';
const {
  MENSAJES,
  leerFiltrosContenidos,
  construirFiltroContenidos,
  ordenarContenidos
} = require('../src/dominio/contenidos');
const { generarSlug, esSlugValido, LARGO_MAXIMO } = require('../src/dominio/slug');

describe('RF-03 filtros de contenidos por seccion y tramo de edad', () => {
  test('sin filtros, o con filtros vacios, no filtra', () => {
    expect(leerFiltrosContenidos()).toEqual({ filtros: {} });
    expect(leerFiltrosContenidos({ seccion: '', edad: '' })).toEqual({ filtros: {} });
  });

  test('acepta las secciones S1 a S5 y los tres tramos de edad', () => {
    expect(leerFiltrosContenidos({ seccion: 'S2', edad: '13-17' })).toEqual({
      filtros: { seccion: 'S2', tramoEdad: '13-17' }
    });
  });

  test.each([['S6'], ['s1'], [['S1', 'S2']], [{ $ne: 'S1' }]])('rechaza la seccion %p', (seccion) => {
    expect(leerFiltrosContenidos({ seccion })).toEqual({ error: MENSAJES.SECCION_INVALIDA });
  });

  test.each([['1-3'], ['4 a 7'], [['4-7']], [{ $gt: '' }]])('rechaza la edad %p', (edad) => {
    expect(leerFiltrosContenidos({ edad })).toEqual({ error: MENSAJES.EDAD_INVALIDA });
  });

  test('el filtro siempre exige estado publicado', () => {
    expect(construirFiltroContenidos()).toEqual({ estado: 'publicado' });
    expect(construirFiltroContenidos({ seccion: 'S1' })).toEqual({ estado: 'publicado', seccion: 'S1' });
  });

  test('con tramo de edad incluye tambien los contenidos sin tramo (introduccion general)', () => {
    expect(construirFiltroContenidos({ seccion: 'S2', tramoEdad: '4-7' })).toEqual({
      estado: 'publicado',
      seccion: 'S2',
      tramoEdad: { $in: ['4-7', null] }
    });
  });
});

describe('RF-03 orden de los contenidos', () => {
  test('por seccion; dentro de ella, primero sin tramo y luego de menor a mayor edad', () => {
    const desordenados = [
      { titulo: 'a', seccion: 'S2', tramoEdad: '13-17' },
      { titulo: 'b', seccion: 'S2', tramoEdad: '4-7' },
      { titulo: 'c', seccion: 'S1', tramoEdad: null },
      { titulo: 'd', seccion: 'S2', tramoEdad: '8-12' },
      { titulo: 'e', seccion: 'S2' },
      { titulo: 'f', seccion: 'S2', tramoEdad: '4-7' }
    ];
    expect(ordenarContenidos(desordenados).map((c) => c.titulo)).toEqual(['c', 'e', 'b', 'f', 'd', 'a']);
  });

  test('no modifica el arreglo original', () => {
    const original = [{ seccion: 'S2' }, { seccion: 'S1' }];
    ordenarContenidos(original);
    expect(original[0].seccion).toBe('S2');
  });
});

describe('Slug de los contenidos', () => {
  test('quita tildes, eñes, signos y mayusculas', () => {
    expect(generarSlug('¿Qué es el TEA?')).toBe('que-es-el-tea');
    expect(generarSlug('Señales de alerta: 4 a 7 años')).toBe('senales-de-alerta-4-a-7-anos');
    expect(generarSlug('  Mitos   y realidades  ')).toBe('mitos-y-realidades');
  });

  test('sin titulo devuelve texto vacio', () => {
    expect(generarSlug(undefined)).toBe('');
    expect(generarSlug('¿?')).toBe('');
  });

  test('recorta los titulos muy largos sin dejar un guion al final', () => {
    const slug = generarSlug(`${'a'.repeat(LARGO_MAXIMO - 1)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(LARGO_MAXIMO);
    expect(slug.endsWith('-')).toBe(false);
  });

  test('valida el formato', () => {
    expect(esSlugValido('que-es-el-tea')).toBe(true);
    expect(esSlugValido('Que-Es')).toBe(false);
    expect(esSlugValido('que--es')).toBe(false);
    expect(esSlugValido('-que')).toBe(false);
    expect(esSlugValido('a'.repeat(LARGO_MAXIMO + 1))).toBe(false);
    expect(esSlugValido(undefined)).toBe(false);
  });
});
