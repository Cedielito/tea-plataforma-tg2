/**
 * Cuestionario SUS al final de la aplicación (M-09; RA-03, RA-05, RA-11). Los
 * 10 enunciados, la escala y la versión llegan de la API
 * (api/contenidos/registro/sus.yaml). Valora la herramienta, no a la persona:
 * el participante no ve ningún valor.
 *
 * - Un fieldset por enunciado, con 5 opciones de radio de 1 a 5; los extremos
 *   llevan su etiqueta («Totalmente en desacuerdo», «Totalmente de acuerdo»).
 * - Todos son obligatorios. Si falta alguno, un resumen recibe el foco y
 *   enlaza a cada enunciado, y el error se repite junto a él.
 * - Las respuestas se entregan a quien usa el cuestionario (alTerminar), que
 *   las pone en la cola de envíos.
 */
import { useId, useRef, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import ResumenErrores from '../componentes/ResumenErrores.jsx';
import { MensajeError } from '../componentes/Campo.jsx';
import { enunciadosSinRespuesta } from './aplicacion.js';
import { SUS } from './textosProfesional.js';

export default function CuestionarioSus({ cuestionario, alTerminar }) {
  const id = useId();
  const { items, escala } = cuestionario;
  const opciones = Array.from({ length: escala.maximo - escala.minimo + 1 }, (_, i) => escala.minimo + i);
  const [respuestas, setRespuestas] = useState([]);
  const [faltan, setFaltan] = useState([]);
  const resumen = useRef(null);

  const idOpcion = (numero, valor) => `${id}-${numero}-${valor}`;
  const idError = (numero) => `${id}-${numero}-error`;

  function responder(indice, valor) {
    setRespuestas((anteriores) => {
      const nuevas = [...anteriores];
      nuevas[indice] = valor;
      return nuevas;
    });
    setFaltan((anteriores) => anteriores.filter((n) => n !== indice + 1));
  }

  function alEnviar(evento) {
    evento.preventDefault();
    const sin = enunciadosSinRespuesta(respuestas, items.length);
    setFaltan(sin);
    if (sin.length > 0) {
      requestAnimationFrame(() => resumen.current?.focus());
      return;
    }
    alTerminar(respuestas.slice(0, items.length));
  }

  return (
    <form className="formulario sus" onSubmit={alEnviar} noValidate>
      {faltan.length > 0 && (
        <ResumenErrores
          ref={resumen}
          titulo={SUS.faltan}
          errores={faltan.map((numero) => ({
            id: idOpcion(numero, escala.minimo),
            etiqueta: SUS.enunciado(numero, items.length),
            mensaje: SUS.falta
          }))}
        />
      )}
      {SUS.descripcion.map((parrafo) => (
        <p key={parrafo}>{parrafo}</p>
      ))}
      {items.map(({ numero, texto }, indice) => {
        const conError = faltan.includes(numero);
        return (
          <fieldset key={numero} className={`sus__enunciado${conError ? ' campo--con-error' : ''}`}>
            <legend>
              <span className="sus__numero">{SUS.enunciado(numero, items.length)}</span>{' '}
              <span className="sus__texto">{texto}</span>
            </legend>
            <MensajeError id={idError(numero)}>{conError ? SUS.falta : null}</MensajeError>
            <div className="sus__opciones">
              {opciones.map((valor) => (
                <label key={valor} htmlFor={idOpcion(numero, valor)} className="sus__opcion">
                  <input
                    id={idOpcion(numero, valor)}
                    type="radio"
                    name={`${id}-${numero}`}
                    value={valor}
                    checked={respuestas[indice] === valor}
                    onChange={() => responder(indice, valor)}
                    aria-describedby={conError ? idError(numero) : undefined}
                  />
                  <span>{SUS.opcion(valor, escala)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      <button type="submit" className="boton boton-primario">
        <CircleCheck aria-hidden="true" />
        {SUS.enviar}
      </button>
    </form>
  );
}
