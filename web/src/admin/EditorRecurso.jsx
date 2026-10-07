/**
 * Editor de recursos en el panel (M-05, M-08; RF-06, RF-10; RCN-01, RCN-02;
 * RA-03, RA-05, RA-10, RA-11). Crea, edita, publica y despublica.
 *
 * - Título, descripción, tipo (archivo o enlace), enlace y al menos un perfil
 *   destinatario son obligatorios, también en borrador. El enlace debe
 *   empezar por https://, http:// o / (un archivo del mismo sitio).
 * - Fuente y fecha de revisión son obligatorias para publicar (RCN-01,
 *   RCN-02). Las reglas las aplica el servidor; sus mensajes aparecen junto a
 *   cada campo y en un resumen arriba, que recibe el foco (noValidate, igual
 *   que los otros editores).
 * - Si el recurso viene de api/contenidos/recursos/recursos.yaml, avisa que el
 *   archivo puede reemplazar lo que se guarde aquí y no deja cambiar el slug.
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
import { RUTA_RECURSOS_WEB } from '../secciones.js';
import { enlaceDeRecurso } from '../recursos/enlaceRecurso.js';
import Campo from '../componentes/Campo.jsx';
import EditorFuentes from './EditorFuentes.jsx';
import GrupoCasillas, { idCasilla } from './GrupoCasillas.jsx';
import ResumenErrores from '../componentes/ResumenErrores.jsx';
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
import { RUTA_API_RECURSOS, RUTA_EDITOR_RECURSOS } from './ListaRecursos.jsx';
import { PERFILES, TIPOS_RECURSO } from './catalogos.js';

const ID = Object.freeze({
  titulo: 'recurso-titulo',
  slug: 'recurso-slug',
  descripcion: 'recurso-descripcion',
  tipo: 'recurso-tipo',
  url: 'recurso-url',
  perfiles: 'recurso-perfiles',
  fechaRevision: 'recurso-fecha'
});

/** El resumen de errores lleva a la primera casilla de los perfiles. */
const ID_RESUMEN = Object.freeze({ ...ID, perfiles: idCasilla(ID.perfiles, PERFILES[0].valor) });

const ETIQUETAS = Object.freeze({
  titulo: 'Título',
  slug: 'Slug',
  descripcion: 'Descripción',
  tipo: 'Tipo',
  url: 'Enlace',
  perfiles: 'Para quién es',
  fuentes: 'Fuentes',
  fechaRevision: 'Fecha de revisión'
});

/** Orden de los campos en el formulario: el resumen de errores lo sigue. */
const ORDEN_CAMPOS = ['titulo', 'slug', 'descripcion', 'tipo', 'url', 'perfiles', 'fuentes', 'fechaRevision'];

const NUEVO = Object.freeze({ _id: null, estado: BORRADOR, archivo: null });

function aFormulario(recurso) {
  return {
    titulo: recurso.titulo ?? '',
    slug: recurso.slug ?? '',
    descripcion: recurso.descripcion ?? '',
    tipo: recurso.tipo ?? '',
    url: recurso.url ?? '',
    perfiles: recurso.perfiles ?? [],
    fuentes: fuentesAFilas(recurso.fuentes),
    fechaRevision: fechaRevision(recurso.fechaRevision)?.iso ?? ''
  };
}

function aDatos(formulario, estado) {
  const { filasEnviadas, fuentes } = fuentesParaEnviar(formulario.fuentes);
  return {
    filasEnviadas,
    datos: {
      titulo: formulario.titulo,
      slug: formulario.slug,
      descripcion: formulario.descripcion,
      tipo: formulario.tipo,
      url: formulario.url,
      perfiles: formulario.perfiles,
      fuentes,
      fechaRevision: formulario.fechaRevision || null,
      estado
    }
  };
}

function textoDeExito(anterior, nuevo) {
  if (nuevo === PUBLICADO) {
    return anterior === PUBLICADO ? 'Cambios guardados. Recursos ya los muestra.' : 'Publicado. Ya aparece en Recursos.';
  }
  return anterior === PUBLICADO
    ? 'Despublicado. El recurso pasó a borrador y ya no aparece en el sitio.'
    : 'Borrador guardado. Todavía no aparece en el sitio.';
}

function AvisoArchivoRecurso({ archivo }) {
  return (
    <AvisoArchivo titulo={<>Este recurso viene del archivo <code>api/contenidos/{archivo}</code> del repositorio.</>}>
      <p>
        Lo que guardes aquí se mantiene hasta que alguien actualice este recurso en el archivo con una fecha de
        revisión más reciente. En ese momento, el archivo reemplaza tus cambios y vuelve a publicar el recurso,
        aunque lo hayas despublicado.
      </p>
      <p>Para que un cambio sea permanente, hazlo también en el archivo.</p>
    </AvisoArchivo>
  );
}

/** Lo que dirá el botón en el sitio, para revisarlo antes de guardar. */
function VistaPreviaEnlace({ tipo, url }) {
  const enlace = tipo ? enlaceDeRecurso({ tipo, url }) : null;
  if (!enlace) return null;
  return (
    <p className="campo__pista">
      En el sitio, el botón dirá: <strong>{enlace.texto}</strong>
    </p>
  );
}

