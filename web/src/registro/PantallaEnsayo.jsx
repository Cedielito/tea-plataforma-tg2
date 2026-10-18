/**
 * Pantalla de un ensayo (M-09, CT-03, CT-07, RF-13, RF-14), compartida por
 * las dos tareas: los botones de respuesta, la cruz de fijación durante el
 * intervalo entre ensayos y después el estímulo. El tiempo de reacción se
 * mide desde esa aparición (motorEnsayo.js y reloj.js).
 *
 * Lo propio de cada tarea llega por props (EnsayoCambioRegla.jsx y
 * EnsayoNavon.jsx): las opciones de respuesta con su tecla, lo que aparece
 * después de la cruz (en cambio de regla, la señal y el juguete; en Navon,
 * el cartel) y un encabezado fijo opcional (en Navon, el recordatorio del
 * nivel del bloque, visible también durante la cruz).
 *
 * - Respuesta con la tecla de cada opción (event.code, sin importar la
 *   distribución del teclado), o con pointerdown sobre un botón (ratón,
 *   táctil o lápiz). Un clic desde el teclado (Enter o espacio sobre el botón
 *   enfocado) también cuenta, como teclado; el clic que sigue a un
 *   pointerdown se ignora.
 * - visibilitychange: el tiempo con la pestaña oculta va aparte (RF-13).
 * - Sin animaciones ni sonidos. Quien la usa solo le pasa lo visible del
 *   ensayo (vistaDeEnsayo, CT-03).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { crearEnsayoMedido, tipoDePuntero, TIPOS_ENTRADA } from './motorEnsayo.js';

/**
 * @param {{opciones: Array<{valor: string, code: string, etiqueta: string, contenido: React.ReactNode}>,
 *   estimulo: React.ReactNode, encabezado?: React.ReactNode, textos: {region: string, fijacion: string},
 *   opcionesDebajo?: boolean, variante?: string, reloj: object, limiteRespuestaMs: number,
 *   intervaloEntreEnsayosMs: number, alTerminar: (medicion: object) => void}} props
 *   opciones: en el orden en que se muestran; `valor` es lo que se registra como respuesta
 *   variante: clase modificadora de la pantalla (ensayo--cajas, ensayo--letras)
 */
export default function PantallaEnsayo({
  opciones,
  estimulo,
  encabezado = null,
  textos,
  opcionesDebajo = false,
  variante = 'cajas',
  reloj,
  limiteRespuestaMs,
  intervaloEntreEnsayosMs,
  alTerminar
}) {
  const [visible, setVisible] = useState(false);
  const motor = useRef(null);
  const terminar = useRef(alTerminar);
  terminar.current = alTerminar;
  const teclas = useRef({});
  teclas.current = Object.fromEntries(opciones.map((o) => [o.code, o.valor]));

  // Intervalo entre ensayos: solo la cruz de fijación, sin nada que cuente el tiempo.
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), intervaloEntreEnsayosMs);
    return () => clearTimeout(id);
  }, [intervaloEntreEnsayosMs]);

  // Con el estímulo ya en la página: el reloj marca la aparición en el siguiente fotograma.
  useLayoutEffect(() => {
    if (!visible) return undefined;
    const medido = crearEnsayoMedido({
      reloj,
      limiteRespuestaMs,
      alTerminar: (medicion) => terminar.current(medicion)
    });
    motor.current = medido;

    function alPresionar(evento) {
      const valor = teclas.current[evento.code];
      if (!valor || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      evento.preventDefault();
      medido.responder(evento, valor, TIPOS_ENTRADA.TECLADO);
    }
    const alCambiarVisibilidad = () => (document.hidden ? medido.ocultar() : medido.mostrar());

    window.addEventListener('keydown', alPresionar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    medido.iniciar();
    return () => {
      window.removeEventListener('keydown', alPresionar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      medido.cancelar();
      motor.current = null;
    };
  }, [visible, reloj, limiteRespuestaMs]);

  const responder = (evento, valor, tipoEntrada) => motor.current?.responder(evento, valor, tipoEntrada);

  const botones = (
    <div className="ensayo__opciones">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          className="ensayo__opcion"
          aria-label={opcion.etiqueta}
          onPointerDown={(e) => responder(e.nativeEvent, opcion.valor, tipoDePuntero(e.pointerType))}
          onClick={(e) => {
            if (e.detail === 0) responder(e.nativeEvent, opcion.valor, TIPOS_ENTRADA.TECLADO);
          }}
        >
          {opcion.contenido}
        </button>
      ))}
    </div>
  );

  return (
    <section className={`ensayo ensayo--${variante}`} aria-label={textos.region}>
      {encabezado}
      {!opcionesDebajo && botones}

      <div className="ensayo__centro">
        {visible ? (
          estimulo
        ) : (
          <p className="ensayo__fijacion">
            <span aria-hidden="true">+</span>
            <span className="solo-lector">{textos.fijacion}</span>
          </p>
        )}
      </div>

      {opcionesDebajo && botones}
    </section>
  );
}
