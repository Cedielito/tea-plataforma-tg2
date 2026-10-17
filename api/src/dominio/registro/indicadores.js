'use strict';
const { TAREAS, FASES, CONDICIONES, TR_MINIMO_MS } = require('./catalogo');

/**
 * Indicadores de desempeno de las dos tareas del registro conductual. M-09,
 * CC-08, CC-09, CC-10, CC-12, RF-13, RF-14
 *
 * Cada indicador es un valor observado en una tarea: no se suma con otros, no
 * se compara con un punto de corte y no se asocia a ninguna categoria.
 *
 * - RF-14: los ensayos de practica, las omisiones y las anticipaciones (tiempo
 *   de reaccion neto menor que `trMinimoMs`) no entran al calculo. La omision
 *   nunca cuenta como error.
 * - RF-13: los indicadores de tiempo usan el tiempo de reaccion neto, sin las
 *   pausas ocurridas durante el ensayo.
 * - CC-09 y CC-10 promedian solo los aciertos. No se recortan valores por
 *   desviacion estandar: con 7 ensayos por bloque no hay datos suficientes.
 *
 * Cada ensayo llega como lo registra el motor de ensayos (T13), en el orden en
 * que se presento:
 *   { tarea, bloque, fase, regla, condicion, practica, estadoItem
 *     ('respondido' | 'omitido'), acierto, claseError ('correcta' |
 *     'perseverativa' | 'aleatoria'), tiempoReaccionMs, pausasDuranteItemMs,
 *     rectificaciones }
 * `claseError` se asigna al registrar el ensayo: un error es perseverativo si
 * la respuesta habria sido correcta con la regla anterior al cambio.
 *
 * Traido de fase-ii (api/src/dominio/indicadores/calculos.js): solo los
 * indicadores de estas dos tareas, sin el campo `dominio` y con CC-09 por
 * ensayo en los bloques mixtos.
 */

function opcionesPorDefecto(opciones) {
  const tr = opciones && opciones.trMinimoMs;
  return { trMinimoMs: typeof tr === 'number' ? tr : TR_MINIMO_MS };
}

/** RF-13. Tiempo de reaccion menos el intervalo pausado durante el ensayo. */
function trNeto(ensayo) {
  if (!ensayo || typeof ensayo.tiempoReaccionMs !== 'number') return null;
  return ensayo.tiempoReaccionMs - (ensayo.pausasDuranteItemMs || 0);
}

/** Ensayos fuera de la practica. */
function soloPuntuados(ensayos) {
  return (Array.isArray(ensayos) ? ensayos : []).filter((e) => e && e.practica !== true);
}

function esOmision(ensayo) {
  return ensayo.estadoItem === 'omitido';
}

function esAnticipacion(ensayo, opciones) {
  const tr = trNeto(ensayo);
  return !esOmision(ensayo) && typeof tr === 'number' && tr < opcionesPorDefecto(opciones).trMinimoMs;
}

/** RF-14. Ensayos que entran al calculo: sin practica, omisiones ni anticipaciones. */
function soloRespondidos(ensayos, opciones) {
  return soloPuntuados(ensayos).filter((e) => !esOmision(e) && !esAnticipacion(e, opciones));
}

function soloAciertos(ensayos, opciones) {
  return soloRespondidos(ensayos, opciones).filter((e) => e.acierto === true);
}

function numeros(valores) {
  return (valores || []).filter((x) => typeof x === 'number' && !Number.isNaN(x));
}

