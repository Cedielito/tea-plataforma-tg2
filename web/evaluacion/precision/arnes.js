/**
 * Arnés del experimento de precisión temporal (M-09, CT-07, T16): lo que corre
 * dentro de la página. Playwright lo inyecta antes de que cargue la web
 * (page.addInitScript), así que la web no cambia y no sabe que la miden.
 *
 * Por cada ensayo de /registro/prueba guarda en window.__arnesPrecision:
 * - insercionMs: el estímulo reemplaza a la cruz de fijación en
 *   .ensayo__centro (MutationObserver, después del commit de React).
 * - fotogramaMs y rafMs: la marca que el navegador entrega a
 *   requestAnimationFrame y performance.now() dentro de ese callback, en el
 *   fotograma que dibuja el estímulo (el mismo que usa el reloj 'animacion').
 *   Desde ahí se avisa a Node para que programe la tecla.
 * - dibujadoMs: performance.now() en un mensaje de MessageChannel enviado
 *   desde ese callback; se atiende cuando el navegador ya terminó el
 *   fotograma (rAF, estilos, diseño y dibujo van juntos, sin tareas en medio).
 *   Es la aparición de referencia (medicion.js la corrige si una tarea larga
 *   se coló antes del mensaje).
 * - desfaseEpocaMs: Date.now() − performance.now(), para pasar a la misma
 *   escala las marcas del reloj 'referencia', que usa Date.now().
 * - pulsacionMs: event.timeStamp del keydown real (fase de captura en
 *   window, antes que el listener de la web), y atencionMs: performance.now()
 *   al atenderlo. La pulsación es la referencia de la respuesta.
 *
 * Carga 'hilo-ocupado': tareas largas (espera activa) de `tareaLargaMs`
 * milisegundos, separadas por `entreTareasMs`, sorteadas con `semillaCarga`.
 * Cada una queda en `tareasLargas` como [inicio, fin].
 *
 * instalarArnes se serializa y corre en la página (scriptDeArnes): solo usa
 * lo que va en el mismo script, su copia de mulberry32 (azar.js), con una
 * prueba que comprueba que dan la misma secuencia.
 */

export const CARGAS = Object.freeze({ NORMAL: 'normal', HILO_OCUPADO: 'hilo-ocupado', CPU_X4: 'cpu-x4' });

/** Parámetros de la carga 'hilo-ocupado', en ms (mínimo y máximo de una distribución uniforme). */
export const TAREAS_LARGAS = Object.freeze({
  tareaLargaMs: Object.freeze([30, 100]),
  entreTareasMs: Object.freeze([100, 400])
});

/** Nombre del binding de Playwright por el que la página avisa a Node. */
export const AVISO = '__arnesAvisar';

/** Teclas de respuesta de las dos tareas (F y J). */
export const TECLAS_RESPUESTA = Object.freeze(['KeyF', 'KeyJ']);

/** Copia de crearAzar (web/src/registro/azar.js) para la página. */
export function mulberry32(semilla) {
  let estado = semilla >>> 0;
  return function siguiente() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{carga: string, semillaCarga: number, tareaLargaMs: number[], entreTareasMs: number[],
 *   aviso: string, teclas: string[]}} opciones
 */
export function instalarArnes({ carga, semillaCarga, tareaLargaMs, entreTareasMs, aviso, teclas }) {
  const estado = { ensayos: [], tareasLargas: [], avisosFallidos: 0 };
  window.__arnesPrecision = estado;

  const avisar = (datos) => {
    const fn = window[aviso];
    if (typeof fn === 'function') fn(datos);
    else estado.avisosFallidos += 1;
  };

  if (carga === 'hilo-ocupado') {
    const sorteo = mulberry32(semillaCarga);
    const entre = ([min, max]) => min + sorteo() * (max - min);
    const programar = () => {
      setTimeout(() => {
        const inicio = performance.now();
        const duracion = entre(tareaLargaMs);
        while (performance.now() - inicio < duracion) {
          // Espera activa: el hilo principal no atiende nada más.
        }
        estado.tareasLargas.push([inicio, performance.now()]);
        programar();
      }, entre(entreTareasMs));
    };
    programar();
  }

  const centrosVistos = new WeakSet();
  const botonesVistos = new WeakSet();
  let actual = null;
  let finAvisado = false;

  function revisar() {
    const centro = document.querySelector('.ensayo__centro');
    const primero = centro && centro.firstElementChild;
    if (primero && !primero.classList.contains('ensayo__fijacion') && !centrosVistos.has(centro)) {
      centrosVistos.add(centro);
      const registro = { insercionMs: performance.now() };
      estado.ensayos.push(registro);
      actual = registro;
      const indice = estado.ensayos.length - 1;
      requestAnimationFrame((marca) => {
        registro.fotogramaMs = marca;
        registro.rafMs = performance.now();
        registro.desfaseEpocaMs = Date.now() - performance.now();
        const canal = new MessageChannel();
        canal.port1.onmessage = () => {
          registro.dibujadoMs = performance.now();
          canal.port1.close();
        };
        canal.port2.postMessage(null);
        avisar({ tipo: 'aparicion', indice });
      });
    }
    const boton = document.querySelector('button.tarea__continuar');
    if (boton && !botonesVistos.has(boton)) {
      botonesVistos.add(boton);
      avisar({ tipo: 'pantalla' });
    }
    if (!finAvisado && document.querySelector('a[download]')) {
      finAvisado = true;
      avisar({ tipo: 'fin' });
    }
  }

  new MutationObserver(revisar).observe(document, { childList: true, subtree: true });

  window.addEventListener(
    'keydown',
    (evento) => {
      if (!actual || 'pulsacionMs' in actual || evento.repeat || !teclas.includes(evento.code)) return;
      actual.pulsacionMs = evento.timeStamp;
      actual.atencionMs = performance.now();
      actual.code = evento.code;
      actual.confiable = evento.isTrusted;
    },
    true
  );
}

/**
 * Código que se inyecta con page.addInitScript({ content }): mulberry32 y el
 * arnés con sus opciones, para la carga y la semilla de la sesión.
 * @param {{carga: string, semillaCarga: number}} opciones
 */
export function scriptDeArnes({ carga, semillaCarga }) {
  const opciones = { carga, semillaCarga, ...TAREAS_LARGAS, aviso: AVISO, teclas: TECLAS_RESPUESTA };
  return `${mulberry32.toString()}\n(${instalarArnes.toString()})(${JSON.stringify(opciones)});\n`;
}
