/**
 * Configuración de la auditoría de accesibilidad con axe-core (T10, RA-01 a
 * RA-11). No corre en el CI normal: se lanza a mano con
 * `npm run accesibilidad -w web` después de `npm run build:web` (pasos en
 * docs/evaluacion/accesibilidad.md).
 *
 * - Un proyecto por variante de la interfaz: normal (1280 × 800), alto
 *   contraste (el ajuste de la barra de accesibilidad, M-07) y 320 px de
 *   ancho (RA-05, criterio 1.4.10 de WCAG). La variante llega a la prueba como
 *   la opción `variante` (accesibilidad.spec.js).
 * - Solo Chromium: axe revisa el DOM y los estilos calculados, que no cambian
 *   entre motores para estas reglas. Usa el navegador completo sin pantalla
 *   (channel 'chromium'); CHROMIUM_EJECUTABLE usa otro Chromium ya instalado.
 * - workers: 1: las variantes comparten el servidor y su base en memoria, y
 *   el inicio de sesión tiene un límite de intentos por minuto.
 * - Antes de empezar se borran los registros de la corrida anterior
 *   (limpiar.js).
 *
 * Variables: ACCESIBILIDAD_SALIDA (carpeta de los resultados, resultados/),
 * ACCESIBILIDAD_VISIBLE=1 (con ventana) y PUERTO_ACCESIBILIDAD (4329).
 */
import { defineConfig } from '@playwright/test';
import { PUERTO_POR_DEFECTO } from './servidor.js';
import { VARIANTES } from './variantes.js';

const puerto = Number(process.env.PUERTO_ACCESIBILIDAD) || PUERTO_POR_DEFECTO;

const chromium = process.env.CHROMIUM_EJECUTABLE
  ? { launchOptions: { executablePath: process.env.CHROMIUM_EJECUTABLE } }
  : { channel: 'chromium' };

export default defineConfig({
  testDir: '.',
  testMatch: 'accesibilidad.spec.js',
  globalSetup: './limpiar.js',
  outputDir: 'resultados/playwright',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // La aplicación de M-09 recorre las dos tareas completas (74 ensayos).
  timeout: 6 * 60 * 1000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${puerto}`,
    headless: process.env.ACCESIBILIDAD_VISIBLE !== '1',
    browserName: 'chromium',
    ...chromium
  },
  projects: Object.values(VARIANTES).map((variante) => ({
    name: variante.nombre,
    use: { variante: variante.nombre, viewport: variante.viewport }
  })),
  webServer: {
    command: 'node servidor.js',
    url: `http://127.0.0.1:${puerto}/api/salud`,
    env: { PUERTO_ACCESIBILIDAD: String(puerto) },
    reuseExistingServer: false,
    timeout: 2 * 60 * 1000
  }
});
