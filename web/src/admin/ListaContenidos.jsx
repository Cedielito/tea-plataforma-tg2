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
import { ErrorAdmin, mensajeDeError, pedirAdmin } from './clienteAdmin.js';
import { SECCIONES_CONTENIDO, etiquetaTramo, nombreSeccion } from './catalogos.js';

const PUBLICADO = 'publicado';

export function EtiquetaEstado({ estado }) {
  const publicado = estado === PUBLICADO;
  return (
    <span className={`etiqueta etiqueta--${publicado ? 'publicado' : 'borrador'}`}>
      {publicado ? 'Publicado' : 'Borrador'}
    </span>
  );
}

function TarjetaContenido({ contenido, alCambiar }) {
  const { _id, titulo, tramoEdad, estado, archivo } = contenido;
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const publicado = estado === PUBLICADO;
  const revision = fechaRevision(contenido.fechaRevision);
  const tramo = etiquetaTramo(tramoEdad);

  async function alternarPublicacion() {
    if (enviando) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const nuevo = publicado ? 'borrador' : PUBLICADO;
      const actualizado = await pedirAdmin(`/api/admin/contenidos/${_id}`, { metodo: 'PATCH', datos: { estado: nuevo } });
      alCambiar(actualizado);
      setMensaje({
        tipo: 'exito',
        texto: nuevo === PUBLICADO ? 'Publicado: ya aparece en el sitio.' : 'Despublicado: ya no aparece en el sitio.'
      });
    } catch (error) {
      if (error instanceof ErrorAdmin && error.estado === 401) return;
      const campos = Object.values(error.campos ?? {});
      setMensaje({ tipo: 'error', texto: campos.length > 0 ? campos.join(' ') : mensajeDeError(error), editar: campos.length > 0 });
    } finally {
      setEnviando(false);
    }
  }

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
        <button type="button" className="boton boton-secundario" onClick={alternarPublicacion}>
          {publicado ? 'Despublicar' : 'Publicar'}
          <span className="solo-lector"> «{titulo}»</span>
        </button>
      </div>
      {/* Región siempre presente para que el lector de pantalla anuncie el resultado */}
      <div role="status" className="tarjeta-admin__resultado">
        {mensaje && (
          <p className={`mensaje mensaje--${mensaje.tipo}`}>
            {mensaje.tipo === 'error' && 'No se pudo publicar. '}
            {mensaje.texto}
            {mensaje.editar && (
              <>
                {' '}
                <Link to={`/admin/contenidos/${_id}`}>Completar en el editor</Link>
              </>
            )}
          </p>
        )}
      </div>
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
