/**
 * Editor de preguntas frecuentes en el panel (M-05, M-08; RF-07, RF-10;
 * RCN-01, RCN-02, RCN-06; RA-03, RA-05, RA-10, RA-11). Crea, edita, publica
 * y despublica.
 *
 * - Pregunta, respuesta y orden son obligatorios, también en borrador.
 * - Fuente y fecha de revisión son obligatorias para publicar. Las reglas las
 *   aplica el servidor; sus mensajes aparecen junto a cada campo y en un
 *   resumen arriba, que recibe el foco (noValidate, igual que los otros
 *   editores).
 * - El slug es el ancla de la pregunta en el sitio (/preguntas-frecuentes#slug).
 *   Si la pregunta viene de api/contenidos/preguntas/preguntas.yaml, avisa que
 *   el archivo puede reemplazar lo que se guarde aquí y no deja cambiar el slug.
 * - Si la sesión vence, el formulario sigue montado con lo escrito.
 *
 * El guardado, los errores y las piezas comunes están en edicion.js y
 * PiezasEditor.jsx.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { fechaRevision } from '../utilidades/formato.js';
import { rutaDePregunta } from '../secciones.js';
import Campo from './Campo.jsx';
import EditorFuentes from './EditorFuentes.jsx';
import ResumenErrores from './ResumenErrores.jsx';
import SesionVencida from './SesionVencida.jsx';
import { AccionesEditor, AvisoArchivo, CampoFechaRevision, EtiquetaEstado } from './PiezasEditor.jsx';
import {
  BORRADOR,
  PUBLICADO,
  fuentesAFilas,
  fuentesParaEnviar,
  listaDelResumen,
  useCargaEditor,
  useEditor
} from './edicion.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { RUTA_API_PREGUNTAS, RUTA_EDITOR_PREGUNTAS } from './ListaPreguntas.jsx';

const ID = Object.freeze({
  pregunta: 'pregunta-pregunta',
  slug: 'pregunta-slug',
  respuesta: 'pregunta-respuesta',
  orden: 'pregunta-orden',
  fechaRevision: 'pregunta-fecha'
});

const ETIQUETAS = Object.freeze({
  pregunta: 'Pregunta',
  slug: 'Slug',
  respuesta: 'Respuesta',
  orden: 'Orden',
  fuentes: 'Fuentes',
  fechaRevision: 'Fecha de revisión'
});

/** Orden de los campos en el formulario: el resumen de errores lo sigue. */
const ORDEN_CAMPOS = ['pregunta', 'slug', 'respuesta', 'orden', 'fuentes', 'fechaRevision'];

const NUEVA = Object.freeze({ _id: null, estado: BORRADOR, archivo: null });

function aFormulario(pregunta) {
  return {
    pregunta: pregunta.pregunta ?? '',
    slug: pregunta.slug ?? '',
    respuesta: pregunta.respuesta ?? '',
    orden: pregunta.orden === undefined || pregunta.orden === null ? '' : String(pregunta.orden),
    fuentes: fuentesAFilas(pregunta.fuentes),
    fechaRevision: fechaRevision(pregunta.fechaRevision)?.iso ?? ''
  };
}

/** Datos para la API. Un orden vacío va como null: el servidor responde que es obligatorio. */
function aDatos(formulario, estado) {
  const { filasEnviadas, fuentes } = fuentesParaEnviar(formulario.fuentes);
  const orden = formulario.orden.trim();
  return {
    filasEnviadas,
    datos: {
      pregunta: formulario.pregunta,
      slug: formulario.slug,
      respuesta: formulario.respuesta,
      orden: orden === '' ? null : Number(orden),
      fuentes,
      fechaRevision: formulario.fechaRevision || null,
      estado
    }
  };
}

function textoDeExito(anterior, nuevo) {
  if (nuevo === PUBLICADO) {
    return anterior === PUBLICADO
      ? 'Cambios guardados. El sitio ya los muestra.'
      : 'Publicada. Ya aparece en Preguntas frecuentes y en el buscador.';
  }
  return anterior === PUBLICADO
    ? 'Despublicada. La pregunta pasó a borrador y ya no aparece en el sitio.'
    : 'Borrador guardado. Todavía no aparece en el sitio.';
}

function AvisoArchivoPregunta({ archivo }) {
  return (
    <AvisoArchivo titulo={<>Esta pregunta viene del archivo <code>api/contenidos/{archivo}</code> del repositorio.</>}>
      <p>
        Lo que guardes aquí se mantiene hasta que alguien actualice esta pregunta en el archivo con una fecha de
        revisión más reciente. En ese momento, el archivo reemplaza tus cambios y vuelve a publicar la pregunta,
        aunque la hayas despublicado.
      </p>
      <p>Para que un cambio sea permanente, hazlo también en el archivo.</p>
    </AvisoArchivo>
  );
}

