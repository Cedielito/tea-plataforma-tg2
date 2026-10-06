/**
 * Encabezado común (M-01; RA-01 a RA-11): barra de accesibilidad
 * (M-07), logo textual, navegación principal y buscador. En pantallas pequeñas la
 * navegación se despliega con un botón «Menú» (aria-expanded; Escape lo cierra).
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import BarraAccesibilidad from '../accesibilidad/BarraAccesibilidad.jsx';
import Buscador from './Buscador.jsx';
import { SECCIONES } from '../secciones.js';

export default function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenu = useRef(null);
  const idMenu = useId();
  const { pathname } = useLocation();

  // Al navegar se cierra el menú.
  useEffect(() => setMenuAbierto(false), [pathname]);

  function alPresionarTecla(evento) {
    if (evento.key === 'Escape' && menuAbierto) {
      setMenuAbierto(false);
      botonMenu.current?.focus();
    }
  }

  return (
    <header className="encabezado" onKeyDown={alPresionarTecla}>
      <BarraAccesibilidad />

      <div className="contenedor encabezado__principal">
        <Link to="/" className="logo">
          <span className="logo__marca" aria-hidden="true" />
          <span className="logo__textos">
            <span className="logo__nombre">Plataforma TEA</span>
            <span className="logo__lema">Información y orientación</span>
          </span>
        </Link>

        <button
          ref={botonMenu}
          type="button"
          className="boton-menu"
          aria-expanded={menuAbierto}
          aria-controls={idMenu}
          onClick={() => setMenuAbierto((valor) => !valor)}
        >
          {menuAbierto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          Menú
        </button>

        <div id={idMenu} className={`menu${menuAbierto ? ' esta-abierto' : ''}`}>
          <nav aria-label="Principal">
            <ul className="navegacion">
              {SECCIONES.map(({ ruta, nav }) => (
                <li key={ruta}>
                  <NavLink to={ruta} className="navegacion__enlace">{nav}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Buscador />
        </div>
      </div>
    </header>
  );
}
