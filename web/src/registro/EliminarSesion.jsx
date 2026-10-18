/**
 * Eliminación de una sesión del registro conductual con todos sus ensayos
 * (M-09, HU-19, CT-11; Ley 1581 de 2012; RA-03, RA-11).
 *
 * - ConfirmarEliminacion: la pregunta en la misma página, sin ventanas
 *   emergentes, como en la bandeja de mensajes. La pregunta recibe el foco;
 *   «Cancelar» lo devuelve al botón que la abrió.
 * - EliminarPorSeudonimo: un campo para el seudónimo que trae la persona en su
 *   copia del consentimiento. Se acepta en minúsculas, con espacios o sin el
 *   guion (normalizarSeudonimo) y la pregunta lo muestra en su forma canónica.
 * - El resultado se anuncia en una región role="status".
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Campo from '../componentes/Campo.jsx';
import { ErrorAdmin, mensajeDeError, pedirAdmin } from '../admin/clienteAdmin.js';
import { RUTA_API_SESIONES } from './rutasProfesional.js';
import { normalizarSeudonimo } from './seudonimo.js';
import { ELIMINAR } from './textosProfesional.js';

/**
 * @returns {Promise<'eliminada'|'no-encontrada'|'sesion-vencida'>} lanza con otro error
 */
async function eliminar(seudonimo) {
  try {
    await pedirAdmin(`${RUTA_API_SESIONES}/${encodeURIComponent(seudonimo)}`, { metodo: 'DELETE' });
    return 'eliminada';
  } catch (problema) {
    if (problema instanceof ErrorAdmin && problema.estado === 404) return 'no-encontrada';
    if (problema instanceof ErrorAdmin && problema.estado === 401) return 'sesion-vencida';
    throw problema;
  }
}

/** Pregunta de confirmación; `alTerminar(resultado, mensaje)`. */
export function ConfirmarEliminacion({ seudonimo, alCancelar, alTerminar }) {
  const idPregunta = useId();
  const pregunta = useRef(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    pregunta.current?.focus();
  }, []);

  async function confirmar() {
    if (eliminando) return;
    setEliminando(true);
    setError(null);
    try {
      const resultado = await eliminar(seudonimo);
      if (resultado === 'sesion-vencida') return setEliminando(false);
      const mensaje = resultado === 'eliminada' ? ELIMINAR.eliminada(seudonimo) : ELIMINAR.noEncontrada(seudonimo);
      return alTerminar(resultado, mensaje);
    } catch (problema) {
      setError(mensajeDeError(problema));
      return setEliminando(false);
    }
  }

  return (
    <div className="confirmar-eliminar" role="group" aria-labelledby={idPregunta}>
      <p id={idPregunta} ref={pregunta} tabIndex={-1} className="confirmar-eliminar__pregunta">
        {ELIMINAR.pregunta(seudonimo)}
      </p>
      <div className="acciones">
        <button type="button" className="boton boton-primario" onClick={confirmar} aria-disabled={eliminando || undefined}>
          <Trash2 aria-hidden="true" />
          {eliminando ? ELIMINAR.eliminando : ELIMINAR.confirmar}
        </button>
        <button type="button" className="boton boton-secundario" onClick={alCancelar}>
          {ELIMINAR.cancelar}
        </button>
      </div>
      <div role="status">{error && <p className="mensaje mensaje--error">{error}</p>}</div>
    </div>
  );
}

/** Formulario «Eliminar una sesión» de la lista; `alEliminar()` vuelve a pedir la lista. */
export function EliminarPorSeudonimo({ alEliminar }) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(null);
  const [aConfirmar, setAConfirmar] = useState(null);
  const [aviso, setAviso] = useState('');
  const botonEliminar = useRef(null);

  function alEnviar(evento) {
    evento.preventDefault();
    setAviso('');
    const seudonimo = normalizarSeudonimo(texto);
    if (!seudonimo) {
      setError(ELIMINAR.invalido);
      document.getElementById(`${id}-seudonimo`)?.focus();
      return;
    }
    setError(null);
    setAConfirmar(seudonimo);
  }

  function cancelar() {
    setAConfirmar(null);
    requestAnimationFrame(() => botonEliminar.current?.focus());
  }

  function alTerminar(resultado, mensaje) {
    setAConfirmar(null);
    setAviso(mensaje);
    if (resultado === 'eliminada') {
      setTexto('');
      alEliminar();
    }
    requestAnimationFrame(() => document.getElementById(`${id}-seudonimo`)?.focus());
  }

  return (
    <section className="tarjeta-admin eliminar-sesion" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="tarjeta-admin__titulo">{ELIMINAR.titulo}</h2>
      <p>{ELIMINAR.descripcion}</p>
      <form className="formulario" onSubmit={alEnviar} noValidate>
        <Campo id={`${id}-seudonimo`} etiqueta={ELIMINAR.campo} pista={ELIMINAR.pista} error={error}>
          {(props) => (
            <input
              {...props}
              className="campo__control campo__control--corto seudonimo-campo"
              name="seudonimo"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={texto}
              onChange={(evento) => {
                setTexto(evento.target.value);
                setAConfirmar(null);
              }}
            />
          )}
        </Campo>
        {!aConfirmar && (
          <button ref={botonEliminar} type="submit" className="boton boton-secundario">
            <Trash2 aria-hidden="true" />
            {ELIMINAR.buscar}
          </button>
        )}
      </form>
      {aConfirmar && <ConfirmarEliminacion seudonimo={aConfirmar} alCancelar={cancelar} alTerminar={alTerminar} />}
      <p role="status">{aviso}</p>
    </section>
  );
}
