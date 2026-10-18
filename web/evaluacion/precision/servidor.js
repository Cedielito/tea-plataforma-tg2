/**
 * Servidor del experimento de precisión temporal (M-09, CT-07, T16). Sirve
 * el build de la web (web/dist, con `npm run build:web`) y monta la API de
 * api/src/api/servidor.js en el mismo origen, como Vercel y Render en
 * producción. La página de prueba solo pide el plan (GET
 * /api/registro/plan), que no usa la base: el servidor arranca sin MongoDB.
 *
 * Puerto: PUERTO_PRECISION (por defecto 4319). Lo levanta Playwright
 * (playwright.config.js) antes de las pruebas.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PUERTO_POR_DEFECTO = 4319;

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

export function crearServidorPrecision() {
  const requerirApi = createRequire(new URL('../../../api/package.json', import.meta.url));
  const express = requerirApi('express');
  const { crearServidor } = requerirApi('./src/api/servidor.js');
  if (!existsSync(`${DIST}index.html`)) {
    throw new Error('No está el build de la web: corre antes «npm run build:web».');
  }
  const app = express();
  app.disable('x-powered-by');
  app.use(crearServidor({ registro: { info() {}, warn() {}, error: console.error } }));
  app.use(express.static(DIST));
  // Aplicación de una sola página: /registro/prueba y las demás rutas sirven index.html.
  app.get('*', (_req, res) => res.sendFile(`${DIST}index.html`));
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.env.PUERTO_PRECISION) || PUERTO_POR_DEFECTO;
  crearServidorPrecision().listen(puerto, '127.0.0.1', () => {
    console.log(`Experimento de precisión: http://127.0.0.1:${puerto}/registro/prueba`);
  });
}
