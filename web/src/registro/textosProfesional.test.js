/**
 * Textos y pantallas del flujo del profesional y de la aplicación (M-09,
 * RCN-03, HU-18): sin vocabulario prohibido; los valores se muestran con su
 * unidad y sin categorías.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buscarVocabularioProhibido } from '../../../api/src/dominio/registro/vocabularioProhibido.js';
import * as textos from './textosProfesional.js';
import { etiquetaEstado, valorDeContextoSesion, valorDeContextoTarea, valorObservado } from './formatoValores.js';

const ESCALA = { minimo: 1, maximo: 5, etiquetaMinimo: 'Totalmente en desacuerdo', etiquetaMaximo: 'Totalmente de acuerdo' };

/** Código de un .jsx sin sus comentarios (los comentarios nombran requisitos, no se ven). */
const sinComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('M-09 / RCN-03 textos del profesional y de la aplicación sin vocabulario prohibido', () => {
  test('ningún texto, tampoco los que salen de funciones', () => {
    const generados = [
      textos.ELIMINAR.pregunta('ABCD-2345'),
      textos.ELIMINAR.eliminada('ABCD-2345'),
      textos.ELIMINAR.noEncontrada('ABCD-2345'),
      [1, 2, 3, 4, 5].map((n) => textos.SUS.opcion(n, ESCALA)),
      textos.SUS.enunciado(1, 10)
    ];
    assert.deepEqual(buscarVocabularioProhibido([textos, generados]), []);
  });

  test('el SUS se llama «valor SUS»: nunca puntaje', () => {
    const todo = JSON.stringify(textos);
    assert.doesNotMatch(todo, /puntaje|puntuaci|score/i);
    assert.match(textos.DETALLE.sus, /valora la herramienta, no a la persona/);
  });

  test('tampoco las pantallas del profesional ni las del panel que se reutilizan', () => {
    const carpeta = new URL('.', import.meta.url);
    const pantallas = readdirSync(carpeta)
      .filter((f) => f.endsWith('.jsx'))
      .map((f) => new URL(f, carpeta));
    const reutilizadas = ['FormularioAcceso.jsx', 'SesionVencida.jsx'].map((f) => new URL(`../admin/${f}`, carpeta));
    for (const archivo of [...pantallas, ...reutilizadas]) {
      const codigo = sinComentarios(readFileSync(archivo, 'utf8'));
      assert.deepEqual(buscarVocabularioProhibido(codigo), [], archivo.pathname);
    }
  });

  test('los estados de la sesión tienen nombre visible', () => {
    for (const estado of ['en_curso', 'completada', 'interrumpida', 'abandonada']) {
      assert.notEqual(etiquetaEstado(estado), estado);
    }
  });
});

describe('HU-18 valores observados con su unidad', () => {
  test('cada unidad con su formato en español de Colombia', () => {
    assert.equal(valorObservado({ unidad: 'proporcion', observado: 1 / 7 }), '0,143');
    assert.equal(valorObservado({ unidad: 'ms', observado: 35.24 }), '35,2 ms');
    assert.equal(valorObservado({ unidad: 'ms', observado: -12.5 }), '-12,5 ms');
    assert.equal(valorObservado({ unidad: 'ensayos', observado: 1, criterioAlcanzado: true }), '1 ensayo');
    assert.equal(valorObservado({ unidad: 'ensayos', observado: 5, criterioAlcanzado: true }), '5 ensayos');
  });

  test('un valor que no se calculó se dice con palabras; CC-12 dice si no se alcanzó el criterio', () => {
    assert.equal(valorObservado({ unidad: 'ms', observado: null }), textos.VALORES.sinDatos);
    assert.equal(valorObservado({ unidad: 'ensayos', observado: null, criterioAlcanzado: false }), textos.VALORES.criterioNoAlcanzado);
    assert.equal(valorObservado({ unidad: 'ensayos', observado: null, criterioAlcanzado: null }), textos.VALORES.sinDatos);
  });

  test('variables de contexto', () => {
    assert.equal(valorDeContextoTarea('tasaOmision', 0.25), '0,25');
    assert.equal(valorDeContextoTarea('variabilidadTiempoReaccion', 120.456), '120,5 ms');
    assert.equal(valorDeContextoTarea('coeficienteVariacion', null), textos.VALORES.sinDatos);
    assert.equal(valorDeContextoSesion('tipoEntrada', 'tactil'), 'Pantalla táctil');
    assert.equal(valorDeContextoSesion('pausas', 3), '3');
  });
});
