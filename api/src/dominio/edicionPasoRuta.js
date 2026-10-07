'use strict';
const { leerFuentes } = require('./edicionContenido');

/**
 * Datos que el editor del panel envia para crear o cambiar un paso de la
 * ruta. M-08, RF-10, RCN-01, RCN-02
 *
 * Igual que en el editor de contenidos, solo se aceptan los campos del
 * formulario y cada uno con su tipo: un objeto como {"$gt": ""} o un campo
 * interno (_id, createdAt) no llega al modelo. Los valores permitidos de cada
 * lista y las reglas para publicar las aplica el modelo al guardar.
 */

const CAMPOS_TEXTO = Object.freeze(['titulo', 'slug', 'texto', 'estado']);
const CAMPOS_LISTA = Object.freeze(['perfiles', 'tramos', 'regimenes', 'tiposEntidad']);

const MENSAJES = Object.freeze({
  CUERPO_INVALIDO: 'Los datos del paso no tienen el formato esperado.',
  VALOR_INVALIDO: 'El valor no es válido.',
  LISTA_INVALIDA: 'Debe ser una lista de opciones.',
  ORDEN_INVALIDO: 'El orden debe ser un número entero.',
  SLUG_DE_ARCHIVO: (archivo) =>
    `Este paso viene del archivo ${archivo} del repositorio: su slug (el id del archivo) no se puede cambiar ` +
    'desde el panel. Si cambiara, al volver a arrancar la API se crearía otro paso igual desde el archivo.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const tiene = (objeto, campo) => Object.prototype.hasOwnProperty.call(objeto, campo);

/**
 * @returns {{cambios: object} | {errores: Object<string, string>}} cambios
 *   listos para el repositorio (crear o actualizar), o un mensaje por campo
 */
function leerCambiosPasoRuta(cuerpo) {
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

  for (const campo of CAMPOS_LISTA) {
    if (!tiene(cuerpo, campo)) continue;
    const valor = cuerpo[campo];
    if (!Array.isArray(valor) || !valor.every((opcion) => typeof opcion === 'string')) {
      errores[campo] = MENSAJES.LISTA_INVALIDA;
    } else {
      cambios[campo] = [...new Set(valor)];
    }
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

module.exports = { MENSAJES, leerCambiosPasoRuta };
