/**
 * Tarjeta de un recurso en /recursos (M-05; RF-06, HU-09, RCN-01, RCN-02;
 * RA-01, RA-05, RA-11): título (h2), para quién es y qué tipo de recurso es
 * (con texto, no solo con el ícono), descripción, un enlace que dice qué abre
 * y en qué sitio («Descargar PDF (minsalud.gov.co)»), «Revisado el
 * dd/mm/aaaa» y las fuentes en un desplegable.
 *
 * El nombre accesible del enlace empieza por su texto visible y sigue con el
 * título del recurso, oculto, para que se entienda fuera de la tarjeta. Abre
 * en la misma pestaña, como todos los enlaces del sitio.
 */
import { useId } from 'react';
import { ExternalLink, FileDown, FileText, Globe } from 'lucide-react';
import FuentesDesplegables from '../componentes/FuentesDesplegables.jsx';
import { Revision } from '../componentes/FuentesRevision.jsx';
import { enlaceDeRecurso, paraQuien } from './enlaceRecurso.js';

export default function TarjetaRecurso({ recurso }) {
  const { titulo, descripcion, tipo, perfiles, fuentes, fechaRevision } = recurso;
  const idTitulo = useId();
  const enlace = enlaceDeRecurso(recurso);
  const destinatarios = paraQuien(perfiles);
  const esArchivo = tipo === 'archivo';
  const IconoTipo = esArchivo ? FileText : Globe;
  const IconoEnlace = esArchivo ? FileDown : ExternalLink;

  return (
    <li className="recurso">
      <article aria-labelledby={idTitulo} className="recurso__cuerpo">
        <h2 id={idTitulo} className="recurso__titulo">
          {titulo}
        </h2>
        <p className="recurso__datos">
          {destinatarios && <span className="recurso__dato">{destinatarios}</span>}
          <span className="recurso__dato">
            <IconoTipo aria-hidden="true" />
            {esArchivo ? 'Documento para descargar' : 'Página oficial'}
          </span>
        </p>
        <p className="recurso__descripcion">{descripcion}</p>
        {enlace && (
          <a href={enlace.href} type={enlace.pdf ? 'application/pdf' : undefined} className="boton boton-primario recurso__enlace">
            <IconoEnlace aria-hidden="true" />
            <span>
              {enlace.texto}
              <span className="solo-lector">: {titulo}</span>
            </span>
          </a>
        )}
        <div className="recurso__pie">
          <Revision valor={fechaRevision} />
          <FuentesDesplegables titulo={titulo} fuentes={fuentes} />
        </div>
      </article>
    </li>
  );
}
