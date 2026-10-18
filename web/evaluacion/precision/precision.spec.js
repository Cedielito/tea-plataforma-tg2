/**
 * Experimento de precisión temporal del registro conductual (M-09, CT-07,
 * T16). Una prueba por celda: motor (el proyecto de Playwright) × reloj
 * ('animacion', 'referencia') × carga ('normal', 'hilo-ocupado' y, solo en
 * Chromium, 'cpu-x4'). En cada celda se aplican PRECISION_SESIONES sesiones
 * de /registro/prueba (cada una con las dos tareas: 74 ensayos con la
 * práctica) y se escribe un CSV con una fila por ensayo (medicion.js).
 *
 * Por sesión:
 * 1. Contexto nuevo; con 'cpu-x4', Emulation.setCPUThrottlingRate por CDP.
 * 2. El arnés (arnes.js) entra antes que la web; la página avisa a Node por
 *    un binding cuando aparece un estímulo, cuando hay un botón «Continuar»
 *    y cuando está el enlace «Descargar JSON».
 * 3. Con cada aparición, Node presiona F o J a la latencia programada
 *    (planDeRespuestas); con cada botón, hace clic. Node no consulta la
 *    página durante los ensayos.
 * 4. Al final lee el JSON que ofrece «Descargar JSON» y los registros del
 *    arnés, los empareja ensayo por ensayo (comprobarEmparejamiento) y arma
 *    las filas.
 */
import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { AVISO, CARGAS, scriptDeArnes, TAREAS_LARGAS } from './arnes.js';
import { aCsv } from './csv.js';
import { COLUMNAS, comprobarEmparejamiento, filaDeEnsayo, LATENCIAS_MS, planDeRespuestas } from './medicion.js';

const requerir = createRequire(import.meta.url);
const versiones = requerir('../../../api/src/dominio/registro/version.js');

const RELOJES = Object.freeze(['animacion', 'referencia']);
const SESIONES = Number(process.env.PRECISION_SESIONES) || 3;
const TAREA = process.env.PRECISION_TAREA || null;
const SEMILLA = Number(process.env.PRECISION_SEMILLA) || 20261024;
const SALIDA = process.env.PRECISION_SALIDA || fileURLToPath(new URL('./resultados/', import.meta.url));
/** Sin ningún aviso de la página en este tiempo, la sesión se da por trabada. */
const MS_SIN_AVISOS = 30 * 1000;
/** Más ensayos de los que tiene una sesión (74). */
const MAXIMO_ENSAYOS = 200;

function commit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Aplica una sesión y devuelve sus filas.
 * @param {import('@playwright/test').Browser} browser
 */
async function aplicarSesion(browser, { baseURL, celda }) {
  const contexto = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  const page = await contexto.newPage();
  try {
    if (celda.carga === CARGAS.CPU_X4) {
      const cdp = await contexto.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }

    const programados = planDeRespuestas(celda.semilla, MAXIMO_ENSAYOS);
    const fallas = [];
    let ultimoAviso = Date.now();
    let alTerminar;
    const terminada = new Promise((ok) => {
      alTerminar = ok;
    });
    let clics = Promise.resolve();

    await page.exposeBinding(AVISO, (_fuente, aviso) => {
      ultimoAviso = Date.now();
      if (aviso.tipo === 'aparicion') {
        const { latenciaMs, tecla } = programados[aviso.indice];
        setTimeout(() => page.keyboard.press(tecla).catch((e) => fallas.push(e)), latenciaMs);
      } else if (aviso.tipo === 'pantalla') {
        clics = clics.then(() => page.locator('button.tarea__continuar').click()).catch((e) => fallas.push(e));
      } else if (aviso.tipo === 'fin') {
        alTerminar();
      }
    });
    await page.addInitScript({ content: scriptDeArnes({ carga: celda.carga, semillaCarga: celda.semilla }) });

    const parametros = new URLSearchParams({ semilla: String(celda.semilla), reloj: celda.reloj });
    if (TAREA) parametros.set('tarea', TAREA);

    let vigilante;
    const trabada = new Promise((_ok, falla) => {
      vigilante = setInterval(() => {
        if (fallas.length) falla(fallas[0]);
        else if (Date.now() - ultimoAviso > MS_SIN_AVISOS) falla(new Error('La sesión dejó de avanzar.'));
      }, 1000);
    });
    try {
      await page.goto(`/registro/prueba?${parametros}`);
      await Promise.race([terminada, trabada]);
    } finally {
      clearInterval(vigilante);
    }

    const { sesionWeb, arnes } = await page.evaluate(async () => {
      const respuesta = await fetch(document.querySelector('a[download]').href);
      return { sesionWeb: await respuesta.json(), arnes: window.__arnesPrecision };
    });
    if (sesionWeb.reloj !== celda.reloj || sesionWeb.semilla !== celda.semilla) {
      throw new Error('La página no usó el reloj o la semilla pedidos.');
    }
    comprobarEmparejamiento(arnes.ensayos, sesionWeb.ensayos, programados);
    return sesionWeb.ensayos.map((ensayo, i) =>
      filaDeEnsayo({ celda, registro: arnes.ensayos[i], ensayo, programado: programados[i], tareasLargas: arnes.tareasLargas })
    );
  } finally {
    await contexto.close();
  }
}

test.beforeAll(async ({ browser, browserName }) => {
  mkdirSync(SALIDA, { recursive: true });
  const cpus = os.cpus();
  const metadatos = {
    motor: browserName,
    versionMotor: browser.version(),
    versionPlaywright: requerir('@playwright/test/package.json').version,
    versionNode: process.version,
    sistema: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: cpus.length ? cpus[0].model : null,
    nucleos: cpus.length,
    memoriaGB: Math.round(os.totalmem() / 1024 ** 3),
    versionCatalogo: versiones.VERSION_CATALOGO,
    versionAlgoritmo: versiones.VERSION_ALGORITMO,
    commit: commit(),
    fecha: new Date().toISOString().slice(0, 10),
    sesionesPorCelda: SESIONES,
    tarea: TAREA || 'cambio-regla y navon',
    semillaPrimeraSesion: SEMILLA,
    latenciasMs: LATENCIAS_MS,
    tareasLargas: TAREAS_LARGAS
  };
  writeFileSync(`${SALIDA}/metadatos-${browserName}.json`, `${JSON.stringify(metadatos, null, 2)}\n`);
});

for (const reloj of RELOJES) {
  for (const carga of Object.values(CARGAS)) {
    test(`CT-07 ${reloj} · ${carga}`, async ({ browser, browserName, baseURL }) => {
      test.skip(carga === CARGAS.CPU_X4 && browserName !== 'chromium', 'La CPU ralentizada por CDP solo existe en Chromium.');
      const filas = [];
      for (let sesion = 1; sesion <= SESIONES; sesion += 1) {
        const celda = { motor: browserName, versionMotor: browser.version(), reloj, carga, sesion, semilla: SEMILLA + sesion - 1 };
        filas.push(...(await aplicarSesion(browser, { baseURL, celda })));
      }
      writeFileSync(`${SALIDA}/precision-${browserName}-${reloj}-${carga}.csv`, aCsv(COLUMNAS, filas));
    });
  }
}
