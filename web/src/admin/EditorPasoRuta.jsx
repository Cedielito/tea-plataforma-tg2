/**
 * Editor de pasos de la ruta en el panel (M-03, M-08, RF-10, HU-14; RCN-01,
 * RCN-02, RCN-06; RA-03, RA-05, RA-10, RA-11). Crea, edita, publica y
 * despublica.
 *
 * - Un paso dice a qué respuestas de la guía aplica: perfiles, tramos de edad
 *   y regímenes (al menos uno de cada uno), y su orden dentro del perfil.
 * - Fuente y fecha de revisión son obligatorias para publicar. Las reglas las
 *   aplica el servidor; sus mensajes aparecen junto a cada campo y en un
 *   resumen arriba, que recibe el foco (noValidate, igual que el editor de
 *   contenidos).
 * - Si el paso viene de api/contenidos/ruta/pasos.yaml, avisa que el archivo
 *   puede reemplazar lo que se guarde aquí y no deja cambiar el slug (el id
 *   del archivo).
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
import Campo from './Campo.jsx';
import EditorFuentes from './EditorFuentes.jsx';
import GrupoCasillas, { idCasilla } from './GrupoCasillas.jsx';
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
import { RUTA_API_PASOS, RUTA_EDITOR_PASOS } from './ListaPasosRuta.jsx';
import { PERFILES, REGIMENES, TIPOS_ENTIDAD, TRAMOS_EDAD } from './catalogos.js';

const OPCIONES_TRAMOS = TRAMOS_EDAD.map(({ valor, etiqueta }) => ({ valor, etiqueta }));

const ID = Object.freeze({
  titulo: 'paso-titulo',
  slug: 'paso-slug',
  texto: 'paso-texto',
  orden: 'paso-orden',
  perfiles: 'paso-perfiles',
  tramos: 'paso-tramos',
  regimenes: 'paso-regimenes',
  tiposEntidad: 'paso-tipos-entidad',
  fechaRevision: 'paso-fecha'
});

/** El resumen de errores lleva a la primera casilla de cada grupo. */
const ID_RESUMEN = Object.freeze({
  ...ID,
  perfiles: idCasilla(ID.perfiles, PERFILES[0].valor),
  tramos: idCasilla(ID.tramos, OPCIONES_TRAMOS[0].valor),
  regimenes: idCasilla(ID.regimenes, REGIMENES[0].valor),
  tiposEntidad: idCasilla(ID.tiposEntidad, TIPOS_ENTIDAD[0].valor)
});

const ETIQUETAS = Object.freeze({
  titulo: 'Título',
  slug: 'Slug',
  texto: 'Texto',
  orden: 'Orden',
  perfiles: 'Perfiles',
  tramos: 'Tramos de edad',
  regimenes: 'Regímenes',
  tiposEntidad: 'Tipos de entidad',
  fuentes: 'Fuentes',
  fechaRevision: 'Fecha de revisión'
});

/** Orden de los campos en el formulario: el resumen de errores lo sigue. */
const ORDEN_CAMPOS = [
  'titulo',
  'slug',
  'texto',
  'orden',
  'perfiles',
  'tramos',
  'regimenes',
  'tiposEntidad',
  'fuentes',
  'fechaRevision'
];

const NUEVO = Object.freeze({ _id: null, estado: BORRADOR, archivo: null });

function aFormulario(paso) {
  return {
    titulo: paso.titulo ?? '',
    slug: paso.slug ?? '',
    texto: paso.texto ?? '',
    orden: paso.orden === undefined || paso.orden === null ? '' : String(paso.orden),
    perfiles: paso.perfiles ?? [],
    tramos: paso.tramos ?? [],
    regimenes: paso.regimenes ?? [],
    tiposEntidad: paso.tiposEntidad ?? [],
    fuentes: fuentesAFilas(paso.fuentes),
    fechaRevision: fechaRevision(paso.fechaRevision)?.iso ?? ''
  };
}

/** Datos para la API. Un orden vacío va como null: el servidor responde que es obligatorio. */
function aDatos(formulario, estado) {
  const { filasEnviadas, fuentes } = fuentesParaEnviar(formulario.fuentes);
  const orden = formulario.orden.trim();
  return {
    filasEnviadas,
    datos: {
      titulo: formulario.titulo,
      slug: formulario.slug,
      texto: formulario.texto,
      orden: orden === '' ? null : Number(orden),
      perfiles: formulario.perfiles,
      tramos: formulario.tramos,
      regimenes: formulario.regimenes,
      tiposEntidad: formulario.tiposEntidad,
      fuentes,
      fechaRevision: formulario.fechaRevision || null,
      estado
    }
  };
}

function textoDeExito(anterior, nuevo) {
  if (nuevo === PUBLICADO) {
    return anterior === PUBLICADO ? 'Cambios guardados. La guía ya los muestra.' : 'Publicado. Ya aparece en la guía.';
  }
  return anterior === PUBLICADO
    ? 'Despublicado. El paso pasó a borrador y ya no aparece en la guía.'
    : 'Borrador guardado. Todavía no aparece en la guía.';
}

function AvisoArchivoPaso({ archivo }) {
  return (
    <AvisoArchivo titulo={<>Este paso viene del archivo <code>api/contenidos/{archivo}</code> del repositorio.</>}>
      <p>
        Lo que guardes aquí se mantiene hasta que alguien actualice este paso en el archivo con una fecha de
        revisión más reciente. En ese momento, el archivo reemplaza tus cambios y vuelve a publicar el paso,
        aunque lo hayas despublicado.
      </p>
      <p>Para que un cambio sea permanente, hazlo también en el archivo.</p>
    </AvisoArchivo>
  );
}

