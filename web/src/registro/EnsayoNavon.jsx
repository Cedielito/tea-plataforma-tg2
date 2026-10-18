/**
 * Ensayo de la tarea de Navon (M-09, CC-10, CT-03) sobre la pantalla
 * compartida (PantallaEnsayo.jsx): arriba, el recordatorio fijo del nivel
 * del bloque («GRANDE» o «PEQUEÑAS»), visible también durante la cruz; en el
 * centro, el cartel, que queda visible hasta la respuesta o el límite; abajo,
 * dos botones grandes con la letra y su tecla (F = H, J = S). Solo recibe lo
 * visible del ensayo (vistaDeEnsayo).
 */
import { Eye } from 'lucide-react';
import FiguraNavon from './FiguraNavon.jsx';
import PantallaEnsayo from './PantallaEnsayo.jsx';
import { OPCIONES_LETRA } from './estimulosNavon.js';
import { etiquetaLetra, NAVON, RECORDATORIOS_NAVON } from './textos.js';

const OPCIONES = OPCIONES_LETRA.map((opcion) => ({
  valor: opcion.valor,
  code: opcion.code,
  etiqueta: etiquetaLetra(opcion),
  contenido: (
    <>
      <span className="ensayo__letra" aria-hidden="true">{opcion.valor}</span>
      <span className="ensayo__tecla" aria-hidden="true">{opcion.tecla}</span>
    </>
  )
}));

/**
 * @param {{vista: object, reloj: object, limiteRespuestaMs: number,
 *   intervaloEntreEnsayosMs: number, alTerminar: (medicion: object) => void}} props
 *   vista: vistaDeEnsayo del ensayo planeado
 */
export default function EnsayoNavon({ vista, ...medicion }) {
  return (
    <PantallaEnsayo
      opciones={OPCIONES}
      textos={NAVON.ensayo}
      variante="letras"
      opcionesDebajo
      encabezado={
        <p className="ensayo__senal ensayo__recordatorio">
          <Eye aria-hidden="true" className="ensayo__senal-icono" />
          <span>{RECORDATORIOS_NAVON[vista.condicion]}</span>
        </p>
      }
      estimulo={<FiguraNavon estimulo={vista.estimulo} className="ensayo__figura-navon" />}
      {...medicion}
    />
  );
}
