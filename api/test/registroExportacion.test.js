'use strict';
const { aCsv, COLUMNAS_ENSAYOS, COLUMNAS_VALORES } = require('../src/dominio/registro/exportacion');
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
