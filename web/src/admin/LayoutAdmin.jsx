/**
 * Layout del panel de administración (M-08, RF-09; RA-01 a RA-11). Separado
 * del layout público: sin la navegación del sitio, sin buscador y sin enlace
 * desde la zona pública.
 *
 * - «Saltar al contenido», barra de accesibilidad (RA-07) y foco en el h1 al
 *   cambiar de página, igual que en la zona pública.
 * - noindex: mientras se está en /admin, la página pide a los buscadores que
 *   no la indexen (además del encabezado X-Robots-Tag de web/vercel.json).
 * - Sin sesión muestra el inicio de sesión; con la sesión vencida deja la
 *   página montada para no perder lo escrito (SesionVencida.jsx).
 */
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BarraAccesibilidad from '../accesibilidad/BarraAccesibilidad.jsx';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useFocoAlNavegar from '../componentes/useFocoAlNavegar.js';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import InicioSesion from './InicioSesion.jsx';
import { SESION, useSesion } from './ContextoSesion.jsx';

function useNoIndexar() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

function ComprobandoSesion() {
  const { estado, reintentar } = useSesion();
  useTituloPagina('Panel de administración');
  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Panel de administración</h1>
      <EstadoDatos
        estado={estado === SESION.ERROR ? ESTADOS.ERROR : ESTADOS.CARGANDO}
        reintentar={reintentar}
        queCarga="el panel"
      />
    </div>
  );
}

export default function LayoutAdmin() {
  const { estado, usuario, cerrarSesion } = useSesion();
  const principal = useRef(null);
  useNoIndexar();
  useFocoAlNavegar(principal);
  const conSesion = estado === SESION.ACTIVA || estado === SESION.VENCIDA;

  let pagina = <ComprobandoSesion />;
  if (conSesion) pagina = <Outlet />;
  if (estado === SESION.SIN_SESION) pagina = <InicioSesion />;

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <header className="encabezado">
        <BarraAccesibilidad />
        <div className="contenedor encabezado-admin">
          <Link to="/admin" className="logo">
            <span className="logo__marca" aria-hidden="true" />
            <span className="logo__textos">
              <span className="logo__nombre">Plataforma TEA</span>
              <span className="logo__lema">Panel de administración</span>
            </span>
          </Link>

          {conSesion && (
            <nav aria-label="Panel" className="navegacion-admin">
              <ul className="navegacion-admin__lista">
                <li>
                  <NavLink to="/admin" end className="navegacion__enlace">Contenidos</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/ruta" className="navegacion__enlace">Pasos de la ruta</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/directorio" className="navegacion__enlace">Directorio</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/preguntas" className="navegacion__enlace">Preguntas frecuentes</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/recursos" className="navegacion__enlace">Recursos</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/mensajes" className="navegacion__enlace">Mensajes</NavLink>
                </li>
                <li>
                  <Link to="/" className="navegacion__enlace">Ir al sitio público</Link>
                </li>
              </ul>
            </nav>
          )}

          {conSesion && (
            <div className="sesion-admin">
              <p className="sesion-admin__usuario">
                Sesión de <strong>{usuario}</strong>
              </p>
              <button type="button" className="boton boton-secundario" onClick={cerrarSesion}>
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>
      <main id="contenido" ref={principal} tabIndex={-1}>
        {pagina}
      </main>
    </>
  );
}
