/**
 * Servidor de la auditoría de accesibilidad y rendimiento (T10, RA-01 a
 * RA-11, M-01 a M-09). Sirve el build de la web (web/dist, con
 * `npm run build:web`) y monta la API de api/src/api/servidor.js en el mismo
 * origen, como Vercel y Render en producción.
 *
 * A diferencia del servidor de T16, este sí necesita datos: levanta MongoDB en
 * memoria (mongodb-memory-server, de las pruebas de api/) y corre la misma
 * preparación del arranque real (prepararArranque en api/src/index.js), que
 * carga los contenidos de api/contenidos y crea dos cuentas de prueba (CUENTAS,
 * solo para esta base en memoria, que se borra al cerrar).
 *
 * Los archivos del build se envían comprimidos con brotli o gzip (zlib de
 * Node), como los entrega Vercel: sin compresión, Lighthouse mediría un
 * JavaScript tres veces más pesado que el real.
 *
 * Puerto: PUERTO_ACCESIBILIDAD (por defecto 4329). Lo levanta Playwright
 * (playwright.config.js) o lighthouse.js antes de medir.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const PUERTO_POR_DEFECTO = 4329;

/** Cuentas de la base en memoria. No existen en ningún otro lugar. */
export const CUENTAS = Object.freeze({
  administrador: Object.freeze({ usuario: 'auditoria.admin', clave: 'clave de la auditoria de accesibilidad' }),
  profesional: Object.freeze({ usuario: 'auditoria.profesional', clave: 'clave de la auditoria de accesibilidad' })
});

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

const TIPOS = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
});

/** Las fuentes y las imágenes ya vienen comprimidas. */
const COMPRIMIBLES = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt', '.webmanifest']);

function archivosDe(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivosDe(ruta) : [ruta];
  });
}

/**
 * Lee el build una vez y prepara cada archivo con sus versiones comprimidas.
 * @returns {Map<string, {tipo: string, crudo: Buffer, br?: Buffer, gzip?: Buffer}>} por ruta web (/assets/...)
 */
export function leerBuild(carpeta = DIST) {
  const build = new Map();
  for (const archivo of archivosDe(carpeta)) {
    const extension = extname(archivo);
    const crudo = readFileSync(archivo);
    const entrada = { tipo: TIPOS[extension] || 'application/octet-stream', crudo };
    if (COMPRIMIBLES.has(extension)) {
      entrada.br = brotliCompressSync(crudo, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      entrada.gzip = gzipSync(crudo, { level: 9 });
    }
    build.set(`/${relative(carpeta, archivo).split(sep).join('/')}`, entrada);
  }
  return build;
}

/** Codificación que se envía según Accept-Encoding: brotli, gzip o ninguna. */
export function codificacionPara(aceptadas = '', entrada) {
  if (!entrada.br) return null;
  const lista = aceptadas.split(',').map((parte) => parte.trim().split(';')[0]);
  if (lista.includes('br')) return 'br';
  if (lista.includes('gzip')) return 'gzip';
  return null;
}

function enviar(req, res, entrada, { inmutable }) {
  const codificacion = codificacionPara(req.headers['accept-encoding'], entrada);
  res.set('Content-Type', entrada.tipo);
  res.set('Vary', 'Accept-Encoding');
  // Los archivos de /assets llevan un hash en el nombre (Vite): se guardan sin preguntar.
  res.set('Cache-Control', inmutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
  if (codificacion) res.set('Content-Encoding', codificacion);
  res.send(codificacion ? entrada[codificacion] : entrada.crudo);
}

/**
 * Prepara la base en memoria, carga los datos y devuelve la aplicación.
 * @returns {Promise<{app: import('express').Express, cerrar: () => Promise<void>}>}
 */
export async function crearServidorAuditoria({ registro = { log() {}, info() {}, warn() {}, error: console.error } } = {}) {
  const requerirApi = createRequire(new URL('../../../api/package.json', import.meta.url));
  const express = requerirApi('express');
  const mongoose = requerirApi('mongoose');
  const { MongoMemoryServer } = requerirApi('mongodb-memory-server');
  const { crearServidor } = requerirApi('./src/api/servidor.js');
  const { prepararArranque } = requerirApi('./src/index.js');
  if (!existsSync(`${DIST}index.html`)) {
    throw new Error('No está el build de la web: corre antes «npm run build:web».');
  }

  const base = await MongoMemoryServer.create();
  const entorno = {
    ADMIN_USUARIO: CUENTAS.administrador.usuario,
    ADMIN_CLAVE: CUENTAS.administrador.clave,
    PROFESIONAL_USUARIO: CUENTAS.profesional.usuario,
    PROFESIONAL_CLAVE: CUENTAS.profesional.clave
  };
  await prepararArranque({ uri: base.getUri('tea_auditoria'), entorno, registro });

  const build = leerBuild();
  const indice = build.get('/index.html');
  const app = express();
  app.disable('x-powered-by');
  app.use(crearServidor({ registro }));
  app.get('*', (req, res) => {
    const entrada = build.get(req.path);
    // Aplicación de una sola página: las rutas que no son archivos sirven index.html.
    if (entrada) enviar(req, res, entrada, { inmutable: req.path.startsWith('/assets/') });
    else enviar(req, res, indice, { inmutable: false });
  });

  async function cerrar() {
    await mongoose.disconnect();
    await base.stop();
  }
  return { app, cerrar };
}

/**
 * Levanta el servidor en 127.0.0.1.
 * @returns {Promise<{url: string, cerrar: () => Promise<void>}>}
 */
export async function levantarServidorAuditoria(puerto = Number(process.env.PUERTO_ACCESIBILIDAD) || PUERTO_POR_DEFECTO) {
  const { app, cerrar } = await crearServidorAuditoria();
  const servidor = await new Promise((ok) => {
    const escuchando = app.listen(puerto, '127.0.0.1', () => ok(escuchando));
  });
  return {
    url: `http://127.0.0.1:${puerto}`,
    async cerrar() {
      await new Promise((ok) => servidor.close(ok));
      await cerrar();
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url, cerrar } = await levantarServidorAuditoria();
  console.log(`Auditoría de accesibilidad: ${url}`);
  const salir = () => cerrar().finally(() => process.exit(0));
  process.on('SIGINT', salir);
  process.on('SIGTERM', salir);
}