function FormularioPaso({ inicial }) {
  const editor = useEditor({
    inicial,
    aFormulario,
    aDatos,
    rutaApi: RUTA_API_PASOS,
    rutaEditor: RUTA_EDITOR_PASOS,
    ordenCampos: ORDEN_CAMPOS,
    textoDeExito
  });
  const { registro: paso, formulario, setFormulario, cambiar, errores, resultado, enviando, guardar } = editor;

  const publicado = paso.estado === PUBLICADO;
  const deArchivo = Boolean(paso.archivo);
  const porCampo = errores?.porCampo ?? {};
  const listaErrores = errores
    ? listaDelResumen(errores, formulario.fuentes, { orden: ORDEN_CAMPOS, ids: ID_RESUMEN, etiquetas: ETIQUETAS })
    : [];
  const elegir = (campo) => (valores) => setFormulario((anterior) => ({ ...anterior, [campo]: valores }));

  return (
    <>
      {editor.avisoCreacion && <p className="mensaje mensaje--exito">{editor.avisoCreacion}</p>}
      {deArchivo && <AvisoArchivoPaso archivo={paso.archivo} />}

      <p className="editor__estado">
        Estado: <EtiquetaEstado estado={paso.estado} />
        {publicado && (
          <>
            {' '}
            <Link to="/ruta-de-atencion">Ver la guía en el sitio</Link>
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
              ? 'No se puede cambiar porque el paso viene de un archivo del repositorio: es su id en ruta/pasos.yaml.'
              : 'Identificador del paso: letras minúsculas sin tildes, números y guiones. Si lo dejas vacío, se genera a partir del título.'
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

        <Campo id={ID.texto} etiqueta="Texto" indicacion="(obligatorio)" error={porCampo.texto} pista="Máximo dos frases.">
          {(props) => <textarea {...props} className="campo__control" rows={4} value={formulario.texto} onChange={cambiar('texto')} />}
        </Campo>

        <Campo
          id={ID.orden}
          etiqueta="Orden"
          indicacion="(obligatorio)"
          error={porCampo.orden}
          pista="La guía muestra los pasos de menor a mayor. Van de 10 en 10 para poder intercalar uno nuevo."
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

        <GrupoCasillas
          id={ID.perfiles}
          etiqueta="Perfiles"
          indicacion="(al menos uno)"
          pista="Quién consulta: la primera pregunta de la guía."
          error={porCampo.perfiles}
          opciones={PERFILES}
          valores={formulario.perfiles}
          alCambiar={elegir('perfiles')}
        />
        <GrupoCasillas
          id={ID.tramos}
          etiqueta="Tramos de edad"
          indicacion="(al menos uno)"
          error={porCampo.tramos}
          opciones={OPCIONES_TRAMOS}
          valores={formulario.tramos}
          alCambiar={elegir('tramos')}
        />
        <GrupoCasillas
          id={ID.regimenes}
          etiqueta="Regímenes de afiliación"
          indicacion="(al menos uno)"
          pista="Si un docente responde «No lo sé», la guía le muestra los pasos de todos los regímenes."
          error={porCampo.regimenes}
          opciones={REGIMENES}
          valores={formulario.regimenes}
          alCambiar={elegir('regimenes')}
        />
        <GrupoCasillas
          id={ID.tiposEntidad}
          etiqueta="Tipos de entidad"
          indicacion="(opcional)"
          pista="Tipos de entidad del directorio que la guía mostrará junto al paso."
          error={porCampo.tiposEntidad}
          opciones={TIPOS_ENTIDAD}
          valores={formulario.tiposEntidad}
          alCambiar={elegir('tiposEntidad')}
        />

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
              ? '«Guardar cambios» mantiene el paso publicado. «Despublicar» lo guarda y lo pasa a borrador: deja de aparecer en la guía.'
              : '«Publicar» lo guarda y lo muestra en la guía; exige fuente y fecha de revisión. «Guardar borrador» lo guarda sin publicarlo.'
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

export default function EditorPasoRuta() {
  const { estado: estadoSesion } = useSesion();
  const { esNuevo, inicial, estado, reintentar } = useCargaEditor(RUTA_API_PASOS, NUEVO);
  useTituloPagina(esNuevo ? 'Nuevo paso de la ruta · Panel' : 'Editar paso de la ruta · Panel');

  return (
    <div className="contenedor pagina pagina-admin">
      <p className="volver">
        <Link to={RUTA_EDITOR_PASOS}>
          <ArrowLeft aria-hidden="true" />
          Volver a la lista de pasos
        </Link>
      </p>
      <h1>{esNuevo ? 'Nuevo paso de la ruta' : 'Editar paso de la ruta'}</h1>
      <SesionVencida />

      {inicial ? (
        <FormularioPaso key={inicial._id ?? 'nuevo'} inicial={inicial} />
      ) : (
        estadoSesion !== SESION.VENCIDA && (
          <EstadoDatos
            estado={estado}
            reintentar={reintentar}
            queCarga="el paso"
            sinContenido="Este paso no existe. Vuelve a la lista para elegir otro."
          />
        )
      )}
    </div>
  );
}
