/**
 * Casos de aceptación de extremo a extremo (T11; HU-01 a HU-19; M-01 a M-09).
 *
 * Solo cubren lo que no tenía evidencia automática: casi todas las reglas ya
 * se prueban con Jest (api/test) y con node --test (web/src), pero no lo que
 * la persona ve en la pantalla. Cada `describe` lleva el código de su
 * historia; la relación completa entre historias, pruebas y resultados está
 * en docs/evaluacion/casos-aceptacion.md. HU-05, HU-08, HU-12, HU-14 y HU-16
 * no tienen prueba aquí: su evidencia automática ya existía.
 *
 * Corre sobre el build y la API con MongoDB en memoria, con el servidor de la
 * auditoría de T10 (playwright.config.js). Los textos esperados salen de la
 * API y de los módulos puros de la web (filtros, enlaces, formatos), no se
 * copian aquí. La aplicación de M-09 se recorre como un participante, solo
 * con el teclado; la medición (reloj.js, motorEnsayo.js) no se toca.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CUENTAS } from '../accesibilidad/servidor.js';
import { filtrarPasos } from '../../src/ruta/filtroPasos.js';
import { entidadesDelPaso, filtrarEntidades } from '../../src/directorio/filtroDirectorio.js';
import { enlaceDeRecurso } from '../../src/recursos/enlaceRecurso.js';
import { fechaRevision } from '../../src/utilidades/formato.js';
import { valorObservado } from '../../src/registro/formatoValores.js';
import { AVISO_REGISTRO, ENTRE_TAREAS } from '../../src/registro/textos.js';
import { APLICACION, DETALLE, ELIMINAR, LISTA, SUS } from '../../src/registro/textosProfesional.js';
import { buscarVocabularioProhibido } from '../../../api/src/dominio/registro/vocabularioProhibido.js';
import { contieneDatoIdentificable } from '../../../api/src/dominio/registro/seudonimo.js';
import versiones from '../../../api/src/dominio/registro/version.js';

/** RCN-03: el texto literal de AvisoNoDiagnostico.jsx (no se importa: es JSX). */
const AVISO_NO_DIAGNOSTICO = 'Esta información no constituye diagnóstico ni sustituye la valoración profesional.';

/** Tarea T3 del Cuadro B.1: una madre, una hija de 10 años y el régimen subsidiado. */
const CASO_RUTA = Object.freeze({ perfil: 'familia', tramo: '8-12', regimen: 'subsidiado' });

const FORMATO_SEUDONIMO = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;

// version.js exporta un objeto congelado: Node no ve sus nombres como exportaciones.
const { VERSION_ALGORITMO } = versiones;

/* ---------- Ayudas ---------- */

/** Espera a que la página termine de pedir datos (el mismo criterio de T10). */
async function esperarLista(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !document.querySelector('main')?.textContent.includes('Estamos cargando'));
}

async function visitar(page, ruta) {
  await page.goto(ruta);
  await esperarLista(page);
}

async function iniciarSesion(page, { usuario, clave }) {
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  await esperarLista(page);
}

async function leerApi(page, ruta) {
  const respuesta = await page.request.get(ruta);
  expect(respuesta.ok(), `GET ${ruta}`).toBe(true);
  return respuesta.json();
}

/** Lo que la persona ve en <main>, en una sola línea. */
const textoVisible = (locator) => locator.innerText().then((texto) => texto.replace(/\s+/g, ' ').trim());

/**
 * Lleva el foco con Tab (solo teclado) hasta el elemento o hasta dentro de él
 * (un grupo de opciones). Falla si no llega en `maximo` pulsaciones.
 */
async function enfocarConTab(page, objetivo, maximo = 60) {
  const elemento = await objetivo.elementHandle();
  for (let i = 0; i <= maximo; i += 1) {
    if (await elemento.evaluate((e) => e === document.activeElement || e.contains(document.activeElement))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`El teclado no llega al elemento en ${maximo} pulsaciones de Tab.`);
}

/**
 * Estado del foco (se evalúa en la página): si el elemento enfocado o uno de
 * sus dos contenedores tiene un anillo de foco (outline de 2 px o más; la
 * opción de la ruta lo pone en su tarjeta), si está dentro de la ventana y si
 * va después del anterior en el orden del documento.
 */
function estadoDelFoco() {
  const activo = document.activeElement;
  if (!activo || activo === document.body) return null;
  const conAnillo = (elemento) => {
    const estilo = getComputedStyle(elemento);
    return estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) >= 2;
  };
  let anillo = false;
  for (let elemento = activo, nivel = 0; elemento && nivel < 3; elemento = elemento.parentElement, nivel += 1) {
    if (conAnillo(elemento)) anillo = true;
  }
  const caja = activo.getBoundingClientRect();
  const enVentana = caja.width > 0 && caja.height > 0 && caja.bottom > 0 && caja.top < innerHeight && caja.right > 0 && caja.left < innerWidth;
  const anterior = window.__focoAnterior;
  const enOrden = !anterior || Boolean(anterior.compareDocumentPosition(activo) & Node.DOCUMENT_POSITION_FOLLOWING);
  const primero = window.__focoPrimero ?? activo;
  window.__focoPrimero = primero;
  window.__focoAnterior = activo;
  const nombre = (activo.getAttribute('aria-label') || activo.textContent || activo.getAttribute('name') || '').replace(/\s+/g, ' ').trim();
  return { anillo, enVentana, enOrden, vuelta: anterior !== undefined && activo === primero, elemento: `${activo.tagName.toLowerCase()} «${nombre.slice(0, 50)}»` };
}

/** Recorre con Tab todos los elementos de la página y devuelve cada parada. */
async function recorrerConTab(page) {
  await page.evaluate(() => {
    delete window.__focoAnterior;
    delete window.__focoPrimero;
    document.activeElement?.blur();
  });
  const paradas = [];
  for (let i = 0; i < 400; i += 1) {
    await page.keyboard.press('Tab');
    const estado = await page.evaluate(estadoDelFoco);
    if (!estado || estado.vuelta) return paradas;
    paradas.push(estado);
  }
  throw new Error('El recorrido con Tab no terminó en 400 paradas.');
}

