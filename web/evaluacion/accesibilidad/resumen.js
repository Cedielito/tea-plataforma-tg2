/**
 * Resumen de la auditoría de accesibilidad y rendimiento (T10, RA-01 a
 * RA-11). Lógica pura: resumir.js lee los registros de resultados/ y escribe
 * con estas funciones las tablas de docs/evaluacion/accesibilidad.md.
 *
 * - axe: violaciones por severidad (cuántas reglas, cuántas veces en una
 *   pantalla y variante, cuántos elementos), por regla, las comprobaciones
 *   incompletas (para revisar a mano) y las pantallas que se desplazan a lo
 *   ancho.
 * - Lighthouse: mediana por página de los puntajes de accesibilidad y
 *   rendimiento y de las métricas, entre las corridas.
 * - Metas: 0 violaciones críticas o graves y ninguna pantalla con
 *   desplazamiento horizontal; Lighthouse accesibilidad ≥ 90 y rendimiento
 *   ≥ 80 en cada página.
 */
import { NOMBRES_SEVERIDAD, SEVERIDADES, esGrave } from './auditoria.js';

export const METAS = Object.freeze({ accesibilidad: 90, rendimiento: 80 });

/** Mediana; null si no hay valores. */
export function mediana(valores) {
  const ordenados = valores.filter((v) => typeof v === 'number' && !Number.isNaN(v)).sort((a, b) => a - b);
  if (ordenados.length === 0) return null;
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[mitad] : (ordenados[mitad - 1] + ordenados[mitad]) / 2;
}

const puntaje = (categoria) => (categoria && typeof categoria.score === 'number' ? Math.round(categoria.score * 100) : null);
const valorDe = (informe, auditoria) => informe.audits?.[auditoria]?.numericValue ?? null;

/**
 * Lo que se guarda de un informe de Lighthouse (el JSON de --output=json).
 * @param {{pagina: string, ruta: string, corrida: number, informe: object}} datos
 */
export function registroDeLighthouse({ pagina, ruta, corrida, informe }) {
  const accesibilidad = informe.categories?.accessibility;
  const fallas = (accesibilidad?.auditRefs ?? [])
    .filter((ref) => ref.weight > 0)
    .map((ref) => informe.audits[ref.id])
    .filter((auditoria) => auditoria && typeof auditoria.score === 'number' && auditoria.score < 1)
    .map((auditoria) => ({ id: auditoria.id, titulo: auditoria.title }));
  const oportunidades = Object.values(informe.audits ?? {})
    .filter((a) => a.details?.type === 'opportunity' && (a.details.overallSavingsMs ?? 0) > 0)
    .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
    .slice(0, 5)
    .map((a) => ({ id: a.id, titulo: a.title, ahorroMs: Math.round(a.details.overallSavingsMs) }));
  return {
    pagina,
    ruta,
    corrida,
    versionLighthouse: informe.lighthouseVersion ?? null,
    indiceEquipo: informe.environment?.benchmarkIndex ?? null,
    accesibilidad: puntaje(accesibilidad),
    rendimiento: puntaje(informe.categories?.performance),
    metricas: {
      fcpMs: valorDe(informe, 'first-contentful-paint'),
      lcpMs: valorDe(informe, 'largest-contentful-paint'),
      tbtMs: valorDe(informe, 'total-blocking-time'),
      cls: valorDe(informe, 'cumulative-layout-shift'),
      siMs: valorDe(informe, 'speed-index')
    },
    fallasAccesibilidad: fallas,
    oportunidades
  };
}

/** Agrupa por regla las violaciones o las incompletas de los registros. */
function agruparPorRegla(registros, campo) {
  const porRegla = new Map();
  for (const registro of registros) {
    for (const resultado of registro[campo]) {
      const regla = porRegla.get(resultado.regla) ?? {
        regla: resultado.regla,
        severidad: resultado.severidad,
        nivel: resultado.nivel,
        criterios: resultado.criterios,
        ayuda: resultado.ayuda,
        pantallas: new Set(),
        variantes: new Set(),
        selectores: new Set(),
        nodos: 0
      };
      regla.pantallas.add(registro.pantalla);
      regla.variantes.add(registro.variante);
      resultado.nodos.forEach((n) => regla.selectores.add(n.selector));
      regla.nodos += resultado.nodos.length;
      porRegla.set(resultado.regla, regla);
    }
  }
  const orden = (regla) => SEVERIDADES.indexOf(regla.severidad);
  return [...porRegla.values()]
    .sort((a, b) => orden(a) - orden(b) || a.regla.localeCompare(b.regla))
    .map((r) => ({ ...r, pantallas: [...r.pantallas].sort(), variantes: [...r.variantes].sort(), selectores: [...r.selectores] }));
}

