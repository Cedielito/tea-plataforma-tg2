/**
 * Configuración del experimento de precisión temporal (M-09, CT-07, T16). No
 * corre en el CI normal: lo lanza el flujo manual
 * .github/workflows/precision.yml, o a mano con `npm run precision -w web`
 * después de `npm run build:web` (pasos en docs/evaluacion/precision.md).
 *
 * - Un proyecto por motor (chromium, firefox, webkit). Chromium usa el
 *   navegador completo sin pantalla (channel 'chromium'), no el
 *   headless-shell. CHROMIUM_EJECUTABLE usa otro Chromium ya instalado.
 * - workers: 1: las celdas no corren al mismo tiempo, para que no compitan
 *   por la CPU.
 * - El servidor (servidor.js) sirve el build y la API en el mismo origen.
 *
 * Variables: PRECISION_SESIONES (sesiones por celda, 3), PRECISION_TAREA
 * (cambio-regla o navon; sin ella, las dos), PRECISION_SEMILLA (semilla de la
 * primera sesión), PRECISION_SALIDA (carpeta de los CSV, resultados/),
 * PRECISION_VISIBLE=1 (con ventana) y PUERTO_PRECISION (4319).
 */
import { defineConfig } from '@playwright/test';
import { PUERTO_POR_DEFECTO } from './servidor.js';

const puerto = Number(process.env.PUERTO_PRECISION) || PUERTO_POR_DEFECTO;
const sesiones = Number(process.env.PRECISION_SESIONES) || 3;

const chromium = process.env.CHROMIUM_EJECUTABLE
  ? { launchOptions: { executablePath: process.env.CHROMIUM_EJECUTABLE } }
  : { channel: 'chromium' };

export default defineConfig({
  testDir: '.',
  testMatch: 'precision.spec.js',
  outputDir: 'resultados/playwright',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // Cada sesión de las dos tareas dura cerca de 2 minutos; con la CPU ralentizada, algo más.
  timeout: sesiones * 6 * 60 * 1000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${puerto}`,
    headless: process.env.PRECISION_VISIBLE !== '1',
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', ...chromium } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ],
  webServer: {
    command: 'node servidor.js',
    url: `http://127.0.0.1:${puerto}/api/registro/plan`,
    env: { PUERTO_PRECISION: String(puerto) },
    reuseExistingServer: false,
    timeout: 60 * 1000
  }
});
