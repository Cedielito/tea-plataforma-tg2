/**
 * Ensayo de la tarea de cambio de regla (M-09, CT-03) sobre la pantalla
 * compartida (PantallaEnsayo.jsx): las dos cajas arriba, con su figura y su
 * tecla, y después de la cruz, al mismo tiempo, la señal de la regla y el
 * juguete. Solo recibe lo visible del ensayo (vistaDeEnsayo).
 */
import { Palette, Shapes } from 'lucide-react';
import Figura from './Figura.jsx';
import PantallaEnsayo from './PantallaEnsayo.jsx';
import { CAJAS, TECLAS } from './estimulos.js';
import { ENSAYO, etiquetaCaja, SENALES } from './textos.js';

const ICONOS_SENAL = { color: Palette, forma: Shapes };

/** Cajas en el orden de la pantalla, con la tecla de cada una (TECLAS). */
const OPCIONES = Object.entries(CAJAS).map(([lado, caja]) => ({
  valor: lado,
  code: Object.keys(TECLAS).find((code) => TECLAS[code] === lado),
  etiqueta: etiquetaCaja(caja),
  contenido: (
    <>
      <Figura estimulo={caja} decorativa className="ensayo__figura-caja" />
      <span className="ensayo__tecla" aria-hidden="true">{caja.tecla}</span>
    </>
  )
}));

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
export default function EnsayoCambioRegla({ vista, ...medicion }) {
  return (
    <PantallaEnsayo
      opciones={OPCIONES}
      textos={ENSAYO}
      estimulo={
        <>
          <Senal regla={vista.regla} />
          <Figura estimulo={vista.estimulo} className="ensayo__figura" />
        </>
      }
      {...medicion}
    />
  );
}
