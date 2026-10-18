/**
 * Medición con Lighthouse en perfil móvil de las páginas públicas principales
 * (T10, RA-01 a RA-11, M-01 a M-06): accesibilidad y rendimiento. Metas:
 * accesibilidad ≥ 90 y rendimiento ≥ 80.
 *
 * - Lighthouse no es una dependencia del proyecto: corre con
 *   `npx lighthouse@12.8.2` (VERSION_LIGHTHOUSE), para no cargar el
 *   `npm ci` del CI. La primera vez npx lo descarga.
 * - Lighthouse se conecta con --port al Chromium que abre Playwright (el de
 *   la auditoría con axe; CHROMIUM_EJECUTABLE usa otro ya instalado).
 * - Perfil móvil, el predeterminado de Lighthouse: pantalla de un Moto G
 *   Power y red y CPU simuladas (RTT de 150 ms, 1,6 Mbit/s, CPU 4 veces más
 *   lenta). El servidor (servidor.js) sirve el build comprimido, como Vercel.
 * - Cada página se mide LIGHTHOUSE_CORRIDAS veces (3) y resumen.js informa la
 *   mediana: en un contenedor compartido el rendimiento varía entre corridas.
 *
 * Escribe resultados/lighthouse/<pagina>-<corrida>.json (lo que usa
 * resumen.js) y el informe completo en resultados/lighthouse/informes/.
 * Sin LIGHTHOUSE_PAGINAS, antes borra los de una corrida anterior; con ella,
 * borra y reemplaza solo los de esas páginas (todas sus corridas, para que la
 * mediana no mezcle builds). Borra después de levantar el servidor y el
 * navegador: si eso falla, lo anterior se conserva.
 *
 * Variables: LIGHTHOUSE_CORRIDAS (3), LIGHTHOUSE_PAGINAS (rutas separadas por
 * coma; sin ella, todas), ACCESIBILIDAD_SALIDA (resultados/),
 * PUERTO_LIGHTHOUSE (4339, el del servidor) y PUERTO_DEPURACION (9339, el de
 * Chromium).
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import { levantarServidorAuditoria } from './servidor.js';
import { registroDeLighthouse } from './resumen.js';
import { PAGINAS_LIGHTHOUSE } from './paginas.js';

export const VERSION_LIGHTHOUSE = '12.8.2';

const ejecutar = promisify(execFile);
const SALIDA = process.env.ACCESIBILIDAD_SALIDA || fileURLToPath(new URL('./resultados/', import.meta.url));
const CORRIDAS = Number(process.env.LIGHTHOUSE_CORRIDAS) || 3;
const PUERTO = Number(process.env.PUERTO_LIGHTHOUSE) || 4339;
const PUERTO_DEPURACION = Number(process.env.PUERTO_DEPURACION) || 9339;

const nombreDe = (ruta) => (ruta === '/' ? 'inicio' : ruta.slice(1).replaceAll('/', '-'));

/**
 * En Windows, npx es npx.cmd y solo se puede lanzar con shell: Node junta los
 * argumentos con espacios sin comillas, así que una ruta con espacios
 * («C:\Users\Ana María\...») se partiría. Allí van entre comillas.
 */
export function argumentosParaShell(argumentos, plataforma = process.platform) {
  if (plataforma !== 'win32') return argumentos;
  return argumentos.map((argumento) => (/[\s"]/.test(argumento) ? `"${argumento.replaceAll('"', '\\"')}"` : argumento));
}

async function medir(url, archivo) {
  const argumentos = [
    '--yes',
    `lighthouse@${VERSION_LIGHTHOUSE}`,
    url,
    `--port=${PUERTO_DEPURACION}`,
    '--only-categories=performance,accessibility',
    '--output=json',
    `--output-path=${archivo}`,
    '--max-wait-for-load=60000',
    '--quiet'
  ];
  await ejecutar('npx', argumentosParaShell(argumentos), {
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024
  });
  return JSON.parse(readFileSync(archivo, 'utf8'));
}

/** Borra las corridas anteriores de una página (registros e informes). */
function borrarCorridas(carpeta, pagina) {
  for (const sub of [carpeta, join(carpeta, 'informes')]) {
    if (!existsSync(sub)) continue;
    for (const nombre of readdirSync(sub)) {
      if (new RegExp(`^${pagina}-\\d+\\.json$`).test(nombre)) rmSync(join(sub, nombre));
    }
  }
}

async function principal() {
  const paginas = process.env.LIGHTHOUSE_PAGINAS ? process.env.LIGHTHOUSE_PAGINAS.split(',') : PAGINAS_LIGHTHOUSE;
  const carpeta = join(SALIDA, 'lighthouse');

  const servidor = await levantarServidorAuditoria(PUERTO);
  const navegador = await chromium.launch({
    ...(process.env.CHROMIUM_EJECUTABLE ? { executablePath: process.env.CHROMIUM_EJECUTABLE } : { channel: 'chromium' }),
    args: [`--remote-debugging-port=${PUERTO_DEPURACION}`]
  });
  try {
    if (!process.env.LIGHTHOUSE_PAGINAS) rmSync(carpeta, { recursive: true, force: true });
    mkdirSync(join(carpeta, 'informes'), { recursive: true });
    for (const ruta of paginas) {
      const pagina = nombreDe(ruta);
      borrarCorridas(carpeta, pagina);
      for (let corrida = 1; corrida <= CORRIDAS; corrida += 1) {
        const informe = await medir(`${servidor.url}${ruta}`, join(carpeta, 'informes', `${pagina}-${corrida}.json`));
        const registro = registroDeLighthouse({ pagina, ruta, corrida, informe });
        writeFileSync(join(carpeta, `${pagina}-${corrida}.json`), `${JSON.stringify(registro, null, 2)}\n`);
        console.log(
          `${ruta} (${corrida}/${CORRIDAS}): accesibilidad ${registro.accesibilidad}, rendimiento ${registro.rendimiento}`
        );
      }
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
