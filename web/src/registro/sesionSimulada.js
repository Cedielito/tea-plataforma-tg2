/**
 * Sesión simulada de la tarea de cambio de regla (M-09, CT-13), solo para
 * pruebas. Pasa por el mismo camino que la página: generador con semilla fija,
 * motor de ensayos con un reloj falso, evaluación y armado de la sesión. Su
 * salida se guarda en api/test/ayudas/sesionWebCambioRegla.json, que una
 * prueba de api/ procesa con procesarSesion (sesionSimulada.test.js comprueba
 * que el archivo sigue siendo lo que produce la web).
 *
 * Respuestas deterministas, elegidas para conocer de antemano CC-08, CC-09 y
 * CC-12 con cualquier orden de reglas:
 * - Práctica: un acierto y un error.
 * - Bloque de color: aciertos; en el cuarto ensayo la pestaña se oculta 3 s.
 * - Bloque de forma: los dos primeros con la regla de color (perseverativos),
 *   el resto aciertos. CC-08 = 2/7 y CC-12 = 5.
 * - Bloques mixtos: aciertos con 700 ms en el inicial, 812,5 ms en los
 *   cambios y 604,25 ms en las repeticiones (CC-09 = 208,25 ms), salvo una
 *   pausa de 2 s (bloque 1), una anticipación y una omisión (bloque 2) y un
 *   error (bloque 3). En el bloque 4 un ensayo se responde con el ratón.
 */
import { generarEnsayos } from './generador.js';
import { CAJAS, ladoCorrecto } from './estimulos.js';
import { crearReloj } from './reloj.js';
import { crearEnsayoMedido, TIPOS_ENTRADA } from './motorEnsayo.js';
import { armarSesion, registrarEnsayo } from './sesionLocal.js';

export const SEMILLA_SIMULADA = 20261020;

export const TIEMPOS_SIMULADOS = Object.freeze({
  practica: 950.5,
  color: 640.25,
  forma: 905.75,
  inicial: 700,
  cambio: 812.5,
  repeticion: 604.25,
  anticipacion: 150.125
});

const otroLado = (lado) => Object.keys(CAJAS).find((l) => l !== lado);

/** Qué hace la persona simulada en el ensayo i (posicion: 1 a 7 dentro del bloque). */
function conducta(ensayo, posicion, tipoMixto) {
  const correcto = ladoCorrecto(ensayo.estimulo, ensayo.regla);
  const c = { lado: correcto, tr: TIEMPOS_SIMULADOS.color, pausa: null, entrada: TIPOS_ENTRADA.TECLADO };
  if (ensayo.practica) return { ...c, tr: TIEMPOS_SIMULADOS.practica, lado: posicion === 1 ? correcto : otroLado(correcto) };
  if (ensayo.fase === 'pre-cambio') return { ...c, pausa: posicion === 4 ? 3000 : null };
  if (ensayo.fase === 'post-cambio') {
    return { ...c, tr: TIEMPOS_SIMULADOS.forma, lado: posicion <= 2 ? ladoCorrecto(ensayo.estimulo, 'color') : correcto };
  }
  const m = { ...c, tr: TIEMPOS_SIMULADOS[tipoMixto] };
  if (ensayo.bloque === 'CR-MIXTO-1' && posicion === 2) return { ...m, pausa: 2000 };
  if (ensayo.bloque === 'CR-MIXTO-2' && posicion === 3) return { ...m, tr: TIEMPOS_SIMULADOS.anticipacion };
  if (ensayo.bloque === 'CR-MIXTO-2' && posicion === 4) return { ...m, lado: null };
  if (ensayo.bloque === 'CR-MIXTO-3' && posicion === 5) return { ...m, lado: otroLado(correcto) };
  if (ensayo.bloque === 'CR-MIXTO-4' && posicion === 6) return { ...m, entrada: TIPOS_ENTRADA.RATON };
  return m;
}

/** @param {object} plan la respuesta de GET /api/registro/plan (planificarSesion) */
export function simularSesion(plan) {
  const secuencia = plan.secuencias.find((s) => s.tarea === 'cambio-regla');
  const planificados = generarEnsayos(secuencia, SEMILLA_SIMULADA);

  let t = 1000;
  let pendiente = null;
  const reloj = crearReloj('animacion', {
    pedirFotograma: (fn) => fn(),
    cancelarFotograma: () => {},
    ahora: () => t
  });

  const ensayos = [];
  let pausas = 0;
  let posicion = 0;
  planificados.forEach((ensayo, i) => {
    const anterior = planificados[i - 1];
    posicion = anterior && anterior.bloque === ensayo.bloque ? posicion + 1 : 1;
    let tipoMixto = 'inicial';
    if (posicion > 1) tipoMixto = ensayo.regla === anterior.regla ? 'repeticion' : 'cambio';
    const c = conducta(ensayo, posicion, tipoMixto);

    t += secuencia.intervaloEntreEnsayosMs;
    let medicion = null;
    const motor = crearEnsayoMedido({
      reloj,
      limiteRespuestaMs: secuencia.limiteRespuestaMs,
      alTerminar: (m) => {
        medicion = m;
      },
      programar: (fn) => {
        pendiente = fn;
        return 1;
      },
      cancelar: () => {
        pendiente = null;
      }
    });
    motor.iniciar();
    const aparicion = t;
    if (c.pausa) {
      t = aparicion + 100;
      motor.ocultar();
      t += c.pausa;
      motor.mostrar();
      pausas += 1;
    }
    if (c.lado === null) {
      t = aparicion + secuencia.limiteRespuestaMs;
      pendiente();
    } else {
      t = aparicion + c.tr + (c.pausa || 0);
      motor.responder({ timeStamp: t, repeat: false }, c.lado, c.entrada);
    }
    ensayos.push(registrarEnsayo(planificados, i, medicion, secuencia));
  });

  return armarSesion({
    ensayos,
    semilla: SEMILLA_SIMULADA,
    reloj: reloj.variante,
    versionCatalogo: plan.versionCatalogo,
    pausas,
    repeticionesInstruccion: 1
  });
}
