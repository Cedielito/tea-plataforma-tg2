'use strict';
const { leerEncabezado, esFechaDeCalendario, erroresDeFuentes } = require('./archivoContenido');
const { validarFuentes, validarFechaRevision } = require('./publicacion');
const { esSlugValido } = require('./slug');

/**
 * Paginas fijas de api/contenidos/paginas: la politica de tratamiento de
 * datos y «Acerca de». M-06, RF-08, RF-12, RS-02, RS-03, RCN-01, RCN-02
 *
 * Tienen el mismo encabezado que los contenidos (titulo, slug, fechaRevision,
 * fuentes) y no se editan desde el panel: cambian con una version nueva en el
 * repositorio. La politica (slug `privacidad`) agrega:
 * - `version`: la que se guarda con cada mensaje de contacto (RS-02);
 * - `vigenteDesde`: AAAA-MM-DD. Solo se valida el formato: es el dia en que se
 *   fusiona el cambio, que puede ser posterior al dia en que se escribe;
 * - `textoAutorizacion`: el texto de la casilla del formulario de contacto.
 *
 * Reglas:
 * - Un archivo que todavia dice COMPLETAR no se publica.
 * - Sin fuentes ni fecha de revision (o con una fecha posterior a hoy) no se
 *   publica (RCN-01, RCN-02), como cualquier contenido.
 * - La version de la politica debe aparecer igual en la casilla («versión
 *   1.0») y en el cuerpo («Versión 1.0»): quien acepta la casilla tiene que
 *   estar aceptando la version que se guarda con su mensaje.
 *
 * Funciones puras: la lectura de la carpeta esta en datos/paginasFijas.js.
 */

const SLUG_POLITICA = 'privacidad';
const MARCA_PENDIENTE = 'COMPLETAR';

const CAMPOS = Object.freeze(['titulo', 'slug', 'fechaRevision', 'fuentes']);
const CAMPOS_POLITICA = Object.freeze(['version', 'vigenteDesde', 'textoAutorizacion']);

const MENSAJES = Object.freeze({
  PENDIENTE: 'El archivo todavía dice COMPLETAR: reemplaza ese texto antes de publicarlo.',
  CAMPO_DESCONOCIDO: 'Campo desconocido en el encabezado:',
  SIN_TITULO: 'El titulo es obligatorio.',
  SLUG_INVALIDO: 'El slug es obligatorio y solo puede tener letras minúsculas sin tildes, números y guiones.',
  FECHA_FORMATO: 'La fechaRevision debe ser una fecha real con el formato AAAA-MM-DD, por ejemplo 2026-10-07.',
  SIN_VERSION: 'La política necesita su version entre comillas, por ejemplo version: "1.0".',
  VIGENCIA_FORMATO: 'La política necesita vigenteDesde: una fecha real con el formato AAAA-MM-DD.',
  SIN_TEXTO_AUTORIZACION: 'La política necesita textoAutorizacion: el texto de la casilla del formulario de contacto.',
  VERSION_EN_AUTORIZACION: 'El textoAutorizacion debe nombrar la misma versión de la política',
  VERSION_EN_CUERPO: 'El cuerpo de la política debe decir la misma versión'
});

const textoLleno = (valor) => typeof valor === 'string' && valor.trim() !== '';
const vacio = (valor) => valor === undefined || valor === null || valor === '';

function erroresDePolitica(campos, cuerpo) {
  const errores = [];
  const { version, vigenteDesde, textoAutorizacion } = campos;
  if (!textoLleno(version)) errores.push(MENSAJES.SIN_VERSION);
  if (!esFechaDeCalendario(vigenteDesde)) errores.push(MENSAJES.VIGENCIA_FORMATO);
  if (!textoLleno(textoAutorizacion)) errores.push(MENSAJES.SIN_TEXTO_AUTORIZACION);
  if (textoLleno(version) && textoLleno(textoAutorizacion) && !textoAutorizacion.includes(`versión ${version}`)) {
    errores.push(`${MENSAJES.VERSION_EN_AUTORIZACION} («versión ${version}»).`);
  }
  if (textoLleno(version) && !cuerpo.includes(`Versión ${version}`)) {
    errores.push(`${MENSAJES.VERSION_EN_CUERPO} («Versión ${version}»).`);
  }
  return errores;
}

/**
 * @param {string} texto contenido del archivo
 * @param {Date} ahora para rechazar una fecha de revision posterior a hoy
 * @returns {{datos: object} | {error: string}} la pagina lista para la API, o
 *   todos sus errores en un solo mensaje
 */
function leerArchivoPagina(texto, ahora = new Date()) {
  if (typeof texto === 'string' && texto.includes(MARCA_PENDIENTE)) return { error: MENSAJES.PENDIENTE };
  const leido = leerEncabezado(texto);
  if (leido.error) return leido;
  const { campos } = leido;
  const cuerpo = leido.cuerpo.trim();

  const esPolitica = campos.slug === SLUG_POLITICA;
  const permitidos = esPolitica ? [...CAMPOS, ...CAMPOS_POLITICA] : CAMPOS;
  const errores = [];
  const desconocidos = Object.keys(campos).filter((campo) => !permitidos.includes(campo));
  if (desconocidos.length > 0) errores.push(`${MENSAJES.CAMPO_DESCONOCIDO} ${desconocidos.join(', ')}.`);
  if (!textoLleno(campos.titulo)) errores.push(MENSAJES.SIN_TITULO);
  if (!esSlugValido(campos.slug)) errores.push(MENSAJES.SLUG_INVALIDO);

  let fechaRevision = null;
  if (!vacio(campos.fechaRevision) && !esFechaDeCalendario(campos.fechaRevision)) {
    errores.push(MENSAJES.FECHA_FORMATO);
  } else {
    fechaRevision = vacio(campos.fechaRevision) ? null : new Date(`${campos.fechaRevision}T00:00:00Z`);
    errores.push(...validarFechaRevision(fechaRevision, ahora));
  }

  const formatoFuentes = erroresDeFuentes(campos.fuentes);
  errores.push(...(formatoFuentes.length > 0 ? formatoFuentes : validarFuentes(campos.fuentes)));
  if (esPolitica) errores.push(...erroresDePolitica(campos, cuerpo));
  if (errores.length > 0) return { error: errores.join(' ') };

  const datos = {
    slug: campos.slug,
    titulo: campos.titulo.trim(),
    cuerpo,
    fuentes: campos.fuentes.map(({ texto: textoFuente, url }) => (vacio(url) ? { texto: textoFuente } : { texto: textoFuente, url })),
    fechaRevision
  };
  if (esPolitica) {
    datos.version = campos.version.trim();
    datos.vigenteDesde = campos.vigenteDesde;
    datos.textoAutorizacion = campos.textoAutorizacion.trim();
  }
  return { datos };
}

module.exports = { SLUG_POLITICA, MARCA_PENDIENTE, MENSAJES, leerArchivoPagina };
