'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { EntidadDirectorio, PasoRuta } = require('../src/datos/modelos');
const repoEntidades = require('../src/datos/repositorios/entidadesDirectorio');
const { MENSAJES } = require('../src/dominio/publicacion');
const { MENSAJES: MENSAJES_LISTA } = require('../src/dominio/archivoLista');
const { MENSAJES: MENSAJES_DIRECTORIO } = require('../src/dominio/directorio');
const { CIUDADES, NACIONAL, TIPOS_ENTIDAD } = require('../src/dominio/catalogos');
const { cargaEntidades, cargaPasosRuta } = require('../src/datos/sincronizacionListas');

/**
 * Carga de directorio/entidades.yaml al arrancar la API (T6). M-04, RF-05,
 * RF-10, RCN-01, RCN-02, RS-07
 *
 * Mismas reglas que la carga de los pasos de la ruta, comparando la fecha de
 * verificacion (fechaVerificacion) en lugar de la de revision.
 */

beforeAll(async () => {
  await levantar();
  await Promise.all([EntidadDirectorio.init(), PasoRuta.init()]);
});
afterAll(bajar);

let carpeta;
let archivo;
beforeEach(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'directorio-'));
  archivo = path.join(carpeta, 'entidades.yaml');
});
afterEach(async () => {
  await limpiar();
  await fs.rm(carpeta, { recursive: true, force: true });
});

const FUENTE = [
  '  fuentes:',
  '    - texto: "Superintendencia Nacional de Salud. Contáctenos. Consultada el 6 de octubre de 2026."',
  '      url: "https://www.supersalud.gov.co/es-co/atencion-ciudadano/contactenos"'
];

/** Una entidad en YAML, como las de api/contenidos/directorio/entidades.yaml. */
function entidad({ id, nombre = 'Supersalud', ciudad = 'Nacional', descripcion = 'Recibe quejas.', ...opciones }) {
  const { fecha = '2026-10-06', fuentes = FUENTE, contacto = ['  contacto:', '    telefonos: ["01 8000 513 700"]'] } =
    opciones;
  const { extra = [], esProfesional = 'false' } = opciones;
  const lineas = [
    `- id: ${id}`,
    `  nombre: "${nombre}"`,
    '  tipo: quejas-salud',
    `  ciudad: ${ciudad}`,
    `  descripcion: "${descripcion}"`,
    ...contacto,
    ...extra
  ];
  if (fecha) lineas.push(`  fechaVerificacion: ${fecha}`);
  lineas.push(`  esProfesional: ${esProfesional}`);
  return [...lineas, ...fuentes].join('\n');
}

const escribir = (...entidades) => fs.writeFile(archivo, `${entidades.join('\n\n')}\n`);
const sincronizar = () => cargaEntidades.sincronizar(archivo);
const buscar = (slug) => EntidadDirectorio.findOne({ slug }).lean();
const dia = (fecha) => fecha.toISOString().slice(0, 10);

