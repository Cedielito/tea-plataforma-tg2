/**
 * Final de la guía de la ruta (M-03; RF-04, RCN-01, RCN-02, RCN-03, RCN-04).
 *
 * - «Pasos para tu caso», con el resumen de las respuestas y el aviso de no
 *   diagnóstico repetido aquí (RCN-03).
 * - Los pasos que coinciden con las respuestas, en orden. Cada uno muestra
 *   sus fuentes y su fecha de revisión en un <details> (RCN-01, RCN-02).
 * - Un recuadro lleva a las señales de alerta del tramo elegido.
 * - «Anterior» vuelve a la pregunta 3 con las respuestas; «Empezar de nuevo»
 *   las borra.
 *
 * Los pasos se descargaron al abrir la página; si todavía no llegan o la API
 * falla, se muestra el mensaje de carga o de error con «Intentar de nuevo».
 * Las entidades del directorio (tiposEntidad) se mostrarán con T6.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, RotateCcw } from 'lucide-react';
import AvisoNoDiagnostico from '../componentes/AvisoNoDiagnostico.jsx';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import { ESTADOS } from '../api/useDatos.js';
import { esEnlaceWeb, fechaRevision } from '../utilidades/formato.js';
import { TRAMOS_EDAD } from '../secciones.js';
import { etiquetaDe } from '../catalogos.js';
import { filtrarPasos } from './filtroPasos.js';
import { resumirRespuestas } from './preguntas.js';

function FuentesDelPaso({ titulo, fuentes = [], fechaRevision: fecha }) {
  const revision = fechaRevision(fecha);
  return (
    <details className="paso-ruta__fuentes">
      <summary>
        Fuentes<span className="solo-lector"> de «{titulo}»</span>
      </summary>
      <ul className="fuentes__lista">
        {fuentes.map(({ texto, url }, i) => (
          <li key={i}>{esEnlaceWeb(url) ? <a href={url}>{texto}</a> : texto}</li>
        ))}
      </ul>
      {revision && (
        <p className="fuentes__revision">
          Revisado el <time dateTime={revision.iso}>{revision.texto}</time>
        </p>
      )}
    </details>
  );
}

function ListaDePasos({ pasos }) {
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
        </li>
      ))}
    </ol>
  );
}

export default function PasosParaTuCaso({ titulo, respuestas, pasos, alAnterior, alEmpezarDeNuevo }) {
  const { estado, datos, reintentar } = pasos;
  const tramo = etiquetaDe(TRAMOS_EDAD, respuestas.tramo);

  return (
    <div className="guia__final">
      <h3 ref={titulo} tabIndex={-1} className="guia__titulo">
        <span className="guia__enunciado">Pasos para tu caso</span>
      </h3>
      <p className="guia__resumen">
        <span className="secundario">Respondiste:</span> {resumirRespuestas(respuestas)}
      </p>
      <AvisoNoDiagnostico className="guia__aviso" />

      {estado === ESTADOS.LISTO ? (
        <ListaDePasos pasos={filtrarPasos(datos, respuestas)} />
      ) : (
        <EstadoDatos
          estado={estado}
          reintentar={reintentar}
          queCarga="los pasos de la ruta"
          sinContenido="La guía todavía no tiene pasos publicados. Más abajo puedes leer la ruta completa."
        />
      )}

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
