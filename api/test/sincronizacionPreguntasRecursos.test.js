'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { PreguntaFrecuente, Recurso } = require('../src/datos/modelos');
const repoPreguntas = require('../src/datos/repositorios/preguntas');
const { MENSAJES } = require('../src/dominio/publicacion');
const { cargaPreguntas, cargaRecursos } = require('../src/datos/sincronizacionListas');

/**
 * Carga de preguntas/preguntas.yaml y recursos/recursos.yaml al arrancar la
 * API (T7). M-05, RF-06, RF-07, RF-10, RCN-01, RCN-02
 *
 * Mismas reglas que la carga de los pasos de la ruta (T5): el id se guarda
 * como slug, crea lo que falta, actualiza solo con una fecha de revision mas
 * reciente y nunca borra.
 */

beforeAll(async () => {
  await levantar();
  await Promise.all([PreguntaFrecuente.init(), Recurso.init()]);
});
afterAll(bajar);

let carpeta;
let archivo;
beforeEach(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'preguntas-recursos-'));
  archivo = path.join(carpeta, 'lista.yaml');
});
afterEach(async () => {
  await limpiar();
  await fs.rm(carpeta, { recursive: true, force: true });
});

const FUENTE = [
  '  fuentes:',
  '    - texto: "Ministerio de Salud. Protocolo clínico para TEA. 2015."',
  '      url: "https://www.minsalud.gov.co/"'
];

/** Una pregunta en YAML, como las de api/contenidos/preguntas/preguntas.yaml. */
function pregunta({ id, orden = 10, texto = '¿A quién debo consultar primero?', ...opciones }) {
  const { respuesta = 'Pide una cita en tu EPS.', fecha = '2026-09-30', fuentes = FUENTE, extra = [] } = opciones;
  const lineas = [`- id: ${id}`, `  orden: ${orden}`, `  pregunta: "${texto}"`, `  respuesta: "${respuesta}"`, ...extra];
  if (fecha) lineas.push(`  fechaRevision: ${fecha}`);
  return [...lineas, ...fuentes].join('\n');
}

/** Un recurso en YAML, como los de api/contenidos/recursos/recursos.yaml. */
function recurso({ id, titulo = 'Protocolo clínico', tipo = 'archivo', perfiles = 'familia, docente', ...opciones }) {
  const { url = 'https://www.minsalud.gov.co/protocolo.pdf', fecha = '2026-09-30', fuentes = FUENTE } = opciones;
  const lineas = [
    `- id: ${id}`,
    `  titulo: "${titulo}"`,
    '  descripcion: "Documento oficial."',
    `  tipo: ${tipo}`,
    `  url: "${url}"`,
    `  perfiles: [${perfiles}]`
  ];
  if (fecha) lineas.push(`  fechaRevision: ${fecha}`);
  return [...lineas, ...fuentes].join('\n');
}

const escribir = (...elementos) => fs.writeFile(archivo, `${elementos.join('\n\n')}\n`);
const dia = (fecha) => fecha.toISOString().slice(0, 10);

