/**
 * Pantalla de un ensayo (M-09, CT-03, CT-07, RF-13, RF-14): las dos cajas,
 * la cruz de fijación durante el intervalo entre ensayos y después, al mismo
 * tiempo, la señal de la regla y el juguete. El tiempo de reacción se mide
 * desde esa aparición (motorEnsayo.js y reloj.js).
 *
 * - Respuesta con F o J (event.code, sin importar la distribución del
 *   teclado), o con pointerdown sobre una caja (ratón, táctil o lápiz). Un
 *   clic desde el teclado (Enter o espacio sobre la caja enfocada) también
 *   cuenta, como teclado; el clic que sigue a un pointerdown se ignora.
 * - visibilitychange: el tiempo con la pestaña oculta va aparte (RF-13).
 * - Sin animaciones ni sonidos. La pantalla solo recibe lo visible del
 *   ensayo (vistaDeEnsayo, CT-03): regla y estímulo.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Palette, Shapes } from 'lucide-react';
import Figura from './Figura.jsx';
import { CAJAS, TECLAS } from './estimulos.js';
import { crearEnsayoMedido, tipoDePuntero, TIPOS_ENTRADA } from './motorEnsayo.js';
import { ENSAYO, etiquetaCaja, SENALES } from './textos.js';

const ICONOS_SENAL = { color: Palette, forma: Shapes };

function Senal({ regla }) {
  const Icono = ICONOS_SENAL[regla];
  return (
    <p className="ensayo__senal">
      <Icono aria-hidden="true" className="ensayo__senal-icono" />
      <span>{SENALES[regla]}</span>
    </p>
  );
}

/**
 * @param {{vista: object, reloj: object, limiteRespuestaMs: number,
 *   intervaloEntreEnsayosMs: number, alTerminar: (medicion: object) => void}} props
 *   vista: vistaDeEnsayo del ensayo planeado
 */
export default function PantallaEnsayo({ vista, reloj, limiteRespuestaMs, intervaloEntreEnsayosMs, alTerminar }) {
  const [visible, setVisible] = useState(false);
  const motor = useRef(null);
  const terminar = useRef(alTerminar);
  terminar.current = alTerminar;

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
      const lado = TECLAS[evento.code];
      if (!lado || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      evento.preventDefault();
      medido.responder(evento, lado, TIPOS_ENTRADA.TECLADO);
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

  const responder = (evento, lado, tipoEntrada) => motor.current?.responder(evento, lado, tipoEntrada);

  return (
    <section className="ensayo" aria-label={ENSAYO.region}>
      <div className="ensayo__cajas">
        {Object.entries(CAJAS).map(([lado, caja]) => (
          <button
            key={lado}
            type="button"
            className={`ensayo__caja ensayo__caja--${lado}`}
            aria-label={etiquetaCaja(caja)}
            onPointerDown={(e) => responder(e.nativeEvent, lado, tipoDePuntero(e.pointerType))}
            onClick={(e) => {
              if (e.detail === 0) responder(e.nativeEvent, lado, TIPOS_ENTRADA.TECLADO);
            }}
          >
            <Figura estimulo={caja} decorativa className="ensayo__figura-caja" />
            <span className="ensayo__tecla" aria-hidden="true">{caja.tecla}</span>
          </button>
        ))}
      </div>

      <div className="ensayo__centro">
        {visible ? (
          <>
            <Senal regla={vista.regla} />
            <Figura estimulo={vista.estimulo} className="ensayo__figura" />
          </>
        ) : (
          <p className="ensayo__fijacion">
            <span aria-hidden="true">+</span>
            <span className="solo-lector">{ENSAYO.fijacion}</span>
          </p>
        )}
      </div>
    </section>
  );
}
