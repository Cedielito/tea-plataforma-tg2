'use strict';
const { ORDEN_TAREAS, TAREAS } = require('./catalogo');
const { INDICADORES } = require('./indicadores');
const { NUMERO_ITEMS } = require('./sus');
const { deGuardado } = require('./resultado');
const { ESTADOS_SESION } = require('./motor');

/**
 * Exportacion del registro conductual en CSV. M-09, HU-19, CT-08, CT-11,
 * CT-13, RF-15
 *
 * Dos archivos, solo con las sesiones del profesional que los pide:
 * - ensayos.csv: un ensayo por fila.
 * - valores.csv: una sesion por fila, con los valores observados por tarea,
 *   las variables de contexto, las respuestas del SUS y el valorSUS. Las
 *   sesiones incompletas salen sin valores (RF-15). Tambien dice si el
 *   dispositivo se entrego y, en las completas, la duracion en minutos
 *   (CT-08), para el analisis de la evaluacion (api/scripts/).
 * Las dos llevan el seudonimo, la version del algoritmo (vacia si la sesion
 * no se proceso), la del catalogo, el reloj y el navegador. Ningun dato de la
 * persona (CT-11): ni la constancia del consentimiento ni las fechas (de las
 * fechas sale solo la duracion).
 *
 * Formato (RFC 4180): separador coma, punto decimal, UTF-8, fin de linea CRLF
 * y comillas solo donde hacen falta. Un valor vacio es un dato que no existe
 * (null): una omision no tiene tiempo de reaccion, por ejemplo.
 *
 * Funciones puras.
 */

