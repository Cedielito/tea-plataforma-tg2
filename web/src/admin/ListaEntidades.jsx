/**
 * Lista del directorio en el panel (M-04, M-08; RF-10, RS-07, HU-14; RA-05,
 * RA-11): todas las entidades, publicadas y borradores, agrupadas por lugar
 * en el orden del catálogo. Tarjetas en lugar de tabla para que funcione
 * desde 320 px sin desplazamiento horizontal.
 *
 * Cada tarjeta dice su estado con texto, su tipo, su fecha de verificación,
 * si es un profesional independiente y, si viene de
 * api/contenidos/directorio/entidades.yaml, el archivo. «Publicar» y
 * «Despublicar» actúan aquí mismo (PublicacionRapida.jsx); el servidor no
 * publica a un profesional sin constancia de autorización (RS-07).
 */
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Plus } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision } from '../utilidades/formato.js';
import { etiquetaDe } from '../catalogos.js';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { EtiquetaEstado } from './PiezasEditor.jsx';
import { ResultadoPublicacion, usePublicacionRapida } from './PublicacionRapida.jsx';
import { CIUDADES, NACIONAL, TIPOS_ENTIDAD } from './catalogos.js';

export const RUTA_API_ENTIDADES = '/api/admin/directorio';
export const RUTA_EDITOR_ENTIDADES = '/admin/directorio';

const TEXTOS_PUBLICACION = {
  publicado: 'Publicada: ya aparece en el directorio y en la guía de la ruta.',
  despublicado: 'Despublicada: ya no aparece en el directorio ni en la guía.'
};

const tituloGrupo = (ciudad) => (ciudad === NACIONAL ? 'Todo el país (Nacional)' : etiquetaDe(CIUDADES, ciudad));

function TarjetaEntidadAdmin({ entidad, alCambiar }) {
  const { _id, nombre, tipo, estado, esProfesional, archivo } = entidad;
  const ruta = `${RUTA_API_ENTIDADES}/${_id}`;
  const { publicado, mensaje, alternar } = usePublicacionRapida({ ruta, estado, alCambiar, textos: TEXTOS_PUBLICACION });
  const verificacion = fechaRevision(entidad.fechaVerificacion);

  return (
    <li className="tarjeta-admin">
      <h3 className="tarjeta-admin__titulo">{nombre}</h3>
      <ul className="tarjeta-admin__datos">
        <li><EtiquetaEstado estado={estado} /></li>
        <li>Tipo: {etiquetaDe(TIPOS_ENTIDAD, tipo)}</li>
        <li>
          {verificacion ? (
            <>Verificado el <time dateTime={verificacion.iso}>{verificacion.texto}</time></>
          ) : (
            'Sin fecha de verificación'
          )}
        </li>
        {esProfesional && <li>Profesional independiente</li>}
      </ul>
      {archivo && (
        <p className="tarjeta-admin__archivo">
          <FileText aria-hidden="true" />
          <span>Viene del archivo <code>{archivo}</code> del repositorio</span>
        </p>
      )}
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_ENTIDADES}/${_id}`} className="boton boton-secundario">
          Editar<span className="solo-lector"> «{nombre}»</span>
        </Link>
        <button type="button" className="boton boton-secundario" onClick={alternar}>
          {publicado ? 'Despublicar' : 'Publicar'}
          <span className="solo-lector"> «{nombre}»</span>
        </button>
      </div>
      <ResultadoPublicacion mensaje={mensaje} rutaEditor={`${RUTA_EDITOR_ENTIDADES}/${_id}`} />
    </li>
  );
}

function GrupoEntidades({ titulo, entidades, alCambiar }) {
  const idTitulo = useId();
  return (
    <section className="grupo-seccion" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{titulo}</h2>
      <ul className="tarjetas-admin">
        {entidades.map((entidad) => (
          <TarjetaEntidadAdmin key={entidad._id} entidad={entidad} alCambiar={alCambiar} />
        ))}
      </ul>
    </section>
  );
}

export default function ListaEntidades() {
  useTituloPagina('Directorio · Panel');
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin(RUTA_API_ENTIDADES);
  const [cambiadas, setCambiadas] = useState({});
  const listo = estado === ESTADOS.LISTO;

  // Si la lista se vuelve a pedir (por ejemplo, al iniciar sesión de nuevo), manda la del servidor.
  useEffect(() => setCambiadas({}), [datos]);

  const entidades = listo ? datos.map((e) => cambiadas[e._id] ?? e) : [];
  const alCambiar = (actualizada) => setCambiadas((anteriores) => ({ ...anteriores, [actualizada._id]: actualizada }));
  // Una ciudad que ya no está en el catálogo igual aparece, al final.
  const ciudades = [
    ...CIUDADES.map(({ valor }) => valor),
    ...new Set(entidades.map((e) => e.ciudad).filter((c) => !CIUDADES.some(({ valor }) => valor === c)))
  ];

  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Directorio</h1>
      <SesionVencida />
      <p className="pagina__descripcion">
        Entidades del directorio de orientación. Las publicadas aparecen en /directorio y junto a los pasos de la
        guía de la ruta: las de todo el país siempre, y las de una ciudad cuando la persona la elige.
      </p>
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_ENTIDADES}/nueva`} className="boton boton-primario">
          <Plus aria-hidden="true" />
          Nueva entidad
        </Link>
        <Link to="/directorio" className="boton boton-secundario">
          <Eye aria-hidden="true" />
          Ver el directorio en el sitio
        </Link>
      </div>

      {listo && entidades.length === 0 && <p className="secundario">Todavía no hay entidades.</p>}
      {listo &&
        ciudades.map((ciudad) => {
          const deLaCiudad = entidades.filter((e) => e.ciudad === ciudad);
          if (deLaCiudad.length === 0) return null;
          return <GrupoEntidades key={ciudad} titulo={tituloGrupo(ciudad)} entidades={deLaCiudad} alCambiar={alCambiar} />;
        })}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga="el directorio" />
      )}
    </div>
  );
}
