/**
 * Pruebas del resumen del experimento de precisión temporal (M-09, CT-07,
 * T16): estadísticas por celda, marcas de las celdas y tabla en Markdown.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  desviacionEstandar,
  media,
  percentil,
  resumirCeldas,
  resumirErrores,
  tablaMarkdown,
  UMBRAL_CT07_MS
} from './estadisticas.js';
import { informe } from './resumir.js';

describe('CT-07 estadísticas del error', () => {
  test('media y desviación estándar muestral', () => {
    assert.equal(media([1, 2, 3, 4]), 2.5);
    assert.ok(Math.abs(desviacionEstandar([2, 4, 4, 4, 5, 5, 7, 9]) - 2.1380899352993947) < 1e-12);
    assert.equal(desviacionEstandar([5]), null);
    assert.equal(media([]), null);
  });

  test('percentil con interpolación lineal, como PERCENTIL.INCLUIR', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assert.equal(percentil(v, 0), 1);
    assert.equal(percentil(v, 100), 10);
    assert.equal(percentil(v, 50), 5.5);
    assert.ok(Math.abs(percentil(v, 95) - 9.55) < 1e-12);
    assert.equal(percentil([], 95), null);
  });

  test('el percentil 95 y el porcentaje dentro de 50 ms usan el error absoluto', () => {
    const errores = [-60, -10, 0, 10, UMBRAL_CT07_MS, 51];
    const r = resumirErrores(errores);
    assert.equal(r.n, 6);
    assert.equal(r.porcentajeDentro, (100 * 4) / 6);
    assert.ok(r.p95Absoluto > 51 && r.p95Absoluto <= 60);
    assert.equal(r.media, 41 / 6);
  });
});

const fila = (o) => ({
  motor: 'chromium',
  versionMotor: '156.0',
  reloj: 'animacion',
  carga: 'normal',
  sesion: 1,
  errorMs: 1,
  errorCotaMs: 4,
  desvioArnesMs: 3,
  ...o
});

describe('CT-07 resumen por celda', () => {
  test('agrupa por motor, reloj y carga, en el orden del diseño', () => {
    const filas = [
      fila({ motor: 'webkit', versionMotor: '27.2' }),
      fila({ reloj: 'referencia', carga: 'hilo-ocupado' }),
      fila({ carga: 'cpu-x4' }),
      fila({}),
      fila({ sesion: 2, errorMs: 3 })
    ];
    const celdas = resumirCeldas(filas);
    assert.deepEqual(
      celdas.map((c) => `${c.motor} ${c.reloj} ${c.carga}`),
      ['chromium animacion normal', 'chromium animacion cpu-x4', 'chromium referencia hilo-ocupado', 'webkit animacion normal']
    );
    assert.equal(celdas[0].sesiones, 2);
    assert.equal(celdas[0].error.media, 2);
    assert.ok(celdas.every((c) => c.pocosEnsayos));
  });

  test('marca la celda con carga en la que el desvío del arnés crece frente a la carga normal', () => {
    const celda = (carga, desvio) =>
      Array.from({ length: 200 }, (_, i) => fila({ carga, desvioArnesMs: i < 180 ? 2 : desvio }));
    const [normal, ocupado] = resumirCeldas([...celda('normal', 8), ...celda('hilo-ocupado', 40)]);
    assert.equal(normal.soloCota, false);
    assert.equal(normal.aumentoDesvioArnes, null);
    assert.equal(ocupado.soloCota, true);
    assert.equal(ocupado.aumentoDesvioArnes, 32);
    assert.equal(ocupado.pocosEnsayos, false);
    // Un desvío que no crece con la carga no marca la celda, aunque sea grande.
    const parejo = resumirCeldas([...celda('normal', 30), ...celda('hilo-ocupado', 32)]);
    assert.ok(parejo.every((c) => !c.soloCota));
    // Sin celda normal para comparar, tampoco.
    assert.equal(resumirCeldas(celda('cpu-x4', 40))[0].soloCota, false);
  });

  test('la tabla en Markdown tiene una fila por celda, con coma decimal y las marcas', () => {
    const celdas = resumirCeldas([
      fila({ desvioArnesMs: 2 }),
      fila({ carga: 'hilo-ocupado', errorMs: 1.25, desvioArnesMs: 30 }),
      fila({ carga: 'hilo-ocupado', errorMs: 2.25, desvioArnesMs: 30 })
    ]);
    const tabla = tablaMarkdown(celdas, 'error').split('\n');
    assert.equal(tabla.length, 4);
    assert.match(tabla[3], /\| chromium 156\.0 \| animacion \| hilo-ocupado¹² \| 2 \| 1,8 \| 0,7 \|/);
    assert.match(tablaMarkdown(celdas, 'cota').split('\n')[3], /hilo-ocupado² \| 2 \| 4,0 \|/);
  });

  test('el informe trae el entorno, las dos tablas y las notas de las marcas', () => {
    const texto = informe({
      filas: [fila({ desvioArnesMs: 2 }), fila({ carga: 'hilo-ocupado', desvioArnesMs: 30 })],
      metadatos: [{ motor: 'chromium', versionMotor: '156.0', versionPlaywright: '1.64.1', sistema: 'Linux', cpu: 'x', nucleos: 4, sesionesPorCelda: 3, versionCatalogo: '1.1.0', versionAlgoritmo: '1.0.0', commit: 'abcdef123', fecha: '2026-10-24' }]
    });
    assert.match(texto, /### Entorno/);
    assert.match(texto, /\| chromium 156\.0 \| 1\.64\.1 \| Linux \| x \(4 núcleos\) \| 3 \| 1\.1\.0 \/ 1\.0\.0 \| abcdef1 \| 2026-10-24 \|/);
    assert.match(texto, /### Error del tiempo de reacción registrado/);
    assert.match(texto, /### Cota superior/);
    assert.match(texto, /¹ Con la carga, el percentil 95 del desvío del arnés sube/);
    assert.match(texto, /² Menos de 200 ensayos/);
  });
});