describe('Carga de las preguntas frecuentes (preguntas/preguntas.yaml) a la base', () => {
  const sincronizar = () => cargaPreguntas.sincronizar(archivo);
  const buscar = (slug) => PreguntaFrecuente.findOne({ slug }).lean();

  test('crea lo que falta, publicado, guardando el id como slug', async () => {
    await escribir(pregunta({ id: 'a-quien-consultar-primero' }), pregunta({ id: 'sin-eps', orden: 20, texto: '¿Sin EPS?' }));

    const informe = await sincronizar();

    expect(informe).toEqual({ creados: ['a-quien-consultar-primero', 'sin-eps'], actualizados: [], sinCambios: [], errores: [] });
    const guardada = await buscar('a-quien-consultar-primero');
    expect(guardada).toMatchObject({
      pregunta: '¿A quién debo consultar primero?',
      respuesta: 'Pide una cita en tu EPS.',
      orden: 10,
      estado: 'publicado'
    });
    expect(guardada).not.toHaveProperty('id');
    expect(dia(guardada.fechaRevision)).toBe('2026-09-30');
  });

  test('si se corre dos veces, la segunda no cambia nada', async () => {
    await escribir(pregunta({ id: 'sin-eps' }));
    await sincronizar();
    expect(await sincronizar()).toEqual({ creados: [], actualizados: [], sinCambios: ['sin-eps'], errores: [] });
  });

  test('con una fecha de revision mas reciente actualiza la pregunta; sin ella, no', async () => {
    await escribir(pregunta({ id: 'sin-eps' }));
    await sincronizar();

    await escribir(pregunta({ id: 'sin-eps', respuesta: 'Otro texto.' }));
    expect((await sincronizar()).sinCambios).toEqual(['sin-eps']);
    expect((await buscar('sin-eps')).respuesta).toBe('Pide una cita en tu EPS.');

    await escribir(pregunta({ id: 'sin-eps', respuesta: 'Respuesta corregida.', fecha: '2026-10-01' }));
    expect((await sincronizar()).actualizados).toEqual(['sin-eps']);
    expect((await buscar('sin-eps')).respuesta).toBe('Respuesta corregida.');
    expect(await PreguntaFrecuente.countDocuments()).toBe(1);
  });

  test('nunca borra: quitar una pregunta del archivo la deja en la base', async () => {
    await escribir(pregunta({ id: 'sin-eps' }), pregunta({ id: 'vacunas', texto: '¿Vacunas?' }));
    await sincronizar();
    await escribir(pregunta({ id: 'sin-eps' }));
    await sincronizar();
    expect((await buscar('vacunas')).estado).toBe('publicado');
  });

  test('una pregunta con errores queda en el informe y las demas se cargan', async () => {
    await escribir(
      pregunta({ id: 'sin-eps', extra: ['  color: azul'] }),
      pregunta({ id: 'vacunas', texto: '¿Vacunas?' }),
      pregunta({ id: 'se-cura', texto: '¿Se cura?', orden: 1.5 })
    );

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['vacunas']);
    expect(informe.errores).toEqual([
      { elemento: 'sin-eps', mensaje: 'Campo desconocido: color.' },
      { elemento: 'se-cura', mensaje: 'El orden debe ser un número entero.' }
    ]);
  });

  test('una pregunta sin orden no se carga: el orden es obligatorio', async () => {
    await fs.writeFile(
      archivo,
      ['- id: sin-orden', '  pregunta: "¿Sin orden?"', '  respuesta: "Sí."', '  fechaRevision: 2026-09-30', ...FUENTE].join('\n')
    );
    const informe = await sincronizar();
    expect(informe.errores).toEqual([{ elemento: 'sin-orden', mensaje: 'El orden es obligatorio.' }]);
  });

  test('el registro usa el nombre «Preguntas frecuentes» y la ruta del archivo', async () => {
    await escribir(pregunta({ id: 'sin-eps' }), pregunta({ id: 'sin-fuentes', texto: '¿Sin fuentes?', fuentes: [] }));
    const registro = { log: jest.fn(), error: jest.fn() };

    await cargaPreguntas.cargar({ ruta: archivo, registro });

    expect(registro.log).toHaveBeenCalledWith('Preguntas frecuentes: 1 creado, 0 actualizados, 0 sin cambios, 1 con error.');
    expect(registro.error).toHaveBeenCalledWith(`  preguntas/preguntas.yaml, sin-fuentes: ${MENSAJES.SIN_FUENTES}`);
  });

  test('slugsDelArchivo devuelve los ids validos del archivo', async () => {
    await escribir(pregunta({ id: 'sin-eps' }), pregunta({ id: 'Mal Escrito' }));
    expect(await cargaPreguntas.slugsDelArchivo(archivo)).toEqual(new Set(['sin-eps']));
  });
});

describe('RCN-01 la carga de preguntas y recursos no publica sin fuentes', () => {
  test('rechaza la pregunta sin fuentes y carga las demas', async () => {
    await escribir(pregunta({ id: 'sin-fuentes', fuentes: [] }), pregunta({ id: 'sin-eps', texto: '¿Sin EPS?' }));
    const informe = await cargaPreguntas.sincronizar(archivo);
    expect(informe.creados).toEqual(['sin-eps']);
    expect(informe.errores).toEqual([{ elemento: 'sin-fuentes', mensaje: MENSAJES.SIN_FUENTES }]);
    expect(await PreguntaFrecuente.findOne({ slug: 'sin-fuentes' })).toBeNull();
  });

  test('rechaza el recurso sin fuentes y carga los demas', async () => {
    await escribir(recurso({ id: 'sin-fuentes', fuentes: [] }), recurso({ id: 'decreto-1421', titulo: 'Decreto 1421' }));
    const informe = await cargaRecursos.sincronizar(archivo);
    expect(informe.creados).toEqual(['decreto-1421']);
    expect(informe.errores).toEqual([{ elemento: 'sin-fuentes', mensaje: MENSAJES.SIN_FUENTES }]);
    expect(await Recurso.findOne({ slug: 'sin-fuentes' })).toBeNull();
  });
});

describe('RCN-02 la carga de preguntas y recursos no publica sin fecha de revision', () => {
  test('rechaza la pregunta y el recurso sin fecha y no los guarda', async () => {
    await escribir(pregunta({ id: 'sin-fecha', fecha: null }));
    expect((await cargaPreguntas.sincronizar(archivo)).errores).toEqual([
      { elemento: 'sin-fecha', mensaje: MENSAJES.SIN_FECHA }
    ]);

    await escribir(recurso({ id: 'sin-fecha', fecha: null }));
    expect((await cargaRecursos.sincronizar(archivo)).errores).toEqual([
      { elemento: 'sin-fecha', mensaje: MENSAJES.SIN_FECHA }
    ]);
    expect(await PreguntaFrecuente.countDocuments()).toBe(0);
    expect(await Recurso.countDocuments()).toBe(0);
  });
});

