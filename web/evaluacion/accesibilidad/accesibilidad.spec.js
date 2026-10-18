/**
 * Auditoría de accesibilidad con axe-core (T10, WCAG 2.1 AA, RA-01 a RA-11):
 * zona pública (M-01 a M-07), panel (M-08) y registro conductual (M-09), en
 * cada variante de variantes.js (un proyecto de Playwright por variante).
 *
 * Por pantalla se escribe resultados/axe/<variante>/<pantalla>.json
 * (registroDePantalla en auditoria.js) con las violaciones de axe y, si la
 * página se desplaza a lo ancho, los elementos que se salen. Las pruebas no
 * fallan por las violaciones: es una medición, y resumir.js dice si se
 * cumplen las metas. Sí fallan si una pantalla no se puede alcanzar.
 *
 * La aplicación de M-09 se recorre completa, como lo haría un participante:
 * en cada ensayo se espera el estímulo y se presiona F, y en cada pantalla de
 * texto se pulsa el botón. Se audita la primera pantalla de cada tipo. La
 * medición del tiempo (reloj.js, motorEnsayo.js) no se toca. Los avisos de
 * vencimiento de la sesión se auditan en pruebas aparte, con el reloj de
 * Playwright (page.clock), que nunca se instala en la aplicación.
 */
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ETIQUETAS_AXE, medirDesbordamiento, medirEntorno, registroDePantalla } from './auditoria.js';
import { carpetaDeResultados } from './limpiar.js';
import { CUENTAS } from './servidor.js';
import { scriptDeAjustes, varianteDe } from './variantes.js';
import { PAGINAS_PIE, SECCIONES, TRAMOS_EDAD } from '../../src/secciones.js';
import { ENTRE_TAREAS, PAUSA } from '../../src/registro/textos.js';
import { ELIMINAR, LISTA } from '../../src/registro/textosProfesional.js';

const SALIDA = carpetaDeResultados();

/** Minutos sin actividad tras los que aparece el aviso de vencimiento (28) y un poco más. */
const ANTES_DEL_AVISO = '27:00';
const HASTA_EL_AVISO = '01:30';

const test = base.extend({
  variante: ['normal', { option: true }],
  page: async ({ page, variante }, use) => {
    const script = scriptDeAjustes(varianteDe(variante));
    if (script) await page.addInitScript({ content: script });
    await use(page);
  }
});

/** Espera a que la página termine de pedir datos y de cargar las fuentes. */
async function esperarLista(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !document.querySelector('main')?.textContent.includes('Estamos cargando'));
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Audita la pantalla tal como está y guarda su registro. Antes comprueba que
 * la variante esté aplicada: la clase de alto contraste en <html> y el ancho
 * de la ventana.
 */
async function auditar(page, variante, pantalla) {
  const { ajustes, viewport } = varianteDe(variante);
  const entorno = await page.evaluate(medirEntorno);
  expect(entorno.clasesHtml.split(' ').includes('alto-contraste')).toBe(Boolean(ajustes?.altoContraste));
  expect(entorno.anchoVentana).toBeLessThanOrEqual(viewport.width);
  const resultados = await new AxeBuilder({ page }).withTags([...ETIQUETAS_AXE]).analyze();
  const desbordamiento = await page.evaluate(medirDesbordamiento);
  const { pathname, search, hash } = new URL(page.url());
  const registro = registroDePantalla({ pantalla, variante, url: `${pathname}${search}${hash}`, resultados, desbordamiento, entorno });
  const carpeta = join(SALIDA, 'axe', variante);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, `${pantalla}.json`), `${JSON.stringify(registro, null, 2)}\n`);
  return registro;
}

async function visitarYAuditar(page, variante, pantalla, ruta) {
  await page.goto(ruta);
  await esperarLista(page);
  await expect(page.locator('h1')).toHaveCount(1);
  return auditar(page, variante, pantalla);
}

