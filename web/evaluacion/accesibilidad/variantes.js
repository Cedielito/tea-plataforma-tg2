/**
 * Variantes de la interfaz en las que se audita cada pantalla (T10, RA-01 a
 * RA-11, M-07).
 *
 * - normal: escritorio de 1280 × 800, sin ajustes.
 * - alto-contraste: el ajuste «Alto contraste» de la barra de accesibilidad.
 *   Se deja en sessionStorage antes de que cargue la página, con la misma
 *   clave que usa la web (CLAVE_AJUSTES en src/accesibilidad/ajustes.js), así
 *   que el script en línea de index.html lo aplica antes del primer pintado.
 * - 320-px: 320 × 640, el ancho mínimo de RA-05 (criterio 1.4.10 de WCAG,
 *   «Reajuste»: equivale a 1280 px con un zoom del 400 %). Además de axe, se
 *   comprueba que no haya desplazamiento horizontal.
 */
import { AJUSTES_INICIALES, CLAVE_AJUSTES } from '../../src/accesibilidad/ajustes.js';

export const VARIANTES = Object.freeze({
  normal: Object.freeze({ nombre: 'normal', viewport: Object.freeze({ width: 1280, height: 800 }), ajustes: null }),
  altoContraste: Object.freeze({
    nombre: 'alto-contraste',
    viewport: Object.freeze({ width: 1280, height: 800 }),
    ajustes: Object.freeze({ ...AJUSTES_INICIALES, altoContraste: true })
  }),
  angosta: Object.freeze({ nombre: '320-px', viewport: Object.freeze({ width: 320, height: 640 }), ajustes: null })
});

/** @returns {typeof VARIANTES[keyof typeof VARIANTES]} */
export function varianteDe(nombre) {
  const variante = Object.values(VARIANTES).find((v) => v.nombre === nombre);
  if (!variante) throw new Error(`Variante desconocida: ${nombre}`);
  return variante;
}

/**
 * Script para page.addInitScript: deja los ajustes de la variante en
 * sessionStorage antes de que cargue la web. Sin ajustes, no hace nada.
 */
export function scriptDeAjustes(variante) {
  if (!variante.ajustes) return null;
  return `try { sessionStorage.setItem(${JSON.stringify(CLAVE_AJUSTES)}, ${JSON.stringify(JSON.stringify(variante.ajustes))}); } catch {}`;
}
