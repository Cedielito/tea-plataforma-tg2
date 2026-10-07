'use strict';
const mongoose = require('mongoose');
const { texto, campoSlug, slugDesdeTitulo, publicable } = require('./comunes');

/**
 * Coleccion `pregunta_frecuente` (Cuadro 13). M-05, RF-02, RF-07, RF-10, RCN-01, RCN-02
 *
 * - `slug` es el `id` de la pregunta en api/contenidos/preguntas/preguntas.yaml
 *   y el ancla de la pregunta en la web (/preguntas-frecuentes#slug); si no
 *   llega, se genera a partir de la pregunta.
 * - Se muestran de menor a mayor `orden` (de 10 en 10, para poder intercalar).
 * - Fuentes, fecha de revision y estado vienen del plugin `publicable`: no se
 *   publica una pregunta sin fuente ni fecha (RCN-01, RCN-02).
 */
const esquema = new mongoose.Schema(
  {
    pregunta: texto({ required: [true, 'La pregunta es obligatoria.'] }),
    slug: campoSlug(),
    respuesta: texto({ required: [true, 'La respuesta es obligatoria.'] }),
    orden: {
      type: Number,
      required: [true, 'El orden es obligatorio.'],
      min: [0, 'El orden no puede ser negativo.'],
      validate: { validator: Number.isInteger, message: 'El orden debe ser un número entero.' }
    }
  },
  { collection: 'pregunta_frecuente', timestamps: true }
);

esquema.plugin(publicable);
esquema.plugin(slugDesdeTitulo, { campo: 'pregunta' });

module.exports = mongoose.model('PreguntaFrecuente', esquema);
