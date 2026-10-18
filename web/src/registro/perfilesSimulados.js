/**
 * Perfiles simulados del registro conductual (M-09, CC-08, CC-09, CC-10,
 * CC-12, CT-13, RF-14, T16), solo para pruebas. Cada perfil es una persona
 * simulada con parámetros conocidos que hace las dos tareas por el mismo
 * camino que la página de prueba: generadores con la semilla del perfil,
 * motor de ensayos con un reloj falso (sesionSimulada.js), evaluación y armado
 * de la sesión. Las sesiones se guardan en api/test/ayudas/perfilesSimulados.json,
 * que las pruebas de api/ procesan con procesarSesion
 * (registroPerfiles.test.js) y pasan por la API (registroReproducibilidad.test.js).
 *
 * Parámetros de cada perfil:
 * - tiempoMedioMs: media del tiempo de reacción de los ensayos respondidos de
 *   cada tarea (sin práctica ni omisiones).
 * - costoCambioMs: en los bloques mixtos, los ensayos de cambio tardan eso
 *   más que los de repetición (CC-09).
 * - diferenciaGlobalLocalMs: los ensayos de atención global tardan eso más
 *   que los de atención local (CC-10; negativo: la global es más rápida).
 * - erroresPorBloque y omisionesPorBloque: en cada bloque de 7 ensayos. La
 *   tasa de error es errores ÷ ensayos respondidos del bloque y la de
 *   omisión, omisiones ÷ 7. En el bloque de forma los errores van primero
 *   (perseveración): CC-08 es la tasa de error y CC-12, errores + 3.
 * - dispersionMs: desviación del ruido de cada ensayo.
 *
 * Los errores y las omisiones de los demás bloques caen en lugares sorteados
 * con la semilla. El ruido (casi normal, acotado a ±3,5 desviaciones) se
 * centra en cada grupo que usan los indicadores (cambio, repetición y el
 * resto; global y local; aciertos y errores), así que las medias de cada
 * grupo son exactamente las del perfil, salvo el redondeo a milésimas de
 * milisegundo del motor de ensayos.
 */
import { barajar, crearAzar } from './azar.js';
import { generarEnsayos } from './generador.js';
import { generarEnsayosNavon } from './generadorNavon.js';
import { CAJAS, ladoCorrecto } from './estimulos.js';
import { letraCorrecta, otraLetra } from './estimulosNavon.js';
import { TIPOS_ENTRADA } from './motorEnsayo.js';
import { armarSesion, registrarEnsayo, registrarEnsayoNavon, unirSesiones } from './sesionLocal.js';
import { crearSimulador, posiciones } from './sesionSimulada.js';

const BASE = Object.freeze({
  tiempoMedioMs: 650,
  costoCambioMs: 150,
  diferenciaGlobalLocalMs: -50,
  erroresPorBloque: 0,
  omisionesPorBloque: 0,
  dispersionMs: 60
});

/** Los seis perfiles: el de base y cinco que cambian uno o dos de sus parámetros. */
export const PERFILES = Object.freeze(
  [
    { id: 'base', descripcion: 'Parámetros de base', ...BASE },
    { id: 'costo-alto', descripcion: 'Costo de cambio mayor', ...BASE, costoCambioMs: 300 },
    { id: 'local-rapida', descripcion: 'La atención local es la más rápida', ...BASE, diferenciaGlobalLocalMs: 80 },
    { id: 'lento', descripcion: 'Tiempo medio mayor y más disperso', ...BASE, tiempoMedioMs: 900, dispersionMs: 90 },
    { id: 'con-errores', descripcion: 'Dos errores por bloque', ...BASE, erroresPorBloque: 2 },
    { id: 'con-omisiones', descripcion: 'Una omisión y un error por bloque', ...BASE, erroresPorBloque: 1, omisionesPorBloque: 1 }
  ].map((perfil, i) => Object.freeze({ ...perfil, semilla: 20261101 + i }))
);

