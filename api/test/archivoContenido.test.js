'use strict';
const {
  ACCIONES,
  MENSAJES,
  leerArchivoContenido,
  decidirAccion
} = require('../src/dominio/archivoContenido');

/** Arma el texto de un archivo de contenido con el encabezado y el cuerpo dados. */
const archivo = (encabezado, cuerpo = '## Título\n\nTexto del cuerpo.') => `---\n${encabezado}\n---\n${cuerpo}\n`;

const ENCABEZADO = [
  'titulo: "¿Qué es el TEA?"',
  'slug: que-es-el-tea',
  'seccion: S1',
  'fechaRevision: 2026-10-06',
  'fuentes:',
  '  - texto: "OMS. Autismo: nota descriptiva. 2025."',
  '    url: https://www.who.int/es/news-room/fact-sheets/detail/autism-spectrum-disorders',
  '  - texto: "Ley 1346 de 2009."'
].join('\n');

describe('Lectura de los archivos de contenido', () => {
  test('separa el encabezado del cuerpo y devuelve el contenido como publicado', () => {
    const { datos, error } = leerArchivoContenido(archivo(ENCABEZADO));
    expect(error).toBeUndefined();
    expect(datos).toEqual({
      titulo: '¿Qué es el TEA?',
      slug: 'que-es-el-tea',
      seccion: 'S1',
      tramoEdad: null,
      fechaRevision: '2026-10-06',
      fuentes: [
        {
          texto: 'OMS. Autismo: nota descriptiva. 2025.',
          url: 'https://www.who.int/es/news-room/fact-sheets/detail/autism-spectrum-disorders'
        },
        { texto: 'Ley 1346 de 2009.' }
      ],
      cuerpo: '## Título\n\nTexto del cuerpo.',
      estado: 'publicado'
    });
  });

  test('la fecha de revision se lee como texto AAAA-MM-DD, no como fecha con hora', () => {
    const { datos } = leerArchivoContenido(archivo(ENCABEZADO));
    expect(typeof datos.fechaRevision).toBe('string');
  });

  test('lee el tramo de edad de las senales', () => {
    const { datos } = leerArchivoContenido(archivo(ENCABEZADO.replace('seccion: S1', 'seccion: S2\ntramoEdad: 13-17')));
    expect(datos.tramoEdad).toBe('13-17');
  });

  test('acepta saltos de linea de Windows y la marca BOM al inicio', () => {
    const texto = '﻿' + archivo(ENCABEZADO).replace(/\n/g, '\r\n');
    const { datos, error } = leerArchivoContenido(texto);
    expect(error).toBeUndefined();
    expect(datos.slug).toBe('que-es-el-tea');
    expect(datos.cuerpo).toBe('## Título\r\n\r\nTexto del cuerpo.');
  });

  test('un cuerpo con lineas --- (separadores de Markdown) no corta el encabezado', () => {
    const { datos } = leerArchivoContenido(archivo(ENCABEZADO, 'Antes\n\n---\n\nDespués'));
    expect(datos.cuerpo).toBe('Antes\n\n---\n\nDespués');
  });

  test('sin fuentes ni fecha devuelve los datos: el modelo decide al publicar (RCN-01, RCN-02)', () => {
    const { datos } = leerArchivoContenido(archivo('titulo: "Sin fuentes"\nslug: sin-fuentes\nseccion: S3'));
    expect(datos.fuentes).toEqual([]);
    expect(datos.fechaRevision).toBeNull();
  });

  test.each([
    ['sin encabezado', 'Solo texto en Markdown.', MENSAJES.SIN_ENCABEZADO],
    ['con el encabezado sin cerrar', '---\ntitulo: "A"\nslug: a\n', MENSAJES.SIN_ENCABEZADO],
    ['con YAML roto', archivo('titulo: "Sin cerrar\nslug: a'), MENSAJES.ENCABEZADO_INVALIDO],
    ['con claves repetidas', archivo('slug: a\nslug: b'), MENSAJES.ENCABEZADO_INVALIDO],
    ['con un encabezado que no tiene campos', archivo('- solo\n- una lista'), MENSAJES.ENCABEZADO_SIN_CAMPOS],
    ['con un encabezado vacio', archivo(''), MENSAJES.ENCABEZADO_SIN_CAMPOS]
  ])('rechaza un archivo %s', (_caso, texto, mensaje) => {
    const { datos, error } = leerArchivoContenido(texto);
    expect(datos).toBeUndefined();
    expect(error).toContain(mensaje);
  });

  test('rechaza un campo desconocido, para atrapar errores de escritura como fechaRevison', () => {
    const { error } = leerArchivoContenido(archivo(ENCABEZADO.replace('fechaRevision', 'fechaRevison')));
    expect(error).toContain(`${MENSAJES.CAMPO_DESCONOCIDO} fechaRevison.`);
  });

  test.each([
    ['sin slug', ENCABEZADO.replace('slug: que-es-el-tea\n', '')],
    ['con mayusculas en el slug', ENCABEZADO.replace('que-es-el-tea', 'Que-Es-El-TEA')],
    ['con tildes en el slug', ENCABEZADO.replace('que-es-el-tea', 'qué-es-el-tea')]
  ])('rechaza un archivo %s', (_caso, encabezado) => {
    expect(leerArchivoContenido(archivo(encabezado)).error).toBe(MENSAJES.SLUG_INVALIDO);
  });

  test.each([
    ['06/10/2026', 'dia/mes/año'],
    ['2026-02-30', 'un dia que no existe'],
    ['2026-10-06T10:00:00', 'con hora'],
    ['"6 de octubre de 2026"', 'en palabras']
  ])('rechaza la fecha de revision %s (%s)', (fecha) => {
    const { error } = leerArchivoContenido(archivo(ENCABEZADO.replace('2026-10-06', fecha)));
    expect(error).toBe(MENSAJES.FECHA_FORMATO);
  });

  test.each([
    ['no son una lista', 'fuentes: "OMS. Autismo."'],
    ['son solo texto', 'fuentes:\n  - "OMS. Autismo."'],
    ['tienen un campo de mas', 'fuentes:\n  - texto: "OMS."\n    enlace: https://www.who.int']
  ])('rechaza fuentes que %s', (_caso, fuentes) => {
    const encabezado = ENCABEZADO.replace(/fuentes:[\s\S]*$/, fuentes);
    const { error } = leerArchivoContenido(archivo(encabezado));
    expect([MENSAJES.FUENTES_NO_LISTA, MENSAJES.FUENTE_FORMATO]).toContain(error);
  });

  test('junta todos los errores de formato en un solo mensaje', () => {
    const { error } = leerArchivoContenido(archivo('titulo: "A"\nautor: "B"\nfechaRevision: hoy'));
    expect(error).toContain(MENSAJES.CAMPO_DESCONOCIDO);
    expect(error).toContain(MENSAJES.SLUG_INVALIDO);
    expect(error).toContain(MENSAJES.FECHA_FORMATO);
  });

  test('no falla si recibe algo que no es texto', () => {
    expect(leerArchivoContenido(undefined).error).toBe(MENSAJES.SIN_ENCABEZADO);
  });
});

