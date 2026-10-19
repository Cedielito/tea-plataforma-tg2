'use strict';
const { media, desviacionEstandar } = require('../src/dominio/registro/indicadores');

/**
 * Estadistica del analisis de la evaluacion con adultos
 * (analisisEvaluacion.js). M-09, CT-13
 *
 * Funciones puras y sin dependencias: la misma entrada da la misma salida.
 * - Media y desviacion estandar muestral (n - 1): las de indicadores.js.
 * - Intervalo de confianza de la media con la t de Student. El cuantil se
 *   calcula, no se lee de una tabla: la funcion de distribucion de la t sale
 *   de la beta incompleta regularizada (fraccion continua de Lentz) y el
 *   cuantil, por biseccion.
 * - Correlacion de Pearson y correccion de Spearman-Brown, 2r / (1 + r).
 */

const NIVEL_CONFIANZA = 0.95;

/** Coeficientes de Lanczos (g = 5, n = 6) para ln Γ(x), x > 0. */
const LANCZOS = Object.freeze([
  76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
  -0.5395239384953e-5
]);

function lnGamma(x) {
  const t = x + 5.5;
  let serie = 1.000000000190015;
  LANCZOS.forEach((c, i) => {
    serie += c / (x + 1 + i);
  });
  return -(t - (x + 0.5) * Math.log(t)) + Math.log((2.5066282746310005 * serie) / x);
}

const MINIMO = 1e-300;
const evitarCero = (v) => (Math.abs(v) < MINIMO ? MINIMO : v);

/** Fraccion continua de la beta incompleta (metodo de Lentz modificado). */
function fraccionContinua(x, a, b) {
  const suma = a + b;
  let c = 1;
  let d = 1 / evitarCero(1 - (suma * x) / (a + 1));
  let h = d;
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;
    const par = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));
    d = 1 / evitarCero(1 + par * d);
    c = evitarCero(1 + par / c);
    h *= d * c;
    const impar = (-(a + m) * (suma + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 / evitarCero(1 + impar * d);
    c = evitarCero(1 + impar / c);
    const paso = d * c;
    h *= paso;
    if (Math.abs(paso - 1) < 3e-16) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a, b). */
function betaIncompleta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? (factor * fraccionContinua(x, a, b)) / a
    : 1 - (factor * fraccionContinua(1 - x, b, a)) / b;
}

/** P(T ≤ t) para la t de Student con `gl` grados de libertad. */
function distribucionT(t, gl) {
  const cola = 0.5 * betaIncompleta(gl / (gl + t * t), gl / 2, 0.5);
  return t >= 0 ? 1 - cola : cola;
}

/** Cuantil p (0.5 < p < 1) de la t de Student, por biseccion. */
function cuantilT(p, gl) {
  let bajo = 0;
  let alto = 1;
  while (distribucionT(alto, gl) < p) alto *= 2;
  for (let i = 0; i < 200 && alto - bajo > 1e-12; i += 1) {
    const medio = (bajo + alto) / 2;
    if (distribucionT(medio, gl) < p) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

function numeros(valores) {
  return (valores || []).filter((x) => typeof x === 'number' && Number.isFinite(x));
}

/**
 * n, media, desviacion estandar e intervalo de confianza de la media:
 * media ± t(1 - α/2; n - 1) · DE / √n. Con menos de 2 valores no hay
 * desviacion ni intervalo.
 */
function describirMuestra(valores, nivel = NIVEL_CONFIANZA) {
  const v = numeros(valores);
  const n = v.length;
  const m = media(v);
  const de = desviacionEstandar(v);
  if (de === null) return { n, media: m, de: null, gl: null, t: null, ic95: null };
  const gl = n - 1;
  const t = cuantilT(1 - (1 - nivel) / 2, gl);
  const margen = (t * de) / Math.sqrt(n);
  return { n, media: m, de, gl, t, ic95: [m - margen, m + margen] };
}

function mediana(valores) {
  const v = [...numeros(valores)].sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mitad = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mitad] : (v[mitad - 1] + v[mitad]) / 2;
}

/** r de Pearson entre dos listas pareadas; null con menos de 3 pares o sin varianza. */
function pearson(x, y) {
  const n = x.length;
  if (n !== y.length || n < 3) return null;
  const mx = media(x);
  const my = media(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Correccion de Spearman-Brown para la prueba completa: 2r / (1 + r). */
function spearmanBrown(r) {
  if (typeof r !== 'number' || r <= -1) return null;
  return (2 * r) / (1 + r);
}

module.exports = {
  NIVEL_CONFIANZA,
  betaIncompleta,
  distribucionT,
  cuantilT,
  describirMuestra,
  mediana,
  pearson,
  spearmanBrown
};
