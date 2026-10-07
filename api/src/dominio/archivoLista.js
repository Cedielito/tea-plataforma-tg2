'use strict';
const YAML = require('yaml');
const { ESTADOS } = require('./catalogos');
const { esSlugValido } = require('./slug');
const { esFechaDeCalendario, erroresDeFuentes } = require('./archivoContenido');

/**
 * Archivos YAML de api/contenidos que guardan una lista de elementos, como
 * ruta/pasos.yaml (T5). M-03, RF-10, RCN-01, RCN-02
 *
 * Cada elemento tiene un `id` unico que se guarda como `slug`: en la base, el
 * identificador legible siempre es `slug`, para no confundirlo con el _id de
 * MongoDB. La carga busca por ese slug (datos/sincronizacionListas.js).
 *
 * Funciones puras. Revisan el formato (campos conocidos, id, fecha y forma de
 * las fuentes); las reglas de publicacion (RCN-01, RCN-02) y los valores de
 * cada campo los aplica el modelo al guardar, igual que para el panel.
 */

const MENSAJES = Object.freeze({
  YAML_INVALIDO: 'El archivo no se pudo leer como YAML.',
  NO_ES_LISTA: 'El archivo debe ser una lista: cada elemento empieza con «- id:».',
  ELEMENTO_SIN_CAMPOS: 'El elemento debe tener campos con nombre, como id: y titulo:.',
  CAMPO_DESCONOCIDO: 'Campo desconocido:',
  ID_INVALIDO: 'El id es obligatorio y solo puede tener letras minúsculas sin tildes, números y guiones.',
  ID_REPETIDO: (id, posicion) => `El id «${id}» ya lo usa el elemento ${posicion}.`,
  FECHA_FORMATO: 'La fechaRevision debe ser una fecha real con el formato AAAA-MM-DD, por ejemplo 2026-10-06.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const vacio = (valor) => valor === undefined || valor === null || valor === '';

function erroresDelElemento(elemento, campos) {
  if (!esObjeto(elemento)) return [MENSAJES.ELEMENTO_SIN_CAMPOS];
  const errores = [];
  const desconocidos = Object.keys(elemento).filter((campo) => campo !== 'id' && !campos.includes(campo));
  if (desconocidos.length > 0) errores.push(`${MENSAJES.CAMPO_DESCONOCIDO} ${desconocidos.join(', ')}.`);
  if (!esSlugValido(elemento.id)) errores.push(MENSAJES.ID_INVALIDO);
  if (!vacio(elemento.fechaRevision) && !esFechaDeCalendario(elemento.fechaRevision)) {
    errores.push(MENSAJES.FECHA_FORMATO);
  }
  errores.push(...erroresDeFuentes(elemento.fuentes));
  return errores;
}

/** Datos para el repositorio: el id pasa a slug y el elemento queda publicado. */
function aDatos({ id, ...resto }, campos) {
  const datos = { slug: id, estado: ESTADOS.PUBLICADO };
  for (const campo of campos) {
    if (resto[campo] !== undefined) datos[campo] = resto[campo];
  }
  datos.fechaRevision = vacio(resto.fechaRevision) ? null : resto.fechaRevision;
  datos.fuentes = vacio(resto.fuentes) ? [] : resto.fuentes;
  return datos;
}

/**
 * Lee el texto de un archivo de lista.
 * @param {string} texto contenido del archivo
 * @param {{campos: string[]}} opciones campos permitidos ademas de `id`
 * @returns {{error: string} | {elementos: {nombre: string, datos: object}[],
 *   errores: {nombre: string, mensaje: string}[]}} `nombre` es el id del
 *   elemento, o «elemento N» si el id no sirve. Si el archivo entero no se
 *   puede leer, solo `error`.
 */
function leerArchivoLista(texto, { campos }) {
  let lista;
  try {
    lista = YAML.parse(typeof texto === 'string' ? texto : '');
  } catch (e) {
    return { error: `${MENSAJES.YAML_INVALIDO} ${e.message}` };
  }
  if (!Array.isArray(lista)) return { error: MENSAJES.NO_ES_LISTA };

  const elementos = [];
  const errores = [];
  const posicionPorId = new Map();
  lista.forEach((elemento, indice) => {
    const posicion = indice + 1;
    const id = esObjeto(elemento) && esSlugValido(elemento.id) ? elemento.id : null;
    const nombre = id ?? `elemento ${posicion}`;
    const mensajes = erroresDelElemento(elemento, campos);
    if (mensajes.length > 0) {
      errores.push({ nombre, mensaje: mensajes.join(' ') });
    } else if (posicionPorId.has(id)) {
      errores.push({ nombre: `elemento ${posicion}`, mensaje: MENSAJES.ID_REPETIDO(id, posicionPorId.get(id)) });
    } else {
      posicionPorId.set(id, posicion);
      elementos.push({ nombre, datos: aDatos(elemento, campos) });
    }
  });
  return { elementos, errores };
}

module.exports = { MENSAJES, leerArchivoLista };
