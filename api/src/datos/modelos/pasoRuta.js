'use strict';
const mongoose = require('mongoose');
const { LISTAS, MENSAJES, esListaNoVacia, todosEn } = require('../../dominio/pasosRuta');
const { texto, campoSlug, slugDesdeTitulo, publicable } = require('./comunes');

/**
 * Coleccion `paso_ruta` (Cuadro 13): pasos de la ruta de atencion interactiva.
 * M-03, RF-04, RF-10, RCN-01, RCN-02, RCN-05
 *
 * - `slug` es el `id` del paso en api/contenidos/ruta/pasos.yaml.
 * - `perfiles`, `tramos` y `regimenes` dicen a que respuestas de la guia
 *   aplica el paso; `orden` lo ubica dentro de su perfil (de 10 en 10).
 * - `tiposEntidad` son los tipos del directorio que se muestran junto al paso.
 * - Fuentes, fecha de revision y estado vienen del plugin `publicable`: no se
 *   publica un paso sin fuente ni fecha (RCN-01, RCN-02).
 */

/** Lista de valores de un catalogo; las obligatorias necesitan al menos uno. */
function lista({ valores, obligatoria, vacia, invalida }) {
  const validadores = [{ validator: todosEn(valores), message: invalida }];
  if (obligatoria) validadores.unshift({ validator: esListaNoVacia, message: vacia });
  return { type: [{ type: String, trim: true }], default: [], validate: validadores };
}

const esquema = new mongoose.Schema(
  {
    titulo: texto({ required: [true, 'El título es obligatorio.'] }),
    slug: campoSlug(),
    texto: texto({ required: [true, 'El texto es obligatorio.'] }),
    perfiles: lista(LISTAS.perfiles),
    tramos: lista(LISTAS.tramos),
    regimenes: lista(LISTAS.regimenes),
    orden: {
      type: Number,
      required: [true, MENSAJES.ORDEN_OBLIGATORIO],
      min: [0, MENSAJES.ORDEN_NEGATIVO],
      validate: { validator: Number.isInteger, message: MENSAJES.ORDEN_ENTERO }
    },
    tiposEntidad: lista(LISTAS.tiposEntidad)
  },
  { collection: 'paso_ruta', timestamps: true }
);

esquema.plugin(publicable);
esquema.plugin(slugDesdeTitulo);

module.exports = mongoose.model('PasoRuta', esquema);
