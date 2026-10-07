/**
 * Final de la guía de la ruta (M-03, M-04; RF-04, RF-05, RS-01, RCN-01,
 * RCN-02, RCN-03, RCN-04).
 *
 * - «Pasos para tu caso», con el resumen de las respuestas y el aviso de no
 *   diagnóstico repetido aquí (RCN-03).
 * - Ciudad opcional para ver entidades cercanas. No es una cuarta pregunta:
 *   no se envía, no se guarda y no va en la dirección (RF-04, RS-01); la guía
 *   la tiene en su estado. Un aviso para el lector de pantalla dice qué
 *   cambió junto a los pasos.
 * - Los pasos que coinciden con las respuestas, en orden. Cada paso muestra
 *   sus fuentes y su fecha de revisión en un <details> (RCN-01, RCN-02) y,
 *   debajo, las entidades nacionales de sus tipos y, si se eligió ciudad,
 *   también las de esa ciudad (directorio/filtroDirectorio.js).
 * - Un enlace al directorio completo, sin filtros, y un recuadro hacia las
 *   señales de alerta del tramo elegido.
 * - «Anterior» vuelve a la pregunta 3 con las respuestas; «Empezar de nuevo»
 *   las borra, también la ciudad.
 *
 * Los pasos y el directorio se descargaron al abrir la página; si todavía no
 * llegan o la API falla, se muestra el mensaje de carga o de error con
 * «Intentar de nuevo». Sin directorio, los pasos se muestran igual.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, MapPin, RotateCcw } from 'lucide-react';
import AvisoNoDiagnostico from '../componentes/AvisoNoDiagnostico.jsx';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import FuentesDesplegables from '../componentes/FuentesDesplegables.jsx';
import { ESTADOS } from '../api/useDatos.js';
import { fechaRevision } from '../utilidades/formato.js';
import { RUTA_DIRECTORIO_WEB, TRAMOS_EDAD } from '../secciones.js';
import { CIUDADES_LOCALES, etiquetaDe } from '../catalogos.js';
import EntidadesDelPaso from '../directorio/EntidadesDelPaso.jsx';
import { NOTA_COBERTURA, entidadesDelPaso } from '../directorio/filtroDirectorio.js';
import { filtrarPasos } from './filtroPasos.js';
import { resumirRespuestas } from './preguntas.js';

function FuentesDelPaso({ titulo, fuentes, fechaRevision: fecha }) {
  const revision = fechaRevision(fecha);
  return (
    <FuentesDesplegables titulo={titulo} fuentes={fuentes}>
      {revision && (
        <p className="fuentes__revision">
          Revisado el <time dateTime={revision.iso}>{revision.texto}</time>
        </p>
      )}
    </FuentesDesplegables>
  );
}

function SelectorCiudad({ ciudad, alCambiar }) {
  const id = useId();
  const [anuncio, setAnuncio] = useState('');

  function cambiar(evento) {
    const elegida = evento.target.value || null;
    alCambiar(elegida);
    setAnuncio(
      elegida
        ? `Junto a cada paso mostramos también las entidades de ${elegida}.`
        : 'Junto a cada paso mostramos solo las entidades de todo el país.'
    );
  }

  return (
    <div className="guia__ciudad">
      <label htmlFor={id} className="guia__ciudad-etiqueta">
        <MapPin aria-hidden="true" />
        <span>
          ¿En qué ciudad buscas atención? <span className="guia__opcional">(opcional)</span>
        </span>
      </label>
      <p id={`${id}-pista`} className="guia__ciudad-pista">
        Junto a cada paso verás entidades de todo el país. Si eliges tu ciudad, también verás las de tu ciudad. Tu
        ciudad no se guarda ni se envía.
      </p>
      <select
        id={id}
        className="selector"
        aria-describedby={`${id}-pista ${id}-nota`}
        value={ciudad ?? ''}
        onChange={cambiar}
      >
        <option value="">Sin elegir: solo entidades de todo el país</option>
        {CIUDADES_LOCALES.map(({ valor, etiqueta }) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>
      <p id={`${id}-nota`} className="guia__ciudad-nota">
        {NOTA_COBERTURA}
      </p>
      <p role="status" className="solo-lector">
        {anuncio}
      </p>
    </div>
  );
}

/** @param {{entidadesDe: ((paso: object) => object[]) | null}} props sin directorio, null */
function ListaDePasos({ pasos, entidadesDe }) {
  if (pasos.length === 0) {
    return (
      <p className="guia__vacio">
        Todavía no hay pasos publicados para estas respuestas. Más abajo puedes leer la ruta completa.
      </p>
    );
  }
  return (
    // role="list": algunos lectores de pantalla quitan la lista si no tiene viñetas visibles.
    <ol className="pasos-ruta" role="list">
      {pasos.map((paso) => (
        <li key={paso.slug} className="paso-ruta">
          <p className="paso-ruta__titulo">{paso.titulo}</p>
          <p className="paso-ruta__texto">{paso.texto}</p>
          <FuentesDelPaso {...paso} />
          {entidadesDe && <EntidadesDelPaso entidades={entidadesDe(paso)} tituloPaso={paso.titulo} />}
        </li>
      ))}
    </ol>
  );
}

