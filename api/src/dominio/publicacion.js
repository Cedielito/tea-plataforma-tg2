'use strict';
const { ESTADOS } = require('./catalogos');

/**
 * Reglas para publicar contenidos, preguntas frecuentes y recursos.
 * RCN-01, RCN-02, RF-10
 *
 * - RCN-01: no se publica sin al menos una fuente que la identifique.
 * - RCN-02: no se publica sin fecha de revision, ni con una fecha posterior a hoy.
 * - Un borrador puede guardarse sin fuentes ni fecha: las reglas se exigen al
 *   publicar.
 *
 * Funciones puras: los esquemas de Mongoose las aplican al guardar (ver
 * datos/modelos/reglasPublicacion.js) y el panel de T4 puede usarlas para
 * avisar antes de enviar.
 */

const MENSAJES = Object.freeze({
  SIN_FUENTES: 'Para publicar hace falta al menos una fuente.',
  FUENTE_SIN_TEXTO: 'Cada fuente necesita un texto que la identifique.',
  FUENTE_URL_INSEGURA: 'El enlace de una fuente debe empezar por http:// o https://.',
  SIN_FECHA: 'Para publicar hace falta la fecha de revisión.',
  FECHA_INVALIDA: 'La fecha de revisión no es válida.',
  FECHA_FUTURA: 'La fecha de revisión no puede ser posterior a hoy.'
});

const ZONA_HORARIA = 'America/Bogota';
const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/**
 * Solo enlaces http(s) absolutos. Con `permitirRuta` acepta tambien rutas del
 * mismo sitio (/recursos/guia.pdf), pero no las que empiezan por // porque el
 * navegador las trata como otro dominio. Evita que un enlace `javascript:`
 * llegue a la web.
 */
function esUrlSegura(valor, { permitirRuta = false } = {}) {
  if (typeof valor !== 'string' || valor.trim() === '') return false;
  const texto = valor.trim();
  if (permitirRuta && /^\/(?![/\\])/.test(texto)) return true;
  try {
    const url = new URL(texto);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validarFuentes(fuentes) {
  if (!Array.isArray(fuentes) || fuentes.length === 0) return [MENSAJES.SIN_FUENTES];
  const errores = new Set();
  for (const fuente of fuentes) {
    const texto = fuente && typeof fuente.texto === 'string' ? fuente.texto.trim() : '';
    if (!texto) errores.add(MENSAJES.FUENTE_SIN_TEXTO);
    const url = fuente && fuente.url;
    const tieneUrl = url !== undefined && url !== null && String(url).trim() !== '';
    if (tieneUrl && !esUrlSegura(url)) errores.add(MENSAJES.FUENTE_URL_INSEGURA);
  }
  return [...errores];
}

/**
 * La fecha de revision es una fecha de calendario: el formulario envia
 * AAAA-MM-DD y se guarda como medianoche UTC de ese dia. Por eso su dia se lee
 * en UTC y se compara con el dia de hoy en Colombia (UTC-5), sin mirar la hora:
 * una revision con la fecha de hoy pasa a cualquier hora del dia, sin importar
 * la zona horaria del servidor.
 */
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Numero de dia (dias desde 1970) del dia UTC de la fecha. */
const numeroDeDia = (fecha) => Math.floor(fecha.getTime() / MS_POR_DIA);

/** Dia de hoy en Colombia como AAAA-MM-DD. */
function hoyEnColombia(ahora = new Date()) {
  return formatoDia.format(ahora);
}

function validarFechaRevision(fecha, ahora = new Date()) {
  if (fecha === undefined || fecha === null || fecha === '') return [MENSAJES.SIN_FECHA];
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return [MENSAJES.FECHA_INVALIDA];
  const hoy = new Date(`${hoyEnColombia(ahora)}T00:00:00Z`);
  if (numeroDeDia(valor) > numeroDeDia(hoy)) return [MENSAJES.FECHA_FUTURA];
  return [];
}

/**
 * Errores que impiden guardar el documento con su estado actual. Un borrador
 * no tiene que cumplir las reglas de publicacion.
 * @returns {{campo: string, mensaje: string}[]}
 */
function validarPublicacion(doc, ahora = new Date()) {
  if (!doc || doc.estado !== ESTADOS.PUBLICADO) return [];
  return [
    ...validarFuentes(doc.fuentes).map((mensaje) => ({ campo: 'fuentes', mensaje })),
    ...validarFechaRevision(doc.fechaRevision, ahora).map((mensaje) => ({ campo: 'fechaRevision', mensaje }))
  ];
}

module.exports = {
  MENSAJES,
  esUrlSegura,
  validarFuentes,
  validarFechaRevision,
  validarPublicacion,
  hoyEnColombia
};