/** Lee un CSV de la exportación (RFC 4180: coma, comillas dobles y CRLF). */
function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i];
    if (entreComillas) {
      if (caracter === '"' && texto[i + 1] === '"') { celda += '"'; i += 1; }
      else if (caracter === '"') entreComillas = false;
      else celda += caracter;
    } else if (caracter === '"') entreComillas = true;
    else if (caracter === ',') { fila.push(celda); celda = ''; }
    else if (caracter === '\r' && texto[i + 1] === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; i += 1; }
    else celda += caracter;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  const [columnas, ...datos] = filas;
  return { columnas, filas: datos.map((valores) => Object.fromEntries(columnas.map((c, i) => [c, valores[i]]))) };
}

/* ---------- Zona pública (M-01 a M-07) ---------- */

test.describe('HU-01 qué es el TEA con su fuente y su fecha de revisión', () => {
  test('desde el inicio se llega a S1, con el texto, sus fuentes y «Revisado el»', async ({ page }) => {
    const contenido = await leerApi(page, '/api/contenidos/que-es-el-tea');
    await visitar(page, '/');
    // Tarea T1 del Cuadro B.1: llegar a S1 desde el inicio.
    await page.locator('main').getByRole('link', { name: 'Qué es el TEA', exact: true }).click();
    await expect(page).toHaveURL(/\/que-es-el-tea$/);
    await esperarLista(page);

    await expect(page.locator('h1')).toHaveText(contenido.titulo);
    // Los subtítulos del Markdown (##) son los h2 de la página: el cuerpo está completo.
    const subtitulos = contenido.cuerpo.split('\n').filter((linea) => /^## /.test(linea)).map((linea) => linea.slice(3).trim());
    for (const subtitulo of subtitulos) {
      await expect(page.locator('main').getByRole('heading', { level: 2, name: subtitulo })).toBeVisible();
    }
    const fuentes = page.locator('main section.fuentes');
    await expect(fuentes.getByRole('heading', { name: 'Fuentes' })).toBeVisible();
    await expect(fuentes.locator('li')).toHaveCount(contenido.fuentes.length);
    expect(contenido.fuentes.length).toBeGreaterThan(0);
    await expect(fuentes.getByText(`Revisado el ${fechaRevision(contenido.fechaRevision).texto}`)).toBeVisible();

    // Medida de apoyo para la revisión manual de RCN-06 (no es un criterio automático).
    const palabras = await page.locator('main .prosa p').evaluateAll((parrafos) =>
      parrafos.map((p) => p.textContent.trim().split(/\s+/).filter(Boolean).length)
    );
    test.info().annotations.push({
      type: 'RCN-06',
      description: `${palabras.length} párrafos; el más largo tiene ${Math.max(...palabras)} palabras`
    });
  });
});

test.describe('HU-02 señales de alerta por tramo de edad, como motivos de consulta', () => {
  test('cada pestaña muestra solo su tramo, sin lista para sumar, y enlaza a la ruta', async ({ page }) => {
    const contenidos = await leerApi(page, '/api/contenidos?seccion=S2');
    const TRAMOS = ['4-7', '8-12', '13-17'];
    // Las viñetas de cada tramo, sin el Markdown, tal como se leen en la página.
    const vinetasDe = (tramo) =>
      contenidos
        .find((c) => c.tramoEdad === tramo)
        .cuerpo.split('\n')
        .filter((linea) => linea.startsWith('- '))
        .map((linea) => linea.slice(2).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, '').replace(/\s+/g, ' ').trim());
    // Las que solo tiene ese tramo: sirven para saber qué tramo está en el panel.
    const propiasDe = (tramo) => vinetasDe(tramo).filter((v) => TRAMOS.every((otro) => otro === tramo || !vinetasDe(otro).includes(v)));

    await visitar(page, '/');
    await page.locator('main').getByRole('link', { name: /^Señales de alerta/ }).click();
    await esperarLista(page);
    // Tarea T2 del Cuadro B.1: un niño de 6 años, el tramo de 4 a 7.
    await page.getByRole('tab', { name: '4 a 7 años' }).click();
    await expect(page).toHaveURL(/\?edad=4-7$/);
    await expect(page.getByRole('tab', { name: '4 a 7 años' })).toHaveAttribute('aria-selected', 'true');

    const panel = page.getByRole('tabpanel');
    for (const tramo of TRAMOS) {
      await page.getByRole('tab', { name: `${tramo.replace('-', ' a ')} años` }).click();
      await expect(page).toHaveURL(new RegExp(`\\?edad=${tramo}$`));
      const texto = await textoVisible(panel);
      expect(texto).toContain('motivo de consulta');
      // El panel tiene todas las viñetas propias de su tramo y ninguna de los otros dos.
      expect(propiasDe(tramo).length, tramo).toBeGreaterThan(0);
      for (const otro of TRAMOS) {
        for (const vineta of propiasDe(otro)) {
          expect(texto.includes(vineta), `«${vineta}» con la pestaña ${tramo}`).toBe(otro === tramo);
        }
      }
      // RCN-04: nada que se pueda sumar ni marcar.
      await expect(panel.locator('ol, input, select, progress, meter')).toHaveCount(0);
      expect(texto).not.toMatch(/puntaje|puntos|resultado|riesgo/i);
    }

    await page.getByRole('link', { name: 'Ver la ruta de atención' }).click();
    await expect(page).toHaveURL(/\/ruta-de-atencion$/);
  });
});

