'use strict';
const { leerFuentes } = require('./edicionContenido');
const { CAMPOS_CONTACTO } = require('./directorio');

/**
 * Datos que el editor del panel envia para crear o cambiar una entidad del
 * directorio. M-04, M-08, RF-05, RF-10, RS-07, RCN-01, RCN-02
 *
 * Igual que en los otros editores, solo se aceptan los campos del formulario
 * y cada uno con su tipo: un objeto como {"$gt": ""} o un campo interno (_id,
 * createdAt) no llega al modelo. `contacto` llega completo y reemplaza al
 * anterior; los telefonos vacios se quitan. Los valores permitidos (tipo,
 * ciudad), el canal de contacto obligatorio y las reglas para publicar
 * (RCN-01, RCN-02, RS-07) los aplica el modelo al guardar.
 */

const CAMPOS_TEXTO = Object.freeze(['nombre', 'slug', 'tipo', 'ciudad', 'descripcion', 'estado']);
/** Campos que aceptan vacio: se guardan como null. */
const CAMPOS_OPCIONALES = Object.freeze(['constanciaAutorizacion', 'fechaVerificacion']);

const MENSAJES = Object.freeze({
  CUERPO_INVALIDO: 'Los datos de la entidad no tienen el formato esperado.',
  VALOR_INVALIDO: 'El valor no es válido.',
  SI_O_NO: 'Debe ser sí o no.',
  CONTACTO_INVALIDO: 'Los datos de contacto no tienen el formato esperado.',
  TELEFONOS_INVALIDOS: 'Los teléfonos deben ser una lista de textos.',
  SLUG_DE_ARCHIVO: (archivo) =>
    `Esta entidad viene del archivo ${archivo} del repositorio: su slug (el id del archivo) no se puede ` +
    'cambiar desde el panel. Si cambiara, al volver a arrancar la API se crearía otra entidad igual desde el archivo.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const tiene = (objeto, campo) => Object.prototype.hasOwnProperty.call(objeto, campo);
const esTextoOVacio = (valor) => typeof valor === 'string' || valor === null;

/** @returns {{valor: object} | {error: string}} contacto sin campos vacios */
function leerContacto(contacto) {
  if (!esObjeto(contacto) || !Object.keys(contacto).every((campo) => CAMPOS_CONTACTO.includes(campo))) {
    return { error: MENSAJES.CONTACTO_INVALIDO };
  }
  const valor = {};
  for (const campo of CAMPOS_CONTACTO) {
    if (!tiene(contacto, campo)) continue;
    const dato = contacto[campo];
    if (campo === 'telefonos') {
      if (!Array.isArray(dato) || !dato.every((telefono) => typeof telefono === 'string')) {
        return { error: MENSAJES.TELEFONOS_INVALIDOS };
      }
      valor.telefonos = dato.map((telefono) => telefono.trim()).filter((telefono) => telefono !== '');
    } else if (!esTextoOVacio(dato)) {
      return { error: MENSAJES.CONTACTO_INVALIDO };
    } else if (dato !== null && dato.trim() !== '') {
      valor[campo] = dato.trim();
    }
  }
  return { valor };
}

/**
 * @returns {{cambios: object} | {errores: Object<string, string>}} cambios
 *   listos para el repositorio (crear o actualizar), o un mensaje por campo
 */
function leerCambiosEntidad(cuerpo) {
  if (!esObjeto(cuerpo)) return { errores: { general: MENSAJES.CUERPO_INVALIDO } };
  const cambios = {};
  const errores = {};

  for (const campo of CAMPOS_TEXTO) {
    if (!tiene(cuerpo, campo)) continue;
    const valor = cuerpo[campo];
    if (typeof valor !== 'string') errores[campo] = MENSAJES.VALOR_INVALIDO;
    // Un slug vacio se quita: el modelo lo genera a partir del nombre.
    else if (campo === 'slug' && valor.trim() === '') cambios.slug = undefined;
    else cambios[campo] = valor;
  }

  for (const campo of CAMPOS_OPCIONALES) {
    if (!tiene(cuerpo, campo)) continue;
    const valor = cuerpo[campo];
    if (!esTextoOVacio(valor)) errores[campo] = MENSAJES.VALOR_INVALIDO;
    else cambios[campo] = valor === null || valor.trim() === '' ? null : valor.trim();
  }

  if (tiene(cuerpo, 'esProfesional')) {
    if (typeof cuerpo.esProfesional !== 'boolean') errores.esProfesional = MENSAJES.SI_O_NO;
    else cambios.esProfesional = cuerpo.esProfesional;
  }

  if (tiene(cuerpo, 'contacto')) {
    const { valor, error } = leerContacto(cuerpo.contacto);
    if (error) errores.contacto = error;
    else cambios.contacto = valor;
  }

  if (tiene(cuerpo, 'fuentes')) {
    const { valor, error } = leerFuentes(cuerpo.fuentes);
    if (error) errores.fuentes = error;
    else cambios.fuentes = valor;
  }

  return Object.keys(errores).length > 0 ? { errores } : { cambios };
}

module.exports = { MENSAJES, leerCambiosEntidad };
