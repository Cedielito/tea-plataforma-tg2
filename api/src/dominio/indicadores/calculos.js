'use strict';

/**
 * Indicadores de DESEMPENO EN TAREA (CC-01 a CC-12), segun la codificacion
 * del Cuadro 12 del documento de trabajo de grado.
 *
 * Se calculan exclusivamente sobre la ejecucion de los minijuegos. Los dominios
 * que no se manifiestan en la ejecucion de una tarea en navegador (B1, B3, B4 y
 * la vertiente expresiva de A2) NO se estiman aqui: se cubren mediante el
 * modulo de reporte del cuidador (reporte.js).
 *
 * Regla transversal: los ensayos de practica y los items omitidos se excluyen
 * de todo calculo de precision; la omision nunca se computa como error.
 */

function soloPuntuados(ensayos) {
  return (ensayos || []).filter((e) => e && e.practica !== true);
}

/** Items efectivamente respondidos: excluye practica y omisiones. */
function soloRespondidos(ensayos) {
  return soloPuntuados(ensayos).filter((e) => e.estadoItem !== 'omitido');
}

function proporcionAciertos(ensayos) {
  const e = soloRespondidos(ensayos);
  if (e.length === 0) return null;
  return e.filter((x) => x.acierto === true).length / e.length;
}

/** Tasa de omision: variable contextual, no indicador conductual. */
function tasaOmision(ensayos) {
  const e = soloPuntuados(ensayos);
  if (e.length === 0) return null;
  return e.filter((x) => x.estadoItem === 'omitido').length / e.length;
}

/**
 * Tiempo de reaccion neto: descuenta el intervalo pausado durante el item.
 * El cliente mide con reloj monotonico; aqui solo se resta la pausa.
 */
function trNeto(ensayo) {
  if (!ensayo || typeof ensayo.tiempoReaccionMs !== 'number') return null;
  return ensayo.tiempoReaccionMs - (ensayo.pausasDuranteItemMs || 0);
}

function tiemposNetos(ensayos) {
  return soloRespondidos(ensayos).map(trNeto).filter((x) => typeof x === 'number');
}

