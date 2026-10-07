'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { PasoRuta } = require('./modelos');
const pasosRuta = require('./repositorios/pasosRuta');
const { DIRECTORIO_CONTENIDOS } = require('./sincronizacionContenidos');
const { describirError, resumirInforme } = require('./informeCarga');
const { ACCIONES, decidirAccion } = require('../dominio/archivoContenido');
const { leerArchivoLista } = require('../dominio/archivoLista');

/**
 * Carga de las listas YAML de api/contenidos a su coleccion al arrancar la
 * API, con las mismas reglas que los textos de S1 a S5 (T3). M-03, RF-04,
 * RF-10, RCN-01, RCN-02, RCN-05
 *
 * - Cada elemento tiene un `id`, que se guarda como `slug`, y se busca por ese
 *   slug. Crea lo que falta y actualiza solo si la fecha de revision del
 *   archivo es mas reciente que la de la base.
 * - Escribe con el repositorio, asi que el modelo rechaza publicar sin fuentes
 *   ni fecha (RCN-01, RCN-02).
 * - Nunca borra ni despublica: quitar un elemento del archivo no lo quita de
 *   la base.
 * - Cada elemento se procesa por separado: uno con errores queda en el
 *   informe y los demas se cargan. Ningun error detiene el arranque.
 *
 * Por ahora carga ruta/pasos.yaml (T5). Las tareas T6 y T7 agregan aqui sus
 * listas con crearCargaDeLista.
 */

/**
 * @param {{nombre: string, archivo: string, Modelo: import('mongoose').Model,
 *   repositorio: {crear: Function, actualizar: Function}, campos: string[],
 *   repetido: string}} configuracion `nombre` encabeza la linea del registro;
 *   `archivo` es la ruta dentro de api/contenidos; `campos`, los permitidos
 *   ademas de `id`; `repetido`, el mensaje si el slug ya existe
 */
function crearCargaDeLista({ nombre, archivo, Modelo, repositorio, campos, repetido }) {
  const rutaPorDefecto = path.join(DIRECTORIO_CONTENIDOS, archivo);

  async function leer(ruta) {
    return leerArchivoLista(await fs.readFile(ruta, 'utf8'), { campos });
  }

  /**
   * @returns {Promise<{creados: string[], actualizados: string[], sinCambios: string[],
   *   errores: {elemento: string|null, mensaje: string}[]}>} ids de cada grupo;
   *   `elemento` es null cuando el error es del archivo entero
   */
  async function sincronizar(ruta = rutaPorDefecto) {
    const informe = { creados: [], actualizados: [], sinCambios: [], errores: [] };
    const leido = await leer(ruta);
    if (leido.error) {
      informe.errores.push({ elemento: null, mensaje: leido.error });
      return informe;
    }
    informe.errores.push(...leido.errores.map(({ nombre: elemento, mensaje }) => ({ elemento, mensaje })));

    const existentes = await Modelo.find({ slug: { $in: leido.elementos.map(({ datos }) => datos.slug) } })
      .select('slug fechaRevision')
      .lean();
    const existentePorSlug = new Map(existentes.map((doc) => [doc.slug, doc]));

    for (const { nombre: elemento, datos } of leido.elementos) {
      const existente = existentePorSlug.get(datos.slug) || null;
      const accion = decidirAccion(datos.fechaRevision, existente);
      if (accion === ACCIONES.OMITIR) {
        informe.sinCambios.push(elemento);
        continue;
      }
      try {
        if (accion === ACCIONES.CREAR) await repositorio.crear(datos);
        else await repositorio.actualizar(existente._id, datos);
        (accion === ACCIONES.CREAR ? informe.creados : informe.actualizados).push(elemento);
      } catch (error) {
        informe.errores.push({ elemento, mensaje: describirError(error, repetido) });
      }
    }
    return informe;
  }

  /**
   * Sincroniza y deja el resultado en el registro. Nunca lanza: un problema
   * con el archivo no impide que la API arranque.
   * @returns el informe, o null si la sincronizacion no se pudo hacer
   */
  async function cargar({ ruta, registro = console } = {}) {
    try {
      const informe = await sincronizar(ruta);
      registro.log(resumirInforme(informe, nombre));
      for (const { elemento, mensaje } of informe.errores) {
        registro.error(`  ${archivo}${elemento ? `, ${elemento}` : ''}: ${mensaje}`);
      }
      return informe;
    } catch (error) {
      registro.error(`No se pudo cargar ${archivo}: ${describirError(error, repetido)}`);
      return null;
    }
  }

  /**
   * Slugs que vienen del archivo, para que el panel avise y no deje cambiarlos
   * (M-08). El archivo no cambia mientras la API corre (llega con cada
   * despliegue), asi que se lee una sola vez por ruta. Si la lectura falla, se
   * vuelve a intentar la proxima vez.
   * @returns {Promise<Set<string>>}
   */
  const indices = new Map();
  function slugsDelArchivo(ruta = rutaPorDefecto) {
    if (!indices.has(ruta)) {
      const indice = leer(ruta).then(
        ({ elementos = [] }) => new Set(elementos.map(({ datos }) => datos.slug)),
        (error) => {
          indices.delete(ruta);
          throw error;
        }
      );
      indices.set(ruta, indice);
    }
    return indices.get(ruta);
  }

  return { archivo, sincronizar, cargar, slugsDelArchivo };
}

const CAMPOS_PASO_RUTA = Object.freeze([
  'perfiles',
  'tramos',
  'regimenes',
  'orden',
  'titulo',
  'texto',
  'tiposEntidad',
  'fuentes',
  'fechaRevision'
]);

const cargaPasosRuta = crearCargaDeLista({
  nombre: 'Pasos de la ruta',
  archivo: 'ruta/pasos.yaml',
  Modelo: PasoRuta,
  repositorio: pasosRuta,
  campos: CAMPOS_PASO_RUTA,
  repetido: 'Ya existe otro paso con el mismo id.'
});

module.exports = { crearCargaDeLista, CAMPOS_PASO_RUTA, cargaPasosRuta };
