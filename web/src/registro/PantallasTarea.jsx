/**
 * Pantallas de texto de las tareas de M-09 (HU-17, CT-08), compartidas por
 * la de cambio de regla y la de Navon: una pantalla con título y botón, y la
 * pausa entre bloques, sin límite de tiempo, con la opción de volver a leer
 * las instrucciones.
 */
import { useEffect, useRef, useState } from 'react';
import { PAUSA } from './textos.js';

/**
 * Pantalla de texto con un título que recibe el foco al aparecer, para que se
 * anuncie. Cada pantalla lleva su `key`: dos seguidas no comparten el foco.
 */
export function Pantalla({ titulo, parrafos = [], boton, alContinuar, children }) {
  const encabezado = useRef(null);
  useEffect(() => {
    encabezado.current?.focus();
  }, []);
  return (
    <section className="tarea__pantalla">
      <h2 ref={encabezado} tabIndex={-1}>{titulo}</h2>
      {parrafos.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {children}
      <button type="button" className="boton boton-primario tarea__continuar" onClick={alContinuar}>
        {boton}
      </button>
    </section>
  );
}

/**
 * Pausa entre bloques (CT-08), con la opción de volver a leer las
 * instrucciones. `instrucciones`: los párrafos que se muestran de nuevo.
 */
export function Pausa({ titulo, parrafos, instrucciones, alVerInstrucciones, alContinuar }) {
  const [verInstrucciones, setVerInstrucciones] = useState(false);
  function alternar() {
    if (!verInstrucciones) alVerInstrucciones();
    setVerInstrucciones((v) => !v);
  }
  return (
    <Pantalla titulo={titulo} parrafos={[...parrafos, PAUSA.parrafo]} boton={PAUSA.boton} alContinuar={alContinuar}>
      <button type="button" className="boton boton-secundario" aria-expanded={verInstrucciones} onClick={alternar}>
        {verInstrucciones ? PAUSA.ocultarInstrucciones : PAUSA.verInstrucciones}
      </button>
      {verInstrucciones && (
        <div className="tarea__instrucciones">
          {instrucciones.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
    </Pantalla>
  );
}
