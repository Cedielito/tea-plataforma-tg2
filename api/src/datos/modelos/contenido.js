'use strict';
const mongoose = require('mongoose');
const { SECCIONES, TRAMOS_EDAD } = require('../../dominio/catalogos');
const { MENSAJES } = require('../../dominio/contenidos');
const { PATRON_SLUG, LARGO_MAXIMO, generarSlug } = require('../../dominio/slug');
const { texto, publicable } = require('./comunes');

/**
 * Coleccion `contenido` (Cuadro 13): paginas de las secciones S1 a S5.
 * M-02, RCN-01, RCN-02, RCN-04, RF-03, RF-10
 *
 * El cuerpo se guarda en Markdown tal como lo escribe el administrador; la
 * web lo convierte a HTML de forma segura (T3).
 */
const esquema = new mongoose.Schema(
  {
    titulo: texto({ required: [true, 'El título es obligatorio.'] }),
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: [true, 'El slug es obligatorio.'],
      maxlength: [LARGO_MAXIMO, `El slug puede tener como máximo ${LARGO_MAXIMO} caracteres.`],
      match: [PATRON_SLUG, 'El slug solo puede tener letras sin tildes, números y guiones.']
    },
    seccion: {
      type: String,
      required: [true, 'La sección es obligatoria.'],
      enum: { values: SECCIONES, message: MENSAJES.SECCION_INVALIDA }
    },
    tramoEdad: {
      type: String,
      default: null,
      enum: { values: [...TRAMOS_EDAD, null], message: MENSAJES.TRAMO_INVALIDO }
    },
    cuerpo: texto({ required: [true, 'El cuerpo es obligatorio.'] })
  },
  { collection: 'contenido', timestamps: true }
);

esquema.plugin(publicable);

/** Si no llega un slug, se genera a partir del título. */
esquema.pre('validate', function completarSlug() {
  if (!this.slug && this.titulo) this.slug = generarSlug(this.titulo);
});

module.exports = mongoose.model('Contenido', esquema);
