'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { Contenido } = require('../src/datos/modelos');
const contenidos = require('../src/datos/repositorios/contenidos');
const { MENSAJES } = require('../src/dominio/publicacion');
const { leerArchivoContenido } = require('../src/dominio/archivoContenido');
const { TRAMOS_EDAD } = require('../src/dominio/catalogos');
const {
  DIRECTORIO_CONTENIDOS,
  sincronizarContenidos,
  resumirInforme,
  cargarContenidos
} = require('../src/datos/sincronizacionContenidos');

beforeAll(async () => {
  await levantar();
  await Contenido.init();
});
afterAll(bajar);

let carpeta;
beforeEach(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'contenidos-'));
});
afterEach(async () => {
  await limpiar();
  await fs.rm(carpeta, { recursive: true, force: true });
});

const FUENTE = [
  'fuentes:',
  '  - texto: "Ministerio de Salud. Protocolo clínico para TEA. 2015."',
  '    url: https://www.minsalud.gov.co/'
];

/** Escribe un archivo de contenido en la carpeta de la prueba. */
async function escribir(nombre, opciones) {
  const { slug, titulo = 'Título', seccion = 'S1', fecha = '2026-09-30', fuentes = FUENTE } = opciones;
  const { cuerpo = 'Texto.', extra = [] } = opciones;
  const encabezado = [`titulo: "${titulo}"`, `slug: ${slug}`, `seccion: ${seccion}`, ...extra];
  if (fecha) encabezado.push(`fechaRevision: ${fecha}`);
  encabezado.push(...fuentes);
  await fs.writeFile(path.join(carpeta, nombre), `---\n${encabezado.join('\n')}\n---\n${cuerpo}\n`);
}

const buscar = (slug) => Contenido.findOne({ slug }).lean();
const dia = (fecha) => fecha.toISOString().slice(0, 10);

describe('Carga de los textos de api/contenidos a la base', () => {
  test('crea lo que falta, publicado, con su fuente y su fecha', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea', cuerpo: '## Definición\n\nTexto.' });
    await escribir('s3.md', { slug: 'mitos', seccion: 'S3' });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe).toEqual({ creados: ['s1.md', 's3.md'], actualizados: [], sinCambios: [], errores: [] });
    const s1 = await buscar('que-es-el-tea');
    expect(s1).toMatchObject({ estado: 'publicado', seccion: 'S1', cuerpo: '## Definición\n\nTexto.' });
    expect(s1.fuentes).toHaveLength(1);
    expect(s1.fechaRevision.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  test('ignora el README y los archivos que no son .md', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await fs.writeFile(path.join(carpeta, 'README.md'), '# Contenidos\n');
    await fs.writeFile(path.join(carpeta, 'notas.txt'), 'pendiente');

    expect((await sincronizarContenidos(carpeta)).creados).toEqual(['s1.md']);
    expect(await Contenido.countDocuments()).toBe(1);
  });

  test('si se corre dos veces, la segunda no cambia nada', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    const antes = await buscar('que-es-el-tea');

    const informe = await sincronizarContenidos(carpeta);

    expect(informe).toEqual({ creados: [], actualizados: [], sinCambios: ['s1.md'], errores: [] });
    expect((await buscar('que-es-el-tea')).updatedAt).toEqual(antes.updatedAt);
  });

  test('con una fecha de revision mas reciente actualiza todos los campos', async () => {
    await escribir('s2.md', { slug: 'senales', seccion: 'S2', extra: ['tramoEdad: 4-7'] });
    await sincronizarContenidos(carpeta);
    await escribir('s2.md', {
      slug: 'senales',
      seccion: 'S2',
      titulo: 'Título nuevo',
      fecha: '2026-10-01',
      cuerpo: 'Texto corregido.'
    });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.actualizados).toEqual(['s2.md']);
    const guardado = await buscar('senales');
    expect(guardado).toMatchObject({ titulo: 'Título nuevo', cuerpo: 'Texto corregido.', tramoEdad: null });
    expect(dia(guardado.fechaRevision)).toBe('2026-10-01');
    expect(await Contenido.countDocuments()).toBe(1);
  });

  test('si el texto cambia sin cambiar la fecha, no se carga', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    await escribir('s1.md', { slug: 'que-es-el-tea', cuerpo: 'Otro texto.' });

    expect((await sincronizarContenidos(carpeta)).sinCambios).toEqual(['s1.md']);
    expect((await buscar('que-es-el-tea')).cuerpo).toBe('Texto.');
  });

  test('no pisa una correccion hecha en el panel con una fecha mas reciente', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    const doc = await Contenido.findOne({ slug: 'que-es-el-tea' });
    await contenidos.actualizar(doc._id, { cuerpo: 'Corregido en el panel.', fechaRevision: '2026-10-02' });

    expect((await sincronizarContenidos(carpeta)).sinCambios).toEqual(['s1.md']);
    expect((await buscar('que-es-el-tea')).cuerpo).toBe('Corregido en el panel.');
  });

  test('completa y publica un borrador que no tiene fecha de revision', async () => {
    await contenidos.crear({
      titulo: 'Borrador',
      slug: 'que-es-el-tea',
      seccion: 'S1',
      cuerpo: 'Relleno.',
      estado: 'borrador'
    });
    await escribir('s1.md', { slug: 'que-es-el-tea' });

    expect((await sincronizarContenidos(carpeta)).actualizados).toEqual(['s1.md']);
    expect(await buscar('que-es-el-tea')).toMatchObject({ estado: 'publicado', cuerpo: 'Texto.' });
  });

  test('vuelve a publicar un contenido despublicado si el archivo trae una revision mas reciente', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    const doc = await Contenido.findOne({ slug: 'que-es-el-tea' });
    await contenidos.actualizar(doc._id, { estado: 'borrador' });
    await escribir('s1.md', { slug: 'que-es-el-tea', fecha: '2026-10-01' });

    await sincronizarContenidos(carpeta);
    expect((await buscar('que-es-el-tea')).estado).toBe('publicado');
  });

  test('nunca borra: quitar un archivo deja el contenido en la base', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    await fs.rm(path.join(carpeta, 's1.md'));

    const informe = await sincronizarContenidos(carpeta);
    expect(informe).toEqual({ creados: [], actualizados: [], sinCambios: [], errores: [] });
    expect((await buscar('que-es-el-tea')).estado).toBe('publicado');
  });

  test('un archivo con errores de formato queda en el informe y los demas se cargan', async () => {
    await fs.writeFile(path.join(carpeta, 'roto.md'), 'Sin encabezado.\n');
    await escribir('s1.md', { slug: 'que-es-el-tea' });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.creados).toEqual(['s1.md']);
    expect(informe.errores).toEqual([{ archivo: 'roto.md', mensaje: expect.stringContaining('encabezado') }]);
  });

  test('dos archivos con el mismo slug: se carga el primero y el segundo queda en el informe', async () => {
    await escribir('a.md', { slug: 'que-es-el-tea', titulo: 'Primero' });
    await escribir('b.md', { slug: 'que-es-el-tea', titulo: 'Segundo' });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.creados).toEqual(['a.md']);
    expect(informe.errores).toEqual([{ archivo: 'b.md', mensaje: 'El slug «que-es-el-tea» ya lo usa a.md.' }]);
    expect((await buscar('que-es-el-tea')).titulo).toBe('Primero');
  });

  test('un error del modelo que no es de fuente ni fecha tambien queda en el informe', async () => {
    await escribir('s9.md', { slug: 'seccion-inexistente', seccion: 'S9' });
    const informe = await sincronizarContenidos(carpeta);
    expect(informe.errores).toEqual([{ archivo: 's9.md', mensaje: 'La sección debe ser S1, S2, S3, S4 o S5.' }]);
  });
});

