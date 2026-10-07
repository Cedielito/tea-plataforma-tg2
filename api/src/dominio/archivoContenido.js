'use strict';
const YAML = require('yaml');
const { ESTADOS } = require('./catalogos');
const { esSlugValido } = require('./slug');

/**
 * Archivos de textos de api/contenidos: encabezado YAML entre lineas `---` y
 * cuerpo en Markdown. M-02, RF-10, RCN-01, RCN-02
 *
 * Funciones puras: leen un archivo y deciden si su contenido se crea, se
 * actualiza o se deja como esta en la base. Las reglas de fuente y fecha
 * (RCN-01, RCN-02) no se repiten aqui: las aplica el modelo al guardar, igual
 * que para lo que se publique desde el panel.
 */

const CAMPOS = Object.freeze(['titulo', 'slug', 'seccion', 'tramoEdad', 'fechaRevision', 'fuentes']);
const CAMPOS_FUENTE = Object.freeze(['texto', 'url']);

const ACCIONES = Object.freeze({ CREAR: 'crear', ACTUALIZAR: 'actualizar', OMITIR: 'omitir' });

const MENSAJES = Object.freeze({
  SIN_ENCABEZADO: 'El archivo debe empezar con un encabezado entre dos líneas ---.',
  ENCABEZADO_INVALIDO: 'El encabezado no se pudo leer como YAML.',
  ENCABEZADO_SIN_CAMPOS: 'El encabezado debe tener campos con nombre, como titulo: y slug:.',
  CAMPO_DESCONOCIDO: 'Campo desconocido en el encabezado:',
  SLUG_INVALIDO: 'El slug es obligatorio y solo puede tener letras minúsculas sin tildes, números y guiones.',
  FECHA_FORMATO: 'La fechaRevision debe ser una fecha real con el formato AAAA-MM-DD, por ejemplo 2026-10-06.',
  FUENTES_NO_LISTA: 'fuentes debe ser una lista: cada fuente empieza con «- texto:».',
  FUENTE_FORMATO: 'Cada fuente debe tener texto y, si lo tiene, url (sin otros campos).'
});

/** Encabezado entre la primera linea `---` y la siguiente; admite BOM y saltos CRLF. */
const PATRON_ARCHIVO = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const vacio = (valor) => valor === undefined || valor === null || valor === '';

/** «2026-02-30» no es una fecha real aunque tenga el formato. */
function esFechaDeCalendario(valor) {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function erroresDeFuentes(fuentes) {
  if (vacio(fuentes)) return [];
  if (!Array.isArray(fuentes)) return [MENSAJES.FUENTES_NO_LISTA];
  const bienFormadas = fuentes.every(
    (fuente) => esObjeto(fuente) && Object.keys(fuente).every((campo) => CAMPOS_FUENTE.includes(campo))
  );
  return bienFormadas ? [] : [MENSAJES.FUENTE_FORMATO];
}

/**
 * Lee el texto de un archivo de contenido.
 * @returns {{datos: object} | {error: string}} datos listos para el repositorio,
 *   siempre como publicado; o los errores de formato en un solo mensaje.
 */
function leerArchivoContenido(texto) {
  const partes = PATRON_ARCHIVO.exec(typeof texto === 'string' ? texto : '');
  if (!partes) return { error: MENSAJES.SIN_ENCABEZADO };
  const [, encabezado, cuerpo] = partes;

  let campos;
  try {
    campos = YAML.parse(encabezado);
  } catch (e) {
    return { error: `${MENSAJES.ENCABEZADO_INVALIDO} ${e.message}` };
  }
  if (!esObjeto(campos)) return { error: MENSAJES.ENCABEZADO_SIN_CAMPOS };

  const errores = [];
  const desconocidos = Object.keys(campos).filter((campo) => !CAMPOS.includes(campo));
  if (desconocidos.length > 0) errores.push(`${MENSAJES.CAMPO_DESCONOCIDO} ${desconocidos.join(', ')}.`);
  if (!esSlugValido(campos.slug)) errores.push(MENSAJES.SLUG_INVALIDO);
  if (!vacio(campos.fechaRevision) && !esFechaDeCalendario(campos.fechaRevision)) {
    errores.push(MENSAJES.FECHA_FORMATO);
  }
  errores.push(...erroresDeFuentes(campos.fuentes));
  if (errores.length > 0) return { error: errores.join(' ') };

  return {
    datos: {
      titulo: campos.titulo,
      slug: campos.slug,
      seccion: campos.seccion,
      tramoEdad: vacio(campos.tramoEdad) ? null : String(campos.tramoEdad),
      fechaRevision: vacio(campos.fechaRevision) ? null : campos.fechaRevision,
      fuentes: vacio(campos.fuentes) ? [] : campos.fuentes,
      cuerpo: cuerpo.trim(),
      estado: ESTADOS.PUBLICADO
    }
  };
}

/** Dia de calendario (AAAA-MM-DD, en UTC) de una fecha guardada en la base. */
function diaGuardado(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10);
}

/**
 * Que hacer con el archivo frente a lo que hay en la base:
 * - no existe: se crea;
 * - el archivo trae una fecha de revision mas reciente, o la base no tiene
 *   fecha: se actualiza (y se vuelve a publicar);
 * - la base tiene la misma fecha o una mas reciente (por ejemplo, una
 *   correccion hecha en el panel): se deja como esta.
 * Si el archivo no trae fecha no hay con que comparar: se intenta guardar
 * para que RCN-02 lo rechace y el error quede en el informe.
 *
 * @param {string|null} fechaArchivo AAAA-MM-DD
 * @param {{fechaRevision: Date|null}|null} existente documento de la base
 */
function decidirAccion(fechaArchivo, existente) {
  if (!existente) return ACCIONES.CREAR;
  const fechaBase = diaGuardado(existente.fechaRevision);
  if (!fechaArchivo || !fechaBase) return ACCIONES.ACTUALIZAR;
  return fechaArchivo > fechaBase ? ACCIONES.ACTUALIZAR : ACCIONES.OMITIR;
}

module.exports = {
  CAMPOS,
  ACCIONES,
  MENSAJES,
  leerArchivoContenido,
  decidirAccion,
  esFechaDeCalendario,
  erroresDeFuentes
};
