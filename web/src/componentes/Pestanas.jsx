/**
 * Pestañas accesibles según el patrón de WAI-ARIA (RA-03, RA-11; RF-03):
 * role tablist, tab y tabpanel, aria-selected y aria-controls. Solo la
 * pestaña elegida está en el orden de tabulación; con las flechas izquierda y
 * derecha (en ciclo), Inicio y Fin se pasa a otra y se muestra de inmediato.
 * Hay un solo panel, cuyo contenido cambia con la pestaña elegida.
 *
 * Si una pestaña trae `nombre`, ese es su nombre accesible (aria-label) y debe
 * empezar por el texto visible (WCAG 2.5.3): «4 a 7» se anuncia «4 a 7 años».
 */
import { useId, useLayoutEffect, useRef } from 'react';

const TECLAS = {
  ArrowRight: (i, total) => (i + 1) % total,
  ArrowLeft: (i, total) => (i - 1 + total) % total,
  Home: () => 0,
  End: (_i, total) => total - 1
};

/**
 * @param {{etiquetadoPor: string, pestanas: {valor: string, etiqueta: string, nombre?: string}[],
 *   seleccionada: string, alCambiar: (valor: string) => void, children: any}} props
 */
export default function Pestanas({ etiquetadoPor, pestanas, seleccionada, alCambiar, children }) {
  const base = useId();
  const botones = useRef(new Map());
  const porEnfocar = useRef(null);
  const idPestana = (valor) => `${base}-pestana-${valor}`;
  const idPanel = `${base}-panel`;

  // Con el teclado, el foco pasa a la pestaña nueva cuando ya está marcada
  // como elegida, para que el lector de pantalla la anuncie «seleccionada».
  useLayoutEffect(() => {
    if (porEnfocar.current !== seleccionada) return;
    porEnfocar.current = null;
    botones.current.get(seleccionada)?.focus();
  }, [seleccionada]);

  function alPresionarTecla(evento, indice) {
    const mover = TECLAS[evento.key];
    if (!mover) return;
    evento.preventDefault();
    const { valor } = pestanas[mover(indice, pestanas.length)];
    porEnfocar.current = valor;
    alCambiar(valor);
  }

  return (
    <>
      <div role="tablist" aria-labelledby={etiquetadoPor} className="pestanas">
        {pestanas.map(({ valor, etiqueta, nombre }, indice) => {
          const elegida = valor === seleccionada;
          return (
            <button
              key={valor}
              ref={(boton) => (boton ? botones.current.set(valor, boton) : botones.current.delete(valor))}
              type="button"
              role="tab"
              id={idPestana(valor)}
              aria-label={nombre}
              aria-selected={elegida}
              aria-controls={idPanel}
              tabIndex={elegida ? 0 : -1}
              className="pestana"
              onClick={() => alCambiar(valor)}
              onKeyDown={(evento) => alPresionarTecla(evento, indice)}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={idPanel} aria-labelledby={idPestana(seleccionada)} tabIndex={0} className="pestanas__panel">
        {children}
      </div>
    </>
  );
}
