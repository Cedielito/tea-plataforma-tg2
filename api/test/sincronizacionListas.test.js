'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { PasoRuta } = require('../src/datos/modelos');
const repoPasosRuta = require('../src/datos/repositorios/pasosRuta');
const { MENSAJES } = require('../src/dominio/publicacion');
const { PERFILES, TRAMOS_EDAD, REGIMENES } = require('../src/dominio/catalogos');
const { cargaPasosRuta } = require('../src/datos/sincronizacionListas');

beforeAll(async () => {
  await levantar();
  await PasoRuta.init();
});
afterAll(bajar);

let carpeta;
let archivo;
beforeEach(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'ruta-'));
  archivo = path.join(carpeta, 'pasos.yaml');
});
afterEach(async () => {
  await limpiar();
  await fs.rm(carpeta, { recursive: true, force: true });
});

const FUENTE = ['  fuentes:', '    - texto: "Ministerio de Salud. Protocolo clínico para TEA. 2015."'];

/** Un paso en YAML, como los de api/contenidos/ruta/pasos.yaml. */
function paso({ id, titulo = 'Título', texto = 'Texto.', perfiles = 'familia', ...opciones }) {
  const { fecha = '2026-09-30', fuentes = FUENTE, extra = [] } = opciones;
  const lineas = [
    `- id: ${id}`,
    `  perfiles: [${perfiles}]`,
    '  tramos: ["4-7", "8-12", "13-17"]',
    '  regimenes: [contributivo, subsidiado]',
    '  orden: 10',
    `  titulo: "${titulo}"`,
    `  texto: "${texto}"`,
    '  tiposEntidad: [salud]',
    ...extra
  ];
  if (fecha) lineas.push(`  fechaRevision: ${fecha}`);
  return [...lineas, ...fuentes].join('\n');
}

const escribir = (...pasos) => fs.writeFile(archivo, `${pasos.join('\n')}\n`);
const sincronizar = () => cargaPasosRuta.sincronizar(archivo);
const buscar = (slug) => PasoRuta.findOne({ slug }).lean();
const dia = (fecha) => fecha.toISOString().slice(0, 10);

