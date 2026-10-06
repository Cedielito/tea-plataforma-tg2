'use strict';
const mongoose = require('mongoose');
const { texto, publicable } = require('./comunes');

/**
 * Coleccion `pregunta_frecuente` (Cuadro 13). M-05, RF-07, RF-10, RCN-01, RCN-02
 * Se muestran de menor a mayor `orden`.
 */
const esquema = new mongoose.Schema(
  {
    pregunta: texto({ required: [true, 'La pregunta es obligatoria.'] }),
    respuesta: texto({ required: [true, 'La respuesta es obligatoria.'] }),
    orden: {
      type: Number,
      default: 0,
      min: [0, 'El orden no puede ser negativo.'],
      validate: { validator: Number.isInteger, message: 'El orden debe ser un número entero.' }
    }
  },
  { collection: 'pregunta_frecuente', timestamps: true }
);

esquema.plugin(publicable);

module.exports = mongoose.model('PreguntaFrecuente', esquema);
