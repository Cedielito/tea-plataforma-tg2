/**
 * Registro de una pantalla auditada con axe-core (T10, RA-01 a RA-11). Lógica
 * pura: la usan accesibilidad.spec.js, que escribe un registro por pantalla y
 * variante, y resumen.js, que los agrupa.
 *
 * - Reglas: las de WCAG 2.0 y 2.1, niveles A y AA (ETIQUETAS_WCAG), y las
 *   buenas prácticas de axe (best-practice), que se informan aparte. La meta
 *   de T10 (0 violaciones críticas o graves) vale para las dos.
 * - Severidad: la de axe (`impact`): critical, serious, moderate o minor; en
 *   el documento, crítica, grave, moderada o menor.
 * - Incompletas: lo que axe no pudo decidir solo (por ejemplo, el contraste
 *   de un texto sobre un degradado). No son violaciones: se revisan a mano y
 *   el resultado va en docs/evaluacion/accesibilidad.md.
 * - Desbordamiento: si la página se desplaza a lo ancho (RA-05, criterio 1.4.10),
 *   que axe no revisa.
 * - Entorno: las clases de <html> y el ancho de la ventana al auditar, como
 *   constancia de que la variante (alto contraste, 320 px) estaba aplicada.
 */

export const ETIQUETAS_WCAG = Object.freeze(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
export const ETIQUETA_PRACTICAS = 'best-practice';
export const ETIQUETAS_AXE = Object.freeze([...ETIQUETAS_WCAG, ETIQUETA_PRACTICAS]);

export const SEVERIDADES = Object.freeze(['critical', 'serious', 'moderate', 'minor']);
export const NOMBRES_SEVERIDAD = Object.freeze({
  critical: 'Crítica',
  serious: 'Grave',
  moderate: 'Moderada',
  minor: 'Menor'
});

/** Las que la meta de T10 deja en 0. */
export const esGrave = (severidad) => severidad === 'critical' || severidad === 'serious';

/** Criterios de WCAG de una regla, a partir de sus etiquetas (wcag143 → 1.4.3). */
export function criteriosDe(etiquetas = []) {
  return etiquetas
    .map((etiqueta) => /^wcag(\d)(\d)(\d+)$/.exec(etiqueta))
    .filter(Boolean)
    .map(([, principio, pauta, criterio]) => `${principio}.${pauta}.${criterio}`);
}

/** Nivel de la regla: WCAG si alguna etiqueta es de ETIQUETAS_WCAG; si no, buena práctica. */
export const nivelDe = (etiquetas = []) => (etiquetas.some((e) => ETIQUETAS_WCAG.includes(e)) ? 'wcag' : 'practica');

const recortar = (texto, largo = 300) => (texto && texto.length > largo ? `${texto.slice(0, largo)}…` : texto);

const resultadoDeRegla = (v) => ({
  regla: v.id,
  severidad: v.impact,
  nivel: nivelDe(v.tags),
  criterios: criteriosDe(v.tags),
  ayuda: v.help,
  enlace: v.helpUrl,
  nodos: v.nodes.map((n) => ({
    selector: (n.target ?? []).join(' '),
    html: recortar(n.html),
    resumen: recortar(n.failureSummary, 600)
  }))
});

/**
 * @param {{pantalla: string, variante: string, url: string, resultados: object,
 *   desbordamiento?: object|null, entorno?: {clasesHtml: string, anchoVentana: number}|null}} datos
 *   resultados: lo que devuelve AxeBuilder.analyze()
 */
export function registroDePantalla({ pantalla, variante, url, resultados, desbordamiento = null, entorno = null }) {
  return {
    pantalla,
    variante,
    url,
    versionAxe: resultados.testEngine?.version ?? null,
    entorno,
    violaciones: resultados.violations.map(resultadoDeRegla),
    incompletas: resultados.incomplete.map(resultadoDeRegla),
    aprobadas: resultados.passes.length,
    desbordamiento
  };
}

/** Se evalúa en la página: clases de <html> y ancho de la ventana. */
export function medirEntorno() {
  return { clasesHtml: document.documentElement.className, anchoVentana: document.documentElement.clientWidth };
}

/**
 * Se evalúa en la página: si se desplaza a lo ancho y qué elementos se salen
 * por la derecha (los primeros cinco, para corregirlos).
 */
export function medirDesbordamiento() {
  const ancho = document.documentElement.clientWidth;
  const total = document.documentElement.scrollWidth;
  if (total <= ancho) return null;
  const fuera = [];
  for (const elemento of document.body.querySelectorAll('*')) {
    const caja = elemento.getBoundingClientRect();
    if (caja.width > 0 && caja.right > ancho + 1) {
      const clase = typeof elemento.className === 'string' && elemento.className ? `.${elemento.className.trim().split(/\s+/).join('.')}` : '';
      fuera.push(`${elemento.tagName.toLowerCase()}${clase} (${Math.round(caja.right)} px)`);
      if (fuera.length === 5) break;
    }
  }
  return { anchoVentana: ancho, anchoPagina: total, elementos: fuera };
}