test.describe('HU-03 ruta de atención sin datos personales ni respuestas guardadas', () => {
  test('tras las tres preguntas muestra los pasos y las entidades, y nada sale del navegador', async ({ page, context }) => {
    const pasos = await leerApi(page, '/api/pasos-ruta');
    const directorio = await leerApi(page, '/api/directorio');
    const origen = new URL(test.info().project.use.baseURL).origin;
    const peticiones = [];
    page.on('request', (peticion) => peticiones.push({ metodo: peticion.method(), url: new URL(peticion.url()), cuerpo: peticion.postData() }));

    await visitar(page, '/ruta-de-atencion');
    const guia = () => page.locator('form').filter({ has: page.locator('fieldset') }).first();
    // Sin campos para escribir: solo opciones (RS-01).
    await expect(guia().locator('input:not([type="radio"]), textarea')).toHaveCount(0);
    for (const nombre of [/^Familia o cuidador/, /^8 a 12 años/, /^Régimen subsidiado/]) {
      await guia().getByRole('radio', { name: nombre }).check();
      await guia().getByRole('button', { name: 'Siguiente' }).click();
    }
    await esperarLista(page);
    await expect(page.getByText('Pasos para tu caso', { exact: true })).toBeVisible();
    await expect(page.getByText('Familia o cuidador · 8 a 12 años · Régimen subsidiado')).toBeVisible();

    const esperados = filtrarPasos(pasos, CASO_RUTA);
    expect(esperados.length).toBeGreaterThan(0);
    const tarjetas = page.locator('ol.pasos-ruta > li.paso-ruta');
    await expect(tarjetas.locator('.paso-ruta__titulo')).toHaveText(esperados.map((p) => p.titulo));

    const comprobarEntidades = async (ciudad) => {
      let conEntidades = 0;
      for (const [i, paso] of esperados.entries()) {
        const nombres = entidadesDelPaso(directorio, paso.tiposEntidad, ciudad).map((e) => e.nombre);
        const tarjeta = tarjetas.nth(i);
        await expect(tarjeta.locator('.entidad-breve__nombre')).toHaveText(nombres);
        await expect(tarjeta.locator('.entidad-breve').filter({ hasText: /Verificado el \d{2}\/\d{2}\/\d{4}/ })).toHaveCount(nombres.length);
        if (nombres.length > 0) conEntidades += 1;
      }
      expect(conEntidades).toBeGreaterThan(0);
    };
    await comprobarEntidades(null);
    await page.getByLabel(/¿En qué ciudad buscas atención\?/).selectOption({ label: 'Bogotá' });
    await comprobarEntidades('Bogotá');

    // Revisión de tráfico (RF-04, RS-01): solo lecturas del mismo origen, sin las respuestas.
    expect(peticiones.length).toBeGreaterThan(0);
    for (const { metodo, url, cuerpo } of peticiones) {
      expect(url.origin, url.href).toBe(origen);
      expect(metodo, url.href).toBe('GET');
      expect(cuerpo).toBeNull();
      const consulta = decodeURIComponent(`${url.pathname}${url.search}`).toLowerCase();
      for (const valor of ['familia', '8-12', 'subsidiado', 'bogota', 'bogotá', 'perfil', 'regimen', 'tramo']) {
        expect(consulta.includes(valor), `«${valor}» en ${consulta}`).toBe(false);
      }
    }
    const apis = [...new Set(peticiones.filter((p) => p.url.pathname.startsWith('/api/')).map((p) => p.url.pathname))].sort();
    expect(apis).toEqual(['/api/contenidos/ruta-de-atencion', '/api/directorio', '/api/pasos-ruta']);
    expect(await context.cookies()).toEqual([]);
    const almacenado = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      sesion: Object.fromEntries(Object.keys(sessionStorage).map((clave) => [clave, sessionStorage.getItem(clave)]))
    }));
    expect(almacenado.local).toEqual([]);
    expect(Object.keys(almacenado.sesion).filter((clave) => clave !== 'tea-ajustes')).toEqual([]);
    expect(JSON.stringify(almacenado.sesion)).not.toMatch(/familia|subsidiado|8-12|Bogot/);
    const direccion = new URL(page.url());
    expect(`${direccion.pathname}${direccion.search}${direccion.hash}`).toBe('/ruta-de-atencion');
  });
});

