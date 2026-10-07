/**
 * Fuentes de un contenido en el editor (M-08, RF-10, RCN-01; RA-03, RA-11).
 * Una fila por fuente, con su texto y su enlace opcional, y botones para
 * agregar y quitar. Al agregar, el foco pasa al texto de la nueva fuente; al
 * quitar, al botón «Agregar fuente».
 *
 * Los mensajes del servidor llegan para el grupo (`fuentes`: «Para publicar
 * hace falta al menos una fuente») o para una fila (`fuentes.0.url`).
 */
import { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Campo, { MensajeError } from '../componentes/Campo.jsx';

let ultimaClave = 0;
/** Fila vacía con una clave estable para React y para los id de sus campos. */
export const filaVacia = (texto = '', url = '') => ({ clave: (ultimaClave += 1), texto, url });

export const ID_FUENTES = 'editor-fuentes';
export const ID_AGREGAR_FUENTE = 'editor-fuentes-agregar';
export const idTextoFuente = (clave) => `editor-fuente-${clave}-texto`;
export const idEnlaceFuente = (clave) => `editor-fuente-${clave}-url`;

export default function EditorFuentes({ filas, alCambiar, error, erroresFilas = {} }) {
  const botonAgregar = useRef(null);
  const enfocar = useRef(null);

  useEffect(() => {
    if (enfocar.current === null) return;
    const destino = enfocar.current === 'agregar' ? botonAgregar.current : document.getElementById(enfocar.current);
    enfocar.current = null;
    destino?.focus();
  }, [filas]);

  function agregar() {
    const nueva = filaVacia();
    enfocar.current = idTextoFuente(nueva.clave);
    alCambiar([...filas, nueva]);
  }

  function quitar(clave) {
    enfocar.current = 'agregar';
    alCambiar(filas.filter((fila) => fila.clave !== clave));
  }

  const cambiar = (clave, campo, valor) =>
    alCambiar(filas.map((fila) => (fila.clave === clave ? { ...fila, [campo]: valor } : fila)));

  return (
    <fieldset
      id={ID_FUENTES}
      className={`campo campo-fuentes${error ? ' campo--con-error' : ''}`}
      aria-describedby={[`${ID_FUENTES}-pista`, error && `${ID_FUENTES}-error`].filter(Boolean).join(' ')}
    >
      <legend className="campo__etiqueta">
        Fuentes <span className="campo__indicacion">(obligatorias para publicar)</span>
      </legend>
      <p id={`${ID_FUENTES}-pista`} className="campo__pista">
        Las fuentes oficiales o científicas que respaldan el texto. El enlace es opcional: un libro o una ley
        impresa pueden no tenerlo.
      </p>
      <MensajeError id={`${ID_FUENTES}-error`}>{error}</MensajeError>

      {filas.length > 0 && (
        <ol className="fuentes-editor">
          {filas.map((fila, indice) => {
            const errores = erroresFilas[fila.clave] ?? {};
            return (
              <li key={fila.clave} className="fuente-fila">
                <fieldset className="fuente-fila__grupo">
                  <legend className="fuente-fila__nombre">Fuente {indice + 1}</legend>
                  <Campo id={idTextoFuente(fila.clave)} etiqueta="Texto de la fuente" error={errores.texto}>
                    {(props) => (
                      <textarea
                        {...props}
                        className="campo__control"
                        rows={2}
                        value={fila.texto}
                        onChange={(e) => cambiar(fila.clave, 'texto', e.target.value)}
                      />
                    )}
                  </Campo>
                  <Campo
                    id={idEnlaceFuente(fila.clave)}
                    etiqueta="Enlace"
                    indicacion="(opcional, empieza por https://)"
                    error={errores.url}
                  >
                    {(props) => (
                      <input
                        {...props}
                        className="campo__control"
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={fila.url}
                        onChange={(e) => cambiar(fila.clave, 'url', e.target.value)}
                      />
                    )}
                  </Campo>
                  <button type="button" className="boton boton-secundario" onClick={() => quitar(fila.clave)}>
                    <Trash2 aria-hidden="true" />
                    Quitar la fuente {indice + 1}
                  </button>
                </fieldset>
              </li>
            );
          })}
        </ol>
      )}

      <button
        ref={botonAgregar}
        id={ID_AGREGAR_FUENTE}
        type="button"
        className="boton boton-secundario"
        onClick={agregar}
      >
        <Plus aria-hidden="true" />
        Agregar fuente
      </button>
    </fieldset>
  );
}
