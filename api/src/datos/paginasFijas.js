'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { DIRECTORIO_CONTENIDOS } = require('./sincronizacionContenidos');
const { SLUG_POLITICA, leerArchivoPagina } = require('../dominio/archivoPagina');

/**
 * Paginas fijas de api/contenidos/paginas: politica de tratamiento de datos y
 * «Acerca de». M-06, RF-08, RF-12, RS-02, RS-03, RCN-01, RCN-02
 *
 * No van a la base ni se editan desde el panel: la politica cambia con una
 * version nueva en el repositorio, que llega con cada despliegue. Por eso la
 * carpeta se lee una sola vez y las paginas quedan en memoria. Un archivo con
 * errores (por ejemplo, uno que todavia dice COMPLETAR) no se publica, queda
 * en el registro y no detiene el arranque; sin la politica, el formulario de
 * contacto no recibe mensajes.
 */

const DIRECTORIO_PAGINAS = path.join(DIRECTORIO_CONTENIDOS, 'paginas');

const esPagina = (nombre) => nombre.endsWith('.md') && nombre.toLowerCase() !== 'readme.md';

/**
 * @returns {Promise<{paginas: Map<string, object>, errores: {archivo: string, mensaje: string}[]}>}
 */
async function leerPaginas(directorio = DIRECTORIO_PAGINAS, ahora = new Date()) {
  const nombres = (await fs.readdir(directorio)).filter(esPagina).sort();
  const paginas = new Map();
  const errores = [];
  const archivoPorSlug = new Map();
  for (const archivo of nombres) {
    const { datos, error } = leerArchivoPagina(await fs.readFile(path.join(directorio, archivo), 'utf8'), ahora);
    if (error) {
      errores.push({ archivo, mensaje: error });
    } else if (paginas.has(datos.slug)) {
      errores.push({ archivo, mensaje: `El slug «${datos.slug}» ya lo usa ${archivoPorSlug.get(datos.slug)}.` });
    } else {
      archivoPorSlug.set(datos.slug, archivo);
      paginas.set(datos.slug, Object.freeze(datos));
    }
  }
  return { paginas, errores };
}

const contar = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

/**
 * @param {{directorio?: string, ahora?: () => Date}} opciones
 * @returns {{
 *   cargar(opciones?: {registro?: Console}): Promise<object|null>,
 *   obtener(slug: string): Promise<object|null>,
 *   politica(): Promise<object|null>
 * }} `obtener` y `politica` leen la carpeta la primera vez; si la lectura
 *   falla, se vuelve a intentar en la siguiente consulta
 */
function crearPaginasFijas({ directorio = DIRECTORIO_PAGINAS, ahora = () => new Date() } = {}) {
  let lectura = null;

  function leer() {
    if (!lectura) {
      lectura = leerPaginas(directorio, ahora()).catch((error) => {
        lectura = null;
        throw error;
      });
    }
    return lectura;
  }

  async function obtener(slug) {
    const { paginas } = await leer();
    return paginas.get(slug) || null;
  }

  return {
    obtener,
    politica: () => obtener(SLUG_POLITICA),

    /** Lee al arrancar y deja el resultado en el registro (los logs de Render). Nunca lanza. */
    async cargar({ registro = console } = {}) {
      try {
        const leido = await leer();
        registro.log(
          `Páginas fijas: ${contar(leido.paginas.size, 'cargada', 'cargadas')}, ` +
            `${contar(leido.errores.length, 'con error', 'con errores')}.`
        );
        for (const { archivo, mensaje } of leido.errores) registro.error(`  ${archivo}: ${mensaje}`);
        if (!leido.paginas.has(SLUG_POLITICA)) {
          registro.error('  Sin la política de privacidad, el formulario de contacto no recibe mensajes.');
        }
        return leido;
      } catch (error) {
        registro.error(`No se pudieron leer las páginas fijas: ${error.message}`);
        return null;
      }
    }
  };
}

/** Las de api/contenidos/paginas, compartidas por el arranque y el servidor. */
const paginasFijas = crearPaginasFijas();

module.exports = { DIRECTORIO_PAGINAS, leerPaginas, crearPaginasFijas, paginasFijas };
