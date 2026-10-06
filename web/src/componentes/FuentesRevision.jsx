/**
 * Fuentes y fecha de revisión al final de cada página (RCN-01, RCN-02;
 * Cuadro 14, «Lenguaje»). Las fuentes con enlace web abren en la misma
 * pestaña; las que no tienen enlace (una ley impresa, un libro) se muestran
 * como texto. Si la página reúne varios contenidos (señales de alerta), cada
 * uno muestra sus propias fuentes y su propia fecha.
 */
import { useId } from 'react';
import { esEnlaceWeb, fechaRevision } from '../utilidades/formato.js';

function Revision({ valor }) {
  const fecha = fechaRevision(valor);
  if (!fecha) return null;
  return (
    <p className="fuentes__revision">
      Revisado el <time dateTime={fecha.iso}>{fecha.texto}</time>
    </p>
  );
}

/** @param {{grupos: {titulo?: string, fuentes: {texto: string, url?: string}[], fechaRevision: string}[]}} props */
export default function FuentesRevision({ grupos }) {
  const idTitulo = useId();
  const conSubtitulos = grupos.length > 1;

  return (
    <section className="fuentes" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="fuentes__titulo">Fuentes</h2>
      {grupos.map(({ titulo, fuentes = [], fechaRevision: fecha }, indice) => (
        <div key={titulo || indice} className="fuentes__grupo">
          {conSubtitulos && titulo && <h3 className="fuentes__subtitulo">{titulo}</h3>}
          <ul className="fuentes__lista">
            {fuentes.map(({ texto, url }, i) => (
              <li key={i}>{esEnlaceWeb(url) ? <a href={url}>{texto}</a> : texto}</li>
            ))}
          </ul>
          <Revision valor={fecha} />
        </div>
      ))}
    </section>
  );
}
