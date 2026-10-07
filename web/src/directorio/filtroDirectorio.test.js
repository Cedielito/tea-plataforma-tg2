/**
 * Pruebas de los filtros del directorio (M-04, RF-05) y de las entidades
 * junto a cada paso de la guía (M-03, RF-04, RS-01), con el ejecutor de
 * pruebas de Node (node --test), sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTA_COBERTURA,
  RUTA_DIRECTORIO,
  agruparPorCiudad,
  entidadesDelPaso,
  filtrarEntidades,
  leerFiltros,
  parametrosDeFiltros,
  resumirResultados
} from './filtroDirectorio.js';

const entidad = (slug, tipo, ciudad, nombre = slug) => ({ slug, tipo, ciudad, nombre });

/** Una muestra con la forma de GET /api/directorio, desordenada a propósito. */
const ENTIDADES = [
  entidad('supersalud', 'quejas-salud', 'Nacional', 'Superintendencia Nacional de Salud'),
  entidad('secretaria-salud-bogota', 'salud', 'Bogotá', 'Secretaría Distrital de Salud de Bogotá'),
  entidad('minsalud', 'salud', 'Nacional', 'Ministerio de Salud'),
  entidad('personeria-bogota', 'proteccion', 'Bogotá', 'Personería de Bogotá'),
  entidad('defensoria', 'proteccion', 'Nacional', 'Defensoría del Pueblo'),
  entidad('icbf', 'proteccion-ninez', 'Nacional', 'ICBF'),
  entidad('secretaria-salud-cali', 'salud', 'Cali', 'Secretaría de Salud Pública de Cali'),
  entidad('linea-106-bogota', 'linea-apoyo', 'Bogotá', 'Línea 106 Bogotá')
];

const slugs = (lista) => lista.map((e) => e.slug);

describe('RF-05 filtros del directorio por ciudad y tipo', () => {
  test('sin filtros muestra todas', () => {
    assert.equal(filtrarEntidades(ENTIDADES).length, ENTIDADES.length);
    assert.equal(filtrarEntidades(ENTIDADES, { ciudad: null, tipo: null }).length, ENTIDADES.length);
  });

  test('las entidades nacionales aparecen con cualquier ciudad', () => {
    for (const ciudad of ['Bogotá', 'Medellín', 'Cali', 'Barranquilla']) {
      const elegidas = slugs(filtrarEntidades(ENTIDADES, { ciudad }));
      for (const nacional of ['supersalud', 'minsalud', 'defensoria', 'icbf']) assert.ok(elegidas.includes(nacional));
    }
  });

  test('con una ciudad no aparecen las de otras ciudades', () => {
    const elegidas = slugs(filtrarEntidades(ENTIDADES, { ciudad: 'Cali' }));
    assert.ok(elegidas.includes('secretaria-salud-cali'));
    assert.ok(!elegidas.includes('secretaria-salud-bogota'));
  });

  test('ciudad y tipo se combinan', () => {
    assert.deepEqual(slugs(filtrarEntidades(ENTIDADES, { ciudad: 'Bogotá', tipo: 'salud' })), [
      'secretaria-salud-bogota',
      'minsalud'
    ]);
  });

  test('con una ciudad elegida, primero esa ciudad y luego todo el país; por tipo y nombre', () => {
    const grupos = agruparPorCiudad(filtrarEntidades(ENTIDADES, { ciudad: 'Bogotá' }), 'Bogotá');
    assert.deepEqual(
      grupos.map(({ ciudad, entidades }) => [ciudad, slugs(entidades)]),
      [
        ['Bogotá', ['secretaria-salud-bogota', 'personeria-bogota', 'linea-106-bogota']],
        ['Nacional', ['minsalud', 'defensoria', 'icbf', 'supersalud']]
      ]
    );
  });

  test('sin ciudad, todo el país primero y luego cada ciudad en el orden del catálogo, sin grupos vacíos', () => {
    const grupos = agruparPorCiudad(ENTIDADES);
    assert.deepEqual(
      grupos.map(({ ciudad }) => ciudad),
      ['Nacional', 'Bogotá', 'Cali']
    );
  });

  test('el resumen cuenta las entidades de cada grupo', () => {
    const bogota = agruparPorCiudad(filtrarEntidades(ENTIDADES, { ciudad: 'Bogotá' }), 'Bogotá');
    assert.equal(resumirResultados(bogota), 'Mostramos 7 entidades: 3 de Bogotá y 4 de todo el país.');
    const soloNacional = agruparPorCiudad(filtrarEntidades(ENTIDADES, { ciudad: 'Cali', tipo: 'quejas-salud' }), 'Cali');
    assert.equal(resumirResultados(soloNacional), 'Mostramos 1 entidad de todo el país.');
    assert.equal(resumirResultados([]), 'No hay entidades con estos filtros.');
  });

  test('no cambia la lista que recibe', () => {
    const copia = structuredClone(ENTIDADES);
    agruparPorCiudad(filtrarEntidades(ENTIDADES, { ciudad: 'Bogotá' }), 'Bogotá');
    entidadesDelPaso(ENTIDADES, ['salud'], 'Bogotá');
    assert.deepEqual(ENTIDADES, copia);
  });
});

