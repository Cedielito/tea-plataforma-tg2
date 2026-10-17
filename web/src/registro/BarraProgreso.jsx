/**
 * Barra de progreso por bloques de la tarea (M-09, HU-17).
 *
 * Principio neuroeducativo: saber cuánto falta reduce la incertidumbre y la
 * carga cognitiva, y da sensación de avance, lo que sostiene la atención en
 * tareas largas. Avanza solo al terminar cada parte (nunca por ensayo ni por
 * tiempo), no cuenta aciertos y no se anima (CT-03).
 */
import { PROGRESO } from './textos.js';

/**
 * @param {{parte: number|null, total: number, completadas: number}} props
 *   parte: la parte en curso (1 a total), o null durante la práctica
 */
export default function BarraProgreso({ parte, total, completadas }) {
  const texto = parte === null ? PROGRESO.practica : PROGRESO.parte(parte, total);
  return (
    <div className="progreso-tarea">
      <p className="progreso-tarea__texto" id="progreso-tarea">
        {PROGRESO.etiqueta}: {texto}
      </p>
      <progress className="progreso-tarea__barra" max={total} value={completadas} aria-labelledby="progreso-tarea" />
    </div>
  );
}
