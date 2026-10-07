/**
 * Editor de entidades del directorio en el panel (M-04, M-08; RF-10, RS-07,
 * HU-14; RCN-01, RCN-02; RA-03, RA-05, RA-10, RA-11). Crea, edita, publica y
 * despublica.
 *
 * - Nombre, tipo, ciudad, descripción y al menos un canal de contacto
 *   (teléfono, correo o sitio web) son obligatorios, también en borrador.
 * - Fuente y fecha de verificación son obligatorias para publicar (RCN-01,
 *   RCN-02). Si es un profesional independiente, también la constancia de su
 *   autorización (RS-07); la constancia no se muestra en el sitio.
 * - Las reglas las aplica el servidor; sus mensajes aparecen junto a cada
 *   campo y en un resumen arriba, que recibe el foco (noValidate, igual que
 *   los otros editores).
 * - Si la entidad viene de api/contenidos/directorio/entidades.yaml, avisa que
 *   el archivo puede reemplazar lo que se guarde aquí y no deja cambiar el
 *   slug (el id del archivo).
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
import Campo, { MensajeError } from '../componentes/Campo.jsx';
import EditorFuentes from './EditorFuentes.jsx';
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
import { RUTA_API_ENTIDADES, RUTA_EDITOR_ENTIDADES } from './ListaEntidades.jsx';
import { CIUDADES, NACIONAL, TIPOS_ENTIDAD } from './catalogos.js';

const ID = Object.freeze({
  nombre: 'entidad-nombre',
  slug: 'entidad-slug',
  tipo: 'entidad-tipo',
  ciudad: 'entidad-ciudad',
  descripcion: 'entidad-descripcion',
  contacto: 'entidad-contacto',
  'contacto.telefonos': 'entidad-telefonos',
  'contacto.correo': 'entidad-correo',
  'contacto.web': 'entidad-web',
  'contacto.direccion': 'entidad-direccion',
  'contacto.horario': 'entidad-horario',
  esProfesional: 'entidad-profesional',
  constanciaAutorizacion: 'entidad-constancia',
  fechaVerificacion: 'entidad-fecha'
});

/** El resumen de errores lleva del grupo de contacto a su primer campo. */
const ID_RESUMEN = Object.freeze({ ...ID, contacto: ID['contacto.telefonos'] });

const ETIQUETAS = Object.freeze({
  nombre: 'Nombre',
  slug: 'Slug',
  tipo: 'Tipo',
  ciudad: 'Ciudad',
  descripcion: 'Descripción',
  contacto: 'Contacto',
  'contacto.telefonos': 'Teléfonos',
  'contacto.correo': 'Correo',
  'contacto.web': 'Sitio web',
  'contacto.direccion': 'Dirección',
  'contacto.horario': 'Horario',
  esProfesional: 'Profesional independiente',
  constanciaAutorizacion: 'Constancia de autorización',
  fuentes: 'Fuentes',
  fechaVerificacion: 'Fecha de verificación'
});

/** Orden de los campos en el formulario: el resumen de errores lo sigue. */
const ORDEN_CAMPOS = [
  'nombre',
  'slug',
  'tipo',
  'ciudad',
  'descripcion',
  'contacto',
  'contacto.telefonos',
  'contacto.correo',
  'contacto.web',
  'contacto.direccion',
  'contacto.horario',
  'esProfesional',
  'constanciaAutorizacion',
  'fuentes',
  'fechaVerificacion'
];

const NUEVA = Object.freeze({ _id: null, estado: BORRADOR, archivo: null });

const etiquetaCiudad = (valor, etiqueta) => (valor === NACIONAL ? 'Nacional (todo el país)' : etiqueta);

function aFormulario(entidad) {
  const contacto = entidad.contacto ?? {};
  return {
    nombre: entidad.nombre ?? '',
    slug: entidad.slug ?? '',
    tipo: entidad.tipo ?? '',
    ciudad: entidad.ciudad ?? '',
    descripcion: entidad.descripcion ?? '',
    telefonos: (contacto.telefonos ?? []).join('\n'),
    correo: contacto.correo ?? '',
    web: contacto.web ?? '',
    direccion: contacto.direccion ?? '',
    horario: contacto.horario ?? '',
    esProfesional: Boolean(entidad.esProfesional),
    constanciaAutorizacion: entidad.constanciaAutorizacion ?? '',
    fuentes: fuentesAFilas(entidad.fuentes),
    fechaVerificacion: fechaRevision(entidad.fechaVerificacion)?.iso ?? ''
  };
}

/** Datos para la API: un teléfono por línea; las líneas vacías no se envían. */
function aDatos(formulario, estado) {
  const { filasEnviadas, fuentes } = fuentesParaEnviar(formulario.fuentes);
  return {
    filasEnviadas,
    datos: {
      nombre: formulario.nombre,
      slug: formulario.slug,
      tipo: formulario.tipo,
      ciudad: formulario.ciudad,
      descripcion: formulario.descripcion,
      contacto: {
        telefonos: formulario.telefonos
          .split('\n')
          .map((linea) => linea.trim())
          .filter(Boolean),
        correo: formulario.correo,
        web: formulario.web,
        direccion: formulario.direccion,
        horario: formulario.horario
      },
      esProfesional: formulario.esProfesional,
      constanciaAutorizacion: formulario.constanciaAutorizacion,
      fuentes,
      fechaVerificacion: formulario.fechaVerificacion || null,
      estado
    }
  };
}

