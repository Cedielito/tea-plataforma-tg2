'use strict';
const {
  LARGO_MAXIMO,
  MAXIMO_PALABRAS,
  MENSAJES,
  leerConsulta,
  patronSinTildes,
  construirFiltroBusqueda
} = require('../src/dominio/busqueda');

/** Mismo comportamiento que $regex con $options: 'i' en MongoDB. */
const coincide = (palabra, texto) => new RegExp(patronSinTildes(palabra), 'i').test(texto);

describe('RF-02 buscador: lectura de la consulta', () => {
  test('sin consulta, o con algo que no es texto, pide escribir', () => {
    expect(leerConsulta(undefined)).toEqual({ error: MENSAJES.MUY_CORTA });
    expect(leerConsulta(['tea', 'eps'])).toEqual({ error: MENSAJES.MUY_CORTA });
    expect(leerConsulta({ $ne: '' })).toEqual({ error: MENSAJES.MUY_CORTA });
  });

  test('pide al menos 2 letras', () => {
    expect(leerConsulta('  a  ')).toEqual({ error: MENSAJES.MUY_CORTA });
    expect(leerConsulta('¿?')).toEqual({ error: MENSAJES.MUY_CORTA });
    expect(leerConsulta('ab')).toEqual({ palabras: ['ab'] });
  });

  test('rechaza consultas de mas de 100 caracteres', () => {
    expect(leerConsulta('a'.repeat(LARGO_MAXIMO + 1))).toEqual({ error: MENSAJES.MUY_LARGA });
    expect(leerConsulta('a'.repeat(LARGO_MAXIMO)).palabras).toHaveLength(1);
  });

  test('quita tildes, mayusculas y signos de puntuacion', () => {
    expect(leerConsulta('¿Qué es el TEA?')).toEqual({ palabras: ['que', 'es', 'el', 'tea'] });
    expect(leerConsulta('NIÑO, niña')).toEqual({ palabras: ['nino', 'nina'] });
  });

  test('quita palabras repetidas y se queda con las primeras 8', () => {
    expect(leerConsulta('tea tea TEA').palabras).toEqual(['tea']);
    const muchas = 'uno dos tres cuatro cinco seis siete ocho nueve diez';
    expect(leerConsulta(muchas).palabras).toHaveLength(MAXIMO_PALABRAS);
  });

  test('los simbolos de expresiones regulares se descartan', () => {
    expect(leerConsulta('.*')).toEqual({ error: MENSAJES.MUY_CORTA });
    expect(leerConsulta('(a+)+$')).toEqual({ error: MENSAJES.MUY_CORTA });
    expect(leerConsulta('tea.*[0-9]')).toEqual({ palabras: ['tea', '0', '9'] });
  });
});

describe('RF-02 buscador: coincidencias sin tildes', () => {
  test('sin tilde encuentra el texto con tilde, y al reves', () => {
    expect(coincide('diagnostico', 'Valoración y diagnóstico')).toBe(true);
    expect(coincide('valoracion', 'VALORACIÓN')).toBe(true);
    expect(coincide(leerConsulta('valoración').palabras[0], 'valoracion')).toBe(true);
  });

  test('la n encuentra la ñ', () => {
    expect(coincide('nino', 'Un niño de 6 años')).toBe(true);
    expect(coincide('anos', 'Un niño de 6 AÑOS')).toBe(true);
  });

  test('encuentra palabras incompletas', () => {
    expect(coincide('autis', 'trastorno del espectro autista')).toBe(true);
  });

  test('no encuentra lo que no esta', () => {
    expect(coincide('eps', 'Secretaría de Educación')).toBe(false);
  });

  test('un caracter especial que llegara al patron se escapa', () => {
    expect(patronSinTildes('a.b')).toBe('[aáàâäAÁÀÂÄ]\\.b');
    expect(coincide('a.b', 'axb')).toBe(false);
  });
});

describe('RF-02 buscador: filtro de MongoDB', () => {
  test('cada palabra debe aparecer en alguno de los campos', () => {
    const filtro = construirFiltroBusqueda(['tea', 'eps'], ['titulo', 'cuerpo']);
    expect(filtro.$and).toHaveLength(2);
    expect(filtro.$and[0].$or).toEqual([
      { titulo: { $regex: patronSinTildes('tea'), $options: 'i' } },
      { cuerpo: { $regex: patronSinTildes('tea'), $options: 'i' } }
    ]);
  });
});
