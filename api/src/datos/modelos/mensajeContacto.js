'use strict';
const mongoose = require('mongoose');
const { LARGO_MAXIMO_CORREO, LARGO_MAXIMO_MENSAJE, SEGUNDOS_CONSERVACION } = require('../../dominio/contacto');

/**
 * Coleccion `mensaje_contacto` (Cuadro 13): mensajes del formulario de
 * contacto. M-06, M-08, RF-08, RF-11, RS-02, RS-04
 *
 * Guarda solo lo que dice la politica de tratamiento de datos: correo,
 * mensaje, fecha de recepcion y version de la politica aceptada. Nada mas:
 * - `strict: 'throw'`: un campo de mas hace fallar el guardado en lugar de
 *   descartarse en silencio;
 * - sin `__v` ni createdAt/updatedAt (la fecha ya es `fecha`);
 * - la IP de quien envia nunca llega aqui.
 *
 * RS-04: el indice TTL sobre `fecha` hace que MongoDB (Atlas) borre cada
 * mensaje a los 180 dias, aunque la API este dormida. Para cambiar ese plazo
 * en una base que ya tiene el indice hace falta `collMod`
 * (docs/despliegue.md): createIndex no cambia un indice existente.
 *
 * Los mensajes de validacion no repiten el valor recibido, para que el correo
 * o el mensaje no terminen en un registro de errores.
 */
const esquema = new mongoose.Schema(
  {
    correo: {
      type: String,
      required: [true, 'El correo es obligatorio.'],
      trim: true,
      maxlength: [LARGO_MAXIMO_CORREO, 'El correo es demasiado largo.']
    },
    mensaje: {
      type: String,
      required: [true, 'El mensaje es obligatorio.'],
      maxlength: [LARGO_MAXIMO_MENSAJE * 2, 'El mensaje es demasiado largo.']
    },
    fecha: { type: Date, required: [true, 'La fecha es obligatoria.'] },
    versionPolitica: { type: String, required: [true, 'La versión de la política es obligatoria.'], trim: true }
  },
  { collection: 'mensaje_contacto', versionKey: false, strict: 'throw', timestamps: false }
);

esquema.index({ fecha: 1 }, { expireAfterSeconds: SEGUNDOS_CONSERVACION });

module.exports = mongoose.model('MensajeContacto', esquema);