describe('RCN-01 la carga de textos no publica un archivo sin fuentes', () => {
  test('rechaza el archivo sin fuentes, no lo guarda y carga los demas', async () => {
    await escribir('sin-fuentes.md', { slug: 'sin-fuentes', fuentes: [] });
    await escribir('s1.md', { slug: 'que-es-el-tea' });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.creados).toEqual(['s1.md']);
    expect(informe.errores).toEqual([{ archivo: 'sin-fuentes.md', mensaje: MENSAJES.SIN_FUENTES }]);
    expect(await buscar('sin-fuentes')).toBeNull();
  });

  test('rechaza la actualizacion que quita las fuentes y deja la version anterior', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    await escribir('s1.md', { slug: 'que-es-el-tea', fecha: '2026-10-01', fuentes: [], cuerpo: 'Sin respaldo.' });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.errores).toEqual([{ archivo: 's1.md', mensaje: MENSAJES.SIN_FUENTES }]);
    expect((await buscar('que-es-el-tea')).cuerpo).toBe('Texto.');
  });

  test('rechaza una fuente con un enlace que no es http ni https', async () => {
    const fuente = ['fuentes:', '  - texto: "Enlace peligroso"', '    url: javascript:alert(1)'];
    await escribir('s1.md', { slug: 'que-es-el-tea', fuentes: fuente });

    const informe = await sincronizarContenidos(carpeta);
    expect(informe.errores).toEqual([{ archivo: 's1.md', mensaje: MENSAJES.FUENTE_URL_INSEGURA }]);
  });
});

describe('RCN-02 la carga de textos no publica un archivo sin fecha de revision', () => {
  test('rechaza el archivo sin fecha y no lo guarda', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea', fecha: null });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.errores).toEqual([{ archivo: 's1.md', mensaje: MENSAJES.SIN_FECHA }]);
    expect(await buscar('que-es-el-tea')).toBeNull();
  });

  test('si un archivo ya cargado pierde la fecha, se informa y la base conserva la version anterior', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await sincronizarContenidos(carpeta);
    await escribir('s1.md', { slug: 'que-es-el-tea', fecha: null, cuerpo: 'Sin fecha.' });

    const informe = await sincronizarContenidos(carpeta);

    expect(informe.errores).toEqual([{ archivo: 's1.md', mensaje: MENSAJES.SIN_FECHA }]);
    expect((await buscar('que-es-el-tea')).cuerpo).toBe('Texto.');
  });

  test('rechaza una fecha de revision posterior a hoy', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea', fecha: '2999-01-01' });
    const informe = await sincronizarContenidos(carpeta);
    expect(informe.errores).toEqual([{ archivo: 's1.md', mensaje: MENSAJES.FECHA_FUTURA }]);
  });
});