function media(valores) {
  const v = numeros(valores);
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function desviacionEstandar(valores) {
  const v = numeros(valores);
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

function tiemposNetos(ensayos) {
  return numeros(ensayos.map(trNeto));
}

/** Proporcion de ensayos fuera de la practica que cumplen la condicion. */
function tasa(ensayos, condicion) {
  const e = soloPuntuados(ensayos);
  if (e.length === 0) return null;
  return e.filter(condicion).length / e.length;
}

function tasaOmision(ensayos) {
  return tasa(ensayos, esOmision);
}

function tasaAnticipacion(ensayos, opciones) {
  return tasa(ensayos, (e) => esAnticipacion(e, opciones));
}

function postCambio(ensayos, opciones) {
  return soloRespondidos(ensayos, opciones).filter((e) => e.fase === FASES.POST_CAMBIO);
}

/**
 * CC-08. Proporcion de errores perseverativos en el bloque posterior al cambio.
 * Un error aleatorio (ni de la regla anterior ni de la nueva) no suma.
 */
function cc08(ensayos, opciones) {
  const post = postCambio(ensayos, opciones);
  if (post.length === 0) return null;
  return post.filter((e) => e.claseError === 'perseverativa').length / post.length;
}

/**
 * CC-12. Ensayos del bloque posterior al cambio hasta tres aciertos seguidos.
 * Devuelve null si no hay ensayos o si no se alcanza el criterio; para
 * distinguir los dos casos esta criterioAlcanzadoCC12.
 */
function cc12(ensayos, opciones) {
  const post = postCambio(ensayos, opciones);
  let seguidos = 0;
  for (let i = 0; i < post.length; i += 1) {
    seguidos = post[i].acierto === true ? seguidos + 1 : 0;
    if (seguidos === 3) return i + 1;
  }
  return null;
}

/** true o false segun se alcance el criterio de CC-12; null si no hay ensayos. */
function criterioAlcanzadoCC12(ensayos, opciones) {
  if (postCambio(ensayos, opciones).length === 0) return null;
  return cc12(ensayos, opciones) !== null;
}

/**
 * Marca cada ensayo de los bloques mixtos como 'inicial', 'cambio' o
 * 'repeticion', comparando su regla con la del ensayo anterior del mismo
 * bloque. El primero de cada bloque es 'inicial' y no cuenta en CC-09. Las
 * omisiones y anticipaciones conservan su lugar en la secuencia: lo que define
 * el tipo es la regla presentada, no la respuesta.
 */
function clasificarEnsayosMixtos(ensayos) {
  const salida = [];
  let anterior = null;
  for (const e of soloPuntuados(ensayos)) {
    if (e.fase !== FASES.MIXTO) continue;
    let tipoEnsayo = 'inicial';
    if (anterior && anterior.bloque === e.bloque) {
      tipoEnsayo = e.regla === anterior.regla ? 'repeticion' : 'cambio';
    }
    salida.push({ ...e, tipoEnsayo });
    anterior = e;
  }
  return salida;
}

/**
 * CC-09. Costo de cambio: tiempo medio de los ensayos de cambio menos el de los
 * de repeticion, solo en los bloques mixtos y solo con aciertos, en ms.
 */
function cc09(ensayos, opciones) {
  const aciertos = soloAciertos(clasificarEnsayosMixtos(ensayos), opciones);
  const cambio = media(tiemposNetos(aciertos.filter((e) => e.tipoEnsayo === 'cambio')));
  const repeticion = media(tiemposNetos(aciertos.filter((e) => e.tipoEnsayo === 'repeticion')));
  if (cambio === null || repeticion === null) return null;
  return cambio - repeticion;
}

/**
 * CC-10. Diferencia global-local: tiempo medio de los ensayos de atencion
 * global menos el de los de atencion local, solo con aciertos, en ms.
 */
function cc10(ensayos, opciones) {
  const aciertos = soloAciertos(ensayos, opciones);
  const global = media(tiemposNetos(aciertos.filter((e) => e.condicion === CONDICIONES.GLOBAL)));
  const local = media(tiemposNetos(aciertos.filter((e) => e.condicion === CONDICIONES.LOCAL)));
  if (global === null || local === null) return null;
  return global - local;
}

/**
 * Variables de contexto de una tarea. Ayudan a interpretar los indicadores y
 * nunca son un indicador en si mismas.
 */
function variablesContextuales(ensayos, opciones) {
  const tr = tiemposNetos(soloRespondidos(ensayos, opciones));
  const m = media(tr);
  const s = desviacionEstandar(tr);
  return {
    tasaOmision: tasaOmision(ensayos),
    tasaAnticipacion: tasaAnticipacion(ensayos, opciones),
    variabilidadTiempoReaccion: s,
    coeficienteVariacion: m && s ? s / m : null,
    rectificacionesPromedio: media(soloRespondidos(ensayos, opciones).map((e) => e.rectificaciones || 0))
  };
}

const INDICADORES = Object.freeze({
  'CC-08': Object.freeze({
    fn: cc08,
    tarea: TAREAS.CAMBIO_REGLA,
    constructo: 'Perseveración tras el cambio de regla',
    metrica: 'Proporción de errores perseverativos en el bloque posterior al cambio',
    unidad: 'proporcion'
  }),
  'CC-09': Object.freeze({
    fn: cc09,
    tarea: TAREAS.CAMBIO_REGLA,
    constructo: 'Costo de cambio',
    metrica: 'Tiempo medio de los ensayos de cambio menos el de los ensayos de repetición, en los bloques mixtos',
    unidad: 'ms'
  }),
  'CC-12': Object.freeze({
    fn: cc12,
    tarea: TAREAS.CAMBIO_REGLA,
    constructo: 'Ensayos hasta criterio',
    metrica: 'Ensayos del bloque posterior al cambio hasta tres aciertos seguidos',
    unidad: 'ensayos',
    detalle: (ensayos, opciones) => ({ criterioAlcanzado: criterioAlcanzadoCC12(ensayos, opciones) })
  }),
  'CC-10': Object.freeze({
    fn: cc10,
    tarea: TAREAS.NAVON,
    constructo: 'Diferencia global-local',
    metrica: 'Tiempo medio de los ensayos de atención global menos el de los ensayos de atención local',
    unidad: 'ms'
  })
});

module.exports = {
  INDICADORES,
  trNeto,
  soloPuntuados,
  esAnticipacion,
  soloRespondidos,
  soloAciertos,
  media,
  desviacionEstandar,
  tasaOmision,
  tasaAnticipacion,
  clasificarEnsayosMixtos,
  criterioAlcanzadoCC12,
  variablesContextuales,
  cc08,
  cc09,
  cc10,
  cc12
};
