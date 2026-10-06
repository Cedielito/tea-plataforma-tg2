/**
 * Editor de contenidos del panel (M-08, RF-10, HU-13; RCN-01, RCN-02;
 * RA-03, RA-05, RA-10, RA-11). Crea, edita, publica y despublica.
 *
 * - Fuente y fecha de revisión son obligatorias para publicar. Las reglas las
 *   aplica el servidor; sus mensajes aparecen junto a cada campo y en un
 *   resumen arriba, que recibe el foco. El formulario no usa la validación del
 *   navegador (noValidate): así todos los mensajes son los mismos, en español.
 * - Los botones no cambian de lugar al publicar o despublicar: el foco se
 *   queda en el botón que se presionó y el resultado se anuncia (role="status").
 * - Si la página viene de api/contenidos, avisa que el archivo puede
 *   reemplazar lo que se guarde aquí y no deja cambiar el slug.
 * - Si la sesión vence, el formulario sigue montado con lo escrito
 *   (SesionVencida.jsx) y se puede guardar al volver a entrar.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Eye, EyeOff, FileText } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import Markdown, { precargarMarkdown } from '../componentes/Markdown.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision, hoyEnColombia } from '../utilidades/formato.js';
import { rutaDeContenido } from '../secciones.js';
import Campo from './Campo.jsx';
import EditorFuentes, { ID_AGREGAR_FUENTE, filaVacia, idEnlaceFuente, idTextoFuente } from './EditorFuentes.jsx';
import ResumenErrores from './ResumenErrores.jsx';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { EtiquetaEstado } from './ListaContenidos.jsx';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { ErrorAdmin, mensajeDeError, pedirAdmin } from './clienteAdmin.js';
import { SECCIONES_CONTENIDO, TRAMOS_EDAD, seccionDe } from './catalogos.js';

const PUBLICADO = 'publicado';
const BORRADOR = 'borrador';
const SECCION_CON_TRAMOS = 'S2';

const ID = Object.freeze({
  titulo: 'editor-titulo',
  slug: 'editor-slug',
  seccion: 'editor-seccion',
  tramoEdad: 'editor-tramo',
  cuerpo: 'editor-cuerpo',
  fechaRevision: 'editor-fecha'
});

const ETIQUETAS = Object.freeze({
  titulo: 'Título',
  slug: 'Slug',
  seccion: 'Sección',
  tramoEdad: 'Tramo de edad',
  cuerpo: 'Cuerpo',
  fuentes: 'Fuentes',
  fechaRevision: 'Fecha de revisión'
});

/** Orden de los campos en el formulario: el resumen de errores lo sigue. */
const ORDEN_CAMPOS = ['titulo', 'slug', 'seccion', 'tramoEdad', 'cuerpo', 'fuentes', 'fechaRevision'];

const NUEVO = Object.freeze({ _id: null, estado: BORRADOR, archivo: null });

function aFormulario(contenido) {
  const fuentes = contenido.fuentes?.length
    ? contenido.fuentes.map(({ texto, url }) => filaVacia(texto ?? '', url ?? ''))
    : [filaVacia()];
  return {
    titulo: contenido.titulo ?? '',
    slug: contenido.slug ?? '',
    seccion: contenido.seccion ?? '',
    tramoEdad: contenido.tramoEdad ?? '',
    cuerpo: contenido.cuerpo ?? '',
    fuentes,
    fechaRevision: fechaRevision(contenido.fechaRevision)?.iso ?? ''
  };
}

/**
 * Datos para la API. Las filas de fuentes vacías no se envían; `filasEnviadas`
 * guarda a qué fila del formulario corresponde cada fuente enviada, para
 * ubicar los errores `fuentes.N.*` del servidor.
 */
function aDatos(formulario, estado) {
  const filasEnviadas = formulario.fuentes.filter((fila) => fila.texto.trim() !== '' || fila.url.trim() !== '');
  return {
    filasEnviadas,
    datos: {
      titulo: formulario.titulo,
      slug: formulario.slug,
      seccion: formulario.seccion,
      tramoEdad: formulario.seccion === SECCION_CON_TRAMOS ? formulario.tramoEdad || null : null,
      cuerpo: formulario.cuerpo,
      fuentes: filasEnviadas.map(({ texto, url }) => ({ texto, url })),
      fechaRevision: formulario.fechaRevision || null,
      estado
    }
  };
}