describe('Registro de la carga al arrancar la API', () => {
  const registroFalso = () => ({ log: jest.fn(), error: jest.fn() });

  test('resume el informe en una linea, con singular y plural', () => {
    expect(resumirInforme({ creados: [], actualizados: ['a'], sinCambios: ['b', 'c'], errores: [] })).toBe(
      'Contenidos: 0 creados, 1 actualizado, 2 sin cambios, 0 con errores.'
    );
    expect(resumirInforme({ creados: ['a'], actualizados: [], sinCambios: [], errores: [{}] })).toBe(
      'Contenidos: 1 creado, 0 actualizados, 0 sin cambios, 1 con error.'
    );
  });

  test('escribe el resumen y una linea por cada archivo con errores', async () => {
    await escribir('s1.md', { slug: 'que-es-el-tea' });
    await escribir('sin-fuentes.md', { slug: 'sin-fuentes', fuentes: [] });
    const registro = registroFalso();

    const informe = await cargarContenidos({ directorio: carpeta, registro });

    expect(informe.creados).toEqual(['s1.md']);
    expect(registro.log).toHaveBeenCalledWith('Contenidos: 1 creado, 0 actualizados, 0 sin cambios, 1 con error.');
    expect(registro.error).toHaveBeenCalledWith(`  sin-fuentes.md: ${MENSAJES.SIN_FUENTES}`);
  });

  test('si la carpeta no existe, lo informa y no lanza: la API arranca igual', async () => {
    const registro = registroFalso();
    const informe = await cargarContenidos({ directorio: path.join(carpeta, 'no-existe'), registro });
    expect(informe).toBeNull();
    expect(registro.error).toHaveBeenCalledWith(expect.stringContaining('No se pudieron cargar los contenidos'));
  });
});

describe('Textos reales de api/contenidos', () => {
  /** Los textos reales, leidos tal como los lee la carga. */
  async function leerReales() {
    const nombres = (await fs.readdir(DIRECTORIO_CONTENIDOS)).filter((n) => n.endsWith('.md') && n !== 'README.md');
    return Promise.all(
      nombres.map(async (archivo) => ({
        archivo,
        ...leerArchivoContenido(await fs.readFile(path.join(DIRECTORIO_CONTENIDOS, archivo), 'utf8'))
      }))
    );
  }

  test('RCN-01 y RCN-02 todos se cargan publicados, con fuentes y fecha de revision', async () => {
    const informe = await sincronizarContenidos();

    expect(informe.errores).toEqual([]);
    expect(informe.creados).toHaveLength(8);
    const guardados = await Contenido.find().lean();
    expect(guardados).toHaveLength(8);
    for (const contenido of guardados) {
      expect(contenido.estado).toBe('publicado');
      expect(contenido.fuentes.length).toBeGreaterThan(0);
      expect(contenido.fechaRevision).toBeInstanceOf(Date);
    }
  });

  test('hay una pagina por seccion de S1 a S5, y S2 tiene la introduccion y los tres tramos', async () => {
    await sincronizarContenidos();
    const porSeccion = (seccion) => Contenido.find({ seccion }).lean();

    for (const seccion of ['S1', 'S3', 'S4', 'S5']) expect(await porSeccion(seccion)).toHaveLength(1);
    const tramos = (await porSeccion('S2')).map((c) => c.tramoEdad).sort();
    expect(tramos).toEqual([...TRAMOS_EDAD, null].sort());
  });

  test('RCN-04 las senales de cada tramo no son una lista numerada ni de casillas para sumar', async () => {
    const tramos = (await leerReales()).filter(({ datos }) => datos.tramoEdad);
    expect(tramos).toHaveLength(3);
    for (const { archivo, datos } of tramos) {
      const lineas = datos.cuerpo.split('\n');
      const numeradas = lineas.filter((linea) => /^\s*\d+[.)]\s/.test(linea));
      const casillas = lineas.filter((linea) => /^\s*[-*+]\s+\[[ xX]\]/.test(linea));
      expect({ archivo, numeradas, casillas }).toEqual({ archivo, numeradas: [], casillas: [] });
    }
  });

  test('RCN-04 cada tramo aclara que sus senales son motivos de consulta y no un diagnostico', async () => {
    const tramos = (await leerReales()).filter(({ datos }) => datos.tramoEdad);
    for (const { datos } of tramos) {
      expect(datos.cuerpo).toMatch(/motivo de consulta/);
      expect(datos.cuerpo).toMatch(/No son un diagnóstico/);
    }
  });
});