function textoDeExito(anterior, nuevo) {
  if (nuevo === PUBLICADO) {
    return anterior === PUBLICADO
      ? 'Cambios guardados. El directorio ya los muestra.'
      : 'Publicada. Ya aparece en el directorio y en la guía de la ruta.';
  }
  return anterior === PUBLICADO
    ? 'Despublicada. La entidad pasó a borrador y ya no aparece en el sitio.'
    : 'Borrador guardado. Todavía no aparece en el sitio.';
}

function AvisoArchivoEntidad({ archivo }) {
  return (
    <AvisoArchivo titulo={<>Esta entidad viene del archivo <code>api/contenidos/{archivo}</code> del repositorio.</>}>
      <p>
        Lo que guardes aquí se mantiene hasta que alguien actualice esta entidad en el archivo con una fecha de
        verificación más reciente. En ese momento, el archivo reemplaza tus cambios y vuelve a publicar la entidad,
        aunque la hayas despublicado.
      </p>
      <p>Para que un cambio sea permanente, hazlo también en el archivo.</p>
    </AvisoArchivo>
  );
}

function FormularioEntidad({ inicial }) {
  const editor = useEditor({
    inicial,
    aFormulario,
    aDatos,
    rutaApi: RUTA_API_ENTIDADES,
    rutaEditor: RUTA_EDITOR_ENTIDADES,
    ordenCampos: ORDEN_CAMPOS,
    textoDeExito
  });
  const { registro: entidad, formulario, setFormulario, cambiar, errores, resultado, enviando, guardar } = editor;

  const publicada = entidad.estado === PUBLICADO;
  const deArchivo = Boolean(entidad.archivo);
  const porCampo = errores?.porCampo ?? {};
  const listaErrores = errores
    ? listaDelResumen(errores, formulario.fuentes, { orden: ORDEN_CAMPOS, ids: ID_RESUMEN, etiquetas: ETIQUETAS })
    : [];
  const errorContacto = porCampo.contacto;

  return (
    <>
      {editor.avisoCreacion && <p className="mensaje mensaje--exito">{editor.avisoCreacion}</p>}
      {deArchivo && <AvisoArchivoEntidad archivo={entidad.archivo} />}

      <p className="editor__estado">
        Estado: <EtiquetaEstado estado={entidad.estado} />
        {publicada && (
          <>
            {' '}
            <Link to="/directorio">Ver el directorio en el sitio</Link>
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
        <Campo id={ID.nombre} etiqueta="Nombre" indicacion="(obligatorio)" error={porCampo.nombre}>
          {(props) => <input {...props} className="campo__control" value={formulario.nombre} onChange={cambiar('nombre')} />}
        </Campo>

        <Campo
          id={ID.slug}
          etiqueta="Slug"
          error={porCampo.slug}
          pista={
            deArchivo
              ? 'No se puede cambiar porque la entidad viene de un archivo del repositorio: es su id en directorio/entidades.yaml.'
              : 'Identificador de la entidad: letras minúsculas sin tildes, números y guiones. Si lo dejas vacío, se genera a partir del nombre.'
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

        <Campo id={ID.tipo} etiqueta="Tipo" indicacion="(obligatorio)" error={porCampo.tipo}>
          {(props) => (
            <select {...props} className="campo__control" value={formulario.tipo} onChange={cambiar('tipo')}>
              <option value="">Elige un tipo</option>
              {TIPOS_ENTIDAD.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          id={ID.ciudad}
          etiqueta="Ciudad"
          indicacion="(obligatoria)"
          error={porCampo.ciudad}
          pista="Las entidades nacionales aparecen con cualquier ciudad que se elija en el sitio."
        >
          {(props) => (
            <select {...props} className="campo__control" value={formulario.ciudad} onChange={cambiar('ciudad')}>
              <option value="">Elige una ciudad</option>
              {CIUDADES.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiquetaCiudad(valor, etiqueta)}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          id={ID.descripcion}
          etiqueta="Descripción"
          indicacion="(obligatoria)"
          error={porCampo.descripcion}
          pista="Qué hace la entidad y para qué acudir a ella, en frases cortas."
        >
          {(props) => (
            <textarea {...props} className="campo__control" rows={3} value={formulario.descripcion} onChange={cambiar('descripcion')} />
          )}
        </Campo>

        <fieldset
          id={ID.contacto}
          className={`campo grupo-contacto${errorContacto ? ' campo--con-error' : ''}`}
          aria-describedby={[`${ID.contacto}-pista`, errorContacto && `${ID.contacto}-error`].filter(Boolean).join(' ')}
        >
          <legend className="campo__etiqueta">
            Contacto <span className="campo__indicacion">(al menos un teléfono, correo o sitio web)</span>
          </legend>
          <p id={`${ID.contacto}-pista`} className="campo__pista">
            Solo datos institucionales y públicos, verificados en la fuente oficial.
          </p>
          <MensajeError id={`${ID.contacto}-error`}>{errorContacto}</MensajeError>

          <Campo
            id={ID['contacto.telefonos']}
            etiqueta="Teléfonos"
            error={porCampo['contacto.telefonos']}
            pista="Uno por línea. Para WhatsApp, agrega «(WhatsApp)» al final, por ejemplo: 300 754 8933 (WhatsApp)."
          >
            {(props) => (
              <textarea {...props} className="campo__control" rows={3} value={formulario.telefonos} onChange={cambiar('telefonos')} />
            )}
          </Campo>
          <Campo id={ID['contacto.correo']} etiqueta="Correo" error={porCampo['contacto.correo']}>
            {(props) => (
              <input
                {...props}
                type="email"
                className="campo__control"
                value={formulario.correo}
                onChange={cambiar('correo')}
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Campo>
          <Campo
            id={ID['contacto.web']}
            etiqueta="Sitio web"
            error={porCampo['contacto.web']}
            pista="La dirección completa, con https://."
          >
            {(props) => (
              <input
                {...props}
                type="url"
                className="campo__control"
                value={formulario.web}
                onChange={cambiar('web')}
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Campo>
          <Campo id={ID['contacto.direccion']} etiqueta="Dirección" error={porCampo['contacto.direccion']}>
            {(props) => <input {...props} className="campo__control" value={formulario.direccion} onChange={cambiar('direccion')} />}
          </Campo>
          <Campo id={ID['contacto.horario']} etiqueta="Horario" error={porCampo['contacto.horario']}>
            {(props) => <input {...props} className="campo__control" value={formulario.horario} onChange={cambiar('horario')} />}
          </Campo>
        </fieldset>

        <div className={`campo${porCampo.esProfesional ? ' campo--con-error' : ''}`}>
          <MensajeError id={`${ID.esProfesional}-error`}>{porCampo.esProfesional}</MensajeError>
          <label className="casilla">
            <input
              type="checkbox"
              id={ID.esProfesional}
              checked={formulario.esProfesional}
              aria-describedby={porCampo.esProfesional ? `${ID.esProfesional}-error` : undefined}
              onChange={(evento) => setFormulario((anterior) => ({ ...anterior, esProfesional: evento.target.checked }))}
            />
            Es un profesional independiente, no una entidad pública
          </label>
        </div>

        <Campo
          id={ID.constanciaAutorizacion}
          etiqueta="Constancia de autorización"
          indicacion={formulario.esProfesional ? '(obligatoria para publicar)' : '(solo para profesionales)'}
          error={porCampo.constanciaAutorizacion}
          pista="Dónde está archivada la autorización firmada del profesional para publicar sus datos, y su fecha. No se muestra en el sitio."
        >
          {(props) => (
            <textarea
              {...props}
              className="campo__control"
              rows={2}
              value={formulario.constanciaAutorizacion}
              onChange={cambiar('constanciaAutorizacion')}
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
          id={ID.fechaVerificacion}
          etiqueta="Fecha de verificación"
          pista="Día en que se verificaron los datos de contacto en la fuente oficial. No puede ser posterior a hoy."
          valor={formulario.fechaVerificacion}
          alCambiar={(fecha) => setFormulario((anterior) => ({ ...anterior, fechaVerificacion: fecha }))}
          error={porCampo.fechaVerificacion}
        />

        <AccionesEditor
          publicado={publicada}
          pista={
            publicada
              ? '«Guardar cambios» mantiene la entidad publicada. «Despublicar» la guarda y la pasa a borrador: deja de aparecer en el sitio.'
              : '«Publicar» la guarda y la muestra en el directorio y en la guía; exige fuente y fecha de verificación. «Guardar borrador» la guarda sin publicarla.'
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

export default function EditorEntidad() {
  const { estado: estadoSesion } = useSesion();
  const { esNuevo, inicial, estado, reintentar } = useCargaEditor(RUTA_API_ENTIDADES, NUEVA);
  useTituloPagina(esNuevo ? 'Nueva entidad del directorio · Panel' : 'Editar entidad del directorio · Panel');

  return (
    <div className="contenedor pagina pagina-admin">
      <p className="volver">
        <Link to={RUTA_EDITOR_ENTIDADES}>
          <ArrowLeft aria-hidden="true" />
          Volver al directorio
        </Link>
      </p>
      <h1>{esNuevo ? 'Nueva entidad del directorio' : 'Editar entidad del directorio'}</h1>
      <SesionVencida />

      {inicial ? (
        <FormularioEntidad key={inicial._id ?? 'nueva'} inicial={inicial} />
      ) : (
        estadoSesion !== SESION.VENCIDA && (
          <EstadoDatos
            estado={estado}
            reintentar={reintentar}
            queCarga="la entidad"
            sinContenido="Esta entidad no existe. Vuelve a la lista para elegir otra."
          />
        )
      )}
    </div>
  );
}
