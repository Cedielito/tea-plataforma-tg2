/**
 * Pruebas del ancla de cada pregunta frecuente (M-05, RF-07, HU-10), con el
 * ejecutor de pruebas de Node (node --test), sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { preguntaDelAncla, slugDelAncla } from './anclaPregunta.js';

const PREGUNTAS = [
  { slug: 'a-quien-consultar-primero', pregunta: '¿A quién debo consultar primero?' },
  { slug: 'sin-eps', pregunta: '¿Qué hago si el niño o la niña no tiene EPS?' }
];

describe('RF-07 el ancla #slug abre su pregunta', () => {
  test('lee el slug con o sin «#», en minúsculas', () => {
    assert.equal(slugDelAncla('#a-quien-consultar-primero'), 'a-quien-consultar-primero');
    assert.equal(slugDelAncla('sin-eps'), 'sin-eps');
    assert.equal(slugDelAncla('#Sin-EPS'), 'sin-eps');
  });

  test('sin ancla, o con un ancla que no es un slug, no hay pregunta', () => {
    for (const hash of ['', '#', '#con espacios', '#%E0%A4%A', '#<script>', undefined, `#${'a'.repeat(81)}`]) {
      assert.equal(slugDelAncla(hash), null);
    }
  });

  test('encuentra la pregunta del ancla', () => {
    assert.equal(preguntaDelAncla('#sin-eps', PREGUNTAS), PREGUNTAS[1]);
  });

  test('un ancla que no corresponde a ninguna pregunta se ignora', () => {
    assert.equal(preguntaDelAncla('#no-existe', PREGUNTAS), null);
    assert.equal(preguntaDelAncla('', PREGUNTAS), null);
  });
});
