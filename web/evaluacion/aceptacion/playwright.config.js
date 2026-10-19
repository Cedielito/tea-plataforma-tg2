/**
 * Configuración de los casos de aceptación de extremo a extremo (T11,
 * HU-01 a HU-19, M-01 a M-09). No corre en el CI normal: se lanza a mano con
 * `npm run aceptacion -w web` después de `npm run build:web` (pasos en
 * docs/evaluacion/casos-aceptacion.md).
 *
 * - Reutiliza el servidor de la auditoría de T10
 *   (../accesibilidad/servidor.js): el build de la web y la API en el mismo
 *   origen, con MongoDB en memoria y la preparación del arranque real
 *   (contenidos de api/contenidos y las dos cuentas de prueba). Corre en otro
 *   puerto (4330) para no chocar con una auditoría abierta.
 * - Solo Chromium, en escritorio (1280 × 800). Los 320 px (HU-05) ya los
 *   recorre la auditoría de T10 en sus 74 pantallas.
 * - workers: 1: las pruebas comparten la base en memoria, el inicio de sesión
 *   tiene un límite de intentos por minuto y las de M-09 van en serie.
 * - Además de la lista, deja el reporte en resultados/aceptacion.json, que es
 *   la evidencia de la columna «Resultado obtenido».
 *
 * Variables: CHROMIUM_EJECUTABLE (otro Chromium ya instalado; en el
 * contenedor de Claude Code, /opt/pw-browsers/chromium), PUERTO_ACEPTACION
 * (4330) y ACEPTACION_VISIBLE=1 (con ventana).
 */
import { defineConfig } from '@playwright/test';

const puerto = Number(process.env.PUERTO_ACEPTACION) || 4330;

const chromium = process.env.CHROMIUM_EJECUTABLE
  ? { launchOptions: { executablePath: process.env.CHROMIUM_EJECUTABLE } }
  : { channel: 'chromium' };

export default defineConfig({
  testDir: '.',
  testMatch: 'aceptacion.spec.js',
  outputDir: 'resultados/playwright',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // La aplicación de M-09 recorre las dos tareas completas (74 ensayos).
  timeout: 6 * 60 * 1000,
  reporter: [['list'], ['json', { outputFile: 'resultados/aceptacion.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${puerto}`,
    headless: process.env.ACEPTACION_VISIBLE !== '1',
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    ...chromium
  },
  webServer: {
    command: 'node ../accesibilidad/servidor.js',
    url: `http://127.0.0.1:${puerto}/api/salud`,
    env: { PUERTO_ACCESIBILIDAD: String(puerto) },
    reuseExistingServer: false,
    timeout: 2 * 60 * 1000
  }
});
