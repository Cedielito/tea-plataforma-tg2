/**
 * Páginas públicas principales que se miden con Lighthouse (T10, M-01 a
 * M-06): el inicio, las ocho secciones y las tres páginas del pie, en el
 * orden del sitio (secciones.js). Lo usan lighthouse.js y resumir.js.
 */
import { PAGINAS_PIE, SECCIONES } from '../../src/secciones.js';

export const PAGINAS_LIGHTHOUSE = Object.freeze(['/', ...SECCIONES.map((s) => s.ruta), ...PAGINAS_PIE.map((p) => p.ruta)]);
