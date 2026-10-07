/**
 * Formatos compartidos por las páginas de contenido, el directorio y el
 * panel. RCN-01, RCN-02, RF-02, RF-05
 */

/**
 * La fecha de revisión es una fecha de calendario guardada a medianoche UTC:
 * se muestra en UTC para que en Colombia (UTC-5) no aparezca el día anterior.
 */
const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC'
});

const formatoDiaColombia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/**
 * Hoy en Colombia como AAAA-MM-DD: el máximo de la fecha de revisión en el
 * editor del panel, igual que valida la API (api/src/dominio/publicacion.js).
 */
export function hoyEnColombia(ahora = new Date()) {
  return formatoDiaColombia.format(ahora);
}

/** @returns {{iso: string, texto: string} | null} «2026-10-06» y «06/10/2026» */
export function fechaRevision(valor) {
  const fecha = new Date(valor);
  if (!valor || Number.isNaN(fecha.getTime())) return null;
  return { iso: fecha.toISOString().slice(0, 10), texto: formatoFecha.format(fecha) };
}

/** Solo enlaces http(s) absolutos: nunca javascript: ni otros esquemas. */
export const esEnlaceWeb = (url) => typeof url === 'string' && /^https?:\/\//i.test(url.trim());

/** Rutas del mismo sitio (/ruta-de-atencion), pero no //otro-dominio. */
export const esRutaInterna = (url) => typeof url === 'string' && /^\/(?![/\\])/.test(url);

/** «1 página», «3 páginas». */
export const contar = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

/** «a», «a y b», «a, b y c». */
export function unirConY(partes) {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * Letras y números de una búsqueda, sin tildes ni signos: la misma cuenta que
 * hace la API (api/src/dominio/busqueda.js) para exigir al menos 2.
 */
export function caracteresBuscables(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '').length;
}

const formatoFechaHoraColombia = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota'
});

const formatoDiaColombiaVisible = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Bogota'
});

/**
 * Un instante (no una fecha de calendario), como la llegada de un mensaje de
 * contacto (RF-11), en hora de Colombia.
 * @param {{conHora?: boolean}} opciones sin hora: solo el día, «30/03/2027»
 * @returns {{iso: string, texto: string} | null}
 */
export function fechaColombia(valor, { conHora = true } = {}) {
  const fecha = new Date(valor);
  if (!valor || Number.isNaN(fecha.getTime())) return null;
  const formato = conHora ? formatoFechaHoraColombia : formatoDiaColombiaVisible;
  return { iso: fecha.toISOString(), texto: formato.format(fecha) };
}
