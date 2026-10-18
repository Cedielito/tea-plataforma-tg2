/**
 * Página no encontrada (M-01).
 */
import { Link } from 'react-router-dom';
import useTituloPagina from '../componentes/useTituloPagina.js';

export default function NoEncontrada() {
  useTituloPagina('Página no encontrada');

  return (
    <div className="contenedor pagina">
      <h1>Página no encontrada</h1>
      <p className="pagina__descripcion">La dirección que escribiste no existe en este sitio.</p>
      <p><Link to="/" className="enlace-suelto">Volver al inicio</Link></p>
    </div>
  );
}
