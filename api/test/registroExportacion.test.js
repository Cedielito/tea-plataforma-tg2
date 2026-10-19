'use strict';
const { aCsv, COLUMNAS_ENSAYOS, COLUMNAS_VALORES, duracionMinutos } = require('../src/dominio/registro/exportacion');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { CAMPOS_IDENTIFICABLES } = require('../src/dominio/registro/seudonimo');

describe('HU-19 formato de los CSV', () => {
  test('coma como separador, punto decimal, vacio para null y fin de linea CRLF', () => {
    const texto = aCsv(['a', 'b', 'c', 'd', 'e'], [{ a: 1.25, b: null, c: true, d: undefined, e: -3 }]);
    expect(texto).toBe('a,b,c,d,e\r\n1.25,,true,,-3\r\n');
  });

  test('las comillas solo van donde hacen falta (RFC 4180)', () => {
    const texto = aCsv(['x'], [{ x: 'uno, dos' }, { x: 'dice "hola"' }, { x: 'con\nsalto' }, { x: 'simple' }]);
    expect(texto).toBe('x\r\n"uno, dos"\r\n"dice ""hola"""\r\n"con\nsalto"\r\nsimple\r\n');
  });

  test('un numero que no es finito queda vacio', () => {
    expect(aCsv(['n'], [{ n: Number.NaN }, { n: Infinity }])).toBe('n\r\n\r\n\r\n');
  });

  test('CT-11 / M-09 las columnas no tienen datos identificables ni vocabulario prohibido', () => {
    const normalizar = (c) => c.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const columna of [...COLUMNAS_ENSAYOS, ...COLUMNAS_VALORES]) {
      expect(CAMPOS_IDENTIFICABLES).not.toContain(normalizar(columna));
    }
    expect(buscarVocabularioProhibido([...COLUMNAS_ENSAYOS, ...COLUMNAS_VALORES])).toEqual([]);
    expect(COLUMNAS_VALORES).toContain('valorSUS');
  });
});

describe('CT-08 duracion de la aplicacion en valores.csv', () => {
  const entregadaEn = new Date('2026-10-27T15:00:00Z');
  const despues = (ms) => new Date(entregadaEn.getTime() + ms);

  test('minutos de la entrega a la llegada de las dos tareas, con dos decimales', () => {
    expect(duracionMinutos({ estado: 'completada', entregadaEn, completadaEn: despues(17 * 60000) })).toBe(17);
    expect(duracionMinutos({ estado: 'completada', entregadaEn, completadaEn: despues(754321) })).toBe(12.57);
    // Las fechas tambien pueden llegar como texto ISO
    const enTexto = { estado: 'completada', entregadaEn: entregadaEn.toISOString(), completadaEn: despues(90000).toISOString() };
    expect(duracionMinutos(enTexto)).toBe(1.5);
  });

  test('vacia si la sesion no se completo o le falta una fecha', () => {
    for (const estado of ['en_curso', 'interrumpida', 'abandonada']) {
      expect(duracionMinutos({ estado, entregadaEn, completadaEn: despues(60000) })).toBeNull();
    }
    expect(duracionMinutos({ estado: 'completada', completadaEn: despues(60000) })).toBeNull();
    expect(duracionMinutos({ estado: 'completada', entregadaEn })).toBeNull();
  });

  test('las columnas van junto al estado y no son fechas', () => {
    const i = COLUMNAS_VALORES.indexOf('estado');
    expect(COLUMNAS_VALORES.slice(i, i + 3)).toEqual(['estado', 'entregada', 'duracionMin']);
    expect(COLUMNAS_VALORES.filter((c) => /fecha|En$/.test(c))).toEqual([]);
  });
});
