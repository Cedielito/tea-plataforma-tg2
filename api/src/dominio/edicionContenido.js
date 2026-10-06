'use strict';

/**
 * Datos que el editor del panel envia para crear o cambiar un contenido.
 * M-08, RF-10, RCN-01, RCN-02
 *
 * Solo se aceptan los campos del formulario, y cada uno con su tipo: un
 * objeto como {"$gt": ""} o un campo interno (_id, createdAt) no llega al
 * modelo. Las reglas para publicar (fuente y fecha de revision) no se repiten
 * aqui: las aplica el modelo al guardar (dominio/publicacion.js), igual que
 * para los textos de api/contenidos.
 */

const CAMPOS_TEXTO = Object.freeze(['titulo', 'slug', 'seccion', 'cuerpo', 'estado']);
/** Campos que aceptan vacio: se guardan como null. */
const CAMPOS_OPCIONALES = Object.freeze(['tramoEdad', 'fechaRevision']);
const CAMPOS_FUENTE = Object.freeze(['texto', 'url']);

const MENSAJES = Object.freeze({
  CUERPO_INVALIDO: 'Los datos del contenido no tienen el formato esperado.',
  VALOR_INVALIDO: 'El valor no es válido.',
  FUENTES_NO_LISTA: 'Las fuentes deben ser una lista.',
  FUENTE_INVALIDA: 'Cada fuente debe tener un texto y, si quieres, un enlace.',
  SLUG_DE_ARCHIVO: (archivo) =>
    `Esta página viene del archivo ${archivo} del repositorio: su slug no se puede cambiar desde el panel. ` +
    'Si cambiara, al volver a arrancar la API se crearía otra página igual desde el archivo.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const tiene = (objeto, campo) => Object.prototype.hasOwnProperty.call(objeto, campo);
const esTextoOVacio = (valor) => typeof valor === 'string' || valor === null;

function leerFuentes(fuentes) {
  if (!Array.isArray(fuentes)) return { error: MENSAJES.FUENTES_NO_LISTA };
  const bienFormadas = fuentes.every(
    (fuente) =>
      esObjeto(fuente) &&
      Object.keys(fuente).every((campo) => CAMPOS_FUENTE.includes(campo)) &&
      CAMPOS_FUENTE.every((campo) => !tiene(fuente, campo) || esTextoOVacio(fuente[campo]))
  );
  if (!bienFormadas) return { error: MENSAJES.FUENTE_INVALIDA };
  return { valor: fuentes.map(({ texto, url }) => ({ texto: texto ?? '', url: url || undefined })) };
}

/**
 * @returns {{cambios: object} | {errores: Object<string, string>}} cambios
 *   listos para los repositorios (crear o actualizar), o un mensaje por campo
 */
function leerCambiosContenido(cuerpo) {
  if (!esObjeto(cuerpo)) return { errores: { general: MENSAJES.CUERPO_INVALIDO } };
  const cambios = {};
  const errores = {};

  for (const campo of CAMPOS_TEXTO) {
    if (!tiene(cuerpo, campo)) continue;
    const valor = cuerpo[campo];
    if (typeof valor !== 'string') errores[campo] = MENSAJES.VALOR_INVALIDO;
    // Un slug vacio se quita: el modelo lo genera a partir del titulo.
    else if (campo === 'slug' && valor.trim() === '') cambios.slug = undefined;
    else cambios[campo] = valor;
  }

  for (const campo of CAMPOS_OPCIONALES) {
    if (!tiene(cuerpo, campo)) continue;
    const valor = cuerpo[campo];
    if (!esTextoOVacio(valor)) errores[campo] = MENSAJES.VALOR_INVALIDO;
    else cambios[campo] = valor === null || valor.trim() === '' ? null : valor.trim();
  }

  if (tiene(cuerpo, 'fuentes')) {
    const { valor, error } = leerFuentes(cuerpo.fuentes);
    if (error) errores.fuentes = error;
    else cambios.fuentes = valor;
  }

  return Object.keys(errores).length > 0 ? { errores } : { cambios };
}

/**
 * El slug de una pagina que viene de api/contenidos no cambia desde el panel:
 * la carga automatica busca por slug y crearia un duplicado.
 * @param {string} slugActual
 * @param {object} cambios resultado de leerCambiosContenido
 * @param {string|null} archivo nombre del archivo de origen, si lo tiene
 * @returns {string|null} mensaje de error
 */
function validarCambioDeSlug(slugActual, cambios, archivo) {
  if (!archivo || !tiene(cambios, 'slug')) return null;
  const nuevo = typeof cambios.slug === 'string' ? cambios.slug.trim().toLowerCase() : '';
  return nuevo === slugActual ? null : MENSAJES.SLUG_DE_ARCHIVO(archivo);
}

module.exports = { MENSAJES, leerCambiosContenido, validarCambioDeSlug };
