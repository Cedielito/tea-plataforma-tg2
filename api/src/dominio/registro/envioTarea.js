'use strict';
const { contieneDatoIdentificable } = require('./seudonimo');
const { VERSION_CATALOGO } = require('./version');

/**
 * Envio de los ensayos de una tarea al terminarla (PUT
 * /api/registro/aplicacion/tareas/:tarea). M-09, CT-11, CP-01, CP-04, RF-14
 *
 * La web manda lo que entrega la tarea (web/src/registro/sesionLocal.js):
 *   { versionCatalogo, semilla, reloj, ensayos: [...], contexto: { pausas,
 *     repeticionesInstruccion } }
 * Aqui se revisa la forma del envio contra la sesion y el plan; el tipo y el
 * rango de cada campo del ensayo los revisa el esquema (ensayoRegistro.js,
 * con strict: 'throw').
 *
 * - CT-11: un envio con un campo identificable (nombre, correo, ...) se
 *   rechaza entero, en cualquier nivel.
 * - El catalogo, la semilla y el reloj deben ser los de la sesion: un plan
 *   viejo (409) o un reloj distinto de 'animacion' no se mezclan con los
 *   datos.
 * - Los ensayos deben ser exactamente los del plan, en orden: primero la
 *   practica (CP-04) y despues cada bloque con sus ensayos (CP-01).
 *
 * Funcion pura.
 */

const CAMPOS = Object.freeze(['versionCatalogo', 'semilla', 'reloj', 'ensayos', 'contexto']);
const CAMPOS_CONTEXTO = Object.freeze(['pausas', 'repeticionesInstruccion']);
const MAXIMO_CONTEXTO = 10000;

const MENSAJES = Object.freeze({
  SOLO_CAMPOS: 'El envío de una tarea solo recibe la versión del catálogo, la semilla, el reloj, los ensayos y el contexto.',
  DATOS_IDENTIFICABLES: 'El envío trae un campo que podría identificar a una persona y no se guardó.',
  CATALOGO_DISTINTO: 'La tarea se hizo con otra versión del catálogo. Avisa a la persona que te acompaña.',
  RELOJ_DISTINTO: 'El reloj de la tarea no es el de la sesión.',
  SEMILLA_DISTINTA: 'La semilla de la tarea no es la de la sesión.',
  CONTEXTO_INVALIDO: 'El contexto de la tarea debe traer las pausas y las repeticiones de instrucciones como números enteros.',
  ENSAYOS_INCOMPLETOS: 'Los ensayos enviados no son los del plan de la tarea.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const soloCampos = (objeto, campos) =>
  Object.keys(objeto).length === campos.length && campos.every((campo) => campo in objeto);
const esConteo = (valor) => Number.isInteger(valor) && valor >= 0 && valor <= MAXIMO_CONTEXTO;

/** Bloque que le toca a cada ensayo fuera de la practica, en el orden del plan. */
function bloquesEsperados(secuencia) {
  return secuencia.bloques.flatMap((bloque) => Array.from({ length: bloque.ensayos }, () => bloque.id));
}

function ensayosDelPlan(ensayos, { tarea, semilla, secuencia }) {
  if (!Array.isArray(ensayos)) return false;
  const bloques = bloquesEsperados(secuencia);
  if (ensayos.length !== secuencia.ensayosPractica + bloques.length) return false;
  return ensayos.every((ensayo, i) => {
    if (!esObjeto(ensayo) || ensayo.tarea !== tarea || ensayo.numero !== i + 1 || ensayo.semilla !== semilla) {
      return false;
    }
    if (i < secuencia.ensayosPractica) return ensayo.practica === true;
    return ensayo.practica === false && ensayo.bloque === bloques[i - secuencia.ensayosPractica];
  });
}

/**
 * @param {unknown} cuerpo
 * @param {{tarea: string, secuencia: object, sesion: {versionCatalogo: string, semilla: number, reloj: string}}} esperado
 *   `secuencia`: la de la tarea en planificarSesion()
 * @returns {{ensayos: object[], contexto: {pausas: number, repeticionesInstruccion: number}}
 *   | {estado: number, error: string}}
 */
function leerEnvioTarea(cuerpo, { tarea, secuencia, sesion }) {
  if (!esObjeto(cuerpo) || !soloCampos(cuerpo, CAMPOS)) return { estado: 400, error: MENSAJES.SOLO_CAMPOS };
  if (contieneDatoIdentificable(cuerpo)) return { estado: 422, error: MENSAJES.DATOS_IDENTIFICABLES };
  if (cuerpo.versionCatalogo !== VERSION_CATALOGO || cuerpo.versionCatalogo !== sesion.versionCatalogo) {
    return { estado: 409, error: MENSAJES.CATALOGO_DISTINTO };
  }
  if (cuerpo.reloj !== sesion.reloj) return { estado: 422, error: MENSAJES.RELOJ_DISTINTO };
  if (cuerpo.semilla !== sesion.semilla) return { estado: 422, error: MENSAJES.SEMILLA_DISTINTA };

  const { contexto } = cuerpo;
  if (!esObjeto(contexto) || !soloCampos(contexto, CAMPOS_CONTEXTO) || !CAMPOS_CONTEXTO.every((c) => esConteo(contexto[c]))) {
    return { estado: 422, error: MENSAJES.CONTEXTO_INVALIDO };
  }
  if (!ensayosDelPlan(cuerpo.ensayos, { tarea, semilla: sesion.semilla, secuencia })) {
    return { estado: 422, error: MENSAJES.ENSAYOS_INCOMPLETOS };
  }
  return {
    ensayos: cuerpo.ensayos,
    contexto: { pausas: contexto.pausas, repeticionesInstruccion: contexto.repeticionesInstruccion }
  };
}

module.exports = { CAMPOS, CAMPOS_CONTEXTO, MENSAJES, leerEnvioTarea };
