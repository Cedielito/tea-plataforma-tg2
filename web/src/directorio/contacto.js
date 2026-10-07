/**
 * Enlaces de contacto de las entidades del directorio (M-04, RF-05; RA-05).
 *
 * - Teléfono: enlace tel: con solo los dígitos del número principal. Con
 *   «, ext. 300», el enlace marca el número principal y el texto muestra la
 *   extensión.
 * - WhatsApp: los números terminan en «(WhatsApp)» (api/contenidos/README.md).
 *   El enlace va a https://wa.me/57 + el número y dice «Escribir por WhatsApp
 *   al 300 754 8933». Es un enlace que la persona decide tocar: la página no
 *   carga nada de terceros (RS-01).
 * - Sitio web: solo http(s); el texto del enlace es el dominio, más corto que
 *   la dirección completa.
 *
 * Funciones puras, sin React, para probarlas con node --test (contacto.test.js).
 */
import { esEnlaceWeb } from '../utilidades/formato.js';

const SUFIJO_WHATSAPP = /\s*\(whatsapp\)\s*$/i;
const EXTENSION = /,?\s*ext\.?\s*\d+\s*$/i;
const soloDigitos = (texto) => texto.replace(/\D/g, '');

/** Celular colombiano: 10 dígitos que empiezan por 3. */
const esCelular = (digitos) => /^3\d{9}$/.test(digitos);

/**
 * @param {string} telefono como está en la entidad: «(601) 330 5000»,
 *   «(604) 384 9999, ext. 300» o «300 754 8933 (WhatsApp)»
 * @returns {{texto: string, href: string|null, whatsapp: boolean}} sin href,
 *   el número se muestra como texto
 */
export function enlaceDeTelefono(telefono) {
  const texto = typeof telefono === 'string' ? telefono.trim() : '';
  if (SUFIJO_WHATSAPP.test(texto)) {
    const numero = texto.replace(SUFIJO_WHATSAPP, '');
    const digitos = soloDigitos(numero);
    if (!esCelular(digitos)) return { texto, href: null, whatsapp: true };
    return { texto: `Escribir por WhatsApp al ${numero}`, href: `https://wa.me/57${digitos}`, whatsapp: true };
  }
  const digitos = soloDigitos(texto.replace(EXTENSION, ''));
  return { texto, href: digitos ? `tel:${digitos}` : null, whatsapp: false };
}

/** @returns {{texto: string, href: string} | null} dominio del sitio web, o null si no es http(s) */
export function enlaceDeSitioWeb(url) {
  if (!esEnlaceWeb(url)) return null;
  try {
    return { texto: new URL(url.trim()).hostname, href: url.trim() };
  } catch {
    return null;
  }
}