describe('Carga de los pasos de la ruta (ruta/pasos.yaml) a la base', () => {
  test('crea lo que falta, publicado, guardando el id como slug', async () => {
    await escribir(paso({ id: 'familia-anotar', titulo: 'Anota lo que observas' }), paso({ id: 'familia-cita' }));

    const informe = await sincronizar();

    expect(informe).toEqual({ creados: ['familia-anotar', 'familia-cita'], actualizados: [], sinCambios: [], errores: [] });
    const guardado = await buscar('familia-anotar');
    expect(guardado).toMatchObject({
      titulo: 'Anota lo que observas',
      estado: 'publicado',
      perfiles: ['familia'],
      tramos: ['4-7', '8-12', '13-17'],
      regimenes: ['contributivo', 'subsidiado'],
      orden: 10,
      tiposEntidad: ['salud']
    });
    expect(guardado).not.toHaveProperty('id');
    expect(dia(guardado.fechaRevision)).toBe('2026-09-30');
  });

  test('si se corre dos veces, la segunda no cambia nada', async () => {
    await escribir(paso({ id: 'familia-anotar' }));
    await sincronizar();
    const antes = await buscar('familia-anotar');

    const informe = await sincronizar();

    expect(informe).toEqual({ creados: [], actualizados: [], sinCambios: ['familia-anotar'], errores: [] });
    expect((await buscar('familia-anotar')).updatedAt).toEqual(antes.updatedAt);
  });

  test('con una fecha de revision mas reciente actualiza el paso', async () => {
    await escribir(paso({ id: 'familia-anotar' }));
    await sincronizar();
    await escribir(paso({ id: 'familia-anotar', texto: 'Texto corregido.', fecha: '2026-10-01' }));

    expect((await sincronizar()).actualizados).toEqual(['familia-anotar']);
    const guardado = await buscar('familia-anotar');
    expect(guardado.texto).toBe('Texto corregido.');
    expect(dia(guardado.fechaRevision)).toBe('2026-10-01');
    expect(await PasoRuta.countDocuments()).toBe(1);
  });

  test('si el texto cambia sin cambiar la fecha, no se carga', async () => {
    await escribir(paso({ id: 'familia-anotar' }));
    await sincronizar();
    await escribir(paso({ id: 'familia-anotar', texto: 'Otro texto.' }));

    expect((await sincronizar()).sinCambios).toEqual(['familia-anotar']);
    expect((await buscar('familia-anotar')).texto).toBe('Texto.');
  });

  test('no pisa una correccion hecha en el panel con una fecha mas reciente', async () => {
    await escribir(paso({ id: 'familia-anotar' }));
    await sincronizar();
    const doc = await PasoRuta.findOne({ slug: 'familia-anotar' });
    await repoPasosRuta.actualizar(doc._id, { texto: 'Corregido en el panel.', fechaRevision: '2026-10-02' });

    expect((await sincronizar()).sinCambios).toEqual(['familia-anotar']);
    expect((await buscar('familia-anotar')).texto).toBe('Corregido en el panel.');
  });

  test('nunca borra: quitar un paso del archivo lo deja en la base', async () => {
    await escribir(paso({ id: 'familia-anotar' }), paso({ id: 'familia-cita' }));
    await sincronizar();
    await escribir(paso({ id: 'familia-cita' }));

    await sincronizar();
    expect((await buscar('familia-anotar')).estado).toBe('publicado');
  });

  test('un paso con errores queda en el informe y los demas se cargan', async () => {
    await escribir(
      paso({ id: 'familia-anotar', extra: ['  color: azul'] }),
      paso({ id: 'familia-cita' }),
      paso({ id: 'familia-cita', titulo: 'Repetido' }),
      paso({ id: 'docente-registrar', perfiles: 'estudiante' })
    );

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['familia-cita']);
    expect(informe.errores).toEqual([
      { elemento: 'familia-anotar', mensaje: 'Campo desconocido: color.' },
      { elemento: 'elemento 3', mensaje: 'El id «familia-cita» ya lo usa el elemento 2.' },
      { elemento: 'docente-registrar', mensaje: 'El perfil debe ser familia o docente.' }
    ]);
    expect(await PasoRuta.countDocuments()).toBe(1);
  });

  test('un archivo que no es una lista queda como un solo error', async () => {
    await fs.writeFile(archivo, 'id: familia-anotar\n');
    const informe = await sincronizar();
    expect(informe.errores).toEqual([{ elemento: null, mensaje: expect.stringContaining('debe ser una lista') }]);
  });
});

describe('RCN-01 la carga de la ruta no publica un paso sin fuentes', () => {
  test('rechaza el paso sin fuentes, no lo guarda y carga los demas', async () => {
    await escribir(paso({ id: 'sin-fuentes', fuentes: [] }), paso({ id: 'familia-anotar' }));

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['familia-anotar']);
    expect(informe.errores).toEqual([{ elemento: 'sin-fuentes', mensaje: MENSAJES.SIN_FUENTES }]);
    expect(await buscar('sin-fuentes')).toBeNull();
  });
});

describe('RCN-02 la carga de la ruta no publica un paso sin fecha de revision', () => {
  test('rechaza el paso sin fecha y no lo guarda', async () => {
    await escribir(paso({ id: 'sin-fecha', fecha: null }));

    const informe = await sincronizar();

    expect(informe.errores).toEqual([{ elemento: 'sin-fecha', mensaje: MENSAJES.SIN_FECHA }]);
    expect(await buscar('sin-fecha')).toBeNull();
  });
});