/** Reparte los mensajes del servidor entre los campos y las filas de fuentes. */
function repartirErrores(campos, filasEnviadas) {
  const errores = { porCampo: {}, porFila: {}, otros: [] };
  for (const [ruta, mensaje] of Object.entries(campos)) {
    const fila = /^fuentes\.(\d+)\.(texto|url)$/.exec(ruta);
    if (fila) {
      const destino = filasEnviadas[Number(fila[1])];
      if (destino) {
        errores.porFila[destino.clave] = { ...errores.porFila[destino.clave], [fila[2]]: mensaje };
        continue;
      }
    }
    if (ORDEN_CAMPOS.includes(ruta)) errores.porCampo[ruta] = mensaje;
    else errores.otros.push(mensaje);
  }
  return errores;
}

function listaDelResumen(errores, filas) {
  const lista = [];
  for (const campo of ORDEN_CAMPOS) {
    if (campo === 'fuentes') {
      if (errores.porCampo.fuentes) {
        const destino = filas[0] ? idTextoFuente(filas[0].clave) : ID_AGREGAR_FUENTE;
        lista.push({ id: destino, etiqueta: ETIQUETAS.fuentes, mensaje: errores.porCampo.fuentes });
      }
      filas.forEach((fila, indice) => {
        const deLaFila = errores.porFila[fila.clave] ?? {};
        if (deLaFila.texto) {
          lista.push({ id: idTextoFuente(fila.clave), etiqueta: `Fuente ${indice + 1}`, mensaje: deLaFila.texto });
        }
        if (deLaFila.url) {
          lista.push({ id: idEnlaceFuente(fila.clave), etiqueta: `Enlace de la fuente ${indice + 1}`, mensaje: deLaFila.url });
        }
      });
    } else if (errores.porCampo[campo]) {
      lista.push({ id: ID[campo], etiqueta: ETIQUETAS[campo], mensaje: errores.porCampo[campo] });
    }
  }
  return [...lista, ...errores.otros.map((mensaje) => ({ id: null, etiqueta: '', mensaje }))];
}

function textoDeExito(anterior, nuevo) {
  if (nuevo === PUBLICADO) {
    return anterior === PUBLICADO ? 'Cambios guardados. La página publicada ya los muestra.' : 'Publicado. Ya aparece en el sitio.';
  }
  return anterior === PUBLICADO
    ? 'Despublicado. La página pasó a borrador y ya no aparece en el sitio.'
    : 'Borrador guardado. Todavía no aparece en el sitio.';
}

function AvisoArchivo({ archivo }) {
  return (
    <div role="note" className="aviso aviso-archivo">
      <FileText aria-hidden="true" />
      <div>
        <p>
          <strong>Esta página viene del archivo <code>api/contenidos/{archivo}</code> del repositorio.</strong>
        </p>
        <p>
          Lo que guardes aquí se mantiene hasta que alguien actualice ese archivo con una fecha de revisión más
          reciente. En ese momento, el archivo reemplaza tus cambios y vuelve a publicar la página, aunque la
          hayas despublicado.
        </p>
        <p>Para que un cambio sea permanente, hazlo también en el archivo.</p>
      </div>
    </div>
  );
}

/**
 * Las páginas de S1, S3, S4 y S5 muestran un solo contenido, con un slug
 * fijo. Pendiente en el backlog: mostrar en el sitio los contenidos nuevos.
 */
function NotaSlugFijo({ seccion, slug }) {
  const pagina = seccionDe(seccion);
  if (!pagina?.slug || slug.trim() === pagina.slug) return null;
  return (
    <p className="nota-editor">
      La página pública de «{pagina.titulo}» muestra solo el contenido con el slug «{pagina.slug}». Este
      contenido no aparecerá en esa página. El buscador sí lo encuentra, pero su enlace lleva a la página de la
      sección.
    </p>
  );
}