test.describe('HU-04 directorio por ciudad y tipo, con la fecha de verificación', () => {
  test('el filtro de Bogotá y salud deja solo esas entidades y las nacionales, cada una con «Verificado el»', async ({ page }) => {
    const entidades = await leerApi(page, '/api/directorio');
    // RS-07: la constancia de autorización nunca llega a la web.
    for (const entidad of entidades) expect(entidad).not.toHaveProperty('constanciaAutorizacion');

    await visitar(page, '/directorio');
    const tarjetas = page.locator('li.entidad');
    await expect(tarjetas).toHaveCount(entidades.length);
    await expect(tarjetas.filter({ hasText: /Verificado el \d{2}\/\d{2}\/\d{4}/ })).toHaveCount(entidades.length);

    // Tarea T4 del Cuadro B.1: una entidad en Bogotá.
    await page.getByLabel('Ciudad', { exact: true }).selectOption({ label: 'Bogotá' });
    await page.getByLabel('Tipo de entidad', { exact: true }).selectOption({ label: 'Salud' });
    await expect(page).toHaveURL(/\/directorio\?ciudad=bogota&tipo=salud$/);
    const esperadas = filtrarEntidades(entidades, { ciudad: 'Bogotá', tipo: 'salud' });
    expect(esperadas.some((e) => e.ciudad === 'Bogotá')).toBe(true);
    await expect(tarjetas).toHaveCount(esperadas.length);
    for (const tarjeta of await tarjetas.all()) {
      await expect(tarjeta.locator('.tipo-lugar')).toHaveText(/Salud.*(Bogotá|Todo el país)/);
      await expect(tarjeta.getByText(/Verificado el \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
    }
    const nombres = await tarjetas.locator('.entidad__nombre').allTextContents();
    expect(nombres.sort()).toEqual(esperadas.map((e) => e.nombre).sort());
  });
});

test.describe('HU-06 tamaño de letra y reducir movimiento durante la visita', () => {
  test('los ajustes se aplican de inmediato, siguen al navegar y al recargar, y no pasan a otra visita', async ({ page, browser }) => {
    await visitar(page, '/');
    const letra = () => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    const clases = () => page.evaluate(() => [...document.documentElement.classList]);
    const transicion = () => page.evaluate(() => getComputedStyle(document.querySelector('.tarjeta')).transitionDuration);
    const normal = await letra();
    expect(await transicion()).not.toBe('0s');

    // Tarea T5 del Cuadro B.1: aumentar la letra desde la barra de accesibilidad.
    const barra = page.getByRole('region', { name: 'Ajustes de accesibilidad' });
    await barra.getByRole('button', { name: 'Grande', exact: true }).click();
    await expect(barra.getByRole('button', { name: 'Grande', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await letra()).toBeCloseTo(normal * 1.125, 1);
    await barra.getByRole('button', { name: 'Muy grande' }).click();
    expect(await letra()).toBeCloseTo(normal * 1.25, 1);
    await barra.getByRole('button', { name: 'Reducir movimiento' }).click();
    await expect(barra.getByRole('button', { name: 'Reducir movimiento' })).toHaveAttribute('aria-pressed', 'true');
    expect(await clases()).toEqual(expect.arrayContaining(['letra-muy-grande', 'sin-movimiento']));
    expect(await transicion()).toBe('0s');

    // Durante la visita: al pasar a otra página y al recargar.
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Directorio' }).click();
    await expect(page).toHaveURL(/\/directorio$/);
    expect(await letra()).toBeCloseTo(normal * 1.25, 1);
    await page.reload();
    await esperarLista(page);
    expect(await clases()).toEqual(expect.arrayContaining(['letra-muy-grande', 'sin-movimiento']));
    await expect(page.getByRole('button', { name: 'Muy grande' })).toHaveAttribute('aria-pressed', 'true');
    // Se guardan solo en sessionStorage, sin cookies (RS-01).
    expect(await page.context().cookies()).toEqual([]);

    // Otra visita empieza sin ajustes.
    const otra = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 800 } });
    const pagina = await otra.newPage();
    await visitar(pagina, '/');
    expect(await pagina.evaluate(() => [...document.documentElement.classList])).not.toEqual(
      expect.arrayContaining(['letra-muy-grande'])
    );
    expect(await pagina.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBeCloseTo(normal, 1);
    await otra.close();
  });
});

test.describe('HU-07 aviso de no diagnóstico en inicio, señales y ruta', () => {
  test('el aviso se ve en las tres páginas, al final de la guía y en «Acerca de» (RF-12)', async ({ page }) => {
    for (const ruta of ['/', '/senales-de-alerta', '/ruta-de-atencion', '/acerca-de']) {
      await visitar(page, ruta);
      await expect(page.locator('main').getByText(AVISO_NO_DIAGNOSTICO, { exact: true }).first(), ruta).toBeVisible();
      // El pie también lo repite en cada página (Cuadro 14, «Patrón de página»).
      await expect(page.locator('footer').getByText(AVISO_NO_DIAGNOSTICO, { exact: true })).toBeVisible();
    }
    await visitar(page, '/ruta-de-atencion');
    const guia = () => page.locator('form').filter({ has: page.locator('fieldset') }).first();
    for (const nombre of [/^Docente/, /^13 a 17 años/, /^No lo sé/]) {
      await guia().getByRole('radio', { name: nombre }).check();
      await guia().getByRole('button', { name: 'Siguiente' }).click();
    }
    await expect(page.locator('.guia__final').getByText(AVISO_NO_DIAGNOSTICO, { exact: true })).toBeVisible();
  });
});

test.describe('HU-09 recursos en PDF o en la guía oficial, con su fuente', () => {
  test('cada tarjeta trae su enlace, su fuente y su fecha de revisión', async ({ page }) => {
    const recursos = await leerApi(page, '/api/recursos');
    await visitar(page, '/recursos');
    const tarjetas = page.locator('li.recurso');
    await expect(tarjetas).toHaveCount(recursos.length);
    // Tarea T6 del Cuadro B.1: un recurso para docentes.
    expect(recursos.some((r) => r.perfiles.includes('docente'))).toBe(true);
    for (const recurso of recursos) {
      const tarjeta = tarjetas.filter({ has: page.getByRole('heading', { name: recurso.titulo, exact: true }) });
      const enlace = enlaceDeRecurso(recurso);
      expect(enlace.texto).toMatch(/^(Descargar PDF|Abrir página oficial) \(/);
      const boton = tarjeta.locator('a.recurso__enlace');
      await expect(boton).toHaveAttribute('href', enlace.href);
      await expect(boton).toContainText(enlace.texto);
      expect(enlace.href).toMatch(/^https:\/\//);
      await expect(tarjeta.getByText(`Revisado el ${fechaRevision(recurso.fechaRevision).texto}`)).toBeVisible();
      await tarjeta.locator('details summary').click();
      await expect(tarjeta.locator('details li')).toHaveCount(recurso.fuentes.length);
      expect(recurso.fuentes.length).toBeGreaterThan(0);
      await expect(tarjeta.locator('details li').first()).toBeVisible();
    }
  });
});

test.describe('HU-10 buscador y preguntas frecuentes desplegables', () => {
  test('el buscador trae páginas y preguntas, y cada pregunta se despliega por separado', async ({ page }) => {
    const buscarEnElEncabezado = async (termino) => {
      await page.locator('header').getByRole('searchbox').fill(termino);
      await page.locator('header').getByRole('searchbox').press('Enter');
      await expect(page).toHaveURL(new RegExp(`/buscar\\?q=${encodeURIComponent(termino).replace(/%20/g, '(%20|\\+)')}$`));
      await esperarLista(page);
    };
    await visitar(page, '/');
    const esperado = await leerApi(page, `/api/buscar?q=${encodeURIComponent('valoración')}`);
    expect(esperado.contenidos.length).toBeGreaterThan(0);
    expect(esperado.preguntas.length).toBeGreaterThan(0);
    await buscarEnElEncabezado('valoración');
    const seccion = (nombre) => page.locator('section.resultados').filter({ has: page.getByRole('heading', { name: nombre, exact: true }) });
    await expect(seccion('Páginas').locator('li.resultado')).toHaveCount(esperado.contenidos.length);
    await expect(seccion('Preguntas frecuentes').locator('li.resultado')).toHaveCount(esperado.preguntas.length);

    // Tarea T7 del Cuadro B.1: «¿A quién debo consultar primero?», desde el buscador.
    await buscarEnElEncabezado('consultar primero');
    await seccion('Preguntas frecuentes').getByRole('link', { name: '¿A quién debo consultar primero?' }).click();
    await expect(page).toHaveURL(/\/preguntas-frecuentes#[a-z0-9-]+$/);
    await esperarLista(page);
    const botones = page.locator('button.acordeon__boton');
    const pregunta = botones.filter({ hasText: '¿A quién debo consultar primero?' });
    await expect(pregunta).toHaveAttribute('aria-expanded', 'true');
    await expect(pregunta).toBeFocused();
    await expect(botones.and(page.locator('[aria-expanded="true"]'))).toHaveCount(1);

    // Cada pregunta se abre y se cierra por separado.
    const otra = botones.nth(1);
    await otra.click();
    await expect(otra).toHaveAttribute('aria-expanded', 'true');
    await expect(pregunta).toHaveAttribute('aria-expanded', 'true');
    await pregunta.click();
    await expect(pregunta).toHaveAttribute('aria-expanded', 'false');
    await expect(otra).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#' + new URL(page.url()).hash.slice(1)).locator('.acordeon__panel')).toBeHidden();
  });
});

test.describe('HU-11 navegación solo con el teclado', () => {
  test('cada parada del Tab tiene foco visible y sigue el orden del documento', async ({ page }) => {
    for (const ruta of ['/', '/senales-de-alerta', '/ruta-de-atencion', '/directorio', '/recursos', '/preguntas-frecuentes', '/contacto']) {
      await visitar(page, ruta);
      expect(await page.locator('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').count(), `${ruta}: tabindex positivo`).toBe(0);
      const paradas = await recorrerConTab(page);
      expect(paradas.length, ruta).toBeGreaterThan(5);
      expect(paradas[0].elemento, ruta).toContain('Saltar al contenido');
      for (const parada of paradas) {
        expect(parada.anillo, `${ruta}: anillo de foco en ${parada.elemento}`).toBe(true);
        expect(parada.enVentana, `${ruta}: ${parada.elemento} dentro de la ventana`).toBe(true);
        expect(parada.enOrden, `${ruta}: ${parada.elemento} después del anterior`).toBe(true);
      }
      test.info().annotations.push({ type: 'paradas', description: `${ruta}: ${paradas.length}` });
    }
  });

  test('saltar al contenido, ajustes, pestañas, ruta, preguntas y contacto se operan con el teclado', async ({ page }) => {
    await visitar(page, '/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenido')).toBeFocused();

    const grande = page.getByRole('button', { name: 'Grande', exact: true });
    await enfocarConTab(page, grande);
    await page.keyboard.press('Enter');
    await expect(grande).toHaveAttribute('aria-pressed', 'true');
    const normal = page.getByRole('button', { name: 'Normal', exact: true });
    await enfocarConTab(page, normal);
    await page.keyboard.press('Space');
    await expect(normal).toHaveAttribute('aria-pressed', 'true');

    await visitar(page, '/senales-de-alerta?edad=4-7');
    await enfocarConTab(page, page.getByRole('tab', { name: '4 a 7 años' }));
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: '8 a 12 años' })).toBeFocused();
    await expect(page.getByRole('tab', { name: '8 a 12 años' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\?edad=8-12$/);

    await visitar(page, '/ruta-de-atencion');
    const guia = () => page.locator('form').filter({ has: page.locator('fieldset') }).first();
    // Pregunta 1: Tab llega a la primera opción (Familia o cuidador) y espacio la marca.
    // Preguntas 2 y 3: la flecha pasa a la segunda opción y la marca (8 a 12 años; subsidiado).
    for (let pregunta = 1; pregunta <= 3; pregunta += 1) {
      await expect(guia().getByRole('heading', { name: new RegExp(`^Pregunta ${pregunta} de 3`) })).toBeVisible();
      await enfocarConTab(page, guia().getByRole('radio').first());
      await page.keyboard.press(pregunta === 1 ? 'Space' : 'ArrowDown');
      await enfocarConTab(page, guia().getByRole('button', { name: 'Siguiente' }));
      await page.keyboard.press('Enter');
    }
    await expect(page.getByText('Familia o cuidador · 8 a 12 años · Régimen subsidiado')).toBeVisible();

    await visitar(page, '/preguntas-frecuentes');
    const primera = page.locator('button.acordeon__boton').first();
    await enfocarConTab(page, primera);
    await page.keyboard.press('Enter');
    await expect(primera).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(primera).toHaveAttribute('aria-expanded', 'false');

    await visitar(page, '/contacto');
    await enfocarConTab(page, page.getByRole('textbox', { name: /^Correo electrónico/ }));
    await page.keyboard.type('docente.teclado@example.com');
    await enfocarConTab(page, page.getByRole('textbox', { name: 'Mensaje', exact: true }));
    await page.keyboard.type('Pregunta escrita solo con el teclado.');
    await enfocarConTab(page, page.getByRole('checkbox'));
    await page.keyboard.press('Space');
    await enfocarConTab(page, page.getByRole('button', { name: 'Enviar mensaje' }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Recibimos tu mensaje' })).toBeVisible();
  });
});

/* ---------- Panel de administración (M-08) ---------- */

test.describe('HU-13 publicar y despublicar un contenido desde el editor', () => {
  test('el editor no publica sin fuente ni fecha, publica con ellas y despublica', async ({ page }) => {
    const slug = 'caso-de-aceptacion-hu-13';
    const publico = () => page.request.get(`/api/contenidos/${slug}`).then((r) => r.status());
    await visitar(page, '/admin');
    // Inicio de sesión con el teclado.
    await enfocarConTab(page, page.getByLabel('Usuario'));
    await page.keyboard.type(CUENTAS.administrador.usuario);
    await enfocarConTab(page, page.getByLabel('Contraseña', { exact: true }));
    await page.keyboard.type(CUENTAS.administrador.clave);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

    await visitar(page, '/admin/contenidos/nuevo');
    await page.getByLabel('Título').fill('Caso de aceptación HU-13');
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('Sección').selectOption('S3');
    await page.getByRole('textbox', { name: /^Cuerpo/ }).fill('Texto de prueba del caso de aceptación.');
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('No se pudo guardar: revisa 2 campos')).toBeVisible();
    await expect(page.locator('#contenido').getByText('Para publicar hace falta al menos una fuente.').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('Para publicar hace falta la fecha de revisión.').first()).toBeVisible();
    expect(await publico()).toBe(404);

    // El editor trae una fila de fuente vacía: no cuenta como fuente.
    const fuente = page.getByRole('group', { name: 'Fuente 1' });
    await fuente.getByRole('textbox', { name: /^Texto de la fuente/ }).fill('Ministerio de Salud y Protección Social');
    await fuente.getByRole('textbox', { name: /^Enlace/ }).fill('https://www.minsalud.gov.co');
    await page.getByRole('button', { name: 'Usar la fecha de hoy' }).click();
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('Publicado. Ya aparece en el sitio.')).toBeVisible();
    expect(await publico()).toBe(200);
    const publicado = await leerApi(page, `/api/contenidos/${slug}`);
    expect(publicado.fuentes).toHaveLength(1);
    expect(publicado.fechaRevision).toBeTruthy();

    await page.getByRole('button', { name: 'Despublicar' }).click();
    await expect(page.getByText('Despublicado. La página pasó a borrador y ya no aparece en el sitio.')).toBeVisible();
    expect(await publico()).toBe(404);
  });
});

test.describe('HU-15 responder y eliminar los mensajes de la bandeja', () => {
  test('el mensaje enviado por el formulario aparece en la bandeja y se elimina', async ({ page }) => {
    const correo = 'familia.hu15@example.com';
    const texto = '¿Dónde pido la valoración para mi hija de 10 años?';
    const envios = [];
    page.on('request', (peticion) => {
      if (peticion.method() === 'POST' && new URL(peticion.url()).pathname === '/api/contacto') envios.push(peticion.postDataJSON());
    });

    // Preparación: el formulario de contacto (HU-08, tarea T8 del Cuadro B.1).
    await visitar(page, '/contacto');
    const formulario = page.locator('form.formulario-contacto');
    await expect(formulario.locator('input:not([type="checkbox"]), textarea, select')).toHaveCount(2);
    await expect(formulario.getByRole('checkbox')).not.toBeChecked();
    await expect(formulario.getByRole('link', { name: /política de tratamiento de datos/ })).toHaveAttribute('href', '/privacidad');
    await page.getByRole('textbox', { name: /^Correo electrónico/ }).fill(correo);
    await page.getByRole('textbox', { name: 'Mensaje', exact: true }).fill(texto);
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByText('No pudimos enviar tu mensaje')).toBeVisible();
    expect(envios).toHaveLength(0);
    await formulario.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByRole('heading', { name: 'Recibimos tu mensaje' })).toBeVisible();
    expect(envios).toHaveLength(1);
    expect(Object.keys(envios[0]).sort()).toEqual(['autorizacion', 'correo', 'mensaje', 'versionPolitica']);

    await visitar(page, '/admin/mensajes');
    await iniciarSesion(page, CUENTAS.administrador);
    await visitar(page, '/admin/mensajes');
    const tarjeta = page.locator('li.tarjeta-mensaje').filter({ has: page.getByRole('heading', { name: `Mensaje de ${correo}` }) });
    await expect(tarjeta).toHaveCount(1);
    await expect(tarjeta.getByText(texto)).toBeVisible();
    await expect(tarjeta.getByRole('link', { name: /Responder por correo/ })).toHaveAttribute('href', new RegExp(`^mailto:${correo.replace(/[.+]/g, '\\$&')}\\?`));

    await tarjeta.getByRole('button', { name: `Eliminar el mensaje de ${correo}` }).click();
    await expect(tarjeta.getByText(`¿Eliminar el mensaje de ${correo}? No se puede deshacer.`)).toBeFocused();
    await tarjeta.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByText('Mensaje eliminado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: `Mensaje de ${correo}` })).toHaveCount(0);
    const bandeja = await leerApi(page, '/api/admin/mensajes');
    expect(JSON.stringify(bandeja)).not.toContain(correo);
  });
});

/* ---------- Registro conductual (M-09) ---------- */

/** Qué hay en la aplicación ahora; null si está cambiando de pantalla (como en T10). */
function estadoDeLaAplicacion() {
  const principal = document.querySelector('main');
  if (!principal) return null;
  if (principal.querySelector('form.sus')) return 'sus';
  const titulo = principal.querySelector('h1')?.textContent;
  if (titulo === 'Gracias') return 'gracias';
  if (titulo === 'Las actividades se interrumpieron') return 'interrumpida';
  const centro = principal.querySelector('.ensayo__centro');
  if (centro && centro.firstElementChild && !centro.querySelector('.ensayo__fijacion')) return 'estimulo';
  if (principal.querySelector('button.tarea__continuar')) return 'pantalla';
  return null;
}

/** Lo visible de un ensayo con el estímulo en pantalla (CT-03). */
function vistaDelEnsayo() {
  const principal = document.querySelector('main');
  const progreso = principal.querySelector('.progreso-tarea');
  const textoProgreso = progreso?.querySelector('.progreso-tarea__texto')?.textContent.trim() ?? null;
  const barra = progreso?.querySelector('progress');
  const caja = barra?.getBoundingClientRect();
  return {
    navon: Boolean(principal.querySelector('.ensayo--letras')),
    textoProgreso,
    barraVisible: Boolean(caja && caja.width > 0 && caja.height > 0),
    valorBarra: barra ? Number(barra.value) : null,
    totalBarra: barra ? Number(barra.max) : null,
    // Todo el texto de la pantalla menos la barra de progreso.
    resto: principal.innerText.replace(progreso?.innerText ?? '', '').replace(/\s+/g, ' ').trim(),
    temporizadores: principal.querySelectorAll('[role="timer"], time, meter').length
  };
}

/** Activa el botón de la pantalla solo con el teclado: Tab hasta él y Enter. */
async function continuarConTeclado(page) {
  const boton = page.locator('main button.tarea__continuar');
  const elemento = await boton.elementHandle();
  await enfocarConTab(page, boton, 10);
  await page.keyboard.press('Enter');
  await page.waitForFunction((b) => !b.isConnected, elemento, { timeout: 15000 });
}

/**
 * Recorre la aplicación del participante hasta «Gracias», solo con el
 * teclado (F en cada ensayo, Tab y Enter o espacio en lo demás), y devuelve
 * lo que vio: la secuencia de pantallas y ensayos de cada tarea.
 */
async function recorrerAplicacion(page) {
  const eventos = { 'cambio-regla': [], navon: [] };
  let tarea = 'cambio-regla';
  for (let paso = 0; paso < 400; paso += 1) {
    const estado = await (await page.waitForFunction(estadoDeLaAplicacion, null, { timeout: 15000 })).jsonValue();
    if (estado === 'gracias') {
      await expect(page.getByText(APLICACION.guardado)).toBeVisible({ timeout: 15000 });
      return eventos;
    }
    if (estado === 'interrumpida') throw new Error('La aplicación se interrumpió.');

    if (estado === 'sus') {
      eventos.sus = true;
      const enunciados = page.locator('form.sus fieldset');
      const total = await enunciados.count();
      for (let i = 0; i < total; i += 1) {
        // Tab entra a cada grupo por su primera opción (1); la flecha pasa a la siguiente (2).
        await enfocarConTab(page, enunciados.nth(i), 10);
        await page.keyboard.press('ArrowRight');
      }
      await enfocarConTab(page, page.getByRole('button', { name: SUS.enviar }), 10);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !document.querySelector('form.sus'));
      continue;
    }

    if (estado === 'estimulo') {
      const estimulo = await page.locator('.ensayo__centro > *').first().elementHandle({ timeout: 5000 });
      const vista = await page.evaluate(vistaDelEnsayo);
      eventos[tarea].push({ tipo: 'ensayo', ...vista });
      await page.keyboard.press('KeyF');
      await page.waitForFunction((elemento) => !elemento.isConnected, estimulo, { timeout: 15000 });
      continue;
    }

    const titulo = ((await page.locator('main h2').first().textContent()) ?? '').trim();
    const pausa = (await page.locator('main button[aria-expanded]').count()) > 0;
    const retroalimentacion = (await page.locator('main .tarea__retroalimentacion').count()) > 0;
    if (titulo === ENTRE_TAREAS.titulo) tarea = 'navon';
    else eventos[tarea].push({ tipo: retroalimentacion ? 'retroalimentacion' : pausa ? 'pausa' : 'pantalla', titulo });
    await continuarConTeclado(page);
  }
  throw new Error('La aplicación no llegó a «Gracias».');
}

/** Crea una sesión en /registro/nueva y devuelve su seudónimo. */
async function crearSesion(page) {
  await visitar(page, '/registro/nueva');
  await page.getByLabel('La persona firmó en papel el consentimiento informado.').check();
  await page.getByLabel('Versión del formato de consentimiento').fill('1.0');
  await page.getByLabel('La persona tiene 18 años o más.').check();
  await page.getByRole('button', { name: 'Crear la sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Sesión creada' })).toBeVisible();
  const seudonimo = (await page.locator('.seudonimo').textContent()).trim();
  // HU-16: 8 caracteres aleatorios en dos grupos de 4.
  expect(seudonimo).toMatch(FORMATO_SEUDONIMO);
  return seudonimo;
}