/** @param {object[]} registros los de registroDePantalla (auditoria.js) */
export function resumirAxe(registros) {
  const porSeveridad = Object.fromEntries(SEVERIDADES.map((s) => [s, { reglas: new Set(), ocurrencias: 0, nodos: 0 }]));
  const variantes = new Map();
  for (const registro of registros) {
    variantes.set(registro.variante, (variantes.get(registro.variante) ?? 0) + 1);
    for (const violacion of registro.violaciones) {
      const severidad = porSeveridad[violacion.severidad] ?? porSeveridad.minor;
      severidad.reglas.add(violacion.regla);
      severidad.ocurrencias += 1;
      severidad.nodos += violacion.nodos.length;
    }
  }
  return {
    pantallas: registros.length,
    porVariante: Object.fromEntries([...variantes].sort()),
    porSeveridad: Object.fromEntries(
      Object.entries(porSeveridad).map(([s, { reglas, ocurrencias, nodos }]) => [s, { reglas: reglas.size, ocurrencias, nodos }])
    ),
    porRegla: agruparPorRegla(registros, 'violaciones'),
    incompletas: agruparPorRegla(registros, 'incompletas'),
    desbordamientos: registros
      .filter((r) => r.desbordamiento)
      .map((r) => ({ pantalla: r.pantalla, variante: r.variante, ...r.desbordamiento })),
    graves: SEVERIDADES.filter(esGrave).reduce((total, s) => total + porSeveridad[s].ocurrencias, 0)
  };
}

/**
 * @param {object[]} registros los de registroDeLighthouse
 * @param {string[]} [orden] rutas en el orden en que van en la tabla; las demás, al final
 */
export function resumirLighthouse(registros, orden = []) {
  const porPagina = new Map();
  for (const registro of registros) {
    const lista = porPagina.get(registro.ruta) ?? [];
    lista.push(registro);
    porPagina.set(registro.ruta, lista);
  }
  const posicion = (ruta) => (orden.includes(ruta) ? orden.indexOf(ruta) : orden.length);
  const paginas = [...porPagina.entries()].sort(([a], [b]) => posicion(a) - posicion(b));
  return paginas.map(([ruta, corridas]) => {
    const metrica = (nombre) => mediana(corridas.map((c) => c.metricas[nombre]));
    const fallas = new Map(corridas.flatMap((c) => c.fallasAccesibilidad).map((f) => [f.id, f]));
    return {
      ruta,
      pagina: corridas[0].pagina,
      corridas: corridas.length,
      accesibilidad: mediana(corridas.map((c) => c.accesibilidad)),
      rendimiento: mediana(corridas.map((c) => c.rendimiento)),
      rendimientoMinimo: Math.min(...corridas.map((c) => c.rendimiento ?? Infinity)),
      metricas: { fcpMs: metrica('fcpMs'), lcpMs: metrica('lcpMs'), tbtMs: metrica('tbtMs'), cls: metrica('cls'), siMs: metrica('siMs') },
      fallasAccesibilidad: [...fallas.values()],
      versionLighthouse: corridas[0].versionLighthouse
    };
  });
}

/** Si se cumplen las metas de T10. Sin registros de una herramienta, su parte no se cumple. */
export function cumpleMetas(axe, lighthouse) {
  const axeCumple = axe.pantallas > 0 && axe.graves === 0 && axe.desbordamientos.length === 0;
  const lighthouseCumple =
    lighthouse.length > 0 &&
    lighthouse.every((p) => p.accesibilidad >= METAS.accesibilidad && p.rendimiento >= METAS.rendimiento);
  return { axe: axeCumple, lighthouse: lighthouseCumple, todas: axeCumple && lighthouseCumple };
}