function FormularioContenido({ inicial }) {
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const idPrevia = useId();
  const resumen = useRef(null);
  const [contenido, setContenido] = useState(inicial);
  const [formulario, setFormulario] = useState(() => aFormulario(inicial));
  const [errores, setErrores] = useState(null);
  // Al crear se llega aquí con el mensaje del resultado: va arriba, junto al h1 que recibe el foco.
  const [avisoCreacion, setAvisoCreacion] = useState(state?.mensaje ?? null);
  const [resultado, setResultado] = useState(null);
  const [verPrevia, setVerPrevia] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const publicado = contenido.estado === PUBLICADO;
  const deArchivo = Boolean(contenido.archivo);
  const hoy = hoyEnColombia();
  const porCampo = errores?.porCampo ?? {};
  const listaErrores = errores ? listaDelResumen(errores, formulario.fuentes) : [];

  useEffect(precargarMarkdown, []);
  useEffect(() => {
    if (errores) resumen.current?.focus();
  }, [errores]);
  // El mensaje no se repite si se recarga la página.
  useEffect(() => {
    if (state?.mensaje) navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  const cambiar = (campo) => (evento) => setFormulario((anterior) => ({ ...anterior, [campo]: evento.target.value }));

  async function guardar(estado) {
    if (enviando) return;
    setEnviando(true);
    setErrores(null);
    setResultado(null);
    setAvisoCreacion(null);
    const { datos, filasEnviadas } = aDatos(formulario, estado);
    try {
      const guardado = contenido._id
        ? await pedirAdmin(`/api/admin/contenidos/${contenido._id}`, { metodo: 'PATCH', datos })
        : await pedirAdmin('/api/admin/contenidos', { metodo: 'POST', datos });
      const mensaje = textoDeExito(contenido.estado, guardado.estado);
      if (!contenido._id) {
        navigate(`/admin/contenidos/${guardado._id}`, { replace: true, state: { mensaje } });
        return;
      }
      setContenido(guardado);
      setFormulario(aFormulario(guardado));
      setResultado(mensaje);
    } catch (error) {
      // Sesión vencida: SesionVencida toma el foco y lo escrito se conserva.
      if (error instanceof ErrorAdmin && error.estado === 401) return;
      const campos = error instanceof ErrorAdmin ? error.campos : {};
      const repartidos = repartirErrores(campos, filasEnviadas);
      if (Object.keys(campos).length === 0) repartidos.otros.push(mensajeDeError(error));
      setErrores(repartidos);
    } finally {
      setEnviando(false);
    }
  }

  const rutaPublica = publicado ? rutaDeContenido(contenido) : null;

  return (
    <>
      {avisoCreacion && <p className="mensaje mensaje--exito">{avisoCreacion}</p>}
      {deArchivo && <AvisoArchivo archivo={contenido.archivo} />}

      <p className="editor__estado">
        Estado: <EtiquetaEstado estado={contenido.estado} />
        {rutaPublica && rutaPublica !== '/' && (
          <>
            {' '}
            <Link to={rutaPublica}>Ver la página en el sitio</Link>
          </>
        )}
      </p>

      {errores && (
        <ResumenErrores
          ref={resumen}
          titulo={listaErrores.length > 1 ? `No se pudo guardar: revisa ${listaErrores.length} campos` : 'No se pudo guardar'}
          errores={listaErrores}
        />
      )}

      <form className="formulario editor" noValidate onSubmit={(evento) => evento.preventDefault()}>
        <Campo id={ID.titulo} etiqueta="Título" indicacion="(obligatorio)" error={porCampo.titulo}>
          {(props) => <input {...props} className="campo__control" value={formulario.titulo} onChange={cambiar('titulo')} />}
        </Campo>

        <Campo
          id={ID.slug}
          etiqueta="Slug"
          error={porCampo.slug}
          pista={
            deArchivo
              ? 'No se puede cambiar porque la página viene de un archivo del repositorio.'
              : 'Identificador de la página: letras minúsculas sin tildes, números y guiones. Si lo dejas vacío, se genera a partir del título.'
          }
        >
          {(props) => (
            <input
              {...props}
              className="campo__control"
              value={formulario.slug}
              onChange={cambiar('slug')}
              readOnly={deArchivo}
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        </Campo>

        <Campo id={ID.seccion} etiqueta="Sección" indicacion="(obligatoria)" error={porCampo.seccion}>
          {(props) => (
            <select {...props} className="campo__control" value={formulario.seccion} onChange={cambiar('seccion')}>
              <option value="">Elige una sección</option>
              {SECCIONES_CONTENIDO.map(({ codigo, titulo }) => (
                <option key={codigo} value={codigo}>
                  {codigo} · {titulo}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <NotaSlugFijo seccion={formulario.seccion} slug={formulario.slug} />

        {formulario.seccion === SECCION_CON_TRAMOS && (
          <Campo
            id={ID.tramoEdad}
            etiqueta="Tramo de edad"
            error={porCampo.tramoEdad}
            pista="Sin tramo, el texto se muestra arriba de las tres pestañas, como introducción."
          >
            {(props) => (
              <select {...props} className="campo__control" value={formulario.tramoEdad} onChange={cambiar('tramoEdad')}>
                <option value="">Sin tramo (introducción)</option>
                {TRAMOS_EDAD.map(({ valor, etiqueta }) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}

        <Campo
          id={ID.cuerpo}
          etiqueta="Cuerpo"
          indicacion="(obligatorio)"
          error={porCampo.cuerpo}
          pista="En Markdown: ## para un subtítulo, - al inicio de la línea para una lista y **texto** para negrita. Los subtítulos empiezan en ## porque el título de la página ya es el principal."
        >
          {(props) => (
            <textarea {...props} className="campo__control campo__control--cuerpo" value={formulario.cuerpo} onChange={cambiar('cuerpo')} />
          )}
        </Campo>

        <div className="vista-previa">
          <button
            type="button"
            className="boton boton-secundario"
            aria-expanded={verPrevia}
            aria-controls={idPrevia}
            onClick={() => setVerPrevia((valor) => !valor)}
          >
            {verPrevia ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {verPrevia ? 'Ocultar la vista previa' : 'Ver la vista previa'}
          </button>
          <section id={idPrevia} hidden={!verPrevia} className="vista-previa__panel" aria-label="Vista previa del cuerpo">
            {verPrevia &&
              (formulario.cuerpo.trim() ? (
                <Markdown texto={formulario.cuerpo} nivelTitulos={3} />
              ) : (
                <p className="secundario">El cuerpo está vacío.</p>
              ))}
          </section>
        </div>

        <EditorFuentes
          filas={formulario.fuentes}
          alCambiar={(fuentes) => setFormulario((anterior) => ({ ...anterior, fuentes }))}
          error={porCampo.fuentes}
          erroresFilas={errores?.porFila}
        />

        <Campo
          id={ID.fechaRevision}
          etiqueta="Fecha de revisión"
          indicacion="(obligatoria para publicar)"
          error={porCampo.fechaRevision}
          pista="Día en que se revisó el texto contra sus fuentes. No puede ser posterior a hoy."
        >
          {(props) => (
            <div className="campo__fila">
              <input
                {...props}
                className="campo__control campo__control--fecha"
                type="date"
                max={hoy}
                value={formulario.fechaRevision}
                onChange={cambiar('fechaRevision')}
              />
              <button
                type="button"
                className="boton boton-secundario"
                onClick={() => setFormulario((anterior) => ({ ...anterior, fechaRevision: hoy }))}
              >
                <CalendarCheck aria-hidden="true" />
                Usar la fecha de hoy
              </button>
            </div>
          )}
        </Campo>

        <div className="editor__acciones">
          <p className="campo__pista">
            {publicado
              ? '«Guardar cambios» mantiene la página publicada. «Despublicar» guarda y la pasa a borrador: deja de aparecer en el sitio.'
              : '«Publicar» guarda y la muestra en el sitio; exige fuente y fecha de revisión. «Guardar borrador» la guarda sin publicarla.'}
          </p>
          <div className="acciones">
            <button type="button" className="boton boton-primario" onClick={() => guardar(PUBLICADO)}>
              {publicado ? 'Guardar cambios' : 'Publicar'}
            </button>
            <button type="button" className="boton boton-secundario" onClick={() => guardar(BORRADOR)}>
              {publicado ? 'Despublicar' : 'Guardar borrador'}
            </button>
          </div>
          <p className="campo__pista">
            La sesión se cierra si pasan 30 minutos sin guardar ni abrir otra página del panel. Si pasa, lo que
            escribiste se conserva aquí y puedes volver a entrar para guardarlo.
          </p>
          <div role="status" className="editor__resultado">
            {enviando && <p>Guardando…</p>}
            {resultado && <p className="mensaje mensaje--exito">{resultado}</p>}
          </div>
        </div>
      </form>
    </>
  );
}

export default function EditorContenido() {
  const { id } = useParams();
  const { estado: estadoSesion } = useSesion();
  const nuevo = !id;
  useTituloPagina(nuevo ? 'Nuevo contenido · Panel' : 'Editar contenido · Panel');
  const { estado, datos, reintentar } = useDatosAdmin(nuevo ? null : `/api/admin/contenidos/${id}`);

  // Lo que se cargó primero se conserva aunque los datos se vuelvan a pedir
  // (por ejemplo, al iniciar sesión de nuevo): así no se pierde lo escrito.
  const [inicial, setInicial] = useState(nuevo ? NUEVO : null);
  useEffect(() => {
    if (estado === ESTADOS.LISTO && datos && inicial?._id !== datos._id) setInicial(datos);
  }, [estado, datos, inicial]);

  return (
    <div className="contenedor pagina pagina-admin">
      <p className="volver">
        <Link to="/admin">
          <ArrowLeft aria-hidden="true" />
          Volver a la lista de contenidos
        </Link>
      </p>
      <h1>{nuevo ? 'Nuevo contenido' : 'Editar contenido'}</h1>
      <SesionVencida />

      {inicial ? (
        <FormularioContenido key={inicial._id ?? 'nuevo'} inicial={inicial} />
      ) : (
        estadoSesion !== SESION.VENCIDA && (
          <EstadoDatos
            estado={estado}
            reintentar={reintentar}
            queCarga="el contenido"
            sinContenido="Este contenido no existe. Vuelve a la lista para elegir otro."
          />
        )
      )}
    </div>
  );
}