const FIN_DE_LINEA = '\r\n';
const NECESITA_COMILLAS = /[",\r\n]/;

/** Prefijo de las columnas de cada tarea en valores.csv. */
const PREFIJOS = Object.freeze({ [TAREAS.CAMBIO_REGLA]: 'cambioRegla', [TAREAS.NAVON]: 'navon' });

const CONTEXTO_TAREA = Object.freeze([
  'tasaOmision',
  'tasaAnticipacion',
  'variabilidadTiempoReaccion',
  'coeficienteVariacion',
  'rectificacionesPromedio'
]);

function celda(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'number' ? (Number.isFinite(valor) ? String(valor) : '') : String(valor);
  return NECESITA_COMILLAS.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** @param {string[]} columnas @param {object[]} filas objetos con esas claves */
function aCsv(columnas, filas) {
  const lineas = [columnas.map(celda).join(','), ...filas.map((fila) => columnas.map((c) => celda(fila[c])).join(','))];
  return lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

/** Datos de la sesion que van en las dos exportaciones. */
function datosDeSesion(sesion) {
  return {
    seudonimo: sesion.seudonimo,
    versionAlgoritmo: sesion.resultado ? sesion.resultado.versionAlgoritmo : null,
    versionCatalogo: sesion.versionCatalogo,
    reloj: sesion.reloj,
    navegador: sesion.navegador || null
  };
}

const COLUMNAS_ENSAYOS = Object.freeze([
  'seudonimo',
  'estadoSesion',
  'versionAlgoritmo',
  'versionCatalogo',
  'reloj',
  'navegador',
  'semilla',
  'tarea',
  'numero',
  'bloque',
  'fase',
  'regla',
  'condicion',
  'congruencia',
  'practica',
  'estimuloForma',
  'estimuloColor',
  'estimuloGlobal',
  'estimuloLocal',
  'respuesta',
  'tipoEntrada',
  'estadoItem',
  'acierto',
  'claseError',
  'tiempoReaccionMs',
  'pausasDuranteItemMs',
  'rectificaciones',
  'aparicionMs',
  'momentoRespuestaMs'
]);

/**
 * @param {{sesion: object, ensayos: object[]}[]} sesiones cada sesion con sus ensayos en orden
 * @returns {string} ensayos.csv
 */
function csvEnsayos(sesiones) {
  const filas = sesiones.flatMap(({ sesion, ensayos }) => {
    const comunes = { ...datosDeSesion(sesion), estadoSesion: sesion.estado };
    return ensayos.map((e) => {
      const estimulo = e.estimulo || {};
      return {
        ...e,
        ...comunes,
        estimuloForma: estimulo.forma,
        estimuloColor: estimulo.color,
        estimuloGlobal: estimulo.global,
        estimuloLocal: estimulo.local
      };
    });
  });
  return aCsv(COLUMNAS_ENSAYOS, filas);
}

const columnaIndicador = (codigo) => codigo.toLowerCase().replace('-', '');

/** Columnas de valores de cada tarea: sus indicadores (CC-12 con su criterio) y su contexto. */
function columnasDeTarea(tarea) {
  const prefijo = PREFIJOS[tarea];
  const indicadores = Object.entries(INDICADORES)
    .filter(([, ind]) => ind.tarea === tarea)
    .flatMap(([codigo, ind]) => {
      const columna = columnaIndicador(codigo);
      return ind.detalle ? [columna, `${columna}CriterioAlcanzado`] : [columna];
    });
  return [...indicadores, ...CONTEXTO_TAREA.map((clave) => `${prefijo}_${clave}`)];
}

const COLUMNAS_SUS = Object.freeze([
  ...Array.from({ length: NUMERO_ITEMS }, (_, i) => `sus${String(i + 1).padStart(2, '0')}`),
  'valorSUS',
  'versionSUS'
]);

const COLUMNAS_VALORES = Object.freeze([
  'seudonimo',
  'estado',
  'entregada',
  'duracionMin',
  'versionAlgoritmo',
  'versionCatalogo',
  'reloj',
  'navegador',
  'tipoEntrada',
  'pausas',
  'repeticionesInstruccion',
  ...ORDEN_TAREAS.flatMap(columnasDeTarea),
  ...COLUMNAS_SUS
]);

const MS_POR_MINUTO = 60000;

/**
 * CT-08. Minutos desde la ultima entrega del dispositivo hasta que llegan las
 * dos tareas (`completadaEn`): las tareas con sus instrucciones y pausas, sin
 * el SUS. Con dos decimales; null si la sesion no se completo.
 */
function duracionMinutos(sesion) {
  if (sesion.estado !== ESTADOS_SESION.COMPLETADA || !sesion.entregadaEn || !sesion.completadaEn) return null;
  const ms = new Date(sesion.completadaEn).getTime() - new Date(sesion.entregadaEn).getTime();
  return Math.round((ms / MS_POR_MINUTO) * 100) / 100;
}

function valoresDeTareas(vista) {
  const fila = { ...vista.contexto };
  for (const tarea of ORDEN_TAREAS) {
    const { indicadores, contexto } = vista.tareas[tarea];
    for (const ind of indicadores) {
      const columna = columnaIndicador(ind.codigo);
      fila[columna] = ind.observado;
      if ('criterioAlcanzado' in ind) fila[`${columna}CriterioAlcanzado`] = ind.criterioAlcanzado;
    }
    for (const clave of CONTEXTO_TAREA) fila[`${PREFIJOS[tarea]}_${clave}`] = contexto[clave];
  }
  return fila;
}

function valoresSus(sus) {
  if (!sus) return {};
  const fila = { valorSUS: sus.valorSUS, versionSUS: sus.version };
  sus.respuestas.forEach((respuesta, i) => {
    fila[COLUMNAS_SUS[i]] = respuesta;
  });
  return fila;
}

/**
 * @param {object[]} sesiones
 * @returns {string} valores.csv
 */
function csvValores(sesiones) {
  const filas = sesiones.map((sesion) => {
    const vista = deGuardado(sesion);
    return {
      ...datosDeSesion(sesion),
      estado: sesion.estado,
      entregada: Boolean(sesion.entregadaEn),
      duracionMin: duracionMinutos(sesion),
      ...(vista.procesada ? valoresDeTareas(vista) : {}),
      ...valoresSus(sesion.sus)
    };
  });
  return aCsv(COLUMNAS_VALORES, filas);
}

module.exports = { COLUMNAS_ENSAYOS, COLUMNAS_VALORES, aCsv, csvEnsayos, csvValores, duracionMinutos };
