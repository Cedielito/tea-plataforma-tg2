/**
 * Lógica pura de la auditoría de accesibilidad y rendimiento (T10, RA-01 a
 * RA-11, RA-05 para el desplazamiento horizontal): registro
 * de cada pantalla, resumen por severidad y por regla, medianas de
 * Lighthouse, metas, variantes y compresión del servidor. La auditoría no
 * corre en el CI normal; estas pruebas sí.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { criteriosDe, esGrave, nivelDe, registroDePantalla } from './auditoria.js';
import { cumpleMetas, informeMarkdown, mediana, registroDeLighthouse, resumirAxe, resumirLighthouse, tablaMarkdown } from './resumen.js';
import { VARIANTES, scriptDeAjustes, varianteDe } from './variantes.js';
import { codificacionPara } from './servidor.js';
import { argumentosParaShell } from './lighthouse.js';
import { CLAVE_AJUSTES } from '../../src/accesibilidad/ajustes.js';

const violacion = (id, impact, nodos = 1, tags = ['wcag2aa', 'wcag143']) => ({
  id,
  impact,
  tags,
  help: `Ayuda de ${id}`,
  helpUrl: `https://dequeuniversity.com/rules/axe/4.13/${id}`,
  nodes: Array.from({ length: nodos }, (_, i) => ({ target: [`#n${i}`], html: `<p id="n${i}">x</p>`, failureSummary: 'Arreglar' }))
});

const resultadosAxe = (violations = []) => ({
  testEngine: { version: '4.13.0' },
  violations,
  incomplete: [{ id: 'color-contrast', impact: 'serious', tags: ['wcag2aa', 'wcag143'], nodes: [{ target: ['.a'] }, { target: ['.b'] }] }],
  passes: [{}, {}, {}]
});

const pantalla = (nombre, variante, violations, desbordamiento = null) =>
  registroDePantalla({ pantalla: nombre, variante, url: `/${nombre}`, resultados: resultadosAxe(violations), desbordamiento });

describe('RA-01 a RA-11 registro de una pantalla auditada con axe', () => {
  test('guarda regla, severidad, criterios de WCAG y elementos; las incompletas se cuentan aparte', () => {
    const registro = pantalla('inicio', 'normal', [violacion('color-contrast', 'serious', 2)]);
    assert.equal(registro.versionAxe, '4.13.0');
    assert.equal(registro.aprobadas, 3);
    assert.deepEqual(
      registro.incompletas.map((i) => [i.regla, i.severidad, i.nodos.map((n) => n.selector)]),
      [['color-contrast', 'serious', ['.a', '.b']]]
    );
    const [v] = registro.violaciones;
    assert.equal(v.regla, 'color-contrast');
    assert.equal(v.nivel, 'wcag');
    assert.deepEqual(v.criterios, ['1.4.3']);
    assert.deepEqual(v.nodos.map((n) => n.selector), ['#n0', '#n1']);
  });

  test('criterios a partir de las etiquetas y nivel de la regla', () => {
    assert.deepEqual(criteriosDe(['wcag2a', 'wcag111', 'wcag1410', 'cat.color', 'best-practice']), ['1.1.1', '1.4.10']);
    assert.equal(nivelDe(['cat.semantics', 'best-practice']), 'practica');
    assert.equal(nivelDe(['wcag21aa', 'wcag1410']), 'wcag');
  });

  test('graves son las críticas y las graves de axe', () => {
    assert.deepEqual(['critical', 'serious', 'moderate', 'minor'].map(esGrave), [true, true, false, false]);
  });
});

describe('RA-01 a RA-11 resumen de axe', () => {
  const registros = [
    pantalla('inicio', 'normal', [violacion('region', 'moderate', 2, ['best-practice'])]),
    pantalla('inicio', 'alto-contraste', [violacion('color-contrast', 'serious', 3), violacion('region', 'moderate', 1, ['best-practice'])]),
    pantalla('contacto', '320-px', [], { anchoVentana: 320, anchoPagina: 360, elementos: ['div.tabla (360 px)'] })
  ];
  const resumen = resumirAxe(registros);

  test('cuenta reglas, ocurrencias y elementos por severidad', () => {
    assert.equal(resumen.pantallas, 3);
    assert.deepEqual(resumen.porVariante, { '320-px': 1, 'alto-contraste': 1, normal: 1 });
    assert.deepEqual(resumen.porSeveridad.serious, { reglas: 1, ocurrencias: 1, nodos: 3 });
    assert.deepEqual(resumen.porSeveridad.moderate, { reglas: 1, ocurrencias: 2, nodos: 3 });
    assert.deepEqual(resumen.porSeveridad.critical, { reglas: 0, ocurrencias: 0, nodos: 0 });
    assert.equal(resumen.graves, 1);
  });

  test('ordena las reglas por severidad y junta pantallas y variantes', () => {
    assert.deepEqual(resumen.porRegla.map((r) => r.regla), ['color-contrast', 'region']);
    const region = resumen.porRegla[1];
    assert.deepEqual(region.pantallas, ['inicio']);
    assert.deepEqual(region.variantes, ['alto-contraste', 'normal']);
    assert.equal(region.nodos, 3);
  });

  test('junta las comprobaciones incompletas por regla, con sus selectores', () => {
    assert.deepEqual(
      resumen.incompletas.map((i) => [i.regla, i.pantallas, i.nodos, i.selectores]),
      [['color-contrast', ['contacto', 'inicio'], 6, ['.a', '.b']]]
    );
  });

  test('informa las pantallas con desplazamiento horizontal', () => {
    assert.deepEqual(resumen.desbordamientos, [
      { pantalla: 'contacto', variante: '320-px', anchoVentana: 320, anchoPagina: 360, elementos: ['div.tabla (360 px)'] }
    ]);
  });
});

/** Informe mínimo de Lighthouse con los campos que se leen. */
function informe({ accesibilidad = 1, rendimiento = 0.9, lcp = 2000, fallas = [] } = {}) {
  const audits = {
    'first-contentful-paint': { numericValue: 1000 },
    'largest-contentful-paint': { numericValue: lcp },
    'total-blocking-time': { numericValue: 50 },
    'cumulative-layout-shift': { numericValue: 0.01 },
    'speed-index': { numericValue: 1500 },
    'unused-javascript': { id: 'unused-javascript', title: 'Reduce unused JavaScript', details: { type: 'opportunity', overallSavingsMs: 300 } },
    'color-contrast': { id: 'color-contrast', title: 'Contraste', score: fallas.includes('color-contrast') ? 0 : 1 },
    'meta-viewport': { id: 'meta-viewport', title: 'Viewport', score: null }
  };
  return {
    lighthouseVersion: '12.8.2',
    environment: { benchmarkIndex: 1500 },
    categories: {
      accessibility: {
        score: accesibilidad,
        auditRefs: [
          { id: 'color-contrast', weight: 7 },
          { id: 'meta-viewport', weight: 10 }
        ]
      },
      performance: { score: rendimiento }
    },
    audits
  };
}

