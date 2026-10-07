/**
 * Una pregunta del acordeón de /preguntas-frecuentes (M-05; RF-07, RCN-01,
 * RCN-02; RA-03, RA-11). El <li> lleva el id del slug, para que el ancla
 * #slug apunte a la pregunta. El botón va dentro del h2 y dice con
 * aria-expanded si está abierta; el panel se oculta con `hidden`, así que su
 * contenido no se lee mientras está cerrada.
 *
 * El panel muestra la respuesta en Markdown seguro, sus fuentes (h3) y
 * «Revisado el dd/mm/aaaa». El ícono cambia de forma, no solo de color.
 */
import { forwardRef, useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Revision } from '../componentes/FuentesRevision.jsx';
import Markdown from '../componentes/Markdown.jsx';
import { esEnlaceWeb } from '../utilidades/formato.js';

const PreguntaDesplegable = forwardRef(function PreguntaDesplegable({ pregunta, abierta, alAlternar }, ref) {
  const { slug, pregunta: texto, respuesta, fuentes = [], fechaRevision } = pregunta;
  const base = useId();
  const idBoton = `${base}-boton`;
  const idPanel = `${base}-panel`;
  const Icono = abierta ? ChevronUp : ChevronDown;

  return (
    <li ref={ref} id={slug} className="acordeon__elemento">
      <h2 className="acordeon__titulo">
        <button
          type="button"
          id={idBoton}
          className="acordeon__boton"
          aria-expanded={abierta}
          aria-controls={idPanel}
          onClick={alAlternar}
        >
          <span className="acordeon__pregunta">{texto}</span>
          <Icono aria-hidden="true" className="acordeon__icono" />
        </button>
      </h2>
      <div id={idPanel} className="acordeon__panel" hidden={!abierta}>
        <Markdown texto={respuesta} nivelTitulos={3} className="prosa acordeon__respuesta" />
        <div className="acordeon__fuentes">
          <h3 className="acordeon__fuentes-titulo">Fuentes</h3>
          <ul className="fuentes__lista">
            {fuentes.map(({ texto: fuente, url }, i) => (
              <li key={i}>{esEnlaceWeb(url) ? <a href={url}>{fuente}</a> : fuente}</li>
            ))}
          </ul>
          <Revision valor={fechaRevision} />
        </div>
      </div>
    </li>
  );
});

export default PreguntaDesplegable;
