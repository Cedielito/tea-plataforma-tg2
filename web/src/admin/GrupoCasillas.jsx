/**
 * Grupo de casillas del panel (M-08, RF-10; RA-03, RA-11): <fieldset> con
 * <legend> visible, pista opcional y el mensaje del servidor junto al grupo,
 * igual que Campo.jsx. Cada casilla es un objetivo táctil de 44 px. Lo usan el
 * editor de pasos de la ruta para perfiles, tramos, regímenes y tipos de
 * entidad, y el de recursos para los perfiles destinatarios.
 */
import { MensajeError } from '../componentes/Campo.jsx';

/** id de la casilla de un valor: el resumen de errores enlaza a la primera. */
export const idCasilla = (id, valor) => `${id}-${valor}`;

/**
 * @param {{id: string, etiqueta: string, indicacion?: string, pista?: string, error?: string,
 *   opciones: {valor: string, etiqueta: string}[], valores: string[],
 *   alCambiar: (valores: string[]) => void}} props los valores elegidos se
 *   devuelven en el orden de `opciones`
 */
export default function GrupoCasillas({ id, etiqueta, indicacion, pista, error, opciones, valores, alCambiar }) {
  const descripcion = [pista && `${id}-pista`, error && `${id}-error`].filter(Boolean).join(' ');

  function alternar(valor, marcada) {
    const elegidos = marcada ? [...valores, valor] : valores.filter((v) => v !== valor);
    alCambiar(opciones.map((opcion) => opcion.valor).filter((v) => elegidos.includes(v)));
  }

  return (
    <fieldset
      id={id}
      className={`campo grupo-casillas${error ? ' campo--con-error' : ''}`}
      aria-describedby={descripcion || undefined}
    >
      <legend className="campo__etiqueta">
        {etiqueta}
        {indicacion && <span className="campo__indicacion"> {indicacion}</span>}
      </legend>
      {pista && (
        <p id={`${id}-pista`} className="campo__pista">
          {pista}
        </p>
      )}
      <MensajeError id={`${id}-error`}>{error}</MensajeError>
      <div className="grupo-casillas__opciones">
        {opciones.map(({ valor, etiqueta: nombre }) => (
          <label key={valor} className="casilla">
            <input
              type="checkbox"
              id={idCasilla(id, valor)}
              checked={valores.includes(valor)}
              onChange={(evento) => alternar(valor, evento.target.checked)}
            />
            {nombre}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
