/**
 * Resumen de errores de los editores del panel y del formulario de contacto
 * (M-06, M-08; RA-03, RA-11). Aparece arriba del formulario cuando no se
 * puede guardar o enviar, recibe el foco y enlaza a cada campo con problema.
 * El mensaje de cada campo se repite junto a él; un error sin campo (`id`
 * vacío) se muestra como texto.
 */
import { forwardRef, useId } from 'react';
import { CircleAlert } from 'lucide-react';

function irAlCampo(evento, id) {
  const campo = document.getElementById(id);
  if (!campo) return;
  evento.preventDefault();
  campo.focus();
  campo.scrollIntoView({ block: 'center' });
}

/** @param {{titulo: string, errores: {id: string, etiqueta: string, mensaje: string}[]}} props */
const ResumenErrores = forwardRef(function ResumenErrores({ titulo, errores }, ref) {
  const idTitulo = useId();
  return (
    <div ref={ref} tabIndex={-1} className="resumen-errores" aria-labelledby={idTitulo} role="region">
      <h2 id={idTitulo} className="resumen-errores__titulo">
        <CircleAlert aria-hidden="true" />
        {titulo}
      </h2>
      <ul className="resumen-errores__lista">
        {errores.map(({ id, etiqueta, mensaje }) => (
          <li key={`${id}-${mensaje}`}>
            {id ? (
              <a href={`#${id}`} onClick={(evento) => irAlCampo(evento, id)}>
                {etiqueta}: {mensaje}
              </a>
            ) : (
              mensaje
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});

export default ResumenErrores;