const ENSAYOS_POR_BLOQUE = 7;

/** Tasas que salen de los conteos por bloque. */
export function tasasDe(perfil) {
  const respondidos = ENSAYOS_POR_BLOQUE - perfil.omisionesPorBloque;
  return { tasaError: perfil.erroresPorBloque / respondidos, tasaOmision: perfil.omisionesPorBloque / ENSAYOS_POR_BLOQUE };
}

const redondear = (ms) => Math.round(ms * 1000) / 1000;

/** Ruido casi normal con desviación 1 (Irwin-Hall de 4 uniformes), acotado a ±2√3. */
const ruidoUnitario = (azar) => (azar() + azar() + azar() + azar() - 2) * Math.sqrt(3);

/**
 * Qué pasa en cada ensayo fuera de la práctica: 'error', 'omision' o
 * 'acierto'. En el bloque de forma los errores van primero.
 */
function resultados(planificados, perfil, azar) {
  const lugar = posiciones(planificados);
  const porBloque = new Map();
  planificados.forEach((ensayo, i) => {
    if (ensayo.practica) return;
    if (!porBloque.has(ensayo.bloque)) porBloque.set(ensayo.bloque, []);
    porBloque.get(ensayo.bloque).push(i);
  });
  const salida = planificados.map(() => 'acierto');
  for (const indices of porBloque.values()) {
    const { fase } = planificados[indices[0]];
    const { erroresPorBloque: e, omisionesPorBloque: o } = perfil;
    let errores;
    let omisiones;
    if (fase === 'post-cambio') {
      errores = indices.slice(0, e);
      omisiones = barajar(indices.slice(e), azar).slice(0, o);
    } else {
      const sorteados = barajar(indices, azar);
      errores = sorteados.slice(0, e);
      omisiones = sorteados.slice(e, e + o);
    }
    for (const i of errores) salida[i] = 'error';
    for (const i of omisiones) salida[i] = 'omision';
  }
  return { salida, lugar };
}

/**
 * Tiempo de cada ensayo respondido: la media de su condición más el ruido
 * centrado en su grupo (condición y acierto). `condicionDe(i)` dice la
 * condición del ensayo i y `extraDe(condicion)` cuánto se suma a la base.
 * La base se elige para que la media de los respondidos sea tiempoMedioMs.
 */
