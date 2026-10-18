/**
 * Cálculos del experimento de precisión temporal (M-09, CT-07, T16), del lado
 * de Node: qué latencia y qué tecla toca en cada ensayo, la aparición de
 * referencia y la fila del CSV de cada ensayo. Funciones puras.
 *
 * Todas las marcas del arnés (arnes.js) están en la escala de performance.now()
 * de la página. Por ensayo:
 * - latenciaArnesMs = pulsación − aparición de referencia: el tiempo de
 *   reacción que de verdad produjo el arnés.
 * - errorMs = tiempo de reacción registrado por la web − latenciaArnesMs: el
 *   error del software, con la latencia del arnés separada.
 * - errorCotaMs = tiempo registrado − latencia programada: cota superior del
 *   error, porque incluye la latencia del arnés.
 * - desvioArnesMs = latenciaArnesMs − latencia programada: lo que el arnés se
 *   apartó de lo programado (aviso a Node, temporizador y entrega de la tecla).
 * - errorAparicionMs y errorRespuestaMs: el error separado en sus dos marcas
 *   (positivo: alarga el tiempo registrado). Con el reloj 'referencia' las
 *   marcas de la web están en Date.now() y se pasan a la escala del arnés con
 *   el desfase medido en el mismo fotograma.
 */
import { barajar, crearAzar } from '../../src/registro/azar.js';
import { TECLAS_RESPUESTA } from './arnes.js';

export const LATENCIAS_MS = Object.freeze([300, 500, 800]);

/** Respuesta que la web registra para cada tecla, en las dos tareas. */
const RESPUESTAS_DE_TECLA = Object.freeze({ KeyF: ['izquierda', 'H'], KeyJ: ['derecha', 'S'] });

const redondear = (ms) => (ms === null ? null : Math.round(ms * 1000) / 1000);

/**
 * Latencia y tecla de los primeros `n` ensayos: las tres latencias barajadas
 * en cada grupo de tres (quedan balanceadas) y F o J al azar, con la semilla
 * de la sesión (otra secuencia que la de los ensayos de la web).
 */
export function planDeRespuestas(semilla, n) {
  const azar = crearAzar((semilla ^ 0x5bd1e995) >>> 0);
  const plan = [];
  while (plan.length < n) {
    for (const latenciaMs of barajar(LATENCIAS_MS, azar)) {
      plan.push({ latenciaMs, tecla: TECLAS_RESPUESTA[Math.floor(azar() * TECLAS_RESPUESTA.length)] });
    }
  }
  return plan.slice(0, n);
}

/**
 * Aparición de referencia: el final del fotograma que dibuja el estímulo
 * (dibujadoMs). Si una tarea larga inyectada empezó después del callback de
 * requestAnimationFrame y antes de ese mensaje, el fotograma ya había
 * terminado cuando empezó: la referencia es el inicio de esa tarea.
 */
export function aparicionDeReferencia(registro, tareasLargas = []) {
  let referencia = registro.dibujadoMs;
  for (const [inicio] of tareasLargas) {
    if (inicio >= registro.rafMs && inicio < referencia) referencia = inicio;
  }
  return referencia;
}

/** Marca de la web en la escala de performance.now() del arnés. */
function enEscalaDelArnes(marca, reloj, registro) {
  if (marca === null || marca === undefined) return null;
  return reloj === 'referencia' ? marca - registro.desfaseEpocaMs : marca;
}

/** Tareas largas que se cruzan con el ensayo (de la inserción del estímulo a la atención de la tecla). */
function tareasLargasEnEnsayo(registro, tareasLargas) {
  return tareasLargas.filter(([inicio, fin]) => fin > registro.insercionMs && inicio < registro.atencionMs).length;
}

/**
 * Comprueba que cada ensayo de la web tiene su registro del arnés y que la web
 * registró la tecla que se presionó. Lanza un error con el primer problema.
 */
export function comprobarEmparejamiento(registros, ensayos, programados) {
  if (registros.length !== ensayos.length) {
    throw new Error(`El arnés vio ${registros.length} apariciones y la web registró ${ensayos.length} ensayos.`);
  }
  ensayos.forEach((ensayo, i) => {
    const registro = registros[i];
    const donde = `ensayo ${i + 1} (${ensayo.tarea} ${ensayo.numero})`;
    if (!('pulsacionMs' in registro) || !('dibujadoMs' in registro)) throw new Error(`Al ${donde} le falta una marca del arnés.`);
    if (registro.confiable !== true) throw new Error(`La tecla del ${donde} no llegó como evento del navegador.`);
    if (registro.code !== programados[i].tecla) throw new Error(`En el ${donde} se presionó otra tecla.`);
    if (ensayo.estadoItem !== 'respondido') throw new Error(`La web no registró la respuesta del ${donde}.`);
    if (!RESPUESTAS_DE_TECLA[registro.code].includes(ensayo.respuesta)) {
      throw new Error(`La web registró en el ${donde} una respuesta que no es la de la tecla.`);
    }
  });
}

export const COLUMNAS = Object.freeze([
  'motor',
  'versionMotor',
  'reloj',
  'carga',
  'sesion',
  'semilla',
  'tarea',
  'numero',
  'practica',
  'tecla',
  'latenciaProgramadaMs',
  'latenciaArnesMs',
  'desvioArnesMs',
  'tiempoReaccionMs',
  'errorMs',
  'errorCotaMs',
  'errorAparicionMs',
  'errorRespuestaMs',
  'tareasLargas'
]);

/**
 * Fila del CSV de un ensayo.
 * @param {{celda: {motor: string, versionMotor: string, reloj: string, carga: string, sesion: number, semilla: number},
 *   registro: object, ensayo: object, programado: {latenciaMs: number, tecla: string}, tareasLargas: number[][]}} datos
 */
export function filaDeEnsayo({ celda, registro, ensayo, programado, tareasLargas = [] }) {
  const aparicion = aparicionDeReferencia(registro, tareasLargas);
  const latenciaArnes = registro.pulsacionMs - aparicion;
  const aparicionWeb = enEscalaDelArnes(ensayo.aparicionMs, celda.reloj, registro);
  const respuestaWeb = enEscalaDelArnes(ensayo.momentoRespuestaMs, celda.reloj, registro);
  return {
    motor: celda.motor,
    versionMotor: celda.versionMotor,
    reloj: celda.reloj,
    carga: celda.carga,
    sesion: celda.sesion,
    semilla: celda.semilla,
    tarea: ensayo.tarea,
    numero: ensayo.numero,
    practica: ensayo.practica,
    tecla: registro.code,
    latenciaProgramadaMs: programado.latenciaMs,
    latenciaArnesMs: redondear(latenciaArnes),
    desvioArnesMs: redondear(latenciaArnes - programado.latenciaMs),
    tiempoReaccionMs: ensayo.tiempoReaccionMs,
    errorMs: redondear(ensayo.tiempoReaccionMs - latenciaArnes),
    errorCotaMs: redondear(ensayo.tiempoReaccionMs - programado.latenciaMs),
    errorAparicionMs: redondear(aparicionWeb === null ? null : aparicion - aparicionWeb),
    errorRespuestaMs: redondear(respuestaWeb === null ? null : respuestaWeb - registro.pulsacionMs),
    tareasLargas: tareasLargasEnEnsayo(registro, tareasLargas)
  };
}