export default function PasosParaTuCaso({
  titulo,
  respuestas,
  pasos,
  directorio,
  ciudad,
  alCambiarCiudad,
  alAnterior,
  alEmpezarDeNuevo
}) {
  const tramo = etiquetaDe(TRAMOS_EDAD, respuestas.tramo);
  const conDirectorio = directorio.estado === ESTADOS.LISTO;
  const entidadesDe = conDirectorio ? (paso) => entidadesDelPaso(directorio.datos, paso.tiposEntidad, ciudad) : null;

  return (
    <div className="guia__final">
      <h3 ref={titulo} tabIndex={-1} className="guia__titulo">
        <span className="guia__enunciado">Pasos para tu caso</span>
      </h3>
      <p className="guia__resumen">
        <span className="secundario">Respondiste:</span> {resumirRespuestas(respuestas)}
      </p>
      <AvisoNoDiagnostico className="guia__aviso" />

      {conDirectorio ? (
        <SelectorCiudad ciudad={ciudad} alCambiar={alCambiarCiudad} />
      ) : (
        <EstadoDatos
          estado={directorio.estado}
          reintentar={directorio.reintentar}
          queCarga="las entidades del directorio"
        />
      )}

      {pasos.estado === ESTADOS.LISTO ? (
        <ListaDePasos pasos={filtrarPasos(pasos.datos, respuestas)} entidadesDe={entidadesDe} />
      ) : (
        <EstadoDatos
          estado={pasos.estado}
          reintentar={pasos.reintentar}
          queCarga="los pasos de la ruta"
          sinContenido="La guía todavía no tiene pasos publicados. Más abajo puedes leer la ruta completa."
        />
      )}

      <p className="guia__directorio">
        El correo, la dirección y el horario de cada entidad están en el{' '}
        <Link to={RUTA_DIRECTORIO_WEB}>directorio de orientación</Link>.
      </p>

      <div className="recuadro-ruta guia__senales">
        <span className="recuadro-ruta__icono" aria-hidden="true">
          <Eye />
        </span>
        <div>
          <p className="recuadro-ruta__titulo">Señales de alerta de {tramo}</p>
          <p>Son motivos para consultar con un profesional de la salud, no un diagnóstico.</p>
          <Link to={`/senales-de-alerta?edad=${respuestas.tramo}`} className="boton boton-secundario">
            Ver las señales de {tramo}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="guia__botones">
        <button type="button" className="boton boton-secundario" onClick={alAnterior}>
          <ArrowLeft aria-hidden="true" />
          Anterior
        </button>
        <button type="button" className="boton boton-secundario" onClick={alEmpezarDeNuevo}>
          <RotateCcw aria-hidden="true" />
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
