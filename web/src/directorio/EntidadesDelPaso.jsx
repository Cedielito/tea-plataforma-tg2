/**
 * Entidades del directorio junto a un paso de la guía de la ruta (M-03, M-04;
 * RF-04, RF-05, RCN-02; RA-05, RA-11): nombre, tipo y lugar, teléfonos, sitio
 * web y «Verificado el». La lista la elige entidadesDelPaso
 * (filtroDirectorio.js) en el navegador; el correo, la dirección y el horario
 * están en /directorio.
 */
import { useId } from 'react';
import ContactoEntidad from './ContactoEntidad.jsx';
import { TipoYLugar, Verificacion } from './TarjetaEntidad.jsx';

/** @param {{entidades: object[], tituloPaso: string}} props */
export default function EntidadesDelPaso({ entidades, tituloPaso }) {
  const idTitulo = useId();
  if (entidades.length === 0) return null;

  return (
    <div className="entidades-paso">
      <p id={idTitulo} className="entidades-paso__titulo">
        Dónde acudir<span className="solo-lector"> en el paso «{tituloPaso}»</span>
      </p>
      <ul className="entidades-paso__lista" role="list" aria-labelledby={idTitulo}>
        {entidades.map(({ slug, nombre, tipo, ciudad, contacto, fechaVerificacion }) => (
          <li key={slug} className="entidad-breve">
            <p className="entidad-breve__nombre">{nombre}</p>
            <TipoYLugar tipo={tipo} ciudad={ciudad} />
            <ContactoEntidad contacto={contacto} breve />
            <Verificacion valor={fechaVerificacion} />
          </li>
        ))}
      </ul>
    </div>
  );
}
