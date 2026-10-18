/**
 * Motor de un ensayo (M-09, CT-07, RF-13, RF-14): mide desde la aparición del
 * estímulo hasta la primera respuesta, registra aparte las pausas por pestaña
 * oculta (el dominio las descuenta: tiempo neto) y cierra el ensayo como
 * omitido si no hay respuesta en el límite. No toca el DOM: la
 * pantalla (PantallaEnsayo.jsx) le pasa los eventos, y las pruebas, eventos
 * falsos con un reloj inyectado. Lo reutiliza la tarea de Navon (T14).
 *
 * - iniciar(): se llama cuando el estímulo y la señal ya están en la página;
 *   el reloj marca la aparición (reloj.js).
 * - responder(evento, lado, tipoEntrada): cuenta solo la primera respuesta
 *   (rectificaciones = 0). Se ignoran las que llegan antes de la aparición y
 *   las repeticiones automáticas de una tecla mantenida.
 * - ocultar() y mostrar(): con visibilitychange. El tiempo con la pestaña
 *   oculta va a pausasDuranteItemMs (RF-13) y no cuenta para el límite.
 * - Sin respuesta en `limiteRespuestaMs` netos: estadoItem 'omitido' y
 *   tiempoReaccionMs null.
 *
 * Los tiempos se redondean a milésimas de milisegundo, solo para quitar el
 * ruido de la resta en coma flotante.
 */

export const ESTADOS_ITEM = Object.freeze({ RESPONDIDO: 'respondido', OMITIDO: 'omitido' });

export const TIPOS_ENTRADA = Object.freeze({ TECLADO: 'teclado', RATON: 'raton', TACTIL: 'tactil', LAPIZ: 'lapiz' });

/** Tipo de entrada de un pointerdown según event.pointerType. */
export function tipoDePuntero(pointerType) {
  return { mouse: TIPOS_ENTRADA.RATON, touch: TIPOS_ENTRADA.TACTIL, pen: TIPOS_ENTRADA.LAPIZ }[pointerType] || TIPOS_ENTRADA.RATON;
}

export const redondear = (ms) => Math.round(ms * 1000) / 1000;

/**
 * @param {{reloj: object, limiteRespuestaMs: number, alTerminar: (medicion: object) => void,
 *   programar?: Function, cancelar?: Function}} opciones
 */
export function crearEnsayoMedido({
  reloj,
  limiteRespuestaMs,
  alTerminar,
  programar = (fn, ms) => globalThis.setTimeout(fn, ms),
  cancelar = (id) => globalThis.clearTimeout(id)
}) {
  let aparicion = null;
  let terminado = false;
  let pausas = 0;
  let inicioPausa = null;
  let espera = null;
  let cancelarAparicion = null;

  const netoHasta = (t) => t - aparicion - pausas - (inicioPausa === null ? 0 : t - inicioPausa);

  function cancelarEspera() {
    if (espera !== null) cancelar(espera);
    espera = null;
  }

  function programarOmision() {
    cancelarEspera();
    espera = programar(revisarOmision, Math.max(0, limiteRespuestaMs - netoHasta(reloj.ahora())));
  }

  function revisarOmision() {
    espera = null;
    // Con la pestaña oculta no se cierra: se vuelve a revisar al mostrarla.
    if (terminado || inicioPausa !== null) return;
    if (netoHasta(reloj.ahora()) >= limiteRespuestaMs) terminar(null, null, null);
    else programarOmision();
  }

  function terminar(lado, tipoEntrada, momento) {
    terminado = true;
    cancelarEspera();
    const respondido = lado !== null;
    alTerminar({
      estadoItem: respondido ? ESTADOS_ITEM.RESPONDIDO : ESTADOS_ITEM.OMITIDO,
      respuesta: lado,
      tipoEntrada,
      aparicionMs: redondear(aparicion),
      momentoRespuestaMs: respondido ? redondear(momento) : null,
      tiempoReaccionMs: respondido ? redondear(momento - aparicion) : null,
      pausasDuranteItemMs: redondear(pausas),
      rectificaciones: 0
    });
  }

  return {
    iniciar() {
      if (terminado || cancelarAparicion) return;
      cancelarAparicion = reloj.marcarAparicion((t) => {
        if (terminado) return;
        aparicion = t;
        programarOmision();
      });
    },

    /** @returns {boolean} si la respuesta se registró */
    responder(evento, lado, tipoEntrada) {
      if (terminado || aparicion === null || (evento && evento.repeat)) return false;
      const momento = reloj.momentoDeRespuesta(evento);
      if (momento < aparicion) return false;
      if (inicioPausa !== null) {
        pausas += Math.max(0, momento - inicioPausa);
        inicioPausa = null;
      }
      terminar(lado, tipoEntrada, momento);
      return true;
    },

    ocultar() {
      if (terminado || aparicion === null || inicioPausa !== null) return;
      inicioPausa = reloj.ahora();
    },

    mostrar() {
      if (inicioPausa === null) return;
      pausas += reloj.ahora() - inicioPausa;
      inicioPausa = null;
      if (!terminado) programarOmision();
    },

    /** Al desmontar la pantalla: no registra nada. */
    cancelar() {
      terminado = true;
      cancelarEspera();
      if (cancelarAparicion) cancelarAparicion();
    }
  };
}
