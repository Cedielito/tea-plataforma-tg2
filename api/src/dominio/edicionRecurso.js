'use strict';
const { leerFuentes } = require('./edicionContenido');

/**
 * Datos que el editor del panel envia para crear o cambiar un recurso.
 * M-05, M-08, RF-06, RF-10, RCN-01, RCN-02
 *
 * Igual que en los otros editores, solo se aceptan los campos del formulario
 * y cada uno con su tipo: un objeto como {"$gt": ""} o un campo interno (_id,
 * createdAt) no llega al modelo. Los valores permitidos (tipo, perfiles), el
 * enlace seguro y las reglas para publicar (RCN-01, RCN-02) los aplica el
 * modelo al guardar.
 */

const CAMPOS_TEXTO = Object.freeze(['titulo', 'slug', 'descripcion', 'tipo', 'url', 'estado']);

const MENSAJES = Object.freeze({
  CUERPO_INVALIDO: 'Los datos del recurso no tienen el formato esperado.',
  VALOR_INVALIDO: 'El valor no es válido.',
  LISTA_INVALIDA: 'Debe ser una lista de opciones.',
  SLUG_DE_ARCHIVO: (archivo) =>
    `Este recurso viene del archivo ${archivo} del repositorio: su slug (el id del archivo) no se puede ` +
    'cambiar desde el panel. Si cambiara, al volver a arrancar la API se crearía otro recurso igual desde el archivo.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const tiene = (objeto, campo) => Object.prototype.hasOwnProperty.call(objeto, campo);

/**
 * @returns {{cambios: object} | {errores: Object<string, string>}} cambios
 *   listos para el repositorio (crear o actualizar), o un mensaje por campo
 */
function leerCambiosRecurso(cuerpo) {
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

  if (tiene(cuerpo, 'perfiles')) {
    const valor = cuerpo.perfiles;
    if (!Array.isArray(valor) || !valor.every((perfil) => typeof perfil === 'string')) {
      errores.perfiles = MENSAJES.LISTA_INVALIDA;
    } else {
      cambios.perfiles = [...new Set(valor)];
    }
  }

  if (tiene(cuerpo, 'fechaRevision')) {
    const valor = cuerpo.fechaRevision;
    if (valor !== null && typeof valor !== 'string') errores.fechaRevision = MENSAJES.VALOR_INVALIDO;
    else cambios.fechaRevision = valor === null || valor.trim() === '' ? null : valor.trim();
  }

  if (tiene(cuerpo, 'fuentes')) {
    const { valor, error } = leerFuentes(cuerpo.fuentes);
    if (error) errores.fuentes = error;
    else cambios.fuentes = valor;
  }

  return Object.keys(errores).length > 0 ? { errores } : { cambios };
}

module.exports = { MENSAJES, leerCambiosRecurso };
