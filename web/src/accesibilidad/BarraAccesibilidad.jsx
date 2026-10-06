/**
 * Barra de ajustes de accesibilidad (M-07; RA-01 a RA-11): tamaño de letra
 * en 3 niveles, alto contraste y reducir movimiento. En pantallas pequeñas se
 * pliega detrás de un botón con aria-expanded.
 */
import { useId, useState } from 'react';
import { ChevronDown, Contrast, Pause, SlidersHorizontal } from 'lucide-react';
import { TAMANOS } from './ajustes.js';
import { useAjustes } from './ContextoAjustes.jsx';

export default function BarraAccesibilidad() {
  const { ajustes, cambiarTamano, alternar } = useAjustes();
  const [abierta, setAbierta] = useState(false);
  const idPanel = useId();
  const idTamano = useId();

  return (
    <section className="barra-accesibilidad" aria-label="Ajustes de accesibilidad">
      <div className="contenedor barra-accesibilidad__interior">
        <button
          type="button"
          className="barra-accesibilidad__desplegar"
          aria-expanded={abierta}
          aria-controls={idPanel}
          onClick={() => setAbierta((valor) => !valor)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Ajustes de accesibilidad
          <ChevronDown aria-hidden="true" className="barra-accesibilidad__flecha" />
        </button>

        <div
          id={idPanel}
          className={`barra-accesibilidad__panel${abierta ? ' esta-abierta' : ''}`}
        >
          <div className="grupo-ajuste" role="group" aria-labelledby={idTamano}>
            <span id={idTamano} className="grupo-ajuste__titulo">Tamaño de letra</span>
            <div className="grupo-ajuste__opciones">
              {TAMANOS.map(({ valor, etiqueta }) => (
                <button
                  key={valor}
                  type="button"
                  className={`ajuste ajuste--${valor}`}
                  aria-pressed={ajustes.tamano === valor}
                  onClick={() => cambiarTamano(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="ajuste"
            aria-pressed={ajustes.altoContraste}
            onClick={() => alternar('altoContraste')}
          >
            <Contrast aria-hidden="true" />
            Alto contraste
          </button>

          <button
            type="button"
            className="ajuste"
            aria-pressed={ajustes.reducirMovimiento}
            onClick={() => alternar('reducirMovimiento')}
          >
            <Pause aria-hidden="true" />
            Reducir movimiento
          </button>
        </div>
      </div>
    </section>
  );
}
