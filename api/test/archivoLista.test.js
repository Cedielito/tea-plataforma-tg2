'use strict';
const { MENSAJES, leerArchivoLista } = require('../src/dominio/archivoLista');

const CAMPOS = ['titulo', 'orden', 'fuentes', 'fechaRevision'];
const leer = (texto) => leerArchivoLista(texto, { campos: CAMPOS });

const FUENTE = [
  '  fuentes:',
  '    - texto: "Ministerio de Salud. Protocolo clínico para TEA. 2015."',
  '      url: https://www.minsalud.gov.co/'
];

/** Un elemento de la lista con sus lineas; `extra` agrega o reemplaza campos. */
function elemento({ id = 'paso-uno', titulo = 'Paso uno', fecha = '2026-10-06', fuentes = FUENTE, extra = [] } = {}) {
  const lineas = [`- id: ${id}`, `  titulo: "${titulo}"`, '  orden: 10', ...extra];
  if (fecha) lineas.push(`  fechaRevision: ${fecha}`);
  return [...lineas, ...fuentes].join('\n');
}

describe('Lectura de las listas YAML de api/contenidos', () => {
  test('lee cada elemento: el id pasa a slug y queda publicado', () => {
    const resultado = leer([elemento(), elemento({ id: 'paso-dos', titulo: 'Paso dos' })].join('\n'));

    expect(resultado.errores).toEqual([]);
    expect(resultado.elementos.map(({ nombre }) => nombre)).toEqual(['paso-uno', 'paso-dos']);
    expect(resultado.elementos[0].datos).toEqual({
      slug: 'paso-uno',
      titulo: 'Paso uno',
      orden: 10,
      estado: 'publicado',
      fechaRevision: '2026-10-06',
      fuentes: [{ texto: 'Ministerio de Salud. Protocolo clínico para TEA. 2015.', url: 'https://www.minsalud.gov.co/' }]
    });
    expect(resultado.elementos[0].datos).not.toHaveProperty('id');
  });

  test('sin fecha ni fuentes, el elemento pasa con valores vacios para que el modelo lo rechace', () => {
    const { elementos } = leer(elemento({ fecha: null, fuentes: [] }));
    expect(elementos[0].datos).toMatchObject({ fechaRevision: null, fuentes: [] });
  });

  test('un YAML mal formado o que no es una lista es un error del archivo entero', () => {
    expect(leer('- id: a\n  titulo: [sin cerrar').error).toMatch(/^El archivo no se pudo leer como YAML\./);
    expect(leer('id: paso-uno\ntitulo: Uno').error).toBe(MENSAJES.NO_ES_LISTA);
    expect(leer('').error).toBe(MENSAJES.NO_ES_LISTA);
  });

  test('un elemento con errores queda en la lista de errores y los demas se leen', () => {
    const texto = [
      elemento({ extra: ['  color: azul'] }),
      elemento({ id: 'Paso Dos' }),
      elemento({ id: 'paso-tres', fecha: '2026-02-30' }),
      elemento({ id: 'paso-cuatro', fuentes: ['  fuentes: Ministerio de Salud'] }),
      '- solo un texto',
      elemento({ id: 'paso-seis' })
    ].join('\n');

    const { elementos, errores } = leer(texto);

    expect(elementos.map(({ nombre }) => nombre)).toEqual(['paso-seis']);
    expect(errores).toEqual([
      { nombre: 'paso-uno', mensaje: 'Campo desconocido: color.' },
      { nombre: 'elemento 2', mensaje: MENSAJES.ID_INVALIDO },
      { nombre: 'paso-tres', mensaje: MENSAJES.FECHA_FORMATO },
      { nombre: 'paso-cuatro', mensaje: 'fuentes debe ser una lista: cada fuente empieza con «- texto:».' },
      { nombre: 'elemento 5', mensaje: MENSAJES.ELEMENTO_SIN_CAMPOS }
    ]);
  });

  test('un elemento sin id se informa por su posicion', () => {
    const { errores } = leer('- titulo: "Sin id"\n  orden: 10');
    expect(errores).toEqual([{ nombre: 'elemento 1', mensaje: MENSAJES.ID_INVALIDO }]);
  });

  test('un id repetido: se lee el primero y el segundo queda en los errores', () => {
    const { elementos, errores } = leer([elemento(), elemento({ titulo: 'Otro' })].join('\n'));
    expect(elementos).toHaveLength(1);
    expect(elementos[0].datos.titulo).toBe('Paso uno');
    expect(errores).toEqual([{ nombre: 'elemento 2', mensaje: 'El id «paso-uno» ya lo usa el elemento 1.' }]);
  });
});
