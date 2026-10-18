'use strict';
const { ORDEN_TAREAS } = require('./catalogo');
const { ESTADOS_SESION, MOTIVOS, procesarSesion } = require('./motor');
const { AVISO_NO_DIAGNOSTICO } = require('./vocabularioProhibido');

/**
 * Resultado de una sesion completa del registro conductual: se calcula una
 * vez y se guarda. M-09, HU-18, RF-15, CT-13, RCN-03
 *
 * - Cuando llegan las dos tareas, la API ejecuta procesarSesion (motor.js)
 *   con los ensayos guardados y guarda su salida en la sesion, con la version
 *   del algoritmo (CT-13). Lo que el profesional ve y exporta es siempre ese
 *   resultado: si despues sube la version, los valores ya entregados no
 *   cambian.
 * - RF-15: una sesion que no esta completada no tiene resultado; su vista dice
 *   que no se proceso y no trae valores.
 * - Toda vista lleva el aviso de no diagnostico de M-09.
 *
 * MongoDB guarda las tareas como lista (aGuardar) y la vista las devuelve
 * como en procesarSesion, por tarea (deGuardado).
 *
 * Funciones puras.
 */

/** Campos de cada ensayo que lee el motor (indicadores.js), sin los del almacenamiento. */
const CAMPOS_ENSAYO_MOTOR = Object.freeze([
  'tarea',
  'bloque',
  'fase',
  'regla',
  'condicion',
  'congruencia',
  'practica',
  'estadoItem',
  'acierto',
  'claseError',
  'tiempoReaccionMs',
  'pausasDuranteItemMs',
  'rectificaciones'
]);

const avisos = () => ({ texto: AVISO_NO_DIAGNOSTICO, soloValoresObservados: true });

function paraElMotor(ensayo) {
  const salida = {};
  for (const campo of CAMPOS_ENSAYO_MOTOR) if (ensayo[campo] !== undefined) salida[campo] = ensayo[campo];
  return salida;
}

/**
 * Procesa una sesion guardada con sus ensayos (en orden).
 * @param {{seudonimo: string, estado: string, versionCatalogo: string, contexto: object}} sesion
 */
function procesarSesionGuardada(sesion, ensayos) {
  return procesarSesion({
    seudonimo: sesion.seudonimo,
    estado: sesion.estado,
    versionCatalogo: sesion.versionCatalogo,
    ensayos: ensayos.map(paraElMotor),
    contexto: sesion.contexto
  });
}

/** Salida de procesarSesion en la forma del esquema (las tareas como lista). */
function aGuardar(salida) {
  return {
    versionAlgoritmo: salida.versionAlgoritmo,
    versionCatalogo: salida.versionCatalogo,
    tareas: ORDEN_TAREAS.map((tarea) => ({ tarea, ...salida.tareas[tarea] })),
    contexto: { ...salida.contexto }
  };
}

const sinCamposDeMongo = (objeto) => {
  const { _id, ...resto } = objeto;
  return resto;
};

/**
 * Vista de los valores de una sesion (HU-18): la misma forma que
 * procesarSesion. Sin resultado (sesion incompleta), dice que no se proceso.
 */
function deGuardado(sesion) {
  if (sesion.estado !== ESTADOS_SESION.COMPLETADA || !sesion.resultado) {
    return { procesada: false, motivo: MOTIVOS.NO_COMPLETADA, avisos: avisos() };
  }
  const { resultado } = sesion;
  const tareas = {};
  for (const { tarea, titulo, indicadores, contexto } of resultado.tareas) {
    tareas[tarea] = {
      titulo,
      indicadores: indicadores.map(sinCamposDeMongo),
      contexto: sinCamposDeMongo(contexto)
    };
  }
  return {
    procesada: true,
    seudonimo: sesion.seudonimo,
    tareas,
    contexto: sinCamposDeMongo(resultado.contexto),
    avisos: avisos(),
    versionAlgoritmo: resultado.versionAlgoritmo,
    versionCatalogo: resultado.versionCatalogo
  };
}

module.exports = { CAMPOS_ENSAYO_MOTOR, procesarSesionGuardada, aGuardar, deGuardado };
