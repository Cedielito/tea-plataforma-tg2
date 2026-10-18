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
 * entrada. Los de Navon (T14) llevan también `congruencia`, después de
 * `condicion`. Sin seudónimo ni ningún dato de la persona (CT-11).
 *
 * Una sesión con las dos tareas une las sesiones de cada una (unirSesiones).
 */
import { evaluarRespuesta, reglaAnterior } from './clasificacion.js';
import { evaluarRespuestaNavon } from './clasificacionNavon.js';

/** Lo planeado, lo medido (motorEnsayo.js) y su evaluación, en el orden de los campos. */
function armarRegistro(ensayo, medicion, { acierto, claseError }) {
  return {
    tarea: ensayo.tarea,
    bloque: ensayo.bloque,
    fase: ensayo.fase,
    regla: ensayo.regla,
    condicion: ensayo.condicion,
    ...('congruencia' in ensayo ? { congruencia: ensayo.congruencia } : {}),
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

/** Ensayo completo de la tarea de cambio de regla. */
export function registrarEnsayo(planificados, indice, medicion, secuencia) {
  const ensayo = planificados[indice];
  const anterior = reglaAnterior(ensayo, planificados[indice - 1], secuencia);
  return armarRegistro(ensayo, medicion, evaluarRespuesta(ensayo, medicion.respuesta, anterior));
}

/** Ensayo completo de la tarea de Navon: la respuesta es la letra elegida. */
export function registrarEnsayoNavon(planificados, indice, medicion) {
  const ensayo = planificados[indice];
  return armarRegistro(ensayo, medicion, evaluarRespuestaNavon(ensayo, medicion.respuesta));
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

/**
 * Sesión de varias tareas seguidas, con la misma semilla y el mismo reloj:
 * los ensayos de todas, en orden, y el contexto de toda la sesión.
 */
export function unirSesiones(sesiones) {
  const [primera] = sesiones;
  const sumar = (clave) => sesiones.reduce((s, x) => s + (x.contexto[clave] || 0), 0);
  return armarSesion({
    ensayos: sesiones.flatMap((s) => s.ensayos),
    semilla: primera.semilla,
    reloj: primera.reloj,
    versionCatalogo: primera.versionCatalogo,
    pausas: sumar('pausas'),
    repeticionesInstruccion: sumar('repeticionesInstruccion')
  });
}

/**
 * Las secuencias del plan que se aplican en la página de prueba: solo la de
 * ?tarea= si existe en el plan, o todas, en el orden del plan (cambio de
 * regla y después Navon). `disponibles`: las tareas que tienen pantalla.
 */
export function elegirSecuencias(plan, tarea, disponibles) {
  const conPantalla = plan.secuencias.filter((s) => disponibles.includes(s.tarea));
  const sola = conPantalla.filter((s) => s.tarea === tarea);
  return sola.length ? sola : conPantalla;
}

/** Con una sola tarea, su nombre va en el archivo; con las dos, solo la semilla. */
export function nombreArchivo(sesion) {
  const tareas = [...new Set((sesion.ensayos || []).map((e) => e.tarea))];
  const tarea = tareas.length === 1 ? `${tareas[0]}-` : '';
  return `registro-prueba-${tarea}${sesion.semilla}.json`;
}
