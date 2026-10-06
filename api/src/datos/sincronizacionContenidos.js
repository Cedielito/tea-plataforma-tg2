'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const { Contenido } = require('./modelos');
const contenidos = require('./repositorios/contenidos');
const { ACCIONES, leerArchivoContenido, decidirAccion } = require('../dominio/archivoContenido');

/**
 * Carga de los textos de api/contenidos a la coleccion `contenido` al arrancar
 * la API. M-02, RF-10, RCN-01, RCN-02
 *
 * Asi los textos llegan a la base de produccion sin instalar nada: se editan
 * en el repositorio, se fusiona el PR, Render vuelve a publicar la API (los
 * archivos estan dentro de api/) y al arrancar se sincronizan.
 *
 * - Busca por slug. Crea lo que falta y actualiza solo si la fecha de revision
 *   del archivo es mas reciente que la de la base (dominio/archivoContenido.js).
 * - Escribe con el repositorio, asi que el modelo rechaza publicar sin fuentes
 *   ni fecha (RCN-01, RCN-02).
 * - Nunca borra ni despublica: quitar un archivo no quita la pagina.
 * - Cada archivo se procesa por separado: uno con errores queda en el informe
 *   y los demas se cargan.
 */

const DIRECTORIO_CONTENIDOS = path.join(__dirname, '..', '..', 'contenidos');

/** Los textos son los .md de la carpeta; README.md la documenta. */
const esArchivoDeContenido = (nombre) => nombre.endsWith('.md') && nombre.toLowerCase() !== 'readme.md';

/** Mensaje legible de un error al guardar: validacion, slug repetido u otro. */
function describirError(error) {
  if (error instanceof mongoose.Error.ValidationError) {
    return Object.values(error.errors)
      .map((detalle) => detalle.message)
      .join(' ');
  }
  if (error && error.code === 11000) return 'Ya existe otro contenido con el mismo slug.';
  return error && error.message ? error.message : String(error);
}

/** Lee la carpeta y separa los archivos que se pueden cargar de los que tienen errores. */
async function leerCarpeta(directorio) {
  const nombres = (await fs.readdir(directorio)).filter(esArchivoDeContenido).sort();
  const leidos = [];
  const errores = [];
  const archivoPorSlug = new Map();
  for (const archivo of nombres) {
    const { datos, error } = leerArchivoContenido(await fs.readFile(path.join(directorio, archivo), 'utf8'));
    if (error) {
      errores.push({ archivo, mensaje: error });
    } else if (archivoPorSlug.has(datos.slug)) {
      errores.push({ archivo, mensaje: `El slug «${datos.slug}» ya lo usa ${archivoPorSlug.get(datos.slug)}.` });
    } else {
      archivoPorSlug.set(datos.slug, archivo);
      leidos.push({ archivo, datos });
    }
  }
  return { leidos, errores };
}

async function guardar(accion, datos, existente) {
  if (accion === ACCIONES.CREAR) return contenidos.crear(datos);
  return contenidos.actualizar(existente._id, datos);
}

/**
 * @returns {Promise<{creados: string[], actualizados: string[], sinCambios: string[],
 *   errores: {archivo: string, mensaje: string}[]}>} nombres de archivo de cada grupo
 */
async function sincronizarContenidos(directorio = DIRECTORIO_CONTENIDOS) {
  const { leidos, errores } = await leerCarpeta(directorio);
  const informe = { creados: [], actualizados: [], sinCambios: [], errores };

  const existentes = await Contenido.find({ slug: { $in: leidos.map(({ datos }) => datos.slug) } })
    .select('slug fechaRevision')
    .lean();
  const existentePorSlug = new Map(existentes.map((doc) => [doc.slug, doc]));

  for (const { archivo, datos } of leidos) {
    const existente = existentePorSlug.get(datos.slug) || null;
    const accion = decidirAccion(datos.fechaRevision, existente);
    if (accion === ACCIONES.OMITIR) {
      informe.sinCambios.push(archivo);
      continue;
    }
    try {
      await guardar(accion, datos, existente);
      (accion === ACCIONES.CREAR ? informe.creados : informe.actualizados).push(archivo);
    } catch (error) {
      errores.push({ archivo, mensaje: describirError(error) });
    }
  }
  return informe;
}

/**
 * Archivo de origen de cada slug de api/contenidos, para que el panel avise
 * cuando una pagina viene del repositorio (M-08). Los archivos no cambian
 * mientras la API corre (llegan con cada despliegue), asi que se leen una
 * sola vez por carpeta. Si la lectura falla, se vuelve a intentar la proxima vez.
 * @returns {Promise<Map<string, string>>} slug -> nombre del archivo
 */
const indicesDeArchivos = new Map();
function archivosPorSlug(directorio = DIRECTORIO_CONTENIDOS) {
  if (!indicesDeArchivos.has(directorio)) {
    const indice = leerCarpeta(directorio).then(
      ({ leidos }) => new Map(leidos.map(({ archivo, datos }) => [datos.slug, archivo])),
      (error) => {
        indicesDeArchivos.delete(directorio);
        throw error;
      }
    );
    indicesDeArchivos.set(directorio, indice);
  }
  return indicesDeArchivos.get(directorio);
}

const contar = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

/** «Contenidos: 0 creados, 1 actualizado, 7 sin cambios, 0 con errores.» */
function resumirInforme({ creados, actualizados, sinCambios, errores }) {
  return [
    `Contenidos: ${contar(creados.length, 'creado', 'creados')}`,
    contar(actualizados.length, 'actualizado', 'actualizados'),
    `${sinCambios.length} sin cambios`,
    `${contar(errores.length, 'con error', 'con errores')}.`
  ].join(', ');
}

/**
 * Sincroniza y deja el resultado en el registro (los logs de Render). Nunca
 * lanza: un problema con los textos no impide que la API arranque.
 * @returns el informe, o null si la sincronizacion no se pudo hacer
 */
async function cargarContenidos({ directorio, registro = console } = {}) {
  try {
    const informe = await sincronizarContenidos(directorio);
    registro.log(resumirInforme(informe));
    for (const { archivo, mensaje } of informe.errores) registro.error(`  ${archivo}: ${mensaje}`);
    return informe;
  } catch (error) {
    registro.error(`No se pudieron cargar los contenidos: ${describirError(error)}`);
    return null;
  }
}

module.exports = {
  DIRECTORIO_CONTENIDOS,
  sincronizarContenidos,
  resumirInforme,
  cargarContenidos,
  archivosPorSlug
};
