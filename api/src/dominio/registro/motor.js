'use strict';
const { CATALOGO, ORDEN_TAREAS } = require('./catalogo');
const { INDICADORES, variablesContextuales } = require('./indicadores');
const { contieneDatoIdentificable } = require('./seudonimo');
const { AVISO_NO_DIAGNOSTICO } = require('./vocabularioProhibido');
const { VERSION_ALGORITMO } = require('./version');

/**
 * Motor del registro conductual: de los ensayos de una sesion a los valores
 * observados por tarea. M-09, RF-15, CT-11, CT-13, RCN-03
 *
 * - La salida se organiza por tarea y constructo. No hay dominios del
 *   DSM-5-TR, puntaje global, percentiles, puntos de corte ni categorias.
 * - RF-15: una sesion que no esta completada no se procesa.
 * - CT-11: una sesion que trae datos identificables no se procesa.
 * - CT-13: toda salida lleva la version del algoritmo y no depende de la hora
 *   ni de valores aleatorios: la misma entrada da la misma salida.
 * - Toda salida lleva el aviso de no diagnostico de M-09.
 *
 * Entrada: { seudonimo, estado, versionCatalogo, ensayos: [...], contexto:
 * { tipoEntrada, pausas, repeticionesInstruccion } }. Cada ensayo dice a que
 * tarea pertenece (`tarea`); su forma esta en indicadores.js.
 *
 * Traido de fase-ii (api/src/dominio/puntuacion/motor.js), sin dominios,
 * cobertura, reporte del cuidador ni normalizacion por percentiles.
 */

const ESTADOS_SESION = Object.freeze({
  EN_CURSO: 'en_curso',
  COMPLETADA: 'completada',
  INTERRUMPIDA: 'interrumpida',
  ABANDONADA: 'abandonada'
});

const MOTIVOS = Object.freeze({
  NO_COMPLETADA: 'sesion_no_completada',
  DATOS_IDENTIFICABLES: 'datos_identificables'
});

/** Unicas variables de la sesion que pasan a la salida. */
const CONTEXTO_SESION = Object.freeze(['tipoEntrada', 'pausas', 'repeticionesInstruccion']);

const avisos = () => ({ texto: AVISO_NO_DIAGNOSTICO, soloValoresObservados: true });

function sinProcesar(motivo) {
  return { procesada: false, motivo, avisos: avisos(), versionAlgoritmo: VERSION_ALGORITMO };
}

function contextoDeSesion(contexto) {
  const salida = {};
  for (const clave of CONTEXTO_SESION) {
    salida[clave] = contexto && contexto[clave] !== undefined ? contexto[clave] : null;
  }
  return salida;
}

function procesarTarea(tarea, ensayos) {
  const cfg = CATALOGO[tarea];
  const propios = ensayos.filter((e) => e && e.tarea === tarea);
  const opciones = { trMinimoMs: cfg.trMinimoMs };
  const indicadores = Object.entries(INDICADORES)
    .filter(([, ind]) => ind.tarea === tarea)
    .map(([codigo, ind]) => ({
      codigo,
      constructo: ind.constructo,
      metrica: ind.metrica,
      unidad: ind.unidad,
      observado: ind.fn(propios, opciones),
      ...(ind.detalle ? ind.detalle(propios, opciones) : {})
    }));
  return { titulo: cfg.titulo, indicadores, contexto: variablesContextuales(propios, opciones) };
}

function procesarSesion(sesion) {
  if (!sesion || sesion.estado !== ESTADOS_SESION.COMPLETADA) return sinProcesar(MOTIVOS.NO_COMPLETADA);
  if (contieneDatoIdentificable(sesion)) return sinProcesar(MOTIVOS.DATOS_IDENTIFICABLES);

  const ensayos = Array.isArray(sesion.ensayos) ? sesion.ensayos : [];
  const tareas = {};
  for (const tarea of ORDEN_TAREAS) tareas[tarea] = procesarTarea(tarea, ensayos);

  return {
    procesada: true,
    seudonimo: sesion.seudonimo,
    tareas,
    contexto: contextoDeSesion(sesion.contexto),
    avisos: avisos(),
    versionAlgoritmo: VERSION_ALGORITMO,
    versionCatalogo: sesion.versionCatalogo || null
  };
}

module.exports = { ESTADOS_SESION, MOTIVOS, procesarSesion };
