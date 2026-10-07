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
 *
 * El guardado, los errores y las piezas que comparte con el editor de pasos
 * de la ruta están en edicion.js y PiezasEditor.jsx.
 */
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import Markdown, { precargarMarkdown } from '../componentes/Markdown.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { fechaRevision } from '../utilidades/formato.js';
import { rutaDeContenido } from '../secciones.js';
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
import { SECCIONES_CONTENIDO, TRAMOS_EDAD, seccionDe } from './catalogos.js';

const RUTA_API = '/api/admin/contenidos';
const RUTA_EDITOR = '/admin/contenidos';
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
  return {
    titulo: contenido.titulo ?? '',
    slug: contenido.slug ?? '',
    seccion: contenido.seccion ?? '',
    tramoEdad: contenido.tramoEdad ?? '',
    cuerpo: contenido.cuerpo ?? '',
    fuentes: fuentesAFilas(contenido.fuentes),
    fechaRevision: fechaRevision(contenido.fechaRevision)?.iso ?? ''
  };
}

/** Datos para la API; las filas de fuentes vacías no se envían. */
function aDatos(formulario, estado) {
  const { filasEnviadas, fuentes } = fuentesParaEnviar(formulario.fuentes);
  return {
    filasEnviadas,
    datos: {
      titulo: formulario.titulo,
      slug: formulario.slug,
      seccion: formulario.seccion,
      tramoEdad: formulario.seccion === SECCION_CON_TRAMOS ? formulario.tramoEdad || null : null,
      cuerpo: formulario.cuerpo,
      fuentes,
      fechaRevision: formulario.fechaRevision || null,
      estado
    }
  };
}

function textoDeExito(anterior, nuevo) {
  if (nuevo === PUBLICADO) {
    return anterior === PUBLICADO ? 'Cambios guardados. La página publicada ya los muestra.' : 'Publicado. Ya aparece en el sitio.';
  }
  return anterior === PUBLICADO
    ? 'Despublicado. La página pasó a borrador y ya no aparece en el sitio.'
    : 'Borrador guardado. Todavía no aparece en el sitio.';
}

function AvisoArchivoContenido({ archivo }) {
  return (
    <AvisoArchivo titulo={<>Esta página viene del archivo <code>api/contenidos/{archivo}</code> del repositorio.</>}>
      <p>
        Lo que guardes aquí se mantiene hasta que alguien actualice ese archivo con una fecha de revisión más
        reciente. En ese momento, el archivo reemplaza tus cambios y vuelve a publicar la página, aunque la
        hayas despublicado.
      </p>
      <p>Para que un cambio sea permanente, hazlo también en el archivo.</p>
    </AvisoArchivo>
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
  const idPrevia = useId();
  const [verPrevia, setVerPrevia] = useState(false);
  const editor = useEditor({
    inicial,
    aFormulario,
    aDatos,
    rutaApi: RUTA_API,
    rutaEditor: RUTA_EDITOR,
    ordenCampos: ORDEN_CAMPOS,
    textoDeExito
  });
  const { registro: contenido, formulario, setFormulario, cambiar, errores, resultado, enviando, guardar } = editor;

  const publicado = contenido.estado === PUBLICADO;
  const deArchivo = Boolean(contenido.archivo);
  const porCampo = errores?.porCampo ?? {};
  const listaErrores = errores
    ? listaDelResumen(errores, formulario.fuentes, { orden: ORDEN_CAMPOS, ids: ID, etiquetas: ETIQUETAS })
    : [];

  useEffect(precargarMarkdown, []);

  const rutaPublica = publicado ? rutaDeContenido(contenido) : null;

  return (
    <>
      {editor.avisoCreacion && <p className="mensaje mensaje--exito">{editor.avisoCreacion}</p>}
      {deArchivo && <AvisoArchivoContenido archivo={contenido.archivo} />}

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
          ref={editor.resumen}
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

        <CampoFechaRevision
          id={ID.fechaRevision}
          valor={formulario.fechaRevision}
          alCambiar={(fecha) => setFormulario((anterior) => ({ ...anterior, fechaRevision: fecha }))}
          error={porCampo.fechaRevision}
        />

        <AccionesEditor
          publicado={publicado}
          pista={
            publicado
              ? '«Guardar cambios» mantiene la página publicada. «Despublicar» guarda y la pasa a borrador: deja de aparecer en el sitio.'
              : '«Publicar» guarda y la muestra en el sitio; exige fuente y fecha de revisión. «Guardar borrador» la guarda sin publicarla.'
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

export default function EditorContenido() {
  const { estado: estadoSesion } = useSesion();
  const { esNuevo: nuevo, inicial, estado, reintentar } = useCargaEditor(RUTA_API, NUEVO);
  useTituloPagina(nuevo ? 'Nuevo contenido · Panel' : 'Editar contenido · Panel');

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
