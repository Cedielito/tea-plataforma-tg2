/**
 * Mensajes mientras llega el contenido, si falla o si no hay nada publicado
 * (M-02; RA-10, RA-11). Lenguaje sencillo, sin jerga técnica, sin animación y
 * sin temporizadores: la API gratuita puede tardar hasta un minuto en
 * despertar, así que se dice con calma y se ofrece «Intentar de nuevo».
 *
 * El recuadro es una región de estado (role="status"): el lector de pantalla
 * anuncia cuando pasa de «cargando» a «error». Al reintentar, el foco pasa al
 * recuadro para que no se pierda cuando desaparece el botón; si el contenido
 * llega y el recuadro se retira con el foco adentro, el foco pasa al h1 de la
 * página, igual que al navegar (Layout.jsx), o al elemento de
 * `focoAlRetirarse` (una ref) si el recuadro está más abajo, dentro de una
 * parte de la página con su propio título (la guía de la ruta).
 *
 * Con `reservarAlto`, mientras carga, el recuadro ocupa el alto de la ventana
 * (T10): el pie queda fuera de la vista y no salta cuando llega el contenido
 * (CLS de Lighthouse). Lo usan las páginas públicas cuyo contenido llega de la
 * API.
 */
import { useLayoutEffect, useRef } from 'react';
import { CircleAlert, Hourglass, Info, RefreshCw } from 'lucide-react';
import { ESTADOS } from '../api/useDatos.js';

export const TEXTO_ESPERA = 'Si nadie ha visitado el sitio en un rato, puede tardar hasta un minuto.';

export default function EstadoDatos({
  estado,
  reintentar,
  queCarga = 'el contenido',
  sinContenido = 'Esta sección todavía no tiene contenido publicado.',
  reservarAlto = false,
  focoAlRetirarse = null
}) {
  const recuadro = useRef(null);
  const destino = useRef(focoAlRetirarse);
  destino.current = focoAlRetirarse;

  // Al desmontarse (llegó el contenido) el recuadro todavía está en la página:
  // si tenía el foco, se lo pasa al título.
  useLayoutEffect(() => {
    const elemento = recuadro.current;
    return () => {
      if (!elemento || elemento !== document.activeElement) return;
      const titulo = destino.current?.current ?? document.querySelector('main h1');
      if (!titulo) return;
      if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1');
      titulo.focus();
    };
  }, []);

  if (estado === ESTADOS.LISTO || estado === ESTADOS.INACTIVO) return null;

  function alReintentar() {
    recuadro.current?.focus();
    reintentar();
  }

  const Icono = { [ESTADOS.CARGANDO]: Hourglass, [ESTADOS.ERROR]: CircleAlert }[estado] || Info;
  const reserva = reservarAlto && estado === ESTADOS.CARGANDO ? ' estado--reserva' : '';

  return (
    <div ref={recuadro} tabIndex={-1} role="status" className={`estado estado--${estado}${reserva}`}>
      <Icono aria-hidden="true" className="estado__icono" />
      <div className="estado__texto">
        {estado === ESTADOS.CARGANDO && (
          <p>
            Estamos cargando {queCarga}. {TEXTO_ESPERA}
          </p>
        )}
        {estado === ESTADOS.ERROR && (
          <>
            <p>
              No pudimos cargar {queCarga}. El servidor puede estar despertando. Intenta de
              nuevo en unos segundos.
            </p>
            <button type="button" className="boton boton-secundario" onClick={alReintentar}>
              <RefreshCw aria-hidden="true" />
              Intentar de nuevo
            </button>
          </>
        )}
        {estado === ESTADOS.NO_ENCONTRADO && <p>{sinContenido}</p>}
      </div>
    </div>
  );
}