describe('Registro de la carga de la ruta al arrancar la API', () => {
  const registroFalso = () => ({ log: jest.fn(), error: jest.fn() });

  test('escribe el resumen y una linea por cada paso con errores', async () => {
    await escribir(paso({ id: 'familia-anotar' }), paso({ id: 'sin-fuentes', fuentes: [] }));
    const registro = registroFalso();

    await cargaPasosRuta.cargar({ ruta: archivo, registro });

    expect(registro.log).toHaveBeenCalledWith('Pasos de la ruta: 1 creado, 0 actualizados, 0 sin cambios, 1 con error.');
    expect(registro.error).toHaveBeenCalledWith(`  ruta/pasos.yaml, sin-fuentes: ${MENSAJES.SIN_FUENTES}`);
  });

  test('un error del archivo entero se registra sin nombre de elemento', async () => {
    await fs.writeFile(archivo, 'no es una lista\n');
    const registro = registroFalso();
    await cargaPasosRuta.cargar({ ruta: archivo, registro });
    expect(registro.error).toHaveBeenCalledWith(
      expect.stringMatching(/^ {2}ruta\/pasos\.yaml: El archivo debe ser una lista/)
    );
  });

  test('si el archivo no existe, lo informa y no lanza: la API arranca igual', async () => {
    const registro = registroFalso();
    const informe = await cargaPasosRuta.cargar({ ruta: path.join(carpeta, 'no-existe.yaml'), registro });
    expect(informe).toBeNull();
    expect(registro.error).toHaveBeenCalledWith(expect.stringContaining('No se pudo cargar ruta/pasos.yaml'));
  });

  test('slugsDelArchivo devuelve los ids validos del archivo', async () => {
    await escribir(paso({ id: 'familia-anotar' }), paso({ id: 'Mal Escrito' }));
    expect(await cargaPasosRuta.slugsDelArchivo(archivo)).toEqual(new Set(['familia-anotar']));
  });
});

describe('Pasos reales de api/contenidos/ruta/pasos.yaml', () => {
  /** Pasos que aplican a las tres respuestas, como los elige la guia de la web. */
  const aplican = (pasos, perfil, tramo, regimen) =>
    pasos.filter((p) => p.perfiles.includes(perfil) && p.tramos.includes(tramo) && p.regimenes.includes(regimen));

  test('RCN-01 y RCN-02 los 18 pasos se cargan publicados, con fuentes y fecha: 12 de familia y 6 de docente', async () => {
    const informe = await cargaPasosRuta.sincronizar();

    expect(informe.errores).toEqual([]);
    expect(informe.creados).toHaveLength(18);
    const pasos = await PasoRuta.find().lean();
    for (const p of pasos) {
      expect(p.estado).toBe('publicado');
      expect(p.fuentes.length).toBeGreaterThan(0);
      expect(p.fechaRevision).toBeInstanceOf(Date);
    }
    expect(pasos.filter((p) => p.perfiles.includes('familia'))).toHaveLength(12);
    expect(pasos.filter((p) => p.perfiles.includes('docente'))).toHaveLength(6);
  });

  test('RF-04 cada combinacion de perfil, tramo y regimen tiene pasos', async () => {
    await cargaPasosRuta.sincronizar();
    const pasos = await PasoRuta.find().lean();
    for (const perfil of PERFILES) {
      for (const tramo of TRAMOS_EDAD) {
        for (const regimen of REGIMENES) {
          expect({ perfil, tramo, regimen, hay: aplican(pasos, perfil, tramo, regimen).length > 0 }).toEqual({
            perfil,
            tramo,
            regimen,
            hay: true
          });
        }
      }
    }
  });

  test('RF-04 contributivo y subsidiado comparten los pasos; sin afiliacion empieza por la afiliacion', async () => {
    await cargaPasosRuta.sincronizar();
    const pasos = await repoPasosRuta.listarPublicados();
    const slugs = (regimen) => aplican(pasos, 'familia', '8-12', regimen).map((p) => p.slug);

    expect(slugs('subsidiado')).toEqual(slugs('contributivo'));
    expect(slugs('sin-afiliacion')).toEqual(['familia-afiliacion', ...slugs('contributivo')]);
  });

  test('RCN-06 el texto de cada paso tiene dos frases como maximo', async () => {
    await cargaPasosRuta.sincronizar();
    for (const { slug, texto } of await PasoRuta.find().lean()) {
      const frases = texto.split(/[.!?](?:\s|$)/).filter((frase) => frase.trim() !== '');
      expect({ slug, frases: frases.length <= 2 }).toEqual({ slug, frases: true });
    }
  });
});