/** Tabla de Markdown; las barras verticales del contenido se escapan. */
export function tablaMarkdown(encabezados, filas) {
  const celda = (valor) => String(valor ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
  return [
    `| ${encabezados.map(celda).join(' | ')} |`,
    `|${encabezados.map(() => '---').join('|')}|`,
    ...filas.map((fila) => `| ${fila.map(celda).join(' | ')} |`)
  ].join('\n');
}

const segundos = (ms) => (ms == null ? null : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);
const decimal = (valor, cifras = 3) => (valor == null ? null : valor.toFixed(cifras).replace('.', ','));
const marca = (cumple) => (cumple ? 'sí' : 'no');

/** Informe en Markdown con las tablas de axe y de Lighthouse. */
export function informeMarkdown(axe, lighthouse) {
  const metas = cumpleMetas(axe, lighthouse);
  const partes = [];
  partes.push('### axe-core: violaciones por severidad', '');
  partes.push(
    `${axe.pantallas} pantallas auditadas (${Object.entries(axe.porVariante)
      .map(([v, n]) => `${v}: ${n}`)
      .join('; ')}).`,
    ''
  );
  partes.push(
    tablaMarkdown(
      ['Severidad', 'Reglas', 'Ocurrencias (pantalla × variante)', 'Elementos'],
      SEVERIDADES.map((s) => [NOMBRES_SEVERIDAD[s], axe.porSeveridad[s].reglas, axe.porSeveridad[s].ocurrencias, axe.porSeveridad[s].nodos])
    ),
    ''
  );
  if (axe.porRegla.length > 0) {
    partes.push('### axe-core: violaciones por regla', '');
    partes.push(
      tablaMarkdown(
        ['Regla', 'Severidad', 'WCAG', 'Variantes', 'Pantallas', 'Elementos'],
        axe.porRegla.map((r) => [
          `\`${r.regla}\``,
          NOMBRES_SEVERIDAD[r.severidad] ?? r.severidad,
          r.criterios.length ? r.criterios.join(', ') : 'buena práctica',
          r.variantes.join(', '),
          r.pantallas.length > 6 ? `${r.pantallas.slice(0, 6).join(', ')} y ${r.pantallas.length - 6} más` : r.pantallas.join(', '),
          r.nodos
        ])
      ),
      ''
    );
  }
  if (axe.incompletas.length > 0) {
    partes.push('### axe-core: comprobaciones incompletas (se revisan a mano)', '');
    partes.push(
      tablaMarkdown(
        ['Regla', 'Severidad si fallara', 'Variantes', 'Pantallas', 'Elementos', 'Selectores'],
        axe.incompletas.map((r) => [
          `\`${r.regla}\``,
          NOMBRES_SEVERIDAD[r.severidad] ?? r.severidad,
          r.variantes.join(', '),
          r.pantallas.length > 6 ? `${r.pantallas.slice(0, 6).join(', ')} y ${r.pantallas.length - 6} más` : r.pantallas.join(', '),
          r.nodos,
          r.selectores.slice(0, 6).map((sel) => `\`${sel}\``).join(', ')
        ])
      ),
      ''
    );
  }
  partes.push(
    axe.desbordamientos.length === 0
      ? 'Ninguna pantalla se desplaza a lo ancho.'
      : `Pantallas que se desplazan a lo ancho: ${axe.desbordamientos.map((d) => `${d.pantalla} (${d.variante}, ${d.anchoPagina} px)`).join('; ')}.`,
    ''
  );
  if (lighthouse.length > 0) {
    partes.push(`### Lighthouse ${lighthouse[0].versionLighthouse ?? ''} (móvil): mediana de ${lighthouse[0].corridas} corridas`, '');
    partes.push(
      tablaMarkdown(
        ['Página', 'Accesibilidad', 'Rendimiento', 'FCP', 'LCP', 'TBT', 'CLS', 'Speed Index'],
        lighthouse.map((p) => [
          `\`${p.ruta}\``,
          p.accesibilidad,
          p.rendimiento,
          segundos(p.metricas.fcpMs),
          segundos(p.metricas.lcpMs),
          p.metricas.tbtMs == null ? null : `${Math.round(p.metricas.tbtMs)} ms`,
          decimal(p.metricas.cls),
          segundos(p.metricas.siMs)
        ])
      ),
      ''
    );
    const conFallas = lighthouse.filter((p) => p.fallasAccesibilidad.length > 0);
    if (conFallas.length > 0) {
      partes.push(
        'Auditorías de accesibilidad de Lighthouse que no pasan: ' +
          conFallas.map((p) => `\`${p.ruta}\`: ${p.fallasAccesibilidad.map((f) => f.id).join(', ')}`).join('; ') +
          '.',
        ''
      );
    }
  }
  partes.push(
    `Metas: axe sin críticas ni graves y sin desplazamiento horizontal: ${marca(metas.axe)}. ` +
      `Lighthouse accesibilidad ≥ ${METAS.accesibilidad} y rendimiento ≥ ${METAS.rendimiento} en cada página: ${marca(metas.lighthouse)}.`
  );
  return `${partes.join('\n')}\n`;
}
