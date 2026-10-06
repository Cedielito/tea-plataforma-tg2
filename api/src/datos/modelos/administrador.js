'use strict';
const mongoose = require('mongoose');

/**
 * Coleccion `administrador` (Cuadro 13): cuentas del panel. M-08, RF-09, RS-05
 *
 * - `claveCifrada` es el hash bcrypt de la contrasena; la contrasena en claro
 *   no se guarda nunca. No se lee salvo que se pida (select: false).
 * - `fechaUltimoAcceso` es el ultimo inicio de sesion correcto.
 * - `sesiones` son las sesiones abiertas (como maximo 5): el hash SHA-256 del
 *   token de la cookie, cuando empezo y su ultima actividad. Viven en el mismo
 *   documento para no agregar colecciones al modelo de datos y para que una
 *   sesion sobreviva a los reinicios de Render.
 *
 * No hay registro publico: el primer administrador se crea al arrancar con
 * ADMIN_USUARIO y ADMIN_CLAVE (datos/administradorInicial.js).
 */
const esquemaSesion = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    creadaEn: { type: Date, required: true },
    ultimaActividad: { type: Date, required: true }
  },
  { _id: false }
);

const esquema = new mongoose.Schema(
  {
    usuario: { type: String, required: true, unique: true, trim: true, lowercase: true },
    claveCifrada: { type: String, required: true, select: false },
    fechaUltimoAcceso: { type: Date, default: null },
    sesiones: { type: [esquemaSesion], default: [] }
  },
  {
    collection: 'administrador',
    timestamps: true,
    toJSON: {
      // Nunca sale en una respuesta, ni por descuido.
      transform(_doc, valor) {
        delete valor.claveCifrada;
        delete valor.sesiones;
        return valor;
      }
    }
  }
);

esquema.index({ 'sesiones.tokenHash': 1 });

module.exports = mongoose.model('Administrador', esquema);
