/**
 * Lista de recursos en el panel (M-05, M-08; RF-06, RF-10; RA-05, RA-11):
 * todos, publicados y borradores, en el orden en que aparecen en el sitio.
 * Tarjetas en lugar de tabla para que funcione desde 320 px sin
 * desplazamiento horizontal.
 *
 * Cada tarjeta dice su estado con texto, su tipo, para quién es, su fecha de
 * revisión y, si viene de api/contenidos/recursos/recursos.yaml, el archivo.
 * «Publicar» y «Despublicar» actúan aquí mismo (PublicacionRapida.jsx).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Plus } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision } from '../utilidades/formato.js';
import { RUTA_RECURSOS_WEB } from '../secciones.js';
import { paraQuien } from '../recursos/enlaceRecurso.js';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { EtiquetaEstado } from './PiezasEditor.jsx';
import { ResultadoPublicacion, usePublicacionRapida } from './PublicacionRapida.jsx';

export const RUTA_API_RECURSOS = '/api/admin/recursos';
export const RUTA_EDITOR_RECURSOS = '/admin/recursos';

const TEXTOS_PUBLICACION = {
  publicado: 'Publicado: ya aparece en Recursos.',
  despublicado: 'Despublicado: ya no aparece en Recursos.'
};

const TIPO_CORTO = { archivo: 'Archivo para descargar', enlace: 'Página oficial' };

function TarjetaRecursoAdmin({ recurso, alCambiar }) {
  const { _id, titulo, tipo, perfiles, estado, archivo } = recurso;
  const ruta = `${RUTA_API_RECURSOS}/${_id}`;
  const { publicado, mensaje, alternar } = usePublicacionRapida({ ruta, estado, alCambiar, textos: TEXTOS_PUBLICACION });
  const revision = fechaRevision(recurso.fechaRevision);

  return (
    <li className="tarjeta-admin">
      <h2 className="tarjeta-admin__titulo">{titulo}</h2>
      <ul className="tarjeta-admin__datos">
        <li><EtiquetaEstado estado={estado} /></li>
        <li>Tipo: {TIPO_CORTO[tipo] ?? tipo}</li>
        <li>
          {revision ? (
            <>Revisado el <time dateTime={revision.iso}>{revision.texto}</time></>
          ) : (
            'Sin fecha de revisión'
          )}
        </li>
      </ul>
      <ul className="tarjeta-admin__datos">
        <li>{paraQuien(perfiles) ?? 'Sin perfil destinatario'}</li>
      </ul>
      {archivo && (
        <p className="tarjeta-admin__archivo">
          <FileText aria-hidden="true" />
          <span>Viene del archivo <code>{archivo}</code> del repositorio</span>
        </p>
      )}
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_RECURSOS}/${_id}`} className="boton boton-secundario">
          Editar<span className="solo-lector"> «{titulo}»</span>
        </Link>
        <button type="button" className="boton boton-secundario" onClick={alternar}>
          {publicado ? 'Despublicar' : 'Publicar'}
          <span className="solo-lector"> «{titulo}»</span>
        </button>
      </div>
      <ResultadoPublicacion mensaje={mensaje} rutaEditor={`${RUTA_EDITOR_RECURSOS}/${_id}`} />
    </li>
  );
}

export default function ListaRecursos() {
  useTituloPagina('Recursos · Panel');
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin(RUTA_API_RECURSOS);
  const [cambiados, setCambiados] = useState({});
  const listo = estado === ESTADOS.LISTO;

  // Si la lista se vuelve a pedir (por ejemplo, al iniciar sesión de nuevo), manda la del servidor.
  useEffect(() => setCambiados({}), [datos]);

  const recursos = listo ? datos.map((r) => cambiados[r._id] ?? r) : [];
  const alCambiar = (actualizado) => setCambiados((anteriores) => ({ ...anteriores, [actualizado._id]: actualizado }));

  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Recursos</h1>
      <SesionVencida />
      <p className="pagina__descripcion">
        Documentos para descargar y enlaces a páginas oficiales. Los publicados aparecen en la página Recursos,
        en el orden en que se crearon.
      </p>
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_RECURSOS}/nuevo`} className="boton boton-primario">
          <Plus aria-hidden="true" />
          Nuevo recurso
        </Link>
        <Link to={RUTA_RECURSOS_WEB} className="boton boton-secundario">
          <Eye aria-hidden="true" />
          Ver los recursos en el sitio
        </Link>
      </div>

      {listo && recursos.length === 0 && <p className="secundario">Todavía no hay recursos.</p>}
      {listo && recursos.length > 0 && (
        <ul className="tarjetas-admin">
          {recursos.map((recurso) => (
            <TarjetaRecursoAdmin key={recurso._id} recurso={recurso} alCambiar={alCambiar} />
          ))}
        </ul>
      )}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga="los recursos" />
      )}
    </div>
  );
}
