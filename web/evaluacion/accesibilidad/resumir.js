/**
 * Resume la auditoría de accesibilidad y rendimiento (T10, RA-01 a RA-11,
 * M-01 a M-09): lee los
 * registros de axe (resultados/axe/<variante>/*.json) y de Lighthouse
 * (resultados/lighthouse/*.json), escribe resultados/resumen.md y
 * resultados/resumen.json y muestra el Markdown, listo para
 * docs/evaluacion/accesibilidad.md.
 *
 * Termina con código 1 si no se cumplen las metas (resumen.js, cumpleMetas).
 *
 * Uso: node evaluacion/accesibilidad/resumir.js [carpeta de resultados]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cumpleMetas, informeMarkdown, resumirAxe, resumirLighthouse } from './resumen.js';
import { PAGINAS_LIGHTHOUSE } from './paginas.js';

const leerJson = (archivo) => JSON.parse(readFileSync(archivo, 'utf8'));
const jsonDe = (carpeta) =>
  existsSync(carpeta)
    ? readdirSync(carpeta)
        .filter((nombre) => nombre.endsWith('.json'))
        .map((nombre) => leerJson(join(carpeta, nombre)))
    : [];

export function leerResultados(carpeta) {
  const carpetaAxe = join(carpeta, 'axe');
  const axe = existsSync(carpetaAxe)
    ? readdirSync(carpetaAxe)
        .filter((variante) => statSync(join(carpetaAxe, variante)).isDirectory())
        .flatMap((variante) => jsonDe(join(carpetaAxe, variante)))
    : [];
  return { axe, lighthouse: jsonDe(join(carpeta, 'lighthouse')) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const carpeta = process.argv[2] || process.env.ACCESIBILIDAD_SALIDA || fileURLToPath(new URL('./resultados/', import.meta.url));
  const registros = leerResultados(carpeta);
  const axe = resumirAxe(registros.axe);
  const lighthouse = resumirLighthouse(registros.lighthouse, PAGINAS_LIGHTHOUSE);
  const markdown = informeMarkdown(axe, lighthouse);
  writeFileSync(join(carpeta, 'resumen.md'), markdown);
  writeFileSync(join(carpeta, 'resumen.json'), `${JSON.stringify({ axe, lighthouse }, null, 2)}\n`);
  console.log(markdown);
  if (!cumpleMetas(axe, lighthouse).todas) process.exitCode = 1;
}
