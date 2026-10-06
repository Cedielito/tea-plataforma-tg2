'use strict';
const mongoose = require('mongoose');
const { TIPOS_RECURSO, PERFILES } = require('../../dominio/catalogos');
const { esUrlSegura } = require('../../dominio/publicacion');
const { texto, publicable } = require('./comunes');

/**
 * Coleccion `recurso` (Cuadro 13): guias para descargar (`archivo`) o enlaces
 * a guias oficiales (`enlace`). M-05, RF-06, RF-10, RCN-01, RCN-02
 *
 * La URL puede ser absoluta (http o https) o una ruta del mismo sitio, como
 * /recursos/guia.pdf, para los archivos que sirve la web.
 */
const esquema = new mongoose.Schema(
  {
    titulo: texto({ required: [true, 'El título es obligatorio.'] }),
    descripcion: texto({ required: [true, 'La descripción es obligatoria.'] }),
    tipo: {
      type: String,
      required: [true, 'El tipo es obligatorio.'],
      enum: { values: TIPOS_RECURSO, message: 'El tipo debe ser archivo o enlace.' }
    },
    url: {
      type: String,
      trim: true,
      required: [true, 'El enlace es obligatorio.'],
      validate: {
        validator: (valor) => esUrlSegura(valor, { permitirRuta: true }),
        message: 'El enlace debe empezar por http://, https:// o / (archivo del sitio).'
      }
    },
    perfiles: {
      type: [{ type: String, enum: { values: PERFILES, message: 'El perfil debe ser familia o docente.' } }],
      validate: {
        validator: (valor) => Array.isArray(valor) && valor.length > 0,
        message: 'Indica al menos un perfil destinatario: familia o docente.'
      }
    }
  },
  { collection: 'recurso', timestamps: true }
);

esquema.plugin(publicable);

module.exports = mongoose.model('Recurso', esquema);
