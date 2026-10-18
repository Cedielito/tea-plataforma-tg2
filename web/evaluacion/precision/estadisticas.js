/**
 * Resumen del experimento de precisión temporal por celda (motor, reloj y
 * carga) (M-09, CT-07, T16). Funciones puras.
 *
 * Por celda, del error (errorMs) y de su cota superior (errorCotaMs):
 * - n, media y desviación estándar (muestral, n − 1);
 * - percentil 95 del error absoluto (interpolación lineal entre los dos
 *   valores ordenados más cercanos, como PERCENTIL.INCLUIR de una hoja de
 *   cálculo);
 * - porcentaje de ensayos con error absoluto de 50 ms o menos (CT-07).
 *
 * Una celda con carga en la que el percentil 95 del desvío absoluto del arnés
 * sube más de UMBRAL_DESVIO_ARNES_MS frente a la celda 'normal' del mismo motor
 * y reloj queda marcada: con la carga, la tecla llegó tarde (por ejemplo,
 * porque el motor la marca cuando el hilo principal se libera), el arnés no
 * pudo separar esa espera y en la celda vale la cota superior. Que el desvío
 * varíe sin carga no invalida el error: la pulsación se mide igual.
 */

export const UMBRAL_CT07_MS = 50;
export const UMBRAL_DESVIO_ARNES_MS = 10;
export const MINIMO_ENSAYOS_POR_CELDA = 200;

export const ORDEN = Object.freeze({
  motor: Object.freeze(['chromium', 'firefox', 'webkit']),
  reloj: Object.freeze(['animacion', 'referencia']),
  carga: Object.freeze(['normal', 'hilo-ocupado', 'cpu-x4'])
});

const numeros = (valores) => valores.filter((v) => typeof v === 'number' && Number.isFinite(v));

export function media(valores) {
  const v = numeros(valores);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function desviacionEstandar(valores) {
  const v = numeros(valores);
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

/** Percentil p (0 a 100) con interpolación lineal entre los valores ordenados. */
export function percentil(valores, p) {
  const v = numeros(valores).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const posicion = (p / 100) * (v.length - 1);
  const abajo = Math.floor(posicion);
  const arriba = Math.ceil(posicion);
  return v[abajo] + (v[arriba] - v[abajo]) * (posicion - abajo);
}

/** Resumen de una lista de errores en ms. */
export function resumirErrores(errores) {
  const v = numeros(errores);
  const absolutos = v.map(Math.abs);
  return {
    n: v.length,
    media: media(v),
    desviacion: desviacionEstandar(v),
    p95Absoluto: percentil(absolutos, 95),
    porcentajeDentro: v.length ? (100 * absolutos.filter((x) => x <= UMBRAL_CT07_MS).length) / v.length : null
  };
}

const lugar = (eje, valor) => {
  const i = ORDEN[eje].indexOf(valor);
  return i === -1 ? ORDEN[eje].length : i;
};

/**
 * Celdas del experimento a partir de las filas de los CSV (valores ya como
 * números), en el orden motor, reloj y carga.
 */
export function resumirCeldas(filas) {
  const grupos = new Map();
  for (const fila of filas) {
    const clave = `${fila.motor}|${fila.reloj}|${fila.carga}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(fila);
  }
  const celdas = [...grupos.values()].map((grupo) => {
    const [{ motor, versionMotor, reloj, carga }] = grupo;
    return {
      motor,
      versionMotor,
      reloj,
      carga,
      sesiones: new Set(grupo.map((f) => f.sesion)).size,
      error: resumirErrores(grupo.map((f) => f.errorMs)),
      cota: resumirErrores(grupo.map((f) => f.errorCotaMs)),
      p95DesvioArnes: percentil(grupo.map((f) => Math.abs(f.desvioArnesMs)), 95),
      pocosEnsayos: grupo.length < MINIMO_ENSAYOS_POR_CELDA
    };
  });
  for (const celda of celdas) {
    const normal = celdas.find((c) => c.motor === celda.motor && c.reloj === celda.reloj && c.carga === 'normal');
    celda.aumentoDesvioArnes =
      normal && celda !== normal && celda.p95DesvioArnes !== null && normal.p95DesvioArnes !== null
        ? celda.p95DesvioArnes - normal.p95DesvioArnes
        : null;
    celda.soloCota = celda.aumentoDesvioArnes !== null && celda.aumentoDesvioArnes > UMBRAL_DESVIO_ARNES_MS;
  }
  return celdas.sort(
      (a, b) =>
        lugar('motor', a.motor) - lugar('motor', b.motor) ||
        lugar('reloj', a.reloj) - lugar('reloj', b.reloj) ||
        lugar('carga', a.carga) - lugar('carga', b.carga)
    );
}

const FORMATO = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ms = (valor) => (valor === null ? '—' : FORMATO.format(valor));
const porcentaje = (valor) => (valor === null ? '—' : `${FORMATO.format(valor)} %`);

/** Tabla en Markdown de una medida ('error' o 'cota') por celda. */
export function tablaMarkdown(celdas, medida = 'error') {
  const encabezado = [
    '| Motor | Reloj | Carga | n | Media (ms) | DE (ms) | P95 abs. (ms) | ≤ 50 ms |',
    '|---|---|---|---:|---:|---:|---:|---:|'
  ];
  const filas = celdas.map((c) => {
    const r = c[medida];
    const marcas = [c.soloCota && medida === 'error' ? '¹' : '', c.pocosEnsayos ? '²' : ''].join('');
    return `| ${c.motor} ${c.versionMotor} | ${c.reloj} | ${c.carga}${marcas} | ${r.n} | ${ms(r.media)} | ${ms(r.desviacion)} | ${ms(r.p95Absoluto)} | ${porcentaje(r.porcentajeDentro)} |`;
  });
  return [...encabezado, ...filas].join('\n');
}
