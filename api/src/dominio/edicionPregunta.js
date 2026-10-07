'use strict';
const { leerFuentes } = require('./edicionContenido');

/**
 * Datos que el editor del panel envia para crear o cambiar una pregunta
 * frecuente. M-05, M-08, RF-07, RF-10, RCN-01, RCN-02
 *
 * Igual que en los otros editores, solo se aceptan los campos del formulario
 * y cada uno con su tipo: un objeto como {"$gt": ""} o un campo interno (_id,
 * createdAt) no llega al modelo. El orden obligatorio y las reglas para
 * publicar (RCN-01, RCN-02) los aplica el modelo al guardar.
 */

const CAMPOS_TEXTO = Object.freeze(['pregunta', 'slug', 'respuesta', 'estado']);

const MENSAJES = Object.freeze({
  CUERPO_INVALIDO: 'Los datos de la pregunta no tienen el formato esperado.',
  VALOR_INVALIDO: 'El valor no es válido.',
  ORDEN_INVALIDO: 'El orden debe ser un número entero.',
  SLUG_DE_ARCHIVO: (archivo) =>
    `Esta pregunta viene del archivo ${archivo} del repositorio: su slug (el id del archivo) no se puede ` +
    'cambiar desde el panel. Si cambiara, al volver a arrancar la API se crearía otra pregunta igual desde el archivo.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const tiene = (objeto, campo) => Object.prototype.hasOwnProperty.call(objeto, campo);

/**
 * @returns {{cambios: object} | {errores: Object<string, string>}} cambios
 *   listos para el repositorio (crear o actualizar), o un mensaje por campo
 */
function leerCambiosPregunta(cuerpo) {
  if (!esObjeto(cuerpo)) return { errores: { general: MENSAJES.CUERPO_INVALIDO } };
  const cambios = {};
  const errores = {};

  for (const campo of CAMPOS_TEXTO) {
    if (!tiene(cuerpo, campo)) continue;
    const valor = cuerpo[campo];
    if (typeof valor !== 'string') errores[campo] = MENSAJES.VALOR_INVALIDO;
    // Un slug vacio se quita: el modelo lo genera a partir de la pregunta.
    else if (campo === 'slug' && valor.trim() === '') cambios.slug = undefined;
    else cambios[campo] = valor;
  }

  // Sin orden (null), el modelo responde que es obligatorio.
  if (tiene(cuerpo, 'orden')) {
    const { orden } = cuerpo;
    if (orden !== null && typeof orden !== 'number') errores.orden = MENSAJES.ORDEN_INVALIDO;
    else cambios.orden = orden;
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

module.exports = { MENSAJES, leerCambiosPregunta };