describe('Carga del directorio (directorio/entidades.yaml) a la base', () => {
  test('crea lo que falta, publicado, guardando el id como slug', async () => {
    await escribir(entidad({ id: 'supersalud' }), entidad({ id: 'personeria-cali', nombre: 'Personería', ciudad: 'Cali' }));

    const informe = await sincronizar();

    expect(informe).toEqual({ creados: ['supersalud', 'personeria-cali'], actualizados: [], sinCambios: [], errores: [] });
    const guardada = await buscar('supersalud');
    expect(guardada).toMatchObject({
      nombre: 'Supersalud',
      tipo: 'quejas-salud',
      ciudad: 'Nacional',
      estado: 'publicado',
      esProfesional: false,
      contacto: { telefonos: ['01 8000 513 700'] }
    });
    expect(guardada).not.toHaveProperty('id');
    expect(guardada).not.toHaveProperty('fechaRevision');
    expect(dia(guardada.fechaVerificacion)).toBe('2026-10-06');
  });

  test('si se corre dos veces, la segunda no cambia nada', async () => {
    await escribir(entidad({ id: 'supersalud' }));
    await sincronizar();
    const antes = await buscar('supersalud');

    expect(await sincronizar()).toEqual({ creados: [], actualizados: [], sinCambios: ['supersalud'], errores: [] });
    expect((await buscar('supersalud')).updatedAt).toEqual(antes.updatedAt);
  });

  test('con una fecha de verificacion mas reciente actualiza la entidad', async () => {
    await escribir(entidad({ id: 'supersalud' }));
    await sincronizar();
    await escribir(entidad({ id: 'supersalud', descripcion: 'Descripción corregida.', fecha: '2026-10-07' }));

    expect((await cargaEntidades.sincronizar(archivo)).actualizados).toEqual(['supersalud']);
    const guardada = await buscar('supersalud');
    expect(guardada.descripcion).toBe('Descripción corregida.');
    expect(dia(guardada.fechaVerificacion)).toBe('2026-10-07');
    expect(await EntidadDirectorio.countDocuments()).toBe(1);
  });

  test('si el dato cambia sin cambiar la fecha de verificacion, no se carga', async () => {
    await escribir(entidad({ id: 'supersalud' }));
    await sincronizar();
    await escribir(entidad({ id: 'supersalud', descripcion: 'Otro texto.' }));

    expect((await sincronizar()).sinCambios).toEqual(['supersalud']);
    expect((await buscar('supersalud')).descripcion).toBe('Recibe quejas.');
  });

  test('no pisa una correccion hecha en el panel con una fecha de verificacion mas reciente', async () => {
    await escribir(entidad({ id: 'supersalud' }));
    await sincronizar();
    const doc = await EntidadDirectorio.findOne({ slug: 'supersalud' });
    await repoEntidades.actualizar(doc._id, { descripcion: 'Corregida en el panel.', fechaVerificacion: '2026-10-07' });

    expect((await sincronizar()).sinCambios).toEqual(['supersalud']);
    expect((await buscar('supersalud')).descripcion).toBe('Corregida en el panel.');
  });

  test('nunca borra: quitar una entidad del archivo la deja en la base', async () => {
    await escribir(entidad({ id: 'supersalud' }), entidad({ id: 'minsalud' }));
    await sincronizar();
    await escribir(entidad({ id: 'minsalud' }));

    await sincronizar();
    expect((await buscar('supersalud')).estado).toBe('publicado');
  });

  test('una entidad con errores queda en el informe y las demas se cargan', async () => {
    await escribir(
      entidad({ id: 'con-fecha-de-revision', extra: ['  fechaRevision: 2026-10-06'] }),
      entidad({ id: 'contacto-mal-escrito', contacto: ['  contacto:', '    telefono: ["106"]'] }),
      entidad({ id: 'sin-contacto', contacto: [] }),
      entidad({ id: 'ciudad-desconocida', ciudad: 'Pasto' }),
      entidad({ id: 'fecha-mal-escrita', fecha: '2026-02-30' }),
      entidad({ id: 'supersalud' })
    );

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['supersalud']);
    expect(informe.errores).toEqual([
      { elemento: 'con-fecha-de-revision', mensaje: `${MENSAJES_LISTA.CAMPO_DESCONOCIDO} fechaRevision.` },
      { elemento: 'contacto-mal-escrito', mensaje: `${MENSAJES_DIRECTORIO.CONTACTO_CAMPO_DESCONOCIDO} telefono.` },
      { elemento: 'fecha-mal-escrita', mensaje: MENSAJES_LISTA.FECHA_FORMATO_DE('fechaVerificacion') },
      { elemento: 'sin-contacto', mensaje: MENSAJES_DIRECTORIO.SIN_CONTACTO },
      { elemento: 'ciudad-desconocida', mensaje: MENSAJES_DIRECTORIO.CIUDAD_INVALIDA }
    ]);
    expect(await EntidadDirectorio.countDocuments()).toBe(1);
  });

  test('el registro usa el nombre «Directorio» y la ruta del archivo', async () => {
    await escribir(entidad({ id: 'supersalud' }), entidad({ id: 'sin-fuentes', fuentes: [] }));
    const registro = { log: jest.fn(), error: jest.fn() };

    await cargaEntidades.cargar({ ruta: archivo, registro });

    expect(registro.log).toHaveBeenCalledWith('Directorio: 1 creado, 0 actualizados, 0 sin cambios, 1 con error.');
    expect(registro.error).toHaveBeenCalledWith(`  directorio/entidades.yaml, sin-fuentes: ${MENSAJES.SIN_FUENTES}`);
  });

  test('slugsDelArchivo devuelve los ids validos del archivo', async () => {
    await escribir(entidad({ id: 'supersalud' }), entidad({ id: 'Mal Escrito' }));
    expect(await cargaEntidades.slugsDelArchivo(archivo)).toEqual(new Set(['supersalud']));
  });
});

describe('RCN-01 la carga del directorio no publica una entidad sin fuentes', () => {
  test('rechaza la entidad sin fuentes y carga las demas', async () => {
    await escribir(entidad({ id: 'sin-fuentes', fuentes: [] }), entidad({ id: 'supersalud' }));

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['supersalud']);
    expect(informe.errores).toEqual([{ elemento: 'sin-fuentes', mensaje: MENSAJES.SIN_FUENTES }]);
    expect(await buscar('sin-fuentes')).toBeNull();
  });
});

