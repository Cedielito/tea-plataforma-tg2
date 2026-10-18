'use strict';
const mongoose = require('mongoose');
const { ROLES } = require('../../dominio/autenticacion');

/**
 * Coleccion `administrador` (Cuadro 13): cuentas del panel. M-08, M-09, RF-09,
 * RS-05
 *
 * - `claveCifrada` es el hash bcrypt de la contrasena; la contrasena en claro
 *   no se guarda nunca. No se lee salvo que se pida (select: false).
 * - `fechaUltimoAcceso` es el ultimo inicio de sesion correcto.
 * - `rol` (T15): `administrador` o `profesional` (registro conductual). Las
 *   cuentas guardadas antes no lo tienen: el repositorio las lee como de
 *   administrador (rolDe).
 * - `sesiones` son las sesiones abiertas (como maximo 5): el hash SHA-256 del
 *   token de la cookie, cuando empezo y su ultima actividad. Viven en el mismo
 *   documento para no agregar colecciones al modelo de datos y para que una
 *   sesion sobreviva a los reinicios de Render.
 *
 * No hay registro publico: el primer administrador se crea al arrancar con
 * ADMIN_USUARIO y ADMIN_CLAVE (datos/administradorInicial.js) y cada
 * profesional, con PROFESIONAL_USUARIO y PROFESIONAL_CLAVE
 * (datos/profesionalInicial.js).
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
    rol: { type: String, enum: Object.values(ROLES), default: ROLES.ADMINISTRADOR },
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
