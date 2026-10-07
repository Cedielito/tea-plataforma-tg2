/**
 * Lo que dice cada tarjeta de /recursos (M-05; RF-06, HU-09; RA-11): para quién
 * es y un enlace que dice qué abre y en qué sitio, por ejemplo «Descargar PDF
 * (minsalud.gov.co)» o «Abrir página oficial (who.int)». El nombre del sitio es
 * el dominio del enlace sin «www.»: lo que la persona verá al abrirlo. Lógica
 * pura, sin React, para probarla con node --test.
 */
import { esEnlaceWeb, esRutaInterna, unirConY } from '../utilidades/formato.js';

export const RUTA_RECURSOS = '/api/recursos';

/** En el orden del catálogo (api/src/dominio/catalogos.js), en plural para la frase. */
const DESTINATARIOS = [
  { valor: 'familia', plural: 'familias' },
  { valor: 'docente', plural: 'docentes' }
];

/** «Para familias y docentes», «Para docentes», o null si no trae perfiles conocidos. */
export function paraQuien(perfiles = []) {
  const elegidos = DESTINATARIOS.filter(({ valor }) => perfiles.includes(valor)).map(({ plural }) => plural);
  return elegidos.length > 0 ? `Para ${unirConY(elegidos)}` : null;
}

/** «https://www.minsalud.gov.co/…» → «minsalud.gov.co»; null si no es un enlace web. */
export function nombreDelSitio(url) {
  if (!esEnlaceWeb(url)) return null;
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** El archivo es un PDF si su ruta termina en .pdf, aunque lleve parámetros. */
function esPdf(url) {
  try {
    return /\.pdf$/i.test(new URL(url.trim(), 'https://sitio.local').pathname);
  } catch {
    return false;
  }
}

/**
 * Enlace de un recurso. Solo enlaces http(s) o archivos del mismo sitio
 * (/recursos/guia.pdf); cualquier otro esquema no se enlaza.
 * @returns {{href: string, texto: string, accion: string, sitio: string|null, pdf: boolean} | null}
 *   `accion` es la parte del texto sin el sitio; `sitio` es null en un archivo del mismo sitio
 */
export function enlaceDeRecurso({ tipo, url }) {
  if (!esEnlaceWeb(url) && !esRutaInterna(url)) return null;
  const pdf = esPdf(url);
  let accion = 'Abrir página oficial';
  if (tipo === 'archivo') accion = pdf ? 'Descargar PDF' : 'Descargar archivo';
  const sitio = nombreDelSitio(url);
  return { href: url.trim(), texto: sitio ? `${accion} (${sitio})` : accion, accion, sitio, pdf };
}