describe('RA-01 a RA-11 resumen de Lighthouse', () => {
  test('mediana con número par e impar de valores; sin valores, null', () => {
    assert.equal(mediana([3, 1, 2]), 2);
    assert.equal(mediana([4, 1, 3, 2]), 2.5);
    assert.equal(mediana([null, 5]), 5);
    assert.equal(mediana([]), null);
  });

  test('registro de un informe: puntajes de 0 a 100, métricas, fallas y oportunidades', () => {
    const registro = registroDeLighthouse({ pagina: 'inicio', ruta: '/', corrida: 1, informe: informe({ accesibilidad: 0.93, fallas: ['color-contrast'] }) });
    assert.equal(registro.accesibilidad, 93);
    assert.equal(registro.rendimiento, 90);
    assert.equal(registro.metricas.lcpMs, 2000);
    assert.deepEqual(registro.fallasAccesibilidad, [{ id: 'color-contrast', titulo: 'Contraste' }]);
    assert.deepEqual(registro.oportunidades, [{ id: 'unused-javascript', titulo: 'Reduce unused JavaScript', ahorroMs: 300 }]);
  });

  test('mediana por página entre corridas', () => {
    const corridas = [0.7, 0.9, 0.85].map((rendimiento, i) =>
      registroDeLighthouse({ pagina: 'inicio', ruta: '/', corrida: i + 1, informe: informe({ rendimiento, lcp: 1000 * (i + 1) }) })
    );
    const [pagina] = resumirLighthouse(corridas);
    assert.equal(pagina.corridas, 3);
    assert.equal(pagina.rendimiento, 85);
    assert.equal(pagina.rendimientoMinimo, 70);
    assert.equal(pagina.metricas.lcpMs, 2000);
  });

  test('las páginas van en el orden pedido; las que no están en él, al final', () => {
    const registro = (ruta) => registroDeLighthouse({ pagina: ruta, ruta, corrida: 1, informe: informe() });
    const rutas = resumirLighthouse(['/b', '/otra', '/', '/a'].map(registro), ['/', '/a', '/b']).map((p) => p.ruta);
    assert.deepEqual(rutas, ['/', '/a', '/b', '/otra']);
  });

  test('metas: 0 graves y sin desplazamiento; accesibilidad ≥ 90 y rendimiento ≥ 80 en cada página', () => {
    const axeLimpio = resumirAxe([pantalla('inicio', 'normal', [violacion('region', 'moderate', 1, ['best-practice'])])]);
    const axeGrave = resumirAxe([pantalla('inicio', 'normal', [violacion('label', 'critical')])]);
    const lighthouse = (accesibilidad, rendimiento) =>
      resumirLighthouse([registroDeLighthouse({ pagina: 'inicio', ruta: '/', corrida: 1, informe: informe({ accesibilidad, rendimiento }) })]);
    assert.deepEqual(cumpleMetas(axeLimpio, lighthouse(0.9, 0.8)), { axe: true, lighthouse: true, todas: true });
    assert.equal(cumpleMetas(axeGrave, lighthouse(1, 1)).axe, false);
    assert.equal(cumpleMetas(axeLimpio, lighthouse(0.89, 1)).lighthouse, false);
    assert.equal(cumpleMetas(axeLimpio, lighthouse(1, 0.79)).lighthouse, false);
    assert.equal(cumpleMetas(resumirAxe([]), lighthouse(1, 1)).axe, false);
    assert.equal(cumpleMetas(axeLimpio, []).lighthouse, false);
  });

  test('el informe en Markdown tiene las dos tablas y dice si se cumplen las metas', () => {
    const axe = resumirAxe([pantalla('inicio', 'normal', [violacion('region', 'moderate', 1, ['best-practice'])])]);
    const lighthouse = resumirLighthouse([registroDeLighthouse({ pagina: 'inicio', ruta: '/', corrida: 1, informe: informe() })]);
    const texto = informeMarkdown(axe, lighthouse);
    assert.match(texto, /\| Moderada \| 1 \| 1 \| 1 \|/);
    assert.match(texto, /\| `region` \| Moderada \| buena práctica \| normal \| inicio \| 1 \|/);
    assert.match(texto, /\| `\/` \| 100 \| 90 \| 1,0 s \| 2,0 s \| 50 ms \| 0,010 \| 1,5 s \|/);
    assert.match(texto, /Metas: .*: sí\. .*: sí\./);
  });

  test('las tablas escapan las barras verticales', () => {
    assert.equal(tablaMarkdown(['a'], [['x|y']]), '| a |\n|---|\n| x\\|y |');
  });
});