async function entregarDispositivo(page) {
  await page.getByRole('link', { name: 'Ver la sesión' }).click();
  await esperarLista(page);
  await page.getByRole('button', { name: 'Entregar el dispositivo y empezar' }).click();
  await page.waitForURL('**/registro/aplicacion');
}

async function entrarAlRegistro(page) {
  await visitar(page, '/registro');
  await iniciarSesion(page, CUENTAS.profesional);
}

/** Descarga un CSV con su botón de la lista de sesiones. */
async function descargarCsv(page, texto) {
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: texto }).click()]);
  return leerCsv(readFileSync(await descarga.path(), 'utf8'));
}

test.describe('M-09 registro conductual: HU-17 a HU-19', () => {
  test.describe.configure({ mode: 'serial' });
  const sesiones = { completa: null, interrumpida: null };

  test.describe('HU-17 instrucciones, práctica con retroalimentación y barra de progreso', () => {
    test('las dos tareas, solo con el teclado: sin temporizadores, marcadores ni puntajes', async ({ page }) => {
      test.slow();
      const plan = await leerApi(page, '/api/registro/plan');
      await entrarAlRegistro(page);
      sesiones.completa = await crearSesion(page);
      await entregarDispositivo(page);

      const inicio = Date.now();
      const eventos = await recorrerAplicacion(page);
      const minutos = (Date.now() - inicio) / 60000;
      expect(eventos.sus).toBe(true);

      for (const secuencia of plan.secuencias) {
        const lista = eventos[secuencia.tarea];
        const ensayos = lista.filter((e) => e.tipo === 'ensayo');
        const primerEnsayo = lista.findIndex((e) => e.tipo === 'ensayo');
        // Empieza con instrucciones, antes de cualquier ensayo.
        expect(primerEnsayo, secuencia.tarea).toBeGreaterThan(0);
        expect(lista.slice(0, primerEnsayo).every((e) => e.tipo === 'pantalla')).toBe(true);

        const practica = ensayos.filter((e) => e.textoProgreso?.endsWith('Práctica'));
        const medidos = ensayos.filter((e) => !e.textoProgreso?.endsWith('Práctica'));
        // CP-04: al menos 2 ensayos de práctica, cada uno con su retroalimentación, antes de los medidos.
        expect(practica.length, secuencia.tarea).toBeGreaterThanOrEqual(2);
        expect(practica.length).toBe(secuencia.ensayosPractica);
        expect(lista.filter((e) => e.tipo === 'retroalimentacion')).toHaveLength(practica.length);
        expect(ensayos.indexOf(medidos[0])).toBe(practica.length);
        for (const [i, evento] of lista.entries()) {
          if (evento.tipo === 'ensayo' && evento.textoProgreso.endsWith('Práctica')) expect(lista[i + 1].tipo).toBe('retroalimentacion');
        }

        // Barra de progreso visible en cada ensayo, por partes: avanza solo entre bloques, con una pausa en medio.
        const total = secuencia.bloques.length;
        expect(medidos).toHaveLength(secuencia.ensayosPuntuados);
        let parteAnterior = 0;
        let indiceAnterior = -1;
        for (const ensayo of ensayos) {
          expect(ensayo.barraVisible).toBe(true);
          expect(ensayo.totalBarra).toBe(total);
        }
        for (const ensayo of medidos) {
          const [, parte, de] = ensayo.textoProgreso.match(/Parte (\d+) de (\d+)$/).map(Number);
          expect(de).toBe(total);
          expect(ensayo.valorBarra).toBe(parte - 1);
          expect(parte - parteAnterior).toBeGreaterThanOrEqual(0);
          const indice = lista.indexOf(ensayo);
          if (parte > parteAnterior && parteAnterior > 0) {
            expect(lista.slice(indiceAnterior, indice).some((e) => e.tipo === 'pausa'), `pausa antes de la parte ${parte}`).toBe(true);
          }
          parteAnterior = parte;
          indiceAnterior = indice;
        }
        expect(parteAnterior).toBe(total);
        // CP-01: como máximo 7 ensayos por parte.
        for (let parte = 1; parte <= total; parte += 1) {
          expect(medidos.filter((e) => e.textoProgreso.endsWith(`Parte ${parte} de ${total}`)).length).toBeLessThanOrEqual(7);
        }

        // CT-03: durante los ensayos no hay números, tiempo, aciertos ni puntajes en pantalla.
        for (const ensayo of ensayos) {
          expect(ensayo.temporizadores).toBe(0);
          expect(ensayo.resto, ensayo.resto).not.toMatch(/\d/);
          expect(ensayo.resto).not.toMatch(/tiempo|segundo|punto|puntaje|acierto|correct|error|marcador|nivel|vidas/i);
        }
        test.info().annotations.push({
          type: secuencia.tarea,
          description: `${lista.filter((e) => e.tipo === 'pantalla').length} pantallas de texto, ${practica.length} de práctica, ${medidos.length} medidos, ${lista.filter((e) => e.tipo === 'pausa').length} pausas`
        });
      }
      // CT-08: la duración de las personas se mide con los voluntarios; aquí, la del recorrido automático.
      test.info().annotations.push({ type: 'duración', description: `${minutos.toFixed(1)} minutos con respuestas inmediatas` });
      expect(minutos).toBeLessThan(20);
    });
  });

  test.describe('HU-18 valores observados por tarea con el aviso de no diagnóstico', () => {
    test('la sesión completa muestra cada valor con su constructo, el aviso y la versión del algoritmo', async ({ page }) => {
      expect(sesiones.completa).toMatch(FORMATO_SEUDONIMO);
      await entrarAlRegistro(page);
      const { valores } = await leerApi(page, `/api/admin/registro/sesiones/${sesiones.completa}`);
      expect(valores.procesada).toBe(true);
      await visitar(page, `/registro/sesiones/${sesiones.completa}`);

      const vista = page.locator('section.valores-sesion');
      await expect(vista.getByRole('heading', { name: DETALLE.valores, exact: true })).toBeVisible();
      await expect(vista.getByRole('note')).toHaveText(AVISO_REGISTRO);
      await expect(vista.getByText(`${DETALLE.versionAlgoritmo}: ${VERSION_ALGORITMO}`)).toBeVisible();
      expect(valores.versionAlgoritmo).toBe(VERSION_ALGORITMO);

      for (const datos of Object.values(valores.tareas)) {
        const tarea = vista.locator('section.valores-tarea').filter({ has: page.getByRole('heading', { name: datos.titulo, exact: true }) });
        const filas = tarea.locator('table').first().locator('tbody tr');
        await expect(filas).toHaveCount(datos.indicadores.length);
        for (const [i, indicador] of datos.indicadores.entries()) {
          await expect(filas.nth(i).locator('th, td')).toHaveText([indicador.codigo, indicador.constructo, indicador.metrica, valorObservado(indicador)]);
        }
      }
      const codigos = Object.values(valores.tareas).flatMap((d) => d.indicadores.map((i) => i.codigo)).sort();
      expect(codigos).toEqual(['CC-08', 'CC-09', 'CC-10', 'CC-12']);

      // Sin etiquetas, niveles, puntos de corte ni puntajes globales en toda la página.
      expect(buscarVocabularioProhibido(await textoVisible(page.locator('main')))).toEqual([]);
    });

    test('una sesión interrumpida por una recarga no muestra valores (RF-15)', async ({ page }) => {
      await entrarAlRegistro(page);
      sesiones.interrumpida = await crearSesion(page);
      await entregarDispositivo(page);
      // A mitad de la primera tarea: el primer ensayo de práctica y una recarga.
      for (let paso = 0; paso < 10; paso += 1) {
        const estado = await (await page.waitForFunction(estadoDeLaAplicacion, null, { timeout: 15000 })).jsonValue();
        if (estado === 'estimulo') break;
        await continuarConTeclado(page);
      }
      await page.keyboard.press('KeyF');
      await page.reload();
      await expect(page.getByRole('heading', { name: APLICACION.interrumpidaTitulo })).toBeVisible();

      await entrarAlRegistro(page);
      await visitar(page, `/registro/sesiones/${sesiones.interrumpida}`);
      await expect(page.locator('main').getByText('Interrumpida', { exact: true })).toBeVisible();
      const vista = page.locator('section.valores-sesion');
      await expect(vista.getByRole('note')).toHaveText(AVISO_REGISTRO);
      await expect(vista.getByText(DETALLE.sinProcesar)).toBeVisible();
      await expect(vista.locator('table')).toHaveCount(0);
      await expect(vista.getByText(DETALLE.versionAlgoritmo)).toHaveCount(0);
    });
  });

  test.describe('HU-19 exportar en CSV y eliminar una sesión por su seudónimo', () => {
    test('los dos CSV traen el seudónimo y la versión sin datos identificables; eliminar borra la sesión y sus ensayos', async ({ page }) => {
      const { completa, interrumpida } = sesiones;
      expect(completa).toMatch(FORMATO_SEUDONIMO);
      expect(interrumpida).toMatch(FORMATO_SEUDONIMO);
      const plan = await leerApi(page, '/api/registro/plan');
      const totalEnsayos = plan.secuencias.reduce((suma, s) => suma + s.ensayosPractica + s.ensayosPuntuados, 0);
      await entrarAlRegistro(page);

      const ensayos = await descargarCsv(page, LISTA.descargarEnsayos);
      const valores = await descargarCsv(page, LISTA.descargarValores);
      for (const { columnas } of [ensayos, valores]) {
        expect(columnas).toEqual(expect.arrayContaining(['seudonimo', 'versionAlgoritmo']));
        expect(contieneDatoIdentificable(Object.fromEntries(columnas.map((c) => [c, 'x'])))).toBe(false);
        expect(buscarVocabularioProhibido(columnas.join(' '))).toEqual([]);
      }
      const ensayosCompleta = ensayos.filas.filter((f) => f.seudonimo === completa);
      expect(ensayosCompleta).toHaveLength(totalEnsayos);
      expect(ensayosCompleta.every((f) => f.versionAlgoritmo === VERSION_ALGORITMO)).toBe(true);
      const filaCompleta = valores.filas.find((f) => f.seudonimo === completa);
      expect(filaCompleta.versionAlgoritmo).toBe(VERSION_ALGORITMO);
      expect(filaCompleta.cambioRegla_CC08).not.toBe('');
      const filaInterrumpida = valores.filas.find((f) => f.seudonimo === interrumpida);
      expect(filaInterrumpida.estado).toBe('interrumpida');
      expect(filaInterrumpida.versionAlgoritmo).toBe('');

      // Eliminar por seudónimo, escrito en minúsculas y sin guion.
      for (const seudonimo of [completa, interrumpida]) {
        await page.getByLabel(ELIMINAR.campo).fill(seudonimo.replace('-', '').toLowerCase());
        await page.getByRole('button', { name: ELIMINAR.buscar, exact: true }).click();
        await expect(page.getByText(ELIMINAR.pregunta(seudonimo))).toBeVisible();
        await page.getByRole('button', { name: ELIMINAR.confirmar }).click();
        await expect(page.getByText(ELIMINAR.eliminada(seudonimo))).toBeVisible();
        expect((await page.request.get(`/api/admin/registro/sesiones/${seudonimo}`)).status()).toBe(404);
      }
      await visitar(page, '/registro');
      const despues = await descargarCsv(page, LISTA.descargarEnsayos);
      expect(despues.filas.filter((f) => f.seudonimo === completa || f.seudonimo === interrumpida)).toEqual([]);
      const valoresDespues = await descargarCsv(page, LISTA.descargarValores);
      expect(valoresDespues.filas.filter((f) => f.seudonimo === completa || f.seudonimo === interrumpida)).toEqual([]);
    });
  });
});
