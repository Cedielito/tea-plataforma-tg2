/**
 * Lista de preguntas frecuentes en el panel (M-05, M-08; RF-07, RF-10; RA-05,
 * RA-11): todas, publicadas y borradores, en el orden en que aparecen en el
 * sitio. Tarjetas en lugar de tabla para que funcione desde 320 px sin
 * desplazamiento horizontal.
 *
 * Cada tarjeta dice su estado con texto, su orden, su fecha de revisión y, si
 * viene de api/contenidos/preguntas/preguntas.yaml, el archivo. «Publicar» y
 * «Despublicar» actúan aquí mismo (PublicacionRapida.jsx).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Plus } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision } from '../utilidades/formato.js';
import { RUTA_PREGUNTAS_WEB } from '../secciones.js';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { EtiquetaEstado } from './PiezasEditor.jsx';
import { ResultadoPublicacion, usePublicacionRapida } from './PublicacionRapida.jsx';

export const RUTA_API_PREGUNTAS = '/api/admin/preguntas';
export const RUTA_EDITOR_PREGUNTAS = '/admin/preguntas';

const TEXTOS_PUBLICACION = {
  publicado: 'Publicada: ya aparece en Preguntas frecuentes y en el buscador.',
  despublicado: 'Despublicada: ya no aparece en el sitio.'
};

function TarjetaPregunta({ pregunta, alCambiar }) {
  const { _id, pregunta: texto, orden, estado, archivo } = pregunta;
  const ruta = `${RUTA_API_PREGUNTAS}/${_id}`;
  const { publicado, mensaje, alternar } = usePublicacionRapida({ ruta, estado, alCambiar, textos: TEXTOS_PUBLICACION });
  const revision = fechaRevision(pregunta.fechaRevision);

  return (
    <li className="tarjeta-admin">
      <h2 className="tarjeta-admin__titulo">{texto}</h2>
      <ul className="tarjeta-admin__datos">
        <li><EtiquetaEstado estado={estado} /></li>
        <li>Orden: {orden}</li>
        <li>
          {revision ? (
            <>Revisada el <time dateTime={revision.iso}>{revision.texto}</time></>
          ) : (
            'Sin fecha de revisión'
          )}
        </li>
      </ul>
      {archivo && (
        <p className="tarjeta-admin__archivo">
          <FileText aria-hidden="true" />
          <span>Viene del archivo <code>{archivo}</code> del repositorio</span>
        </p>
      )}
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_PREGUNTAS}/${_id}`} className="boton boton-secundario">
          Editar<span className="solo-lector"> «{texto}»</span>
        </Link>
        <button type="button" className="boton boton-secundario" onClick={alternar}>
          {publicado ? 'Despublicar' : 'Publicar'}
          <span className="solo-lector"> «{texto}»</span>
        </button>
      </div>
      <ResultadoPublicacion mensaje={mensaje} rutaEditor={`${RUTA_EDITOR_PREGUNTAS}/${_id}`} />
    </li>
  );
}

export default function ListaPreguntas() {
  useTituloPagina('Preguntas frecuentes · Panel');
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin(RUTA_API_PREGUNTAS);
  const [cambiadas, setCambiadas] = useState({});
  const listo = estado === ESTADOS.LISTO;

  // Si la lista se vuelve a pedir (por ejemplo, al iniciar sesión de nuevo), manda la del servidor.
  useEffect(() => setCambiadas({}), [datos]);

  const preguntas = listo ? datos.map((p) => cambiadas[p._id] ?? p) : [];
  const alCambiar = (actualizada) => setCambiadas((anteriores) => ({ ...anteriores, [actualizada._id]: actualizada }));

  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Preguntas frecuentes</h1>
      <SesionVencida />
      <p className="pagina__descripcion">
        Preguntas de la página Preguntas frecuentes, de menor a mayor orden. Las publicadas también aparecen en
        el buscador del sitio.
      </p>
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_PREGUNTAS}/nueva`} className="boton boton-primario">
          <Plus aria-hidden="true" />
          Nueva pregunta
        </Link>
        <Link to={RUTA_PREGUNTAS_WEB} className="boton boton-secundario">
          <Eye aria-hidden="true" />
          Ver las preguntas en el sitio
        </Link>
      </div>

      {listo && preguntas.length === 0 && <p className="secundario">Todavía no hay preguntas.</p>}
      {listo && preguntas.length > 0 && (
        <ul className="tarjetas-admin">
          {preguntas.map((pregunta) => (
            <TarjetaPregunta key={pregunta._id} pregunta={pregunta} alCambiar={alCambiar} />
          ))}
        </ul>
      )}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga="las preguntas frecuentes" />
      )}
    </div>
  );
}
