'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {
  MENSAJES,
  leerArchivoSus,
  leerRespuestasSus,
  calcularValorSUS
} = require('../src/dominio/registro/sus');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');

const ARCHIVO = path.join(__dirname, '..', 'contenidos', 'registro', 'sus.yaml');
const TEXTO = fs.readFileSync(ARCHIVO, 'utf8');

const ARCHIVO_MINIMO = `
version: prueba-1
fuente: Fuente de prueba
escala:
  minimo: 1
  maximo: 5
  etiquetaMinimo: En desacuerdo
  etiquetaMaximo: De acuerdo
items:
${Array.from({ length: 10 }, (_, i) => `  - Enunciado ${i + 1}`).join('\n')}
`;

describe('M-09 cuestionario SUS: el archivo api/contenidos/registro/sus.yaml', () => {
  test('tiene los 10 items en orden, la escala de 1 a 5 y su version', () => {
    const { datos, error } = leerArchivoSus(TEXTO);
    expect(error).toBeUndefined();
    expect(datos.items.map((i) => i.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(datos.items[0].texto).toBe('Creo que me gustaría usar esta herramienta con frecuencia.');
    expect(datos.items[9].texto).toBe('Necesité aprender muchas cosas antes de poder usar esta herramienta.');
    expect(datos.escala).toEqual({
      minimo: 1,
      maximo: 5,
      etiquetaMinimo: 'Totalmente en desacuerdo',
      etiquetaMaximo: 'Totalmente de acuerdo'
    });
    expect(datos.version).toMatch(/\S/);
    expect(datos.fuente).toContain('Sevilla-González');
  });

  test('M-09 / RCN-03 no tiene vocabulario prohibido (tampoco «puntaje»)', () => {
    expect(buscarVocabularioProhibido(leerArchivoSus(TEXTO).datos)).toEqual([]);
    expect(TEXTO).not.toMatch(/puntaje|score/i);
  });

  test.each([
    ['un item de menos', ARCHIVO_MINIMO.replace('  - Enunciado 10\n', ''), MENSAJES.ITEMS],
    ['un item vacio', ARCHIVO_MINIMO.replace('Enunciado 3', '""'), MENSAJES.ITEMS],
    ['otra escala', ARCHIVO_MINIMO.replace('maximo: 5', 'maximo: 7'), MENSAJES.ESCALA],
    ['sin version', ARCHIVO_MINIMO.replace('version: prueba-1', 'version: ""'), MENSAJES.VERSION],
    ['sin fuente', ARCHIVO_MINIMO.replace('fuente: Fuente de prueba', 'fuente: ""'), MENSAJES.FUENTE],
    ['un campo de mas', `${ARCHIVO_MINIMO}otro: x\n`, MENSAJES.CAMPOS],
    ['YAML roto', 'items: [', MENSAJES.YAML_INVALIDO]
  ])('no carga un archivo con %s', (_caso, texto, mensaje) => {
    const { datos, error } = leerArchivoSus(texto);
    expect(datos).toBeUndefined();
    expect(error).toContain(mensaje);
  });
});

describe('M-09 cuestionario SUS: valorSUS', () => {
  test('todo en 3 da 50', () => {
    expect(calcularValorSUS(Array(10).fill(3))).toBe(50);
  });

  test('5 en los impares y 1 en los pares da 100; lo contrario da 0', () => {
    const mejor = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 5 : 1));
    const peor = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 1 : 5));
    expect(calcularValorSUS(mejor)).toBe(100);
    expect(calcularValorSUS(peor)).toBe(0);
  });

  test('un caso mezclado: (r - 1) en los impares y (5 - r) en los pares, por 2,5', () => {
    // impares: 4,5,3,4,2 → 3+4+2+3+1 = 13; pares: 2,1,2,3,4 → 3+4+3+2+1 = 13; 26 x 2,5 = 65
    expect(calcularValorSUS([4, 2, 5, 1, 3, 2, 4, 3, 2, 4])).toBe(65);
  });

  test('no calcula con respuestas incompletas o fuera de la escala', () => {
    expect(() => calcularValorSUS(Array(9).fill(3))).toThrow(RangeError);
    expect(() => calcularValorSUS([...Array(9).fill(3), 6])).toThrow(RangeError);
  });
});

describe('M-09 cuestionario SUS: respuestas enviadas', () => {
  const cuestionario = { version: 'prueba-1' };
  const respuestas = [4, 2, 5, 1, 3, 2, 4, 3, 2, 4];

  test('acepta 10 enteros de 1 a 5 con la version vigente', () => {
    expect(leerRespuestasSus({ version: 'prueba-1', respuestas }, cuestionario)).toEqual({
      respuestas,
      version: 'prueba-1'
    });
  });

  test('otra version responde 409 y otros campos, 400', () => {
    expect(leerRespuestasSus({ version: 'vieja', respuestas }, cuestionario).estado).toBe(409);
    expect(leerRespuestasSus({ version: 'prueba-1', respuestas, valorSUS: 100 }, cuestionario).estado).toBe(400);
  });

  test.each([
    ['nueve respuestas', respuestas.slice(1)],
    ['un cero', [0, ...respuestas.slice(1)]],
    ['un decimal', [2.5, ...respuestas.slice(1)]],
    ['un texto', ['3', ...respuestas.slice(1)]]
  ])('rechaza %s con 422', (_caso, enviadas) => {
    expect(leerRespuestasSus({ version: 'prueba-1', respuestas: enviadas }, cuestionario)).toEqual({
      estado: 422,
      error: MENSAJES.RESPUESTAS
    });
  });
});

describe('M-09 cuestionario SUS: carga al arrancar', () => {
  const { crearCuestionarioSus } = require('../src/datos/cuestionarioSus');
  const { crearRegistro } = require('./ayudas/administrador');
  const os = require('node:os');

  function archivoTemporal(texto) {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'sus-'));
    const archivo = path.join(directorio, 'sus.yaml');
    fs.writeFileSync(archivo, texto);
    return archivo;
  }

  test('el del repositorio se carga y deja su version en el registro', async () => {
    const registro = crearRegistro();
    const cuestionario = crearCuestionarioSus();
    const datos = await cuestionario.cargar({ registro });
    expect(datos.items).toHaveLength(10);
    expect(registro.lineas.join('\n')).toContain(`versión ${datos.version}, 10 ítems`);
    expect(await cuestionario.obtener()).toEqual(datos);
  });

  test('un archivo con errores no se usa y queda en el registro', async () => {
    const registro = crearRegistro();
    const cuestionario = crearCuestionarioSus({ archivo: archivoTemporal(ARCHIVO_MINIMO.replace('  - Enunciado 10\n', '')) });
    expect(await cuestionario.cargar({ registro })).toBeNull();
    expect(registro.error).toHaveBeenCalledWith(expect.stringContaining(MENSAJES.ITEMS));
    expect(await cuestionario.obtener()).toBeNull();
  });

  test('si el archivo no existe, no detiene el arranque', async () => {
    const registro = crearRegistro();
    const cuestionario = crearCuestionarioSus({ archivo: path.join(os.tmpdir(), 'no-existe', 'sus.yaml') });
    expect(await cuestionario.cargar({ registro })).toBeNull();
    expect(registro.error).toHaveBeenCalledWith(expect.stringContaining('No se pudo leer el cuestionario SUS'));
    await expect(cuestionario.obtener()).rejects.toThrow();
  });
});