function tiempos(planificados, resultado, perfil, azar, condicionDe, extraDe) {
  const respondidos = planificados
    .map((_ensayo, i) => i)
    .filter((i) => !planificados[i].practica && resultado[i] !== 'omision');
  const extraMedio = respondidos.reduce((s, i) => s + extraDe(condicionDe(i)), 0) / respondidos.length;
  const base = perfil.tiempoMedioMs - extraMedio;

  const grupos = new Map();
  for (const i of respondidos) {
    const clave = `${condicionDe(i)}|${resultado[i]}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(i);
  }
  const tr = planificados.map(() => null);
  for (const indices of grupos.values()) {
    const ruidos = indices.map(() => ruidoUnitario(azar) * perfil.dispersionMs);
    const centro = ruidos.reduce((a, b) => a + b, 0) / ruidos.length;
    indices.forEach((i, k) => {
      tr[i] = redondear(base + extraDe(condicionDe(i)) + ruidos[k] - centro);
    });
  }
  // Práctica: aciertos con el tiempo medio (no entra al cálculo).
  planificados.forEach((ensayo, i) => {
    if (ensayo.practica) tr[i] = perfil.tiempoMedioMs;
  });
  return tr;
}

const conducta = (lado, tr) => ({ lado, tr, pausa: null, entrada: TIPOS_ENTRADA.TECLADO });

const otroLado = (lado) => Object.keys(CAJAS).find((l) => l !== lado);

function simularCambioRegla(plan, perfil, simulador, azar) {
  const secuencia = plan.secuencias.find((s) => s.tarea === 'cambio-regla');
  const planificados = generarEnsayos(secuencia, perfil.semilla);
  const { salida: resultado, lugar } = resultados(planificados, perfil, azar);
  const condicionDe = (i) => {
    const ensayo = planificados[i];
    if (ensayo.fase !== 'mixto' || lugar[i] === 1) return 'otro';
    return ensayo.regla === planificados[i - 1].regla ? 'repeticion' : 'cambio';
  };
  const tr = tiempos(planificados, resultado, perfil, azar, condicionDe, (c) => (c === 'cambio' ? perfil.costoCambioMs : 0));

  const ensayos = planificados.map((ensayo, i) => {
    const correcto = ladoCorrecto(ensayo.estimulo, ensayo.regla);
    const lado = { acierto: correcto, error: otroLado(correcto), omision: null }[resultado[i]];
    return registrarEnsayo(planificados, i, simulador.medir(secuencia, conducta(lado, tr[i])), secuencia);
  });
  return armarSesion({ ensayos, semilla: perfil.semilla, reloj: simulador.reloj.variante, versionCatalogo: plan.versionCatalogo });
}

function simularNavon(plan, perfil, simulador, azar) {
  const secuencia = plan.secuencias.find((s) => s.tarea === 'navon');
  const planificados = generarEnsayosNavon(secuencia, perfil.semilla);
  const { salida: resultado } = resultados(planificados, perfil, azar);
  const condicionDe = (i) => planificados[i].condicion;
  const tr = tiempos(planificados, resultado, perfil, azar, condicionDe, (c) =>
    c === 'global' ? perfil.diferenciaGlobalLocalMs : 0
  );

  const ensayos = planificados.map((ensayo, i) => {
    const correcta = letraCorrecta(ensayo.estimulo, ensayo.condicion);
    const lado = { acierto: correcta, error: otraLetra(correcta), omision: null }[resultado[i]];
    return registrarEnsayoNavon(planificados, i, simulador.medir(secuencia, conducta(lado, tr[i])));
  });
  return armarSesion({ ensayos, semilla: perfil.semilla, reloj: simulador.reloj.variante, versionCatalogo: plan.versionCatalogo });
}

/**
 * Sesión de las dos tareas de un perfil, con el formato de /registro/prueba.
 * @param {object} plan la respuesta de GET /api/registro/plan (planificarSesion)
 */
export function simularPerfil(plan, perfil) {
  // Una secuencia para los resultados y el ruido, aparte de la de los ensayos.
  const azar = crearAzar((perfil.semilla ^ 0x2545f491) >>> 0);
  const simulador = crearSimulador();
  return unirSesiones([simularCambioRegla(plan, perfil, simulador, azar), simularNavon(plan, perfil, simulador, azar)]);
}

/** Los seis perfiles, cada uno con sus parámetros, sus tasas y su sesión. */
export function simularPerfiles(plan) {
  return PERFILES.map((perfil) => {
    const { id, descripcion, semilla, ...parametros } = perfil;
    return { id, descripcion, semilla, parametros: { ...parametros, ...tasasDe(perfil) }, sesion: simularPerfil(plan, perfil) };
  });
}

/**
 * Texto del archivo de api/test/ayudas: JSON con un ensayo por línea, para
 * que el archivo sea corto y se pueda revisar.
 */
export function textoDeArchivo(perfiles) {
  const ensayos = [];
  const conMarcas = perfiles.map((p) => ({
    ...p,
    sesion: {
      ...p.sesion,
      ensayos: p.sesion.ensayos.map((e) => {
        ensayos.push(JSON.stringify(e));
        return `@ensayo-${ensayos.length - 1}@`;
      })
    }
  }));
  return `${JSON.stringify({ perfiles: conMarcas }, null, 2).replace(/"@ensayo-(\d+)@"/g, (_m, i) => ensayos[Number(i)])}\n`;
}
