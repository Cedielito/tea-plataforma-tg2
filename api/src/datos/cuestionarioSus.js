'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { DIRECTORIO_CONTENIDOS } = require('./sincronizacionContenidos');
const { leerArchivoSus } = require('../dominio/registro/sus');

/**
 * Cuestionario SUS de api/contenidos/registro/sus.yaml. M-09
 *
 * No va a la base ni se edita desde el panel: la traduccion cambia con una
 * version nueva en el repositorio, que llega con cada despliegue. Se lee una
 * sola vez y queda en memoria, como las paginas fijas (paginasFijas.js). Un
 * archivo con errores no se usa, queda en el registro y no detiene el
 * arranque; sin cuestionario, la aplicacion termina sin el SUS.
 */

const ARCHIVO_SUS = path.join(DIRECTORIO_CONTENIDOS, 'registro', 'sus.yaml');

/**
 * @param {{archivo?: string}} opciones
 * @returns {{cargar(opciones?: {registro?: Console}): Promise<object|null>, obtener(): Promise<object|null>}}
 *   `obtener` lee el archivo la primera vez y devuelve null si tiene errores;
 *   si la lectura falla, se vuelve a intentar en la siguiente consulta
 */
function crearCuestionarioSus({ archivo = ARCHIVO_SUS } = {}) {
  let lectura = null;

  function leer() {
    if (!lectura) {
      lectura = fs
        .readFile(archivo, 'utf8')
        .then(leerArchivoSus)
        .catch((error) => {
          lectura = null;
          throw error;
        });
    }
    return lectura;
  }

  return {
    async obtener() {
      const { datos } = await leer();
      return datos ? Object.freeze(datos) : null;
    },

    /** Lee al arrancar y deja el resultado en el registro (los logs de Render). Nunca lanza. */
    async cargar({ registro = console } = {}) {
      try {
        const { datos, error } = await leer();
        if (error) registro.error(`Cuestionario SUS: ${path.basename(archivo)} no se cargó. ${error}`);
        else registro.log(`Cuestionario SUS: versión ${datos.version}, ${datos.items.length} ítems.`);
        return datos || null;
      } catch (error) {
        registro.error(`No se pudo leer el cuestionario SUS: ${error.message}`);
        return null;
      }
    }
  };
}

/** El de api/contenidos/registro, compartido por el arranque y el servidor. */
const cuestionarioSus = crearCuestionarioSus();

module.exports = { ARCHIVO_SUS, crearCuestionarioSus, cuestionarioSus };