describe('RF-05 filtros del directorio en la dirección, sin tildes ni mayúsculas', () => {
  test('lee ?ciudad=bogota&tipo=salud como los valores de la API', () => {
    assert.deepEqual(leerFiltros(new URLSearchParams('ciudad=bogota&tipo=salud')), { ciudad: 'Bogotá', tipo: 'salud' });
    assert.deepEqual(leerFiltros(new URLSearchParams('ciudad=medellin')), { ciudad: 'Medellín', tipo: null });
  });

  test('un valor desconocido, con tilde o «nacional» se ignora', () => {
    assert.deepEqual(leerFiltros(new URLSearchParams('ciudad=Bogotá&tipo=hospital')), { ciudad: null, tipo: null });
    assert.deepEqual(leerFiltros(new URLSearchParams('ciudad=nacional')), { ciudad: null, tipo: null });
    assert.deepEqual(leerFiltros(new URLSearchParams('')), { ciudad: null, tipo: null });
  });

  test('escribe los parámetros sin tildes y omite los vacíos', () => {
    assert.deepEqual(parametrosDeFiltros({ ciudad: 'Medellín', tipo: 'proteccion-ninez' }), {
      ciudad: 'medellin',
      tipo: 'proteccion-ninez'
    });
    assert.deepEqual(parametrosDeFiltros({ ciudad: null, tipo: 'salud' }), { tipo: 'salud' });
    assert.deepEqual(parametrosDeFiltros({}), {});
  });
});

describe('RF-04 RS-01 entidades junto a cada paso de la guía', () => {
  test('sin ciudad, solo las nacionales de los tipos del paso', () => {
    assert.deepEqual(slugs(entidadesDelPaso(ENTIDADES, ['quejas-salud', 'proteccion'])), ['defensoria', 'supersalud']);
  });

  test('con ciudad, primero las de esa ciudad y luego las nacionales', () => {
    assert.deepEqual(slugs(entidadesDelPaso(ENTIDADES, ['quejas-salud', 'proteccion'], 'Bogotá')), [
      'personeria-bogota',
      'defensoria',
      'supersalud'
    ]);
    assert.deepEqual(slugs(entidadesDelPaso(ENTIDADES, ['salud'], 'Cali')), ['secretaria-salud-cali', 'minsalud']);
  });

  test('una ciudad sin entidades de ese tipo deja solo las nacionales', () => {
    assert.deepEqual(slugs(entidadesDelPaso(ENTIDADES, ['salud'], 'Medellín')), ['minsalud']);
  });

  test('el ICBF no sale junto a un paso de quejas o de protección de derechos', () => {
    assert.ok(!slugs(entidadesDelPaso(ENTIDADES, ['quejas-salud', 'proteccion'], 'Bogotá')).includes('icbf'));
  });

  test('un paso sin tipos de entidad no muestra ninguna', () => {
    assert.deepEqual(entidadesDelPaso(ENTIDADES, []), []);
    assert.deepEqual(entidadesDelPaso(ENTIDADES, undefined), []);
    assert.deepEqual(entidadesDelPaso(null, ['salud']), []);
  });

  test('la web pide todo el directorio sin parámetros: la ciudad no llega a la API', () => {
    assert.equal(RUTA_DIRECTORIO, '/api/directorio');
  });
});

describe('Nota de cobertura del directorio', () => {
  test('nombra las ciudades con entidades locales', () => {
    assert.equal(
      NOTA_COBERTURA,
      'Por ahora hay entidades locales de Bogotá, Medellín, Cali y Barranquilla. ' +
        'Si tu ciudad no está, puedes acudir a las de todo el país.'
    );
  });
});
