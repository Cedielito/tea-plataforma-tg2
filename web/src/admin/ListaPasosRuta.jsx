/**
 * Lista de pasos de la ruta en el panel (M-03, M-08, RF-10, HU-14; RA-05,
 * RA-11): todos los pasos, publicados y borradores, agrupados por perfil y
 * por orden. Tarjetas en lugar de tabla para que funcione desde 320 px sin
 * desplazamiento horizontal.
 *
 * Cada tarjeta dice su estado con texto, su orden, a qué edades y regímenes
 * aplica, su fecha de revisión y, si viene de api/contenidos/ruta/pasos.yaml,
 * el archivo. «Publicar» y «Despublicar» actúan aquí mismo (PublicacionRapida.jsx).
 */
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Plus } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision } from '../utilidades/formato.js';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { EtiquetaEstado } from './PiezasEditor.jsx';
import { ResultadoPublicacion, usePublicacionRapida } from './PublicacionRapida.jsx';
import { PERFILES, REGIMENES, TRAMOS_EDAD, unirConY } from './catalogos.js';

export const RUTA_API_PASOS = '/api/admin/pasos-ruta';
export const RUTA_EDITOR_PASOS = '/admin/ruta';

const TEXTOS_PUBLICACION = {
  publicado: 'Publicado: ya aparece en la guía.',
  despublicado: 'Despublicado: ya no aparece en la guía.'
};

/** Un grupo por combinación de perfiles; el de ambos solo se muestra si tiene pasos. */
const GRUPOS = [
  { clave: 'familia', titulo: 'Para familias', siempre: true },
  { clave: 'docente', titulo: 'Para docentes', siempre: true },
  { clave: 'familia,docente', titulo: 'Para familias y docentes', siempre: false }
];
const claveDe = (perfiles = []) =>
  PERFILES.map(({ valor }) => valor)
    .filter((valor) => perfiles.includes(valor))
    .join(',');

/** «4 a 7, 8 a 12 y 13 a 17 años» */
function edades(tramos = []) {
  const elegidos = TRAMOS_EDAD.filter(({ valor }) => tramos.includes(valor)).map(({ corta }) => corta);
  return elegidos.length > 0 ? `${unirConY(elegidos)} años` : 'ninguna';
}

const REGIMEN_EN_FRASE = { contributivo: 'contributivo', subsidiado: 'subsidiado', 'sin-afiliacion': 'sin afiliación' };

/** «contributivo, subsidiado y sin afiliación» */
function regimenes(lista = []) {
  const elegidos = REGIMENES.filter(({ valor }) => lista.includes(valor)).map(({ valor }) => REGIMEN_EN_FRASE[valor]);
  return elegidos.length > 0 ? unirConY(elegidos) : 'ninguno';
}

function TarjetaPaso({ paso, alCambiar }) {
  const { _id, titulo, orden, estado, archivo } = paso;
  const ruta = `${RUTA_API_PASOS}/${_id}`;
  const { publicado, mensaje, alternar } = usePublicacionRapida({ ruta, estado, alCambiar, textos: TEXTOS_PUBLICACION });
  const revision = fechaRevision(paso.fechaRevision);

  return (
    <li className="tarjeta-admin">
      <h3 className="tarjeta-admin__titulo">{titulo}</h3>
      <ul className="tarjeta-admin__datos">
        <li><EtiquetaEstado estado={estado} /></li>
        <li>Orden: {orden}</li>
        <li>
          {revision ? (
            <>Revisado el <time dateTime={revision.iso}>{revision.texto}</time></>
          ) : (
            'Sin fecha de revisión'
          )}
        </li>
      </ul>
      <ul className="tarjeta-admin__datos">
        <li>Edades: {edades(paso.tramos)}</li>
        <li>Régimen: {regimenes(paso.regimenes)}</li>
      </ul>
      {archivo && (
        <p className="tarjeta-admin__archivo">
          <FileText aria-hidden="true" />
          <span>Viene del archivo <code>{archivo}</code> del repositorio</span>
        </p>
      )}
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_PASOS}/${_id}`} className="boton boton-secundario">
          Editar<span className="solo-lector"> «{titulo}»</span>
        </Link>
        <button type="button" className="boton boton-secundario" onClick={alternar}>
          {publicado ? 'Despublicar' : 'Publicar'}
          <span className="solo-lector"> «{titulo}»</span>
        </button>
      </div>
      <ResultadoPublicacion mensaje={mensaje} rutaEditor={`${RUTA_EDITOR_PASOS}/${_id}`} />
    </li>
  );
}

function GrupoPasos({ titulo, pasos, alCambiar }) {
  const idTitulo = useId();
  return (
    <section className="grupo-seccion" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{titulo}</h2>
      {pasos.length === 0 ? (
        <p className="secundario">Este grupo todavía no tiene pasos.</p>
      ) : (
        <ul className="tarjetas-admin">
          {pasos.map((paso) => (
            <TarjetaPaso key={paso._id} paso={paso} alCambiar={alCambiar} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ListaPasosRuta() {
  useTituloPagina('Pasos de la ruta · Panel');
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin(RUTA_API_PASOS);
  const [cambiados, setCambiados] = useState({});
  const listo = estado === ESTADOS.LISTO;

  // Si la lista se vuelve a pedir (por ejemplo, al iniciar sesión de nuevo), manda la del servidor.
  useEffect(() => setCambiados({}), [datos]);

  const pasos = listo ? datos.map((p) => cambiados[p._id] ?? p) : [];
  const alCambiar = (actualizado) => setCambiados((anteriores) => ({ ...anteriores, [actualizado._id]: actualizado }));

  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Pasos de la ruta</h1>
      <SesionVencida />
      <p className="pagina__descripcion">
        Pasos de la guía de la ruta de atención. La guía muestra, en orden, los publicados que coinciden con
        las tres respuestas: quién consulta, la edad y el régimen.
      </p>
      <div className="acciones">
        <Link to={`${RUTA_EDITOR_PASOS}/nuevo`} className="boton boton-primario">
          <Plus aria-hidden="true" />
          Nuevo paso
        </Link>
        <Link to="/ruta-de-atencion" className="boton boton-secundario">
          <Eye aria-hidden="true" />
          Ver la guía en el sitio
        </Link>
      </div>

      {listo &&
        GRUPOS.map(({ clave, titulo, siempre }) => {
          const delGrupo = pasos.filter((p) => claveDe(p.perfiles) === clave);
          if (!siempre && delGrupo.length === 0) return null;
          return <GrupoPasos key={clave} titulo={titulo} pasos={delGrupo} alCambiar={alCambiar} />;
        })}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga="los pasos de la ruta" />
      )}
    </div>
  );
}