describe('Decision de carga segun la fecha de revision', () => {
  const enBase = (fecha) => ({ fechaRevision: fecha === null ? null : new Date(`${fecha}T00:00:00Z`) });

  test('si el contenido no existe en la base, se crea', () => {
    expect(decidirAccion('2026-10-06', null)).toBe(ACCIONES.CREAR);
  });

  test('si el archivo trae una fecha mas reciente, se actualiza', () => {
    expect(decidirAccion('2026-10-06', enBase('2026-10-05'))).toBe(ACCIONES.ACTUALIZAR);
  });

  test('con la misma fecha no se toca: corregir un texto exige cambiar la fecha', () => {
    expect(decidirAccion('2026-10-06', enBase('2026-10-06'))).toBe(ACCIONES.OMITIR);
  });

  test('si la base tiene una revision mas reciente (hecha en el panel), no se pisa', () => {
    expect(decidirAccion('2026-10-06', enBase('2026-10-20'))).toBe(ACCIONES.OMITIR);
  });

  test('si la base no tiene fecha (un borrador), se actualiza', () => {
    expect(decidirAccion('2026-10-06', enBase(null))).toBe(ACCIONES.ACTUALIZAR);
  });

  test('si el archivo no trae fecha, se intenta para que RCN-02 lo rechace y quede en el informe', () => {
    expect(decidirAccion(null, enBase('2026-10-06'))).toBe(ACCIONES.ACTUALIZAR);
  });

  test('compara por dia: la hora guardada no cambia la decision', () => {
    const existente = { fechaRevision: new Date('2026-10-06T23:59:59Z') };
    expect(decidirAccion('2026-10-06', existente)).toBe(ACCIONES.OMITIR);
    expect(decidirAccion('2026-10-07', existente)).toBe(ACCIONES.ACTUALIZAR);
  });
});