function FormularioPregunta({ inicial }) {
  const editor = useEditor({
    inicial,
    aFormulario,
    aDatos,
    rutaApi: RUTA_API_PREGUNTAS,
    rutaEditor: RUTA_EDITOR_PREGUNTAS,
    ordenCampos: ORDEN_CAMPOS,
    textoDeExito
  });
  const { registro: pregunta, formulario, setFormulario, cambiar, errores, resultado, enviando, guardar } = editor;

  const publicada = pregunta.estado === PUBLICADO;
  const deArchivo = Boolean(pregunta.archivo);
  const porCampo = errores?.porCampo ?? {};
  const listaErrores = errores
    ? listaDelResumen(errores, formulario.fuentes, { orden: ORDEN_CAMPOS, ids: ID, etiquetas: ETIQUETAS })
    : [];

  return (
    <>
      {editor.avisoCreacion && <p className="mensaje mensaje--exito">{editor.avisoCreacion}</p>}
      {deArchivo && <AvisoArchivoPregunta archivo={pregunta.archivo} />}

      <p className="editor__estado">
        Estado: <EtiquetaEstado estado={pregunta.estado} />
        {publicada && (
          <>
            {' '}
            <Link to={rutaDePregunta(pregunta.slug)}>Ver la pregunta en el sitio</Link>
          </>
        )}
      </p>

      {errores && (
        <ResumenErrores
          ref={editor.resumen}
          titulo={listaErrores.length > 1 ? `No se pudo guardar: revisa ${listaErrores.length} campos` : 'No se pudo guardar'}
          errores={listaErrores}
        />
      )}

      <form className="formulario editor" noValidate onSubmit={(evento) => evento.preventDefault()}>
        <Campo id={ID.pregunta} etiqueta="Pregunta" indicacion="(obligatoria)" error={porCampo.pregunta}>
          {(props) => <input {...props} className="campo__control" value={formulario.pregunta} onChange={cambiar('pregunta')} />}
        </Campo>

        <Campo
          id={ID.slug}
          etiqueta="Slug"
          error={porCampo.slug}
          pista={
            deArchivo
              ? 'No se puede cambiar porque la pregunta viene de un archivo del repositorio: es su id en preguntas/preguntas.yaml.'
              : 'Identificador de la pregunta y su enlace en el sitio (/preguntas-frecuentes#slug): letras minúsculas sin tildes, números y guiones. Si lo dejas vacío, se genera a partir de la pregunta.'
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

        <Campo
          id={ID.respuesta}
          etiqueta="Respuesta"
          indicacion="(obligatoria)"
          error={porCampo.respuesta}
          pista="Breve y literal, en frases cortas. Admite Markdown: **negrita**, listas y enlaces."
        >
          {(props) => (
            <textarea {...props} className="campo__control" rows={5} value={formulario.respuesta} onChange={cambiar('respuesta')} />
          )}
        </Campo>

        <Campo
          id={ID.orden}
          etiqueta="Orden"
          indicacion="(obligatorio)"
          error={porCampo.orden}
          pista="El sitio muestra las preguntas de menor a mayor. Van de 10 en 10 para poder intercalar una nueva."
        >
          {(props) => (
            <input
              {...props}
              className="campo__control campo__control--corto"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={formulario.orden}
              onChange={cambiar('orden')}
            />
          )}
        </Campo>

        <EditorFuentes
          filas={formulario.fuentes}
          alCambiar={(fuentes) => setFormulario((anterior) => ({ ...anterior, fuentes }))}
          error={porCampo.fuentes}
          erroresFilas={errores?.porFila}
        />

        <CampoFechaRevision
          id={ID.fechaRevision}
          valor={formulario.fechaRevision}
          alCambiar={(fecha) => setFormulario((anterior) => ({ ...anterior, fechaRevision: fecha }))}
          error={porCampo.fechaRevision}
        />

        <AccionesEditor
          publicado={publicada}
          pista={
            publicada
              ? '«Guardar cambios» mantiene la pregunta publicada. «Despublicar» la guarda y la pasa a borrador: deja de aparecer en el sitio.'
              : '«Publicar» la guarda y la muestra en el sitio; exige fuente y fecha de revisión. «Guardar borrador» la guarda sin publicarla.'
          }
          enviando={enviando}
          resultado={resultado}
          alPublicar={() => guardar(PUBLICADO)}
          alGuardarBorrador={() => guardar(BORRADOR)}
        />
      </form>
    </>
  );
}

export default function EditorPregunta() {
  const { estado: estadoSesion } = useSesion();
  const { esNuevo, inicial, estado, reintentar } = useCargaEditor(RUTA_API_PREGUNTAS, NUEVA);
  useTituloPagina(esNuevo ? 'Nueva pregunta frecuente · Panel' : 'Editar pregunta frecuente · Panel');

  return (
    <div className="contenedor pagina pagina-admin">
      <p className="volver">
        <Link to={RUTA_EDITOR_PREGUNTAS}>
          <ArrowLeft aria-hidden="true" />
          Volver a la lista de preguntas
        </Link>
      </p>
      <h1>{esNuevo ? 'Nueva pregunta frecuente' : 'Editar pregunta frecuente'}</h1>
      <SesionVencida />

      {inicial ? (
        <FormularioPregunta key={inicial._id ?? 'nueva'} inicial={inicial} />
      ) : (
        estadoSesion !== SESION.VENCIDA && (
          <EstadoDatos
            estado={estado}
            reintentar={reintentar}
            queCarga="la pregunta"
            sinContenido="Esta pregunta no existe. Vuelve a la lista para elegir otra."
          />
        )
      )}
    </div>
  );
}
