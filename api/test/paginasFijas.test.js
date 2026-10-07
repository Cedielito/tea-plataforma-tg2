'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { crearPaginasFijas } = require('../src/datos/paginasFijas');
const { MENSAJES } = require('../src/dominio/archivoPagina');
const { crearServidor } = require('../src/api/servidor');
const { crearRegistro } = require('./ayudas/administrador');

/**
 * Lectura de api/contenidos/paginas al arrancar y GET /api/paginas/:slug.
 * M-06, RF-12, RS-03
 */

let carpeta;
beforeEach(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'paginas-'));
});
afterEach(() => fs.rm(carpeta, { recursive: true, force: true }));

const ahora = () => new Date('2026-10-07T15:00:00Z');

async function escribir(nombre, { slug, cuerpo = 'Texto.' }) {
  const texto = [
    '---',
    'titulo: "Título"',
    `slug: ${slug}`,
    'fechaRevision: 2026-10-06',
    'fuentes:',
    '  - texto: "Ley 1581 de 2012."',
    '---',
    cuerpo
  ].join('\n');
  await fs.writeFile(path.join(carpeta, nombre), texto);
}

describe('RS-03 carga de las paginas fijas', () => {
  test('carga las paginas validas y deja en el registro las que tienen errores, sin detener nada', async () => {
    await escribir('acerca-de.md', { slug: 'acerca-de' });
    await escribir('otra.md', { slug: 'otra', cuerpo: 'Vigente desde el COMPLETAR.' });
    await escribir('repetida.md', { slug: 'acerca-de' });
    await fs.writeFile(path.join(carpeta, 'README.md'), 'Documentación de la carpeta.');
    const registro = crearRegistro();

    const paginas = crearPaginasFijas({ directorio: carpeta, ahora });
    const leido = await paginas.cargar({ registro });

    expect([...leido.paginas.keys()]).toEqual(['acerca-de']);
    expect(registro.lineas).toEqual([
      'Páginas fijas: 1 cargada, 2 con errores.',
      `  otra.md: ${MENSAJES.PENDIENTE}`,
      '  repetida.md: El slug «acerca-de» ya lo usa acerca-de.md.',
      '  Sin la política de privacidad, el formulario de contacto no recibe mensajes.'
    ]);
    expect(await paginas.obtener('acerca-de')).toMatchObject({ slug: 'acerca-de', titulo: 'Título' });
    expect(await paginas.obtener('otra')).toBeNull();
    expect(await paginas.politica()).toBeNull();
  });

  test('lee la carpeta una sola vez', async () => {
    await escribir('acerca-de.md', { slug: 'acerca-de' });
    const paginas = crearPaginasFijas({ directorio: carpeta, ahora });
    await paginas.obtener('acerca-de');
    await fs.rm(path.join(carpeta, 'acerca-de.md'));
    expect(await paginas.obtener('acerca-de')).not.toBeNull();
  });

  test('si la carpeta no se puede leer, lo registra sin lanzar y vuelve a intentar despues', async () => {
    const faltante = path.join(carpeta, 'no-existe');
    const registro = crearRegistro();
    const paginas = crearPaginasFijas({ directorio: faltante, ahora });

    expect(await paginas.cargar({ registro })).toBeNull();
    expect(registro.lineas[0]).toMatch(/^No se pudieron leer las páginas fijas: /);

    await fs.mkdir(faltante);
    await fs.writeFile(path.join(faltante, 'a.md'), '');
    expect(await paginas.obtener('a')).toBeNull();
  });
});

describe('RS-03 RF-12 GET /api/paginas/:slug', () => {
  const app = crearServidor();

  test('la politica llega con su version, su vigencia y el texto de la casilla', async () => {
    const res = await request(app).get('/api/paginas/privacidad');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slug: 'privacidad',
      titulo: 'Política de tratamiento de datos personales',
      version: '1.0',
      vigenteDesde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      textoAutorizacion: expect.stringContaining('Autorizo el tratamiento de mi correo'),
      fuentes: expect.arrayContaining([expect.objectContaining({ texto: expect.any(String) })]),
      fechaRevision: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
    });
    expect(res.body.cuerpo).toContain('no escribas en tu mensaje nombres, documentos ni información de salud');
  });

  test('«Acerca de» llega sin los campos de la politica', async () => {
    const res = await request(app).get('/api/paginas/acerca-de');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('acerca-de');
    expect(res.body.version).toBeUndefined();
  });

  test('una pagina que no existe, o un slug invalido, responde 404', async () => {
    expect((await request(app).get('/api/paginas/no-existe')).status).toBe(404);
    expect((await request(app).get('/api/paginas/..%2Fs1-que-es-el-tea')).status).toBe(404);
  });
});
