/**
 * Pruebas de las preguntas de la guía de la ruta (M-03, RF-04), con el
 * ejecutor de pruebas de Node (node --test).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PREGUNTAS, RESPUESTAS_VACIAS, responder, resumirRespuestas } from './preguntas.js';
import { NO_LO_SE } from './filtroPasos.js';

const valores = (indice, perfil) => PREGUNTAS[indice].opciones(perfil).map((opcion) => opcion.valor);

describe('RF-04 las tres preguntas de la guía', () => {
  test('preguntan quién consulta, el tramo de edad y el régimen, en ese orden', () => {
    assert.deepEqual(PREGUNTAS.map((p) => p.campo), ['perfil', 'tramo', 'regimen']);
    assert.deepEqual(Object.keys(RESPUESTAS_VACIAS), ['perfil', 'tramo', 'regimen']);
    assert.deepEqual(valores(0), ['familia', 'docente']);
    assert.deepEqual(valores(1, 'familia'), ['4-7', '8-12', '13-17']);
    assert.deepEqual(valores(2, 'familia'), ['contributivo', 'subsidiado', 'sin-afiliacion']);
  });

  test('si consulta un docente, las preguntas 2 y 3 hablan de «el estudiante»', () => {
    assert.equal(PREGUNTAS[1].enunciado('docente'), '¿Qué edad tiene el estudiante?');
    assert.equal(PREGUNTAS[2].enunciado('docente'), '¿A qué régimen de salud está afiliado el estudiante?');
    assert.match(PREGUNTAS[1].enunciado('familia'), /el niño, la niña o el adolescente/);
    assert.match(PREGUNTAS[2].enunciado('familia'), /el niño, la niña o el adolescente/);
  });

  test('«No lo sé» se ofrece solo a los docentes, en la pregunta del régimen', () => {
    assert.deepEqual(valores(2, 'docente'), ['contributivo', 'subsidiado', 'sin-afiliacion', NO_LO_SE]);
    assert.ok(!valores(2, 'familia').includes(NO_LO_SE));
  });

  test('ninguna pregunta ni opción indaga por conductas ni síntomas', () => {
    const textos = PREGUNTAS.flatMap((p) =>
      ['familia', 'docente'].flatMap((perfil) => [
        p.enunciado(perfil),
        ...p.opciones(perfil).flatMap((o) => [o.etiqueta, o.descripcion ?? ''])
      ])
    ).join(' ');
    assert.doesNotMatch(textos, /conducta|comportamiento|síntoma|señal|observ|diagn/i);
  });

  test('al cambiar a familia se borra «No lo sé», que no se ofrece a las familias', () => {
    const docente = { perfil: 'docente', tramo: '8-12', regimen: NO_LO_SE };
    assert.deepEqual(responder(docente, 'perfil', 'familia'), { perfil: 'familia', tramo: '8-12', regimen: null });
    const conRegimen = { ...docente, regimen: 'subsidiado' };
    assert.deepEqual(responder(conRegimen, 'perfil', 'familia'), { ...conRegimen, perfil: 'familia' });
  });

  test('el resumen del final usa los nombres visibles', () => {
    assert.equal(
      resumirRespuestas({ perfil: 'familia', tramo: '8-12', regimen: 'subsidiado' }),
      'Familia o cuidador · 8 a 12 años · Régimen subsidiado'
    );
    assert.equal(
      resumirRespuestas({ perfil: 'docente', tramo: '13-17', regimen: NO_LO_SE }),
      'Docente · 13 a 17 años · Régimen: no lo sé'
    );
  });
});
