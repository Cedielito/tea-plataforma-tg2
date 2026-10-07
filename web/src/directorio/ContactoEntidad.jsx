/**
 * Datos de contacto de una entidad del directorio (M-04, RF-05; RA-05, RA-11):
 * lista de definiciones con teléfonos (enlaces tel: y de WhatsApp), correo,
 * sitio web, dirección y horario. Cada enlace es un objetivo táctil de 44 px.
 * Los íconos son decorativos: la etiqueta de cada dato está escrita.
 *
 * Con `breve` (guía de la ruta, M-03) solo muestra teléfonos y sitio web; el
 * resto está en /directorio.
 */
import { Clock, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { enlaceDeSitioWeb, enlaceDeTelefono } from './contacto.js';

function Dato({ Icono, etiqueta, children }) {
  return (
    <div className="contacto__dato">
      <dt className="contacto__etiqueta">
        <Icono aria-hidden="true" />
        {etiqueta}
      </dt>
      <dd className="contacto__valor">{children}</dd>
    </div>
  );
}

function Telefonos({ telefonos }) {
  const enlaces = telefonos.map(enlaceDeTelefono);
  return (
    <Dato Icono={Phone} etiqueta={enlaces.length === 1 ? 'Teléfono' : 'Teléfonos'}>
      <ul className="contacto__telefonos" role="list">
        {enlaces.map(({ texto, href, whatsapp }, i) => (
          <li key={i}>
            {href ? (
              <a href={href} className="contacto__enlace">
                {whatsapp && <MessageCircle aria-hidden="true" />}
                {texto}
              </a>
            ) : (
              <span className="contacto__texto">{texto}</span>
            )}
          </li>
        ))}
      </ul>
    </Dato>
  );
}

/** @param {{contacto: object, breve?: boolean}} props */
export default function ContactoEntidad({ contacto = {}, breve = false }) {
  const { telefonos = [], correo, direccion, horario } = contacto;
  const web = enlaceDeSitioWeb(contacto.web);

  return (
    <dl className={`contacto${breve ? ' contacto--breve' : ''}`}>
      {telefonos.length > 0 && <Telefonos telefonos={telefonos} />}
      {!breve && correo && (
        <Dato Icono={Mail} etiqueta="Correo">
          <a href={`mailto:${correo}`} className="contacto__enlace">
            {correo}
          </a>
        </Dato>
      )}
      {web && (
        <Dato Icono={Globe} etiqueta="Sitio web">
          <a href={web.href} className="contacto__enlace">
            {web.texto}
          </a>
        </Dato>
      )}
      {!breve && direccion && (
        <Dato Icono={MapPin} etiqueta="Dirección">
          {direccion}
        </Dato>
      )}
      {!breve && horario && (
        <Dato Icono={Clock} etiqueta="Horario">
          {horario}
        </Dato>
      )}
    </dl>
  );
}
