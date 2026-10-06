/**
 * Campo de formulario del panel (M-08; RA-03, RA-11): etiqueta visible, pista
 * opcional y el mensaje del servidor junto al campo, entre la etiqueta y el
 * control. El control recibe id, aria-describedby (pista y error) y
 * aria-invalid; el error se marca con ícono y con la palabra «Error», no solo
 * con color.
 */
import { CircleAlert } from 'lucide-react';

/** Props de accesibilidad para un control con pista y error. */
export function describir(id, { pista, error }) {
  const ids = [pista && `${id}-pista`, error && `${id}-error`].filter(Boolean);
  return { id, 'aria-describedby': ids.length > 0 ? ids.join(' ') : undefined, 'aria-invalid': error ? true : undefined };
}

export function MensajeError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="campo__error">
      <CircleAlert aria-hidden="true" />
      <span>
        <span className="solo-lector">Error: </span>
        {children}
      </span>
    </p>
  );
}

/**
 * @param {{id: string, etiqueta: string, pista?: React.ReactNode, error?: string,
 *   indicacion?: string, children: (props: object) => React.ReactNode}} props
 *   `indicacion` va junto a la etiqueta, por ejemplo «(obligatorio)»
 */
export default function Campo({ id, etiqueta, pista, error, indicacion, children, className = '' }) {
  return (
    <div className={`campo${error ? ' campo--con-error' : ''} ${className}`.trim()}>
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
        {indicacion && <span className="campo__indicacion"> {indicacion}</span>}
      </label>
      {pista && (
        <p id={`${id}-pista`} className="campo__pista">
          {pista}
        </p>
      )}
      <MensajeError id={`${id}-error`}>{error}</MensajeError>
      {children(describir(id, { pista, error }))}
    </div>
  );
}
