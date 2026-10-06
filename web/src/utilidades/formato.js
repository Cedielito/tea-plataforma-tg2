/**
 * Formatos compartidos por las páginas de contenido. RCN-01, RCN-02, RF-02
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

/**
 * Letras y números de una búsqueda, sin tildes ni signos: la misma cuenta que
 * hace la API (api/src/dominio/busqueda.js) para exigir al menos 2.
 */
export function caracteresBuscables(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '').length;
}
