'use strict';
const { ESTADOS } = require('./catalogos');

/**
 * Reglas para publicar contenidos, preguntas frecuentes, recursos, pasos de la
 * ruta y entidades del directorio. RCN-01, RCN-02, RF-05, RF-10
 *
 * - RCN-01: no se publica sin al menos una fuente que la identifique.
 * - RCN-02: no se publica sin fecha de revision, ni con una fecha posterior a hoy.
 *   En el directorio esa fecha se llama fecha de verificacion
 *   (`fechaVerificacion`, Cuadro 13): la regla es la misma y cambian el campo
 *   y el texto de los mensajes (CAMPOS_FECHA).
 * - Un borrador puede guardarse sin fuentes ni fecha: las reglas se exigen al
 *   publicar.
 *
 * Funciones puras: los esquemas de Mongoose las aplican al guardar (ver
 * datos/modelos/comunes.js) y el panel de T4 puede usarlas para
 * avisar antes de enviar.
 */

const MENSAJES = Object.freeze({
  SIN_FUENTES: 'Para publicar hace falta al menos una fuente.',
  FUENTE_SIN_TEXTO: 'Cada fuente necesita un texto que la identifique.',
  FUENTE_URL_INSEGURA: 'El enlace de una fuente debe empezar por http:// o https://.',
  SIN_FECHA: 'Para publicar hace falta la fecha de revisión.',
  FECHA_INVALIDA: 'La fecha de revisión no es válida.',
  FECHA_FUTURA: 'La fecha de revisión no puede ser posterior a hoy.',
  SIN_FECHA_VERIFICACION: 'Para publicar hace falta la fecha de verificación.',
  FECHA_VERIFICACION_INVALIDA: 'La fecha de verificación no es válida.',
  FECHA_VERIFICACION_FUTURA: 'La fecha de verificación no puede ser posterior a hoy.'
});

/**
 * Campos de fecha que cumplen RCN-02 y los mensajes de cada uno. Los modelos
 * eligen su campo con el plugin `publicable` (datos/modelos/comunes.js).
 */
const CAMPOS_FECHA = Object.freeze({
  fechaRevision: Object.freeze({
    sinFecha: MENSAJES.SIN_FECHA,
    invalida: MENSAJES.FECHA_INVALIDA,
    futura: MENSAJES.FECHA_FUTURA
  }),
  fechaVerificacion: Object.freeze({
    sinFecha: MENSAJES.SIN_FECHA_VERIFICACION,
    invalida: MENSAJES.FECHA_VERIFICACION_INVALIDA,
    futura: MENSAJES.FECHA_VERIFICACION_FUTURA
  })
});

/** Mensajes del campo de fecha; un nombre que no esta en CAMPOS_FECHA es un error de programacion. */
function mensajesDeFecha(campoFecha) {
  const mensajes = CAMPOS_FECHA[campoFecha];
  if (!mensajes) throw new Error(`Campo de fecha desconocido: ${campoFecha}`);
  return mensajes;
}

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

/**
 * @param {string} campoFecha `fechaRevision` (por defecto) o `fechaVerificacion`:
 *   solo cambia el texto de los mensajes
 */
function validarFechaRevision(fecha, ahora = new Date(), campoFecha = 'fechaRevision') {
  const mensajes = mensajesDeFecha(campoFecha);
  if (fecha === undefined || fecha === null || fecha === '') return [mensajes.sinFecha];
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return [mensajes.invalida];
  const hoy = new Date(`${hoyEnColombia(ahora)}T00:00:00Z`);
  if (numeroDeDia(valor) > numeroDeDia(hoy)) return [mensajes.futura];
  return [];
}

/**
 * Errores que impiden guardar el documento con su estado actual. Un borrador
 * no tiene que cumplir las reglas de publicacion.
 * @param {{campoFecha?: string}} opciones campo de la fecha de RCN-02
 * @returns {{campo: string, mensaje: string}[]}
 */
function validarPublicacion(doc, ahora = new Date(), { campoFecha = 'fechaRevision' } = {}) {
  if (!doc || doc.estado !== ESTADOS.PUBLICADO) return [];
  return [
    ...validarFuentes(doc.fuentes).map((mensaje) => ({ campo: 'fuentes', mensaje })),
    ...validarFechaRevision(doc[campoFecha], ahora, campoFecha).map((mensaje) => ({ campo: campoFecha, mensaje }))
  ];
}

module.exports = {
  MENSAJES,
  CAMPOS_FECHA,
  mensajesDeFecha,
  esUrlSegura,
  validarFuentes,
  validarFechaRevision,
  validarPublicacion,
  hoyEnColombia
};
