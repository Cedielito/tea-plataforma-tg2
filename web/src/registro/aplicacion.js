/**
 * Pasos de la aplicación de una sesión del registro conductual (M-09, HU-17,
 * RF-15): qué pantalla toca al abrir /registro/aplicacion y qué se envía a la
 * API al terminar cada parte. Lógica pura.
 *
 * - Recién entregado el dispositivo (sin ninguna tarea recibida), empiezan
 *   las tareas, en el orden del plan.
 * - Si la página se abre de nuevo (se recargó, o se volvió atrás y adelante)
 *   con una tarea pendiente, lo medido en esa tarea se perdió y repetirla
 *   daría ensayos con práctica previa: la sesión queda interrumpida (se
 *   guarda lo recibido y no se procesa, RF-15).
 * - Con las dos tareas recibidas, falta solo el SUS (si el cuestionario está
 *   disponible) y luego el agradecimiento.
 * - El reloj es siempre la variante 'animacion' (reloj.js): la aplicación no
 *   lee ?reloj= ni VITE_RELOJ_REGISTRO, y la API rechaza otro.
 */
import { RUTA_API_APLICACION } from './clienteAplicacion.js';
import { VARIANTES_RELOJ } from './reloj.js';

export const RELOJ_APLICACION = VARIANTES_RELOJ.ANIMACION;

export const PASOS = Object.freeze({
  TAREAS: 'tareas',
  SUS: 'sus',
  GRACIAS: 'gracias',
  INTERRUMPIDA: 'interrumpida'
});

/** Secuencias del plan que tienen pantalla, en el orden del plan. */
export function tareasDelPlan(plan, disponibles) {
  return plan.secuencias.filter((s) => disponibles.includes(s.tarea));
}

/**
 * @param {{aplicacion: object, recienEntregada: boolean, disponibles: string[]}} datos
 *   `aplicacion`: la respuesta de GET /api/registro/aplicacion
 * @returns {string} uno de PASOS
 */
export function pasoInicial({ aplicacion, recienEntregada, disponibles }) {
  const recibidas = aplicacion.tareasRecibidas || [];
  const pendientes = tareasDelPlan(aplicacion.plan, disponibles).filter((s) => !recibidas.includes(s.tarea));
  if (pendientes.length === 0) {
    return aplicacion.susRespondido || !aplicacion.cuestionarioSus ? PASOS.GRACIAS : PASOS.SUS;
  }
  if (recienEntregada && recibidas.length === 0 && aplicacion.estado === 'en_curso') return PASOS.TAREAS;
  return PASOS.INTERRUMPIDA;
}

/**
 * Envío de una tarea terminada: la sesión que entrega la tarea (armarSesion,
 * sesionLocal.js) en la forma que recibe PUT /api/registro/aplicacion/tareas/:tarea.
 */
export function envioDeTarea(sesionTarea) {
  const { tarea } = sesionTarea.ensayos[0];
  const { pausas, repeticionesInstruccion } = sesionTarea.contexto;
  return {
    clave: tarea,
    ruta: `${RUTA_API_APLICACION}/tareas/${tarea}`,
    metodo: 'PUT',
    datos: {
      versionCatalogo: sesionTarea.versionCatalogo,
      semilla: sesionTarea.semilla,
      reloj: sesionTarea.reloj,
      ensayos: sesionTarea.ensayos,
      contexto: { pausas, repeticionesInstruccion }
    }
  };
}

export function envioDeSus(version, respuestas) {
  return { clave: 'sus', ruta: `${RUTA_API_APLICACION}/sus`, metodo: 'PUT', datos: { version, respuestas } };
}

/** Números de los enunciados del SUS que no tienen respuesta, del 1 al total. */
export function enunciadosSinRespuesta(respuestas, total) {
  const faltan = [];
  for (let i = 0; i < total; i += 1) {
    if (!Number.isInteger(respuestas[i])) faltan.push(i + 1);
  }
  return faltan;
}
