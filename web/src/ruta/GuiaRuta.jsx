/**
 * Guía de la ruta de atención (M-03; RF-04, RS-01, RCN-03; RA-03, RA-10,
 * RA-11). Va arriba en /ruta-de-atencion, después del aviso de no diagnóstico
 * y antes del texto de S4.
 *
 * - Tres preguntas, una por pantalla, con «Pregunta X de 3», Anterior y
 *   Siguiente. Cada una es un <form> con <fieldset> y <legend>; «Siguiente»
 *   envía el formulario, así que Enter también avanza. Las opciones son
 *   botones de radio nativos: las flechas cambian de opción.
 * - Si se pulsa «Siguiente» sin elegir, aparece «Elige una opción para
 *   continuar» (role="alert"), enlazado a las opciones con aria-describedby.
 * - Al cambiar de pantalla, el foco va al título de la nueva: la pregunta,
 *   «Pasos para tu caso» o, con «Empezar de nuevo», la primera pregunta.
 * - Los pasos publicados se descargan al abrir la página, todos y sin enviar
 *   respuestas; al final se eligen en el navegador (filtroPasos.js). Las
 *   respuestas viven solo en el estado de React: no van a la API, ni a la
 *   dirección de la página, ni a sessionStorage. Al recargar se pierden.
 * - La barra de avance es decorativa (aria-hidden) y sin animación.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, LockKeyhole } from 'lucide-react';
import useDatos from '../api/useDatos.js';
import { PREGUNTAS, RESPUESTAS_VACIAS, responder } from './preguntas.js';
import PasosParaTuCaso from './PasosParaTuCaso.jsx';

/** Todos los pasos publicados: la API no recibe ni filtra respuestas (RF-04). */
export const RUTA_PASOS = '/api/pasos-ruta';

const TOTAL = PREGUNTAS.length;
const FINAL = TOTAL;

function BarraAvance({ actual }) {
  return (
    <span className="guia__barra" aria-hidden="true">
      {PREGUNTAS.map(({ campo }, indice) => (
        <span key={campo} className={`guia__segmento${indice <= actual ? ' guia__segmento--hecho' : ''}`} />
      ))}
    </span>
  );
}

function Pregunta({ indice, respuestas, titulo, alResponder, alSiguiente, alAnterior }) {
  const base = useId();
  const idError = `${base}-error`;
  const [avisos, setAvisos] = useState(0);
  const { campo, enunciado, opciones } = PREGUNTAS[indice];
  const elegida = respuestas[campo];
  const faltaRespuesta = avisos > 0 && !elegida;

  function alEnviar(evento) {
    evento.preventDefault();
    if (elegida) alSiguiente();
    // Cada intento sin respuesta vuelve a montar el aviso para que se anuncie de nuevo.
    else setAvisos((n) => n + 1);
  }

  return (
    <form className="guia__formulario" noValidate onSubmit={alEnviar}>
      <fieldset className="guia__grupo">
        <legend className="guia__leyenda">
          <h3 ref={titulo} tabIndex={-1} className="guia__titulo">
            <span className="guia__progreso">
              Pregunta {indice + 1} de {TOTAL}
              <BarraAvance actual={indice} />
            </span>
            <span className="guia__enunciado">{enunciado(respuestas.perfil)}</span>
          </h3>
        </legend>

        {faltaRespuesta && (
          <p key={avisos} id={idError} role="alert" className="guia__error">
            <CircleAlert aria-hidden="true" />
            Elige una opción para continuar.
          </p>
        )}

        <div className="guia__opciones">
          {opciones(respuestas.perfil).map(({ valor, etiqueta, descripcion }) => (
            <label key={valor} className="opcion">
              <input
                type="radio"
                className="opcion__control"
                name={`${base}-${campo}`}
                value={valor}
                checked={elegida === valor}
                onChange={() => alResponder(campo, valor)}
                aria-describedby={faltaRespuesta ? idError : undefined}
              />
              <span className="opcion__textos">
                <span className="opcion__etiqueta">{etiqueta}</span>
                {descripcion && <span className="opcion__descripcion">{descripcion}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="guia__botones">
        {indice > 0 && (
          <button type="button" className="boton boton-secundario" onClick={alAnterior}>
            <ArrowLeft aria-hidden="true" />
            Anterior
          </button>
        )}
        <button type="submit" className="boton boton-primario">
          Siguiente
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

export default function GuiaRuta() {
  const idTitulo = useId();
  const pasos = useDatos(RUTA_PASOS);
  const [pantalla, setPantalla] = useState(0);
  const [respuestas, setRespuestas] = useState(RESPUESTAS_VACIAS);
  const titulo = useRef(null);
  const pantallaAnterior = useRef(pantalla);

  // El foco pasa al título solo cuando cambia la pantalla, no al abrir la página.
  useEffect(() => {
    if (pantallaAnterior.current === pantalla) return;
    pantallaAnterior.current = pantalla;
    titulo.current?.focus();
  }, [pantalla]);

  const alResponder = (campo, valor) => setRespuestas((anteriores) => responder(anteriores, campo, valor));
  const irA = (destino) => setPantalla(destino);

  function empezarDeNuevo() {
    setRespuestas(RESPUESTAS_VACIAS);
    setPantalla(0);
  }

  return (
    <section className="guia" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="guia__encabezado">¿Qué pasos te corresponden?</h2>
      <p className="guia__introduccion">
        Responde 3 preguntas y te mostramos, en orden, los pasos para tu caso.
      </p>
      <p className="guia__privacidad">
        <LockKeyhole aria-hidden="true" />
        Tus respuestas no se guardan ni se envían.
      </p>

      {pantalla === FINAL ? (
        <PasosParaTuCaso
          titulo={titulo}
          respuestas={respuestas}
          pasos={pasos}
          alAnterior={() => irA(TOTAL - 1)}
          alEmpezarDeNuevo={empezarDeNuevo}
        />
      ) : (
        <Pregunta
          key={pantalla}
          indice={pantalla}
          respuestas={respuestas}
          titulo={titulo}
          alResponder={alResponder}
          alSiguiente={() => irA(pantalla + 1)}
          alAnterior={() => irA(pantalla - 1)}
        />
      )}
    </section>
  );
}
