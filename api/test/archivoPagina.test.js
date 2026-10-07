'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { MENSAJES, SLUG_POLITICA, leerArchivoPagina } = require('../src/dominio/archivoPagina');
const { MENSAJES: MENSAJES_PUBLICACION } = require('../src/dominio/publicacion');
const { DIRECTORIO_PAGINAS, leerPaginas } = require('../src/datos/paginasFijas');

/**
 * Paginas fijas de api/contenidos/paginas: politica de privacidad y «Acerca
 * de». M-06, RF-08, RF-12, RS-02, RS-03, RCN-01, RCN-02
 */

const AHORA = new Date('2026-10-07T15:00:00Z');

const FUENTE = ['fuentes:', '  - texto: "Ley 1581 de 2012."', '    url: "https://normas.cra.gov.co/"'];

function pagina({ slug = 'acerca-de', fecha = '2026-10-07', fuentes = FUENTE, extra = [], cuerpo = 'Texto.' } = {}) {
  const encabezado = ['titulo: "Título"', `slug: ${slug}`, ...extra, ...fuentes];
  if (fecha) encabezado.push(`fechaRevision: ${fecha}`);
  return `---\n${encabezado.join('\n')}\n---\n${cuerpo}\n`;
}

const POLITICA = [
  'version: "1.0"',
  'vigenteDesde: 2026-10-07',
  'textoAutorizacion: "Autorizo el tratamiento de mi correo, según la política (versión 1.0)."'
];
const politica = (opciones = {}) =>
  pagina({ slug: SLUG_POLITICA, extra: POLITICA, cuerpo: '**Versión 1.0.** Vigente desde el 7 de octubre.', ...opciones });

const leer = (texto) => leerArchivoPagina(texto, AHORA);

describe('RS-03 paginas fijas listas para publicar', () => {
  test('lee una pagina con su titulo, cuerpo, fuentes y fecha de revision', () => {
    const { datos, error } = leer(pagina({ cuerpo: '## Qué es\n\nUna plataforma.' }));
    expect(error).toBeUndefined();
    expect(datos).toEqual({
      slug: 'acerca-de',
      titulo: 'Título',
      cuerpo: '## Qué es\n\nUna plataforma.',
      fuentes: [{ texto: 'Ley 1581 de 2012.', url: 'https://normas.cra.gov.co/' }],
      fechaRevision: new Date('2026-10-07T00:00:00Z')
    });
  });

  test('la politica agrega su version, su vigencia y el texto de la casilla', () => {
    const { datos } = leer(politica());
    expect(datos).toMatchObject({
      slug: 'privacidad',
      version: '1.0',
      vigenteDesde: '2026-10-07',
      textoAutorizacion: 'Autorizo el tratamiento de mi correo, según la política (versión 1.0).'
    });
  });

  test('un archivo que todavia dice COMPLETAR no se publica, en el encabezado o en el cuerpo', () => {
    expect(leer(politica({ extra: ['version: "1.0"', 'vigenteDesde: "COMPLETAR: fecha"', POLITICA[2]] }))).toEqual({
      error: MENSAJES.PENDIENTE
    });
    expect(leer(pagina({ cuerpo: 'Vigente desde el COMPLETAR.' }))).toEqual({ error: MENSAJES.PENDIENTE });
  });

  test('la vigencia puede ser posterior a hoy (el dia en que se fusiona), pero debe ser una fecha real', () => {
    expect(leer(politica({ extra: ['version: "1.0"', 'vigenteDesde: 2026-10-20', POLITICA[2]] })).datos.vigenteDesde).toBe(
      '2026-10-20'
    );
    expect(leer(politica({ extra: ['version: "1.0"', 'vigenteDesde: 2026-02-30', POLITICA[2]] })).error).toContain(
      MENSAJES.VIGENCIA_FORMATO
    );
  });

  test('la politica sin version, vigencia o texto de la casilla no se publica', () => {
    const { error } = leer(politica({ extra: [] }));
    expect(error).toContain(MENSAJES.SIN_VERSION);
    expect(error).toContain(MENSAJES.VIGENCIA_FORMATO);
    expect(error).toContain(MENSAJES.SIN_TEXTO_AUTORIZACION);
  });

  test('la version debe coincidir en la casilla y en el cuerpo', () => {
    const extra = ['version: "1.1"', POLITICA[1], POLITICA[2]];
    const { error } = leer(politica({ extra }));
    expect(error).toContain(`${MENSAJES.VERSION_EN_AUTORIZACION} («versión 1.1»).`);
    expect(error).toContain(`${MENSAJES.VERSION_EN_CUERPO} («Versión 1.1»).`);
  });

  test('una pagina que no es la politica no admite sus campos ni otros desconocidos', () => {
    expect(leer(pagina({ extra: ['version: "1.0"', 'autor: "x"'] })).error).toBe(
      `${MENSAJES.CAMPO_DESCONOCIDO} version, autor.`
    );
  });

  test('titulo, slug y formato de la fecha son obligatorios', () => {
    const sinTitulo = pagina().replace('titulo: "Título"\n', '');
    expect(leer(sinTitulo).error).toContain(MENSAJES.SIN_TITULO);
    expect(leer(pagina({ slug: 'Acerca De' })).error).toContain(MENSAJES.SLUG_INVALIDO);
    expect(leer(pagina({ fecha: '07/10/2026' })).error).toContain(MENSAJES.FECHA_FORMATO);
    expect(leer('sin encabezado').error).toBeDefined();
  });
});

