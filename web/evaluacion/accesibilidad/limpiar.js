/**
 * Preparación global de la auditoría con axe (T10, RA-01 a RA-11): borra los
 * registros de una corrida anterior (resultados/axe), para que resumir.js no
 * mezcle pantallas de builds distintos. Por eso las tres variantes se corren
 * juntas (`npm run accesibilidad:axe -w web`).
 */
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const carpetaDeResultados = () =>
  process.env.ACCESIBILIDAD_SALIDA || fileURLToPath(new URL('./resultados/', import.meta.url));

export default function limpiar() {
  rmSync(join(carpetaDeResultados(), 'axe'), { recursive: true, force: true });
}
