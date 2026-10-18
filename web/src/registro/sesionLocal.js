/**
 * Registro de los ensayos y sesión local de la página de prueba (M-09, CT-11,
 * RF-15). La sesión no se envía a la API (el guardado llega con T15): se
 * muestra en una tabla y se descarga en JSON, con la forma que procesa
 * procesarSesion (api/src/dominio/registro/motor.js).
 *
 * Cada ensayo lleva los campos que documenta indicadores.js (tarea, bloque,
 * fase, regla, condicion, practica, estadoItem, acierto, claseError,
 * tiempoReaccionMs, pausasDuranteItemMs, rectificaciones) y además número,
 * estímulo, respuesta, aparición, momento de la respuesta, semilla y tipo de
 * entrada. Sin seudónimo ni ningún dato de la persona (CT-11).
 */
import { evaluarRespuesta, reglaAnterior } from './clasificacion.js';

/** Ensayo completo: lo planeado, lo medido (motorEnsayo.js) y su evaluación. */
export function registrarEnsayo(planificados, indice, medicion, secuencia) {
  const ensayo = planificados[indice];
  const anterior = reglaAnterior(ensayo, planificados[indice - 1], secuencia);
  const { acierto, claseError } = evaluarRespuesta(ensayo, medicion.respuesta, anterior);
  return {
    tarea: ensayo.tarea,
    bloque: ensayo.bloque,
    fase: ensayo.fase,
    regla: ensayo.regla,
    condicion: ensayo.condicion,
    practica: ensayo.practica,
    estadoItem: medicion.estadoItem,
    acierto,
    claseError,
    tiempoReaccionMs: medicion.tiempoReaccionMs,
    pausasDuranteItemMs: medicion.pausasDuranteItemMs,
    rectificaciones: medicion.rectificaciones,
    numero: ensayo.numero,
    estimulo: { ...ensayo.estimulo },
    respuesta: medicion.respuesta,
    aparicionMs: medicion.aparicionMs,
    momentoRespuestaMs: medicion.momentoRespuestaMs,
    semilla: ensayo.semilla,
    tipoEntrada: medicion.tipoEntrada
  };
}

/** El tipo de entrada más usado fuera de la práctica (el primero que aparece, si empatan). */
export function tipoEntradaPredominante(ensayos) {
  const cuentas = new Map();
  for (const e of ensayos) {
    if (e.practica || !e.tipoEntrada) continue;
    cuentas.set(e.tipoEntrada, (cuentas.get(e.tipoEntrada) || 0) + 1);
  }
  let elegido = null;
  for (const [tipo, n] of cuentas) if (elegido === null || n > cuentas.get(elegido)) elegido = tipo;
  return elegido;
}

/**
 * Sesión terminada. `pausas`: veces que la pestaña se ocultó durante la tarea;
 * `repeticionesInstruccion`: veces que se pidió ver de nuevo las instrucciones.
 */
export function armarSesion({ ensayos, semilla, reloj, versionCatalogo, pausas = 0, repeticionesInstruccion = 0 }) {
  return {
    estado: 'completada',
    versionCatalogo,
    semilla,
    reloj,
    ensayos,
    contexto: { tipoEntrada: tipoEntradaPredominante(ensayos), pausas, repeticionesInstruccion }
  };
}

export const nombreArchivo = (sesion) => `registro-prueba-cambio-regla-${sesion.semilla}.json`;
