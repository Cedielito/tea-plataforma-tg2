/**
 * Tarjeta de una entidad en /directorio (M-04; RF-05, RS-07, RCN-01, RCN-02;
 * RA-01, RA-05, RA-11). Todos los datos a la vista, sin página de detalle:
 * nombre (h3), tipo y lugar, descripción, contacto completo, «Verificado el
 * dd/mm/aaaa» y las fuentes en un desplegable.
 *
 * Si es un profesional independiente lo dice: sus datos se publican con su
 * autorización (RS-07). La constancia nunca llega a la web.
 */
import { useId } from 'react';
import { BadgeCheck } from 'lucide-react';
import FuentesDesplegables from '../componentes/FuentesDesplegables.jsx';
import { fechaRevision } from '../utilidades/formato.js';
import { CIUDADES, TIPOS_ENTIDAD, etiquetaDe } from '../catalogos.js';
import ContactoEntidad from './ContactoEntidad.jsx';

/** «Verificado el 06/10/2026», o nada si la fecha no es válida. */
export function Verificacion({ valor, className = '' }) {
  const fecha = fechaRevision(valor);
  if (!fecha) return null;
  return (
    <p className={`verificacion ${className}`.trim()}>
      <BadgeCheck aria-hidden="true" />
      <span>
        Verificado el <time dateTime={fecha.iso}>{fecha.texto}</time>
      </span>
    </p>
  );
}

/** Tipo y lugar, con su etiqueta para el lector de pantalla. */
export function TipoYLugar({ tipo, ciudad, className = '' }) {
  return (
    <p className={`tipo-lugar ${className}`.trim()}>
      <span className="tipo-lugar__dato">
        <span className="solo-lector">Tipo: </span>
        {etiquetaDe(TIPOS_ENTIDAD, tipo)}
      </span>
      <span className="tipo-lugar__dato">
        <span className="solo-lector">Dónde atiende: </span>
        {etiquetaDe(CIUDADES, ciudad)}
      </span>
    </p>
  );
}

export default function TarjetaEntidad({ entidad }) {
  const { nombre, tipo, ciudad, descripcion, contacto, esProfesional, fuentes, fechaVerificacion } = entidad;
  const idNombre = useId();

  return (
    <li className="entidad">
      <article aria-labelledby={idNombre} className="entidad__cuerpo">
        <h3 id={idNombre} className="entidad__nombre">
          {nombre}
        </h3>
        <TipoYLugar tipo={tipo} ciudad={ciudad} />
        <p className="entidad__descripcion">{descripcion}</p>
        {esProfesional && (
          <p className="entidad__profesional">Profesional independiente. Publicamos sus datos con su autorización.</p>
        )}
        <ContactoEntidad contacto={contacto} />
        <div className="entidad__pie">
          <Verificacion valor={fechaVerificacion} />
          <FuentesDesplegables titulo={nombre} fuentes={fuentes} />
        </div>
      </article>
    </li>
  );
}