describe('RA-01 a RA-11 variantes y servidor de la auditoría', () => {
  test('tres variantes: normal, alto contraste y 320 px', () => {
    assert.deepEqual(Object.values(VARIANTES).map((v) => [v.nombre, v.viewport.width]), [
      ['normal', 1280],
      ['alto-contraste', 1280],
      ['320-px', 320]
    ]);
    assert.throws(() => varianteDe('otra'));
  });

  test('el alto contraste se deja en sessionStorage con la clave de la web, antes de cargar', () => {
    assert.equal(scriptDeAjustes(VARIANTES.normal), null);
    const guardado = new Map();
    const sessionStorage = { setItem: (clave, valor) => guardado.set(clave, valor) };
    new Function('sessionStorage', scriptDeAjustes(VARIANTES.altoContraste))(sessionStorage);
    assert.equal(JSON.parse(guardado.get(CLAVE_AJUSTES)).altoContraste, true);
  });

  test('en Windows, los argumentos de npx con espacios van entre comillas; en Linux y macOS, tal cual', () => {
    const argumentos = ['--yes', 'lighthouse@12.8.2', '--output-path=C:\\Users\\Ana María\\inicio-1.json'];
    assert.deepEqual(argumentosParaShell(argumentos, 'linux'), argumentos);
    assert.deepEqual(argumentosParaShell(argumentos, 'win32'), [
      '--yes',
      'lighthouse@12.8.2',
      '"--output-path=C:\\Users\\Ana María\\inicio-1.json"'
    ]);
  });

  test('el servidor envía brotli o gzip según Accept-Encoding, y sin comprimir lo que ya lo está', () => {
    const comprimible = { br: Buffer.from('b'), gzip: Buffer.from('g') };
    assert.equal(codificacionPara('gzip, deflate, br, zstd', comprimible), 'br');
    assert.equal(codificacionPara('gzip;q=1.0', comprimible), 'gzip');
    assert.equal(codificacionPara('', comprimible), null);
    assert.equal(codificacionPara(undefined, comprimible), null);
    assert.equal(codificacionPara('br', { crudo: Buffer.from('fuente') }), null);
  });
});
