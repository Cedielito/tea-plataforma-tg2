/**
 * Migas de pan (Cuadro 14, «Patrón de página»; RA-08, RA-11): muestran dónde
 * está la persona y la llevan de vuelta al inicio. La página actual no es
 * enlace y se marca con aria-current.
 */
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function MigasDePan({ actual }) {
  return (
    <nav aria-label="Migas de pan" className="migas">
      <ol className="migas__lista">
        <li className="migas__elemento">
          <Link to="/">Inicio</Link>
        </li>
        <li className="migas__elemento">
          <ChevronRight aria-hidden="true" />
          <span aria-current="page">{actual}</span>
        </li>
      </ol>
    </nav>
  );
}
