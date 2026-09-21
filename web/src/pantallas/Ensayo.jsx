import { useEffect, useRef, useState } from 'react';

/**
 * M-04. Pantalla comun a los tres minijuegos (CP-10).
 * CT-03: el tiempo de reaccion se mide en segundo plano y nunca se muestra.
 * CT-07: resolucion de milisegundos mediante performance.now().
 * CP-05: la retroalimentacion es contingente y de tono neutro.
 */
export default function Ensayo({ ensayo, practica, onResponder }) {
  const inicio = useRef(0);
  const [respondido, setRespondido] = useState(false);

  useEffect(() => {
    inicio.current = performance.now();
    setRespondido(false);
  }, [ensayo.id]);

  function responder(opcion) {
    if (respondido) return;
    const tiempoReaccionMs = Math.round(performance.now() - inicio.current);
    setRespondido(true);
    // CP-05: la senal se entrega en menos de 500 ms y no indica acierto ni error
    setTimeout(() => onResponder({
      ensayoId: ensayo.id,
      bloque: ensayo.bloque,
      constructo: ensayo.constructo,
      condicion: ensayo.condicion,
      cambioDeRegla: ensayo.cambioDeRegla === true,
      practica,
      respuesta: opcion.id,
      acierto: opcion.id === ensayo.correcta,
      tiempoReaccionMs
    }), 300);
  }

  return (
    <main>
      <progress value={ensayo.orden} max={ensayo.totalEnsayos} aria-label="Avance de la actividad" />
      <figure>
        <img src={ensayo.estimulo} alt={ensayo.descripcionAlternativa} />
        <figcaption>{ensayo.enunciado}</figcaption>
      </figure>
      <div>
        {ensayo.opciones.map((o) => (
          <button key={o.id} onClick={() => responder(o)} disabled={respondido}>
            {o.etiqueta}
          </button>
        ))}
      </div>
      {practica && respondido && <p role="status">Así es como funciona. Sigamos.</p>}
    </main>
  );
}