describe('Carga de los recursos (recursos/recursos.yaml) a la base', () => {
  const sincronizar = () => cargaRecursos.sincronizar(archivo);
  const buscar = (slug) => Recurso.findOne({ slug }).lean();

  test('crea lo que falta, publicado, guardando el id como slug', async () => {
    await escribir(
      recurso({ id: 'protocolo-minsalud-tea' }),
      recurso({ id: 'oms-autismo', titulo: 'Nota de la OMS', tipo: 'enlace', url: 'https://www.who.int/es/' })
    );

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['protocolo-minsalud-tea', 'oms-autismo']);
    expect(await buscar('protocolo-minsalud-tea')).toMatchObject({
      titulo: 'Protocolo clínico',
      tipo: 'archivo',
      url: 'https://www.minsalud.gov.co/protocolo.pdf',
      perfiles: ['familia', 'docente'],
      estado: 'publicado'
    });
  });

  test('con una fecha de revision mas reciente actualiza el recurso', async () => {
    await escribir(recurso({ id: 'decreto-1421' }));
    await sincronizar();
    await escribir(recurso({ id: 'decreto-1421', titulo: 'Título corregido', fecha: '2026-10-01' }));

    expect((await sincronizar()).actualizados).toEqual(['decreto-1421']);
    expect((await buscar('decreto-1421')).titulo).toBe('Título corregido');
    expect(await Recurso.countDocuments()).toBe(1);
  });

  test('un recurso con un tipo, un perfil o un enlace que no sirven queda en el informe', async () => {
    await escribir(
      recurso({ id: 'tipo-mal', tipo: 'video' }),
      recurso({ id: 'perfil-mal', perfiles: 'estudiante' }),
      recurso({ id: 'enlace-mal', url: 'javascript:alert(1)' }),
      recurso({ id: 'bien', titulo: 'Bien' })
    );

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['bien']);
    expect(informe.errores.map(({ elemento }) => elemento)).toEqual(['tipo-mal', 'perfil-mal', 'enlace-mal']);
  });

  test('el registro usa el nombre «Recursos» y la ruta del archivo', async () => {
    await escribir(recurso({ id: 'decreto-1421' }));
    const registro = { log: jest.fn(), error: jest.fn() };
    await cargaRecursos.cargar({ ruta: archivo, registro });
    expect(registro.log).toHaveBeenCalledWith('Recursos: 1 creado, 0 actualizados, 0 sin cambios, 0 con errores.');
  });
});

describe('Preguntas reales de api/contenidos/preguntas/preguntas.yaml', () => {
  test('RCN-01 y RCN-02 las 12 preguntas se cargan publicadas, con fuentes y fecha', async () => {
    const informe = await cargaPreguntas.sincronizar();
    expect(informe.errores).toEqual([]);
    expect(informe.creados).toHaveLength(12);

    const publicadas = await repoPreguntas.listarPublicadas();
    expect(publicadas).toHaveLength(12);
    for (const { fuentes, fechaRevision } of publicadas) {
      expect(fuentes.length).toBeGreaterThan(0);
      expect(fechaRevision).toBeInstanceOf(Date);
    }
  });

  test('RF-07 la primera es «¿A quién debo consultar primero?» (tarea T7 de la prueba de usabilidad)', async () => {
    await cargaPreguntas.sincronizar();
    const [primera] = await repoPreguntas.listarPublicadas();
    expect(primera).toMatchObject({ slug: 'a-quien-consultar-primero', pregunta: '¿A quién debo consultar primero?' });
  });

  test('los ordenes no se repiten', async () => {
    await cargaPreguntas.sincronizar();
    const ordenes = (await PreguntaFrecuente.find().lean()).map(({ orden }) => orden);
    expect(new Set(ordenes).size).toBe(ordenes.length);
  });
});

describe('Recursos reales de api/contenidos/recursos/recursos.yaml', () => {
  test('RCN-01 y RCN-02 los 6 recursos se cargan publicados, con fuentes y fecha', async () => {
    const informe = await cargaRecursos.sincronizar();
    expect(informe.errores).toEqual([]);
    expect(informe.creados).toHaveLength(6);
    const publicados = await Recurso.find({ estado: 'publicado' }).lean();
    expect(publicados).toHaveLength(6);
    expect(publicados.every(({ fuentes, fechaRevision }) => fuentes.length > 0 && fechaRevision)).toBe(true);
  });

  test('RF-06 hay recursos para docentes (tarea T6 de la prueba de usabilidad) y para familias', async () => {
    await cargaRecursos.sincronizar();
    expect(await Recurso.countDocuments({ perfiles: 'docente' })).toBeGreaterThan(0);
    expect(await Recurso.countDocuments({ perfiles: 'familia' })).toBeGreaterThan(0);
  });

  test('RF-06 cada archivo para descargar es un PDF y cada enlace es una página https', async () => {
    await cargaRecursos.sincronizar();
    for (const { tipo, url } of await Recurso.find().lean()) {
      expect(url).toMatch(/^https:\/\//);
      if (tipo === 'archivo') expect(url).toMatch(/\.pdf$/i);
    }
  });
});