async function iniciarSesion(page, { usuario, clave }) {
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/* ---------- Zona pública (M-01 a M-07) ---------- */

test.describe('RA-01 a RA-11 zona pública', () => {
  test('inicio, secciones, páginas del pie, búsqueda y página no encontrada', async ({ page, variante }) => {
    await visitarYAuditar(page, variante, 'inicio', '/');
    for (const { ruta } of [...SECCIONES, ...PAGINAS_PIE]) {
      if (ruta === '/senales-de-alerta' || ruta === '/ruta-de-atencion') continue;
      await visitarYAuditar(page, variante, ruta.slice(1), ruta);
    }
    await visitarYAuditar(page, variante, 'buscar', '/buscar?q=valoraci%C3%B3n');
    await visitarYAuditar(page, variante, 'no-encontrada', '/esta-pagina-no-existe');
  });

  test('señales de alerta con sus tres pestañas', async ({ page, variante }) => {
    for (const { valor } of TRAMOS_EDAD) {
      await visitarYAuditar(page, variante, `senales-de-alerta-${valor}`, `/senales-de-alerta?edad=${valor}`);
    }
  });

  test('ruta de atención: cada pregunta, el error y el final', async ({ page, variante }) => {
    await visitarYAuditar(page, variante, 'ruta-pregunta-1', '/ruta-de-atencion');
    const guia = page.locator('form').filter({ has: page.locator('fieldset') }).first();
    await guia.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Elige una opción para continuar.')).toBeVisible();
    await auditar(page, variante, 'ruta-pregunta-1-error');

    for (const numero of [1, 2, 3]) {
      const formulario = page.locator('form').filter({ has: page.locator('fieldset') }).first();
      if (numero > 1) await auditar(page, variante, `ruta-pregunta-${numero}`);
      await formulario.locator('input[type="radio"]').first().check();
      await formulario.getByRole('button', { name: 'Siguiente' }).click();
    }
    await esperarLista(page);
    await auditar(page, variante, 'ruta-final');
    const ciudad = page.getByLabel(/¿En qué ciudad buscas atención\?/);
    await ciudad.selectOption({ index: 1 });
    await auditar(page, variante, 'ruta-final-con-ciudad');
  });

  test('directorio con filtros, preguntas abiertas y contacto con errores', async ({ page, variante }) => {
    await visitarYAuditar(page, variante, 'directorio-filtrado', '/directorio?ciudad=bogota&tipo=salud');

    const preguntas = await page.request.get('/api/preguntas').then((r) => r.json());
    await visitarYAuditar(page, variante, 'preguntas-frecuentes-abierta', `/preguntas-frecuentes#${preguntas[0].slug}`);
    await expect(page.locator('[aria-expanded="true"]').first()).toBeVisible();

    await visitarYAuditar(page, variante, 'contacto-vacio', '/contacto');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.resumen-errores, [role="alert"]').first()).toBeVisible();
    await auditar(page, variante, 'contacto-errores');
  });
});

/* ---------- Panel de administración (M-08) ---------- */

test.describe('RA-01 a RA-11 panel de administración', () => {
  test('inicio de sesión, error, listas y editores', async ({ page, variante }) => {
    await visitarYAuditar(page, variante, 'admin-inicio-sesion', '/admin');
    // Un usuario que no existe: el error no bloquea la cuenta de la auditoría.
    await iniciarSesion(page, { usuario: 'auditoria.inexistente', clave: 'una clave que no es la correcta' });
    await expect(page.getByRole('alert')).toBeVisible();
    await auditar(page, variante, 'admin-inicio-sesion-error');

    await iniciarSesion(page, CUENTAS.administrador);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await esperarLista(page);
    await auditar(page, variante, 'admin-contenidos');

    for (const [pantalla, ruta] of [
      ['admin-ruta', '/admin/ruta'],
      ['admin-directorio', '/admin/directorio'],
      ['admin-preguntas', '/admin/preguntas'],
      ['admin-recursos', '/admin/recursos'],
      ['admin-mensajes', '/admin/mensajes'],
      ['admin-contenido-nuevo', '/admin/contenidos/nuevo'],
      ['admin-entidad-nueva', '/admin/directorio/nueva']
    ]) {
      await visitarYAuditar(page, variante, pantalla, ruta);
    }

    await page.goto('/admin');
    await esperarLista(page);
    await page.locator('main a[href^="/admin/contenidos/"]:not([href$="/nuevo"])').first().click();
    await esperarLista(page);
    await auditar(page, variante, 'admin-contenido-existente');
  });

  test('aviso de vencimiento y sesión vencida', async ({ page, context, variante }) => {
    await page.clock.install();
    await page.goto('/admin');
    await esperarLista(page);
    await iniciarSesion(page, CUENTAS.administrador);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await esperarLista(page);
    // Con la página desplazada hasta abajo: la franja tiene que verse igual (sticky).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    await page.clock.fastForward(ANTES_DEL_AVISO);
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toHaveCount(0);
    await page.clock.fastForward(HASTA_EL_AVISO);
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await auditar(page, variante, 'admin-aviso-vencimiento');

    // Sin la cookie, la API responde 401 y la página muestra el formulario para volver a entrar.
    await context.clearCookies();
    await page.getByRole('button', { name: 'Seguir conectado' }).click();
    await expect(page.getByRole('heading', { name: 'Tu sesión se cerró' })).toBeVisible();
    await auditar(page, variante, 'admin-sesion-vencida');
  });
});

/* ---------- Registro conductual (M-09) ---------- */

/** Qué hay en la aplicación ahora; null si está cambiando de pantalla. */
function estadoDeLaAplicacion() {
  const principal = document.querySelector('main');
  if (!principal) return null;
  if (principal.querySelector('form.sus')) return 'sus';
  if (principal.querySelector('h1')?.textContent === 'Gracias') return 'gracias';
  const centro = principal.querySelector('.ensayo__centro');
  if (centro && centro.firstElementChild && !centro.querySelector('.ensayo__fijacion')) {
    return principal.querySelector('.ensayo--letras') ? 'estimulo-navon' : 'estimulo-cambio-regla';
  }
  if (principal.querySelector('button.tarea__continuar')) return 'pantalla';
  return null;
}

/**
 * Recorre la aplicación del participante hasta «Gracias» y audita la primera
 * pantalla de cada tipo. Devuelve la lista de pantallas auditadas.
 */
async function recorrerAplicacion(page, variante) {
  const auditadas = new Set();
  const auditarUnaVez = async (pantalla) => {
    if (auditadas.has(pantalla)) return;
    auditadas.add(pantalla);
    await auditar(page, variante, pantalla);
  };
  let tarea = 'cambio-regla';
  let practica = true;
  let pantallasDeLaTarea = 0;

  for (let paso = 0; paso < 400; paso += 1) {
    const estado = await (await page.waitForFunction(estadoDeLaAplicacion, null, { timeout: 15000 })).jsonValue();

    if (estado === 'gracias') {
      await expect(page.getByText('Todo quedó guardado.')).toBeVisible({ timeout: 15000 });
      await auditarUnaVez('aplicacion-gracias');
      return auditadas;
    }

    if (estado === 'sus') {
      await auditarUnaVez('aplicacion-sus');
      await page.getByRole('button', { name: 'Terminar' }).click();
      await expect(page.getByText('Falta responder algunas frases')).toBeVisible();
      await auditarUnaVez('aplicacion-sus-errores');
      const enunciados = page.locator('form.sus fieldset');
      const total = await enunciados.count();
      for (let i = 0; i < total; i += 1) await enunciados.nth(i).locator('input[type="radio"][value="3"]').check();
      await page.getByRole('button', { name: 'Terminar' }).click();
      await page.waitForFunction(() => !document.querySelector('form.sus'));
      continue;
    }

    if (estado.startsWith('estimulo')) {
      // El estímulo se toma antes de auditar: si el ensayo vence (5 s) durante la auditoría, ya no estaría.
      const estimulo = await page.locator('.ensayo__centro > *').first().elementHandle({ timeout: 5000 });
      await auditarUnaVez(`aplicacion-ensayo-${practica ? 'practica-' : ''}${tarea}`);
      await page.keyboard.press('KeyF');
      // Se espera a que el ensayo termine (el estímulo sale de la página) antes de seguir.
      await page.waitForFunction((elemento) => !elemento.isConnected, estimulo, { timeout: 15000 });
      continue;
    }

    // Una pantalla de texto con su botón «Continuar» (o el que corresponda).
    const titulo = ((await page.locator('main h2').first().textContent()) ?? '').trim();
    const esPausa = (await page.locator('main button[aria-expanded]').count()) > 0;
    const conRetroalimentacion = (await page.locator('.tarea__retroalimentacion').count()) > 0;
    if (titulo === ENTRE_TAREAS.titulo) {
      await auditarUnaVez('aplicacion-entre-tareas');
      tarea = 'navon';
      practica = true;
      pantallasDeLaTarea = 0;
    } else if (esPausa) {
      // La primera pausa de cada tarea es la del fin de la práctica; las demás, entre bloques (CT-08).
      await auditarUnaVez(titulo === PAUSA.titulo ? `aplicacion-pausa-${tarea}` : `aplicacion-fin-practica-${tarea}`);
      if (!auditadas.has('aplicacion-pausa-instrucciones')) {
        await page.locator('main button[aria-expanded]').click();
        await auditarUnaVez('aplicacion-pausa-instrucciones');
      }
      practica = false;
    } else if (conRetroalimentacion) {
      await auditarUnaVez(`aplicacion-retroalimentacion-${tarea}`);
    } else if (practica) {
      pantallasDeLaTarea += 1;
      await auditarUnaVez(`aplicacion-${tarea}-pantalla-${pantallasDeLaTarea}`);
    } else {
      await auditarUnaVez(`aplicacion-${tarea}-antes-del-bloque`);
    }
    const boton = page.locator('button.tarea__continuar');
    const elemento = await boton.elementHandle();
    await boton.click();
    await page.waitForFunction((b) => !b.isConnected, elemento, { timeout: 15000 });
  }
  throw new Error('La aplicación no llegó a «Gracias».');
}

test.describe('RA-01 a RA-11 registro conductual (M-09)', () => {
  test('zona del profesional y aplicación completa', async ({ page, variante }) => {
    test.slow();
    await visitarYAuditar(page, variante, 'registro-inicio-sesion', '/registro');
    await iniciarSesion(page, CUENTAS.profesional);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await esperarLista(page);
    // Cada variante termina eliminando su sesión: la lista empieza vacía en las tres.
    await expect(page.getByText(LISTA.vacia)).toBeVisible();
    await auditar(page, variante, 'registro-lista');

    await visitarYAuditar(page, variante, 'registro-nueva', '/registro/nueva');
    await page.getByRole('button', { name: 'Crear la sesión' }).click();
    await expect(page.getByText('No pudimos crear la sesión')).toBeVisible();
    await auditar(page, variante, 'registro-nueva-errores');
    await page.getByLabel('La persona firmó en papel el consentimiento informado.').check();
    await page.getByLabel('Versión del formato de consentimiento').fill('1.0');
    await page.getByLabel('La persona tiene 18 años o más.').check();
    await page.getByRole('button', { name: 'Crear la sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Sesión creada' })).toBeVisible();
    const seudonimo = (await page.locator('.seudonimo').textContent()).trim();
    await auditar(page, variante, 'registro-seudonimo');

    await page.getByRole('link', { name: 'Ver la sesión' }).click();
    await esperarLista(page);
    await auditar(page, variante, 'registro-detalle-en-curso');
    await page.getByRole('button', { name: 'Entregar el dispositivo y empezar' }).click();
    await page.waitForURL('**/registro/aplicacion');

    await recorrerAplicacion(page, variante);

    // De vuelta el profesional: la lista con la sesión y su detalle con los valores.
    await page.goto('/registro');
    await esperarLista(page);
    await iniciarSesion(page, CUENTAS.profesional);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await esperarLista(page);
    await auditar(page, variante, 'registro-lista-con-sesiones');
    await visitarYAuditar(page, variante, 'registro-detalle-completa', `/registro/sesiones/${seudonimo}`);
    await expect(page.getByRole('heading', { name: 'Valores observados' })).toBeVisible();
    await page.getByRole('button', { name: ELIMINAR.botonDetalle }).click();
    await auditar(page, variante, 'registro-detalle-eliminar');
    await page.getByRole('button', { name: ELIMINAR.confirmar }).click();
    await expect(page.getByText(ELIMINAR.eliminada(seudonimo))).toBeVisible();
    await esperarLista(page);
    await auditar(page, variante, 'registro-lista-tras-eliminar');
  });

  test('aviso de vencimiento en la zona del profesional', async ({ page, variante }) => {
    await page.clock.install();
    await page.goto('/registro');
    await esperarLista(page);
    await iniciarSesion(page, CUENTAS.profesional);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await esperarLista(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.clock.fastForward(ANTES_DEL_AVISO);
    await page.clock.fastForward(HASTA_EL_AVISO);
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toBeInViewport();
    await auditar(page, variante, 'registro-aviso-vencimiento');
    // «Seguir conectado» renueva la sesión y el aviso se va.
    await page.getByRole('button', { name: 'Seguir conectado' }).click();
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toHaveCount(0);
  });
});
