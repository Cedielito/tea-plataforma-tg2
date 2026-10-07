'use strict';
const { Schema } = require('mongoose');
const { ESTADOS } = require('../../dominio/catalogos');
const { MENSAJES, esUrlSegura, mensajesDeFecha, validarPublicacion } = require('../../dominio/publicacion');
const { PATRON_SLUG, LARGO_MAXIMO, generarSlug } = require('../../dominio/slug');

/**
 * Piezas comunes de los esquemas que se publican: contenido,
 * pregunta_frecuente, recurso, paso_ruta y entidad_directorio (Cuadro 13).
 * RCN-01, RCN-02, RF-05, RF-10
 */

/**
 * Texto guardado en forma NFC: si se pega «é» como «e» + tilde combinada
 * (frecuente al copiar de un PDF), el buscador igual lo encuentra.
 */
const aNFC = (valor) => (typeof valor === 'string' ? valor.normalize('NFC') : valor);

function texto(opciones = {}) {
  return { type: String, trim: true, set: aNFC, ...opciones };
}

const sinVacio = (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor);

/** Texto que se puede dejar vacio: un texto vacio no se guarda. */
function textoOpcional(opciones = {}) {
  return texto({ set: (valor) => sinVacio(aNFC(valor)), ...opciones });
}

/**
 * Identificador legible y unico. Los archivos de api/contenidos lo llaman
 * `slug` (paginas) o `id` (listas YAML); en la base siempre es `slug`, para no
 * confundirlo con el _id de MongoDB que usan el panel y sus rutas.
 */
function campoSlug() {
  return {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: [true, 'El slug es obligatorio.'],
    maxlength: [LARGO_MAXIMO, `El slug puede tener como máximo ${LARGO_MAXIMO} caracteres.`],
    match: [PATRON_SLUG, 'El slug solo puede tener letras sin tildes, números y guiones.']
  };
}

/**
 * Plugin: si no llega un slug, se genera a partir del título (o del campo que
 * se indique, como el nombre de una entidad del directorio).
 */
function slugDesdeTitulo(schema, { campo = 'titulo' } = {}) {
  schema.pre('validate', function completarSlug() {
    if (!this.slug && this[campo]) this.slug = generarSlug(this[campo]);
  });
}

/** Una fuente: texto que la identifica y enlace opcional (un libro puede no tenerlo). */
const esquemaFuente = new Schema(
  {
    texto: texto({ required: [true, MENSAJES.FUENTE_SIN_TEXTO] }),
    url: {
      type: String,
      trim: true,
      set: sinVacio,
      validate: {
        validator: (valor) => valor === undefined || valor === null || esUrlSegura(valor),
        message: MENSAJES.FUENTE_URL_INSEGURA
      }
    }
  },
  { _id: false }
);

/**
 * Operaciones que escriben sin pasar por la validacion del documento. Se
 * bloquean para que nadie publique saltandose RCN-01 y RCN-02: toda escritura
 * va por save() desde los repositorios.
 */
const ESCRITURAS_DIRECTAS = ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'];
const MENSAJE_ESCRITURA_DIRECTA =
  'Escritura directa bloqueada: usa los repositorios de datos/repositorios, que guardan con save() ' +
  'para aplicar las reglas de publicacion (RCN-01, RCN-02).';

/**
 * Plugin: agrega fuentes, fecha de revision y estado, y rechaza guardar como
 * publicado lo que no cumple las reglas de dominio/publicacion.js.
 * @param {{campoFecha?: string}} opciones nombre del campo de fecha de RCN-02:
 *   `fechaRevision` (por defecto) o `fechaVerificacion` en el directorio
 */
function publicable(schema, { campoFecha = 'fechaRevision' } = {}) {
  mensajesDeFecha(campoFecha);
  schema.add({
    fuentes: { type: [esquemaFuente], default: [] },
    [campoFecha]: { type: Date, default: null },
    estado: {
      type: String,
      required: true,
      default: ESTADOS.BORRADOR,
      enum: { values: Object.values(ESTADOS), message: 'El estado debe ser borrador o publicado.' }
    }
  });

  schema.pre('validate', function aplicarReglasDePublicacion() {
    const porCampo = new Map();
    for (const { campo, mensaje } of validarPublicacion(this, new Date(), { campoFecha })) {
      porCampo.set(campo, [...(porCampo.get(campo) || []), mensaje]);
    }
    for (const [campo, mensajes] of porCampo) this.invalidate(campo, mensajes.join(' '));
  });

  schema.pre(ESCRITURAS_DIRECTAS, function bloquearEscrituraDirecta() {
    throw new Error(MENSAJE_ESCRITURA_DIRECTA);
  });
}

module.exports = {
  texto,
  textoOpcional,
  sinVacio,
  campoSlug,
  slugDesdeTitulo,
  esquemaFuente,
  publicable,
  ESCRITURAS_DIRECTAS,
  MENSAJE_ESCRITURA_DIRECTA
};
