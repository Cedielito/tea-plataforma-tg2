/**
 * Fuentes de un elemento dentro de una lista, en un <details> que se abre con
 * Enter o Espacio (RCN-01; RA-03, RA-11). Lo usan los pasos de la guía de la
 * ruta (M-03) y las entidades del directorio (M-04): la lista queda corta y
 * las fuentes están a un toque. `titulo` va oculto en el resumen para que el
 * lector de pantalla diga de qué elemento son.
 *
 * @param {{titulo: string, fuentes: {texto: string, url?: string}[], children?: React.ReactNode}} props
 *   `children` va después de la lista, por ejemplo «Revisado el …»
 */
import { esEnlaceWeb } from '../utilidades/formato.js';

export default function FuentesDesplegables({ titulo, fuentes = [], children = null }) {
  return (
    <details className="fuentes-desplegables">
      <summary>
        Fuentes<span className="solo-lector"> de «{titulo}»</span>
      </summary>
      <ul className="fuentes__lista">
        {fuentes.map(({ texto, url }, i) => (
          <li key={i}>{esEnlaceWeb(url) ? <a href={url}>{texto}</a> : texto}</li>
        ))}
      </ul>
      {children}
    </details>
  );
}