function FormularioRecurso({ inicial }) {
  const editor = useEditor({
    inicial,
    aFormulario,
    aDatos,
    rutaApi: RUTA_API_RECURSOS,
    rutaEditor: RUTA_EDITOR_RECURSOS,
    ordenCampos: ORDEN_CAMPOS,
    textoDeExito
  });
  const { registro: recurso, formulario, setFormulario, cambiar, errores, resultado, enviando, guardar } = editor;

  const publicado = recurso.estado === PUBLICADO;
  const deArchivo = Boolean(recurso.archivo);
  const porCampo = errores?.porCampo ?? {};
  const listaErrores = errores
    ? listaDelResumen(errores, formulario.fuentes, { orden: ORDEN_CAMPOS, ids: ID_RESUMEN, etiquetas: ETIQUETAS })
    : [];

  return (
    <>
      {editor.avisoCreacion && <p className="mensaje mensaje--exito">{editor.avisoCreacion}</p>}
      {deArchivo && <AvisoArchivoRecurso archivo={recurso.archivo} />}

      <p className="editor__estado">
        Estado: <EtiquetaEstado estado={recurso.estado} />
        {publicado && (
          <>
            {' '}
            <Link to={RUTA_RECURSOS_WEB}>Ver los recursos en el sitio</Link>
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
              ? 'No se puede cambiar porque el recurso viene de un archivo del repositorio: es su id en recursos/recursos.yaml.'
              : 'Identificador del recurso: letras minúsculas sin tildes, números y guiones. Si lo dejas vacío, se genera a partir del título.'
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
          id={ID.descripcion}
          etiqueta="Descripción"
          indicacion="(obligatoria)"
          error={porCampo.descripcion}
          pista="Qué es el recurso y para qué sirve, en frases cortas. Si el archivo es grande, dilo aquí."
        >
          {(props) => (
            <textarea {...props} className="campo__control" rows={3} value={formulario.descripcion} onChange={cambiar('descripcion')} />
          )}
        </Campo>

        <Campo id={ID.tipo} etiqueta="Tipo" indicacion="(obligatorio)" error={porCampo.tipo}>
          {(props) => (
            <select {...props} className="campo__control" value={formulario.tipo} onChange={cambiar('tipo')}>
              <option value="">Elige un tipo</option>
              {TIPOS_RECURSO.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          id={ID.url}
          etiqueta="Enlace"
          indicacion="(obligatorio)"
          error={porCampo.url}
          pista="La dirección completa del documento o de la página oficial, con https://."
        >
          {(props) => (
            <>
              <input
                {...props}
                type="url"
                className="campo__control"
                value={formulario.url}
                onChange={cambiar('url')}
                autoCapitalize="none"
                spellCheck={false}
              />
              <VistaPreviaEnlace tipo={formulario.tipo} url={formulario.url} />
            </>
          )}
        </Campo>

        <GrupoCasillas
          id={ID.perfiles}
          etiqueta="Para quién es"
          indicacion="(al menos uno)"
          error={porCampo.perfiles}
          opciones={PERFILES}
          valores={formulario.perfiles}
          alCambiar={(perfiles) => setFormulario((anterior) => ({ ...anterior, perfiles }))}
        />

        <EditorFuentes
          filas={formulario.fuentes}
          alCambiar={(fuentes) => setFormulario((anterior) => ({ ...anterior, fuentes }))}
          error={porCampo.fuentes}
          erroresFilas={errores?.porFila}
        />

        <CampoFechaRevision
          id={ID.fechaRevision}
          pista="Día en que se revisó que el enlace funciona y que el documento sigue vigente. No puede ser posterior a hoy."
          valor={formulario.fechaRevision}
          alCambiar={(fecha) => setFormulario((anterior) => ({ ...anterior, fechaRevision: fecha }))}
          error={porCampo.fechaRevision}
        />

        <AccionesEditor
          publicado={publicado}
          pista={
            publicado
              ? '«Guardar cambios» mantiene el recurso publicado. «Despublicar» lo guarda y lo pasa a borrador: deja de aparecer en el sitio.'
              : '«Publicar» lo guarda y lo muestra en Recursos; exige fuente y fecha de revisión. «Guardar borrador» lo guarda sin publicarlo.'
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

export default function EditorRecurso() {
  const { estado: estadoSesion } = useSesion();
  const { esNuevo, inicial, estado, reintentar } = useCargaEditor(RUTA_API_RECURSOS, NUEVO);
  useTituloPagina(esNuevo ? 'Nuevo recurso · Panel' : 'Editar recurso · Panel');

  return (
    <div className="contenedor pagina pagina-admin">
      <p className="volver">
        <Link to={RUTA_EDITOR_RECURSOS}>
          <ArrowLeft aria-hidden="true" />
          Volver a la lista de recursos
        </Link>
      </p>
      <h1>{esNuevo ? 'Nuevo recurso' : 'Editar recurso'}</h1>
      <SesionVencida />

      {inicial ? (
        <FormularioRecurso key={inicial._id ?? 'nuevo'} inicial={inicial} />
      ) : (
        estadoSesion !== SESION.VENCIDA && (
          <EstadoDatos
            estado={estado}
            reintentar={reintentar}
            queCarga="el recurso"
            sinContenido="Este recurso no existe. Vuelve a la lista para elegir otro."
          />
        )
      )}
    </div>
  );
}