describe('RCN-02 la carga del directorio no publica una entidad sin fecha de verificacion', () => {
  test('rechaza la entidad sin fechaVerificacion y no la guarda', async () => {
    await escribir(entidad({ id: 'sin-fecha', fecha: null }));

    const informe = await sincronizar();

    expect(informe.errores).toEqual([{ elemento: 'sin-fecha', mensaje: MENSAJES.SIN_FECHA_VERIFICACION }]);
    expect(await buscar('sin-fecha')).toBeNull();
  });
});

describe('RS-07 la carga del directorio no publica a un profesional sin constancia de autorizacion', () => {
  test('rechaza al profesional sin constancia y acepta al que la tiene', async () => {
    await escribir(
      entidad({ id: 'profesional-sin-constancia', ciudad: 'Cali', esProfesional: 'true' }),
      entidad({
        id: 'profesional-con-constancia',
        ciudad: 'Cali',
        esProfesional: 'true',
        extra: ['  constanciaAutorizacion: "Autorización firmada el 1 de octubre de 2026 (AUT-001)."']
      })
    );

    const informe = await sincronizar();

    expect(informe.creados).toEqual(['profesional-con-constancia']);
    expect(informe.errores).toEqual([
      { elemento: 'profesional-sin-constancia', mensaje: MENSAJES_DIRECTORIO.SIN_CONSTANCIA }
    ]);
  });
});

describe('Entidades reales de api/contenidos/directorio/entidades.yaml', () => {
  test('RCN-01 RCN-02 RS-07 las 23 entidades se cargan publicadas, con fuentes y fecha, sin profesionales', async () => {
    const informe = await cargaEntidades.sincronizar();

    expect(informe.errores).toEqual([]);
    expect(informe.creados).toHaveLength(23);
    for (const e of await EntidadDirectorio.find().lean()) {
      expect({ slug: e.slug, estado: e.estado, esProfesional: e.esProfesional }).toEqual({
        slug: e.slug,
        estado: 'publicado',
        esProfesional: false
      });
      expect(e.fuentes.length).toBeGreaterThan(0);
      expect(e.fechaVerificacion).toBeInstanceOf(Date);
    }
  });

  test('RF-05 hay entidades nacionales y de cada ciudad del catalogo', async () => {
    await cargaEntidades.sincronizar();
    const ciudades = new Set((await EntidadDirectorio.find().lean()).map((e) => e.ciudad));
    expect([...ciudades].sort()).toEqual([...CIUDADES].sort());
  });

  test('el ICBF va en proteccion-ninez, aparte de la Defensoria y las Personerias', async () => {
    await cargaEntidades.sincronizar();
    const porTipo = (tipo) =>
      EntidadDirectorio.find({ tipo })
        .lean()
        .then((lista) => lista.map((e) => e.slug).sort());
    expect(await porTipo('proteccion-ninez')).toEqual(['icbf', 'icbf-linea-141']);
    expect((await porTipo('proteccion')).every((slug) => /^(defensoria|personeria)/.test(slug))).toBe(true);
  });

  test('RF-04 cada tipo de entidad que usan los pasos de la ruta tiene al menos una entidad nacional', async () => {
    await Promise.all([cargaEntidades.sincronizar(), cargaPasosRuta.sincronizar()]);
    const tiposDePasos = new Set((await PasoRuta.find().lean()).flatMap((p) => p.tiposEntidad));
    const publicadas = await repoEntidades.listarPublicadas();
    const nacionales = new Set(publicadas.filter((e) => e.ciudad === NACIONAL).map((e) => e.tipo));

    expect(tiposDePasos.size).toBeGreaterThan(0);
    for (const tipo of tiposDePasos) {
      expect(TIPOS_ENTIDAD).toContain(tipo);
      expect({ tipo, hayNacional: nacionales.has(tipo) }).toEqual({ tipo, hayNacional: true });
    }
  });

  test('los numeros de WhatsApp son celulares de 10 digitos con el sufijo «(WhatsApp)»', async () => {
    await cargaEntidades.sincronizar();
    const telefonos = (await EntidadDirectorio.find().lean()).flatMap((e) => e.contacto.telefonos);
    const deWhatsApp = telefonos.filter((telefono) => /whatsapp/i.test(telefono));

    expect(deWhatsApp.length).toBeGreaterThan(0);
    for (const telefono of deWhatsApp) expect(telefono).toMatch(/^3\d{2} \d{3} \d{4} \(WhatsApp\)$/);
  });
});