function mediana(valores) {
  const v = (valores || []).filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function media(valores) {
  const v = (valores || []).filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function desviacionEstandar(valores) {
  const v = (valores || []).filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

function porConstructo(ensayos, constructo) {
  return soloPuntuados(ensayos).filter((e) => e.constructo === constructo);
}

/** CC-01. Reconocimiento de estados mentales a partir de la mirada. */
const cc01 = (ensayos) => proporcionAciertos(
  porConstructo(ensayos, 'emociones_basicas').concat(porConstructo(ensayos, 'estados_complejos'))
);

/** CC-02. Latencia de decision socioemocional: mediana del TR neto. */
const cc02 = (ensayos) => mediana(tiemposNetos(ensayos));

/**
 * CC-03. Indice de complejidad emocional: contraste intraindividual entre
 * emociones basicas y estados complejos. Controla el desempeno general del
 * participante y aisla la dificultad especifica.
 */
function cc03(ensayos) {
  const basicas = proporcionAciertos(porConstructo(ensayos, 'emociones_basicas'));
  const complejas = proporcionAciertos(porConstructo(ensayos, 'estados_complejos'));
  if (basicas === null || complejas === null) return null;
  return basicas - complejas;
}

/**
 * CC-11. Matriz de confusion entre el estado presentado y el seleccionado.
 * Permite identificar pares de confusion sistematica.
 */
function cc11(ensayos) {
  const e = soloRespondidos(ensayos).filter((x) => x.presentado && x.respuesta);
  if (e.length === 0) return null;
  const matriz = {};
  for (const x of e) {
    if (!matriz[x.presentado]) matriz[x.presentado] = {};
    matriz[x.presentado][x.respuesta] = (matriz[x.presentado][x.respuesta] || 0) + 1;
  }
  return matriz;
}

/** CC-04 y CC-05. Falsa creencia de primer y de segundo orden. */
const cc04 = (ensayos) => proporcionAciertos(porConstructo(ensayos, 'falsa_creencia_primer_orden'));
const cc05 = (ensayos) => proporcionAciertos(porConstructo(ensayos, 'falsa_creencia_segundo_orden'));

/** CC-06. Deteccion de faux pas. */
const cc06 = (ensayos) => proporcionAciertos(porConstructo(ensayos, 'faux_pas'));

/**
 * CC-07. Indice de inferencia social: contraste entre secuencias mecanicas
 * (linea base de control, sin atribucion mental) y secuencias sociales.
 * Es la metrica de mayor valor discriminativo de MJ-2: al controlar la
 * capacidad general de secuenciacion, aisla la dificultad de atribucion.
 */
function cc07(ensayos) {
  const mecanica = proporcionAciertos(porConstructo(ensayos, 'secuencia_mecanica'));
  const social = proporcionAciertos(porConstructo(ensayos, 'secuencia_social'));
  if (mecanica === null || social === null) return null;
  return mecanica - social;
}

/**
 * CC-08. Indice de perseveracion. Solo computa los errores clasificados como
 * perseverativos en el momento del registro: la respuesta emitida habria sido
 * correcta bajo la regla vigente antes del cambio. Un error que no corresponde
 * ni a la regla anterior ni a la nueva se clasifica como aleatorio y no suma.
 */
function cc08(ensayos) {
  const post = soloRespondidos(ensayos).filter((e) => e.posteriorACambio === true);
  if (post.length === 0) return null;
  return post.filter((e) => e.claseError === 'perseverativa').length / post.length;
}

/** CC-12. Ensayos hasta criterio: cuantos ensayos post-cambio hasta 3 aciertos seguidos. */
function cc12(ensayos) {
  const post = soloRespondidos(ensayos).filter((e) => e.posteriorACambio === true);
  if (post.length === 0) return null;
  let seguidos = 0;
  for (let i = 0; i < post.length; i += 1) {
    seguidos = post[i].acierto === true ? seguidos + 1 : 0;
    if (seguidos === 3) return i + 1;
  }
  return null;
}

/** CC-09. Costo de cambio: TR neto posterior al cambio menos TR neto previo. */
function cc09(ensayos) {
  const e = soloRespondidos(ensayos);
  const post = media(e.filter((x) => x.posteriorACambio === true).map(trNeto));
  const pre = media(e.filter((x) => x.posteriorACambio !== true).map(trNeto));
  if (post === null || pre === null) return null;
  return post - pre;
}

/** CC-10. Sesgo de procesamiento local: latencia global menos latencia local. */
function cc10(ensayos) {
  const e = soloRespondidos(ensayos);
  const global = media(e.filter((x) => x.condicion === 'global').map(trNeto));
  const local = media(e.filter((x) => x.condicion === 'local').map(trNeto));
  if (global === null || local === null) return null;
  return global - local;
}

/**
 * Variables contextuales. Se registran para interpretar los indicadores, NUNCA
 * como indicadores en si mismas y nunca asociadas a un dominio del DSM-5-TR.
 */
function variablesContextuales(ensayos, sesion) {
  const tr = tiemposNetos(ensayos);
  const m = media(tr);
  const s = desviacionEstandar(tr);
  return {
    tasaOmision: tasaOmision(ensayos),
    variabilidadTiempoReaccion: s,
    coeficienteVariacion: m && s ? s / m : null,
    rectificacionesPromedio: media(soloRespondidos(ensayos).map((e) => e.rectificaciones || 0)),
    repeticionesInstruccion: sesion ? sesion.repeticionesInstruccion : null,
    pausas: sesion ? sesion.pausas : null,
    tipoEntrada: sesion ? sesion.tipoEntrada : null
  };
}

const INDICADORES = {
  'CC-01': { fn: cc01, dominio: 'A2', vertiente: 'receptiva', origen: 'desempeno', componente: 'MJ-1' },
  'CC-02': { fn: cc02, dominio: 'A2', vertiente: 'receptiva', origen: 'desempeno', componente: 'MJ-1' },
  'CC-03': { fn: cc03, dominio: 'A2', vertiente: 'receptiva', origen: 'desempeno', componente: 'MJ-1' },
  'CC-04': { fn: cc04, dominio: 'A1', origen: 'desempeno', componente: 'MJ-2' },
  'CC-05': { fn: cc05, dominio: 'A1', origen: 'desempeno', componente: 'MJ-2' },
  'CC-06': { fn: cc06, dominio: 'A1', origen: 'desempeno', componente: 'MJ-2' },
  'CC-07': { fn: cc07, dominio: 'A3', origen: 'desempeno', componente: 'MJ-2' },
  'CC-08': { fn: cc08, dominio: 'B2', origen: 'desempeno', componente: 'MJ-3' },
  'CC-09': { fn: cc09, dominio: 'B2', origen: 'desempeno', componente: 'MJ-3' },
  // Coherencia central: constructo perceptivo, no es un dominio del DSM-5-TR
  'CC-10': { fn: cc10, dominio: null, constructo: 'coherencia_central', origen: 'desempeno', componente: 'MJ-3' },
  'CC-11': { fn: cc11, dominio: 'A2', vertiente: 'receptiva', origen: 'desempeno', componente: 'MJ-1', tipo: 'matriz' },
  'CC-12': { fn: cc12, dominio: 'B2', origen: 'desempeno', componente: 'MJ-3' }
};

module.exports = {
  INDICADORES, soloPuntuados, soloRespondidos, proporcionAciertos, tasaOmision,
  trNeto, tiemposNetos, mediana, media, desviacionEstandar, variablesContextuales,
  cc01, cc02, cc03, cc11, cc04, cc05, cc06, cc07, cc08, cc12, cc09, cc10
};
