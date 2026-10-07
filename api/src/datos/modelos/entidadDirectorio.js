'use strict';
const mongoose = require('mongoose');
const { TIPOS_ENTIDAD, CIUDADES } = require('../../dominio/catalogos');
const { esUrlSegura } = require('../../dominio/publicacion');
const { MENSAJES, esCorreoValido, validarEntidad } = require('../../dominio/directorio');
const { texto, textoOpcional, campoSlug, slugDesdeTitulo, publicable } = require('./comunes');

/**
 * Coleccion `entidad_directorio` (Cuadro 13): entidades y profesionales del
 * directorio de orientacion. M-04, RF-05, RF-10, RS-07, RCN-01, RCN-02, HU-14
 *
 * - `slug` es el `id` de la entidad en api/contenidos/directorio/entidades.yaml;
 *   si no llega, se genera a partir del nombre.
 * - `tipo` y `ciudad` salen de los catalogos (dominio/catalogos.js). Las
 *   entidades de ciudad «Nacional» atienden en todo el pais.
 * - `contacto` necesita al menos un telefono, correo o sitio web (HU-14).
 * - RS-07: si `esProfesional`, no se publica sin `constanciaAutorizacion`.
 *   La constancia es solo para el panel: la API publica no la devuelve.
 * - Fuentes, fecha de verificacion y estado vienen del plugin `publicable`
 *   con `fechaVerificacion` como fecha de RCN-02: no se publica sin fuente ni
 *   fecha de verificacion.
 */

const esquemaContacto = new mongoose.Schema(
  {
    telefonos: { type: [texto()], default: [] },
    correo: textoOpcional({
      lowercase: true,
      validate: {
        validator: (valor) => valor === undefined || valor === null || esCorreoValido(valor),
        message: MENSAJES.CORREO_INVALIDO
      }
    }),
    web: textoOpcional({
      validate: {
        validator: (valor) => valor === undefined || valor === null || esUrlSegura(valor),
        message: MENSAJES.WEB_INSEGURA
      }
    }),
    direccion: textoOpcional(),
    horario: textoOpcional()
  },
  { _id: false }
);

const esquema = new mongoose.Schema(
  {
    nombre: texto({ required: [true, 'El nombre es obligatorio.'] }),
    slug: campoSlug(),
    tipo: {
      type: String,
      trim: true,
      required: [true, 'El tipo es obligatorio.'],
      enum: { values: TIPOS_ENTIDAD, message: MENSAJES.TIPO_INVALIDO }
    },
    ciudad: texto({
      required: [true, 'La ciudad es obligatoria.'],
      enum: { values: CIUDADES, message: MENSAJES.CIUDAD_INVALIDA }
    }),
    descripcion: texto({ required: [true, 'La descripción es obligatoria.'] }),
    contacto: { type: esquemaContacto, default: () => ({}) },
    esProfesional: { type: Boolean, default: false },
    constanciaAutorizacion: textoOpcional()
  },
  { collection: 'entidad_directorio', timestamps: true }
);

esquema.plugin(publicable, { campoFecha: 'fechaVerificacion' });
esquema.plugin(slugDesdeTitulo, { campo: 'nombre' });

esquema.pre('validate', function aplicarReglasDelDirectorio() {
  for (const { campo, mensaje } of validarEntidad(this)) this.invalidate(campo, mensaje);
});

module.exports = mongoose.model('EntidadDirectorio', esquema);
