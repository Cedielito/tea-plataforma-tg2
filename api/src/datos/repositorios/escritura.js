'use strict';
const mongoose = require('mongoose');

/**
 * Escritura comun de los modelos publicables. RCN-01, RCN-02, RF-10
 *
 * Todo pasa por save(), que ejecuta la validacion del esquema y las reglas de
 * publicacion. Las actualizaciones por consulta (updateOne y similares) estan
 * bloqueadas en los esquemas. El panel de administracion (T4) usa estas
 * funciones.
 */
function crearEscritura(Modelo) {
  return {
    crear(datos) {
      return new Modelo(datos).save();
    },

    /** @returns el documento actualizado, o null si no existe. */
    async actualizar(id, cambios) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await Modelo.findById(id);
      if (!doc) return null;
      doc.set(cambios);
      return doc.save();
    }
  };
}

module.exports = { crearEscritura };
