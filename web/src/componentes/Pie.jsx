/**
 * Pie común (M-01, RCN-03): aviso de no diagnóstico, enlaces a privacidad y
 * «Acerca de» y la línea del trabajo de grado.
 */
import { Link } from 'react-router-dom';
import AvisoNoDiagnostico from './AvisoNoDiagnostico.jsx';
import { PAGINAS_PIE } from '../secciones.js';

export default function Pie() {
  return (
    <footer className="pie">
      <div className="contenedor pie__interior">
        <AvisoNoDiagnostico />
        <nav aria-label="Información del sitio">
          <ul className="pie__enlaces">
            {PAGINAS_PIE.map(({ ruta, titulo }) => (
              <li key={ruta}><Link to={ruta}>{titulo}</Link></li>
            ))}
          </ul>
        </nav>
        <p className="pie__credito">
          Trabajo de grado · Ingeniería de Sistemas y Computación · Universidad Católica de
          Colombia · 2026
        </p>
      </div>
    </footer>
  );
}