describe('RCN-01 RCN-02 paginas fijas con fuente y fecha de revision', () => {
  test('sin fuentes no se publica', () => {
    expect(leer(pagina({ fuentes: [] })).error).toBe(MENSAJES_PUBLICACION.SIN_FUENTES);
    expect(leer(pagina({ fuentes: ['fuentes: "una"'] })).error).toContain('fuentes debe ser una lista');
  });

  test('sin fecha de revision, o con una posterior a hoy, no se publica', () => {
    expect(leer(pagina({ fecha: null })).error).toBe(MENSAJES_PUBLICACION.SIN_FECHA);
    expect(leer(pagina({ fecha: '2026-10-08' })).error).toBe(MENSAJES_PUBLICACION.FECHA_FUTURA);
  });
});

describe('RS-03 archivos reales de api/contenidos/paginas', () => {
  test('ningun archivo dice COMPLETAR', async () => {
    const nombres = (await fs.readdir(DIRECTORIO_PAGINAS)).filter((nombre) => nombre.endsWith('.md'));
    expect(nombres.length).toBeGreaterThan(0);
    for (const nombre of nombres) {
      const texto = await fs.readFile(path.join(DIRECTORIO_PAGINAS, nombre), 'utf8');
      expect({ archivo: nombre, pendiente: texto.includes('COMPLETAR') }).toEqual({ archivo: nombre, pendiente: false });
    }
  });

  test('se leen sin errores la politica y «Acerca de»', async () => {
    const { paginas, errores } = await leerPaginas();
    expect(errores).toEqual([]);
    expect([...paginas.keys()].sort()).toEqual(['acerca-de', 'privacidad']);
  });

  test('la politica dice la misma version en el encabezado, la casilla y el cuerpo', async () => {
    const { paginas } = await leerPaginas();
    const { version, textoAutorizacion, cuerpo, vigenteDesde } = paginas.get('privacidad');
    expect(version).toBe('1.0');
    expect(vigenteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(textoAutorizacion).toContain(`(versión ${version})`);
    expect(cuerpo).toContain(`**Versión ${version}.**`);
  });

  test('«Acerca de» repite el aviso de no diagnostico (RF-12) y enlaza a la politica y al contacto', async () => {
    const { paginas } = await leerPaginas();
    const { cuerpo } = paginas.get('acerca-de');
    expect(cuerpo).toContain('Esta información no constituye diagnóstico ni sustituye la valoración profesional.');
    expect(cuerpo).toContain('(/privacidad)');
    expect(cuerpo).toContain('(/contacto)');
  });
});
