/**
 * Lista de contenidos del panel (M-08, RF-10, HU-13; RA-05, RA-11): todos los
 * contenidos, publicados y borradores, agrupados por sección. Tarjetas en
 * lugar de tabla para que funcione desde 320 px sin desplazamiento horizontal.
 *
 * Cada tarjeta dice su estado con texto (no solo con color), su fecha de
 * revisión y, si viene de api/contenidos, el nombre del archivo. «Publicar» y
 * «Despublicar» actúan aquí mismo; si el servidor no deja publicar (falta la
 * fuente o la fecha, RCN-01 y RCN-02), sus mensajes aparecen en la tarjeta
 * con un enlace al editor.
 */
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision } from '../utilidades/formato.js';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { EtiquetaEstado } from './PiezasEditor.jsx';
import { ResultadoPublicacion, usePublicacionRapida } from './PublicacionRapida.jsx';
import { SECCIONES_CONTENIDO, etiquetaTramo, nombreSeccion } from './catalogos.js';

const TEXTOS_PUBLICACION = {
  publicado: 'Publicado: ya aparece en el sitio.',
  despublicado: 'Despublicado: ya no aparece en el sitio.'
};

function TarjetaContenido({ contenido, alCambiar }) {
  const { _id, titulo, tramoEdad, estado, archivo } = contenido;
  const ruta = `/api/admin/contenidos/${_id}`;
  const { publicado, mensaje, alternar } = usePublicacionRapida({ ruta, estado, alCambiar, textos: TEXTOS_PUBLICACION });
  const revision = fechaRevision(contenido.fechaRevision);
  const tramo = etiquetaTramo(tramoEdad);

  return (
    <li className="tarjeta-admin">
      <h3 className="tarjeta-admin__titulo">{titulo}</h3>
      <ul className="tarjeta-admin__datos">
        <li><EtiquetaEstado estado={estado} /></li>
        {tramo && <li>Tramo: {tramo}</li>}
        <li>
          {revision ? (
            <>Revisado el <time dateTime={revision.iso}>{revision.texto}</time></>
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
        <Link to={`/admin/contenidos/${_id}`} className="boton boton-secundario">
          Editar<span className="solo-lector"> «{titulo}»</span>
        </Link>
        <button type="button" className="boton boton-secundario" onClick={alternar}>
          {publicado ? 'Despublicar' : 'Publicar'}
          <span className="solo-lector"> «{titulo}»</span>
        </button>
      </div>
      <ResultadoPublicacion mensaje={mensaje} rutaEditor={`/admin/contenidos/${_id}`} />
    </li>
  );
}

function GrupoSeccion({ seccion, contenidos, alCambiar }) {
  const idTitulo = useId();
  return (
    <section className="grupo-seccion" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{nombreSeccion(seccion)}</h2>
      {contenidos.length === 0 ? (
        <p className="secundario">Esta sección todavía no tiene contenidos.</p>
      ) : (
        <ul className="tarjetas-admin">
          {contenidos.map((contenido) => (
            <TarjetaContenido key={contenido._id} contenido={contenido} alCambiar={alCambiar} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ListaContenidos() {
  useTituloPagina('Contenidos · Panel');
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin('/api/admin/contenidos');
  const [cambiados, setCambiados] = useState({});
  const listo = estado === ESTADOS.LISTO;

  // Si la lista se vuelve a pedir (por ejemplo, al iniciar sesión de nuevo), manda la del servidor.
  useEffect(() => setCambiados({}), [datos]);

  const contenidos = listo ? datos.map((c) => cambiados[c._id] ?? c) : [];
  const alCambiar = (actualizado) => setCambiados((anteriores) => ({ ...anteriores, [actualizado._id]: actualizado }));

  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Contenidos</h1>
      <SesionVencida />
      <p className="pagina__descripcion">
        Páginas de las secciones S1 a S5. Solo lo publicado aparece en el sitio.
      </p>
      <p>
        <Link to="/admin/contenidos/nuevo" className="boton boton-primario">
          <Plus aria-hidden="true" />
          Nuevo contenido
        </Link>
      </p>

      {listo &&
        SECCIONES_CONTENIDO.map(({ codigo }) => (
          <GrupoSeccion
            key={codigo}
            seccion={codigo}
            contenidos={contenidos.filter((c) => c.seccion === codigo)}
            alCambiar={alCambiar}
          />
        ))}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga="los contenidos" />
      )}
    </div>
  );
}
