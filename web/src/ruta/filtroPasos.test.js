/**
 * Pruebas del filtro de la guía de la ruta (M-03, RF-04, RS-01), con el
 * ejecutor de pruebas de Node (node --test), sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NO_LO_SE, filtrarPasos } from './filtroPasos.js';

const TODOS_LOS_TRAMOS = ['4-7', '8-12', '13-17'];
const TODOS_LOS_REGIMENES = ['contributivo', 'subsidiado', 'sin-afiliacion'];

const paso = (slug, cambios) => ({
  slug,
  perfiles: ['familia'],
  tramos: TODOS_LOS_TRAMOS,
  regimenes: TODOS_LOS_REGIMENES,
  orden: 10,
  ...cambios
});

/** Una muestra con la forma de api/contenidos/ruta/pasos.yaml, desordenada a propósito. */
const PASOS = [
  paso('familia-cita-eps', { orden: 40 }),
  paso('familia-afiliacion', { orden: 10, regimenes: ['sin-afiliacion'] }),
  paso('familia-anotar', { orden: 20 }),
  paso('familia-solo-adolescentes', { orden: 30, tramos: ['13-17'] }),
  paso('docente-registrar', { perfiles: ['docente'], orden: 10 }),
  paso('docente-afiliacion', { perfiles: ['docente'], orden: 40, regimenes: ['sin-afiliacion'] }),
  paso('docente-ajustes', { perfiles: ['docente'], orden: 50 }),
  paso('ambos-perfiles', { perfiles: ['familia', 'docente'], orden: 60 })
];

const slugs = (respuestas) => filtrarPasos(PASOS, respuestas).map((p) => p.slug);

describe('RF-04 la guía elige en el navegador los pasos que coinciden con las tres respuestas', () => {
  test('solo los del perfil, el tramo y el régimen elegidos, ordenados', () => {
    assert.deepEqual(slugs({ perfil: 'familia', tramo: '8-12', regimen: 'subsidiado' }), [
      'familia-anotar',
      'familia-cita-eps',
      'ambos-perfiles'
    ]);
  });

  test('un paso de un solo tramo aparece solo con ese tramo', () => {
    assert.ok(slugs({ perfil: 'familia', tramo: '13-17', regimen: 'contributivo' }).includes('familia-solo-adolescentes'));
    assert.ok(!slugs({ perfil: 'familia', tramo: '4-7', regimen: 'contributivo' }).includes('familia-solo-adolescentes'));
  });

  test('contributivo y subsidiado dan los mismos pasos; sin afiliación agrega primero la afiliación', () => {
    const contributivo = slugs({ perfil: 'familia', tramo: '4-7', regimen: 'contributivo' });
    assert.deepEqual(slugs({ perfil: 'familia', tramo: '4-7', regimen: 'subsidiado' }), contributivo);
    assert.deepEqual(slugs({ perfil: 'familia', tramo: '4-7', regimen: 'sin-afiliacion' }), [
      'familia-afiliacion',
      ...contributivo
    ]);
  });

  test('«No lo sé» muestra los pasos de todos los regímenes', () => {
    assert.deepEqual(slugs({ perfil: 'docente', tramo: '8-12', regimen: NO_LO_SE }), [
      'docente-registrar',
      'docente-afiliacion',
      'docente-ajustes',
      'ambos-perfiles'
    ]);
  });

  test('con el mismo orden se conserva el orden de llegada', () => {
    const empatados = [paso('b', { orden: 10 }), paso('a', { orden: 10 })];
    const elegidos = filtrarPasos(empatados, { perfil: 'familia', tramo: '4-7', regimen: 'subsidiado' });
    assert.deepEqual(elegidos.map((p) => p.slug), ['b', 'a']);
  });

  test('si falta una respuesta no muestra ningún paso', () => {
    assert.deepEqual(slugs({ perfil: 'familia', tramo: '4-7' }), []);
    assert.deepEqual(slugs({ perfil: 'familia', regimen: 'subsidiado' }), []);
    assert.deepEqual(slugs({}), []);
    assert.deepEqual(filtrarPasos(null, { perfil: 'familia', tramo: '4-7', regimen: 'subsidiado' }), []);
  });

  test('no cambia la lista que recibe', () => {
    const copia = structuredClone(PASOS);
    filtrarPasos(PASOS, { perfil: 'familia', tramo: '4-7', regimen: 'subsidiado' });
    assert.deepEqual(PASOS, copia);
  });

  test('un paso sin listas no rompe el filtro: simplemente no aparece', () => {
    const incompletos = [{ slug: 'sin-listas', orden: 10 }, paso('completo')];
    const elegidos = filtrarPasos(incompletos, { perfil: 'familia', tramo: '4-7', regimen: 'subsidiado' });
    assert.deepEqual(elegidos.map((p) => p.slug), ['completo']);
  });
});
