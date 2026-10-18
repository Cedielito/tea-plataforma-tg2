/**
 * Zona del profesional del registro conductual en /registro (M-09, HU-16,
 * HU-18, HU-19, RS-05; RA-03, RA-11). Usa la sesión del panel (T4): la misma
 * cookie, los mismos vencimientos y el mismo formulario de inicio de sesión,
 * con una cuenta de rol «profesional». Sin registro público: la cuenta se
 * crea al desplegar (docs/despliegue.md).
 *
 * - Sin sesión: el inicio de sesión. Con una cuenta de administrador: un
 *   aviso para cerrar la sesión (la API también le responde 403).
 * - Con sesión: una navegación corta (Sesiones, Nueva sesión, Cerrar sesión)
 *   y la página. Con la sesión vencida, la página sigue montada y muestra el
 *   formulario para volver a entrar (SesionVencida.jsx).
 * - Va dentro del layout de M-09, que no nombra la plataforma: el del panel
 *   sí lo hace, y M-09 no puede tener ese vocabulario.
 * - `alEntregar` pasa a las páginas (useOutletContext): al entregar el
 *   dispositivo, esta zona se desmonta y la aplicación sabe que viene de la
 *   entrega (PaginaAplicacion.jsx).
 *
 * Reutiliza los estilos del panel (tarjetas, confirmación, sesión vencida).
 */
import { useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import '../estilos/admin.css';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useFocoAlNavegar from '../componentes/useFocoAlNavegar.js';
import { ESTADOS } from '../api/useDatos.js';
import FormularioAcceso from '../admin/FormularioAcceso.jsx';
import { ProveedorSesion, ROLES, SESION, useSesion } from '../admin/ContextoSesion.jsx';
import { ZONA } from './textosProfesional.js';

function AccesoProfesional() {
  const { cerrada } = useSesion();
  const confirmacion = useRef(null);
  useEffect(() => {
    if (cerrada) confirmacion.current?.focus();
  }, [cerrada]);
  return (
    <div className="contenedor pagina pagina-acceso registro-profesional">
      <h1>{ZONA.accesoTitulo}</h1>
      {cerrada && (
        <p ref={confirmacion} tabIndex={-1} className="mensaje mensaje--exito">
          {ZONA.cerrada}
        </p>
      )}
      <p className="pagina__descripcion">{ZONA.accesoDescripcion}</p>
      <FormularioAcceso />
    </div>
  );
}

function BotonCerrarSesion() {
  const { cerrarSesion } = useSesion();
  return (
    <button type="button" className="boton boton-secundario" onClick={cerrarSesion}>
      <LogOut aria-hidden="true" />
      {ZONA.cerrarSesion}
    </button>
  );
}

function SinAcceso() {
  return (
    <div className="contenedor pagina registro-profesional">
      <h1>{ZONA.sinAccesoTitulo}</h1>
      <p className="pagina__descripcion">{ZONA.sinAcceso}</p>
      <BotonCerrarSesion />
    </div>
  );
}

function Zona({ alEntregar }) {
  const { estado, usuario, rol, reintentar } = useSesion();
  const contenido = useRef(null);
  useFocoAlNavegar(contenido);

  if (estado === SESION.SIN_SESION) return <AccesoProfesional />;
  if (estado === SESION.COMPROBANDO || estado === SESION.ERROR) {
    return (
      <div className="contenedor pagina registro-profesional">
        <h1>{ZONA.tituloPagina}</h1>
        <EstadoDatos
          estado={estado === SESION.ERROR ? ESTADOS.ERROR : ESTADOS.CARGANDO}
          reintentar={reintentar}
          queCarga={ZONA.comprobando}
        />
      </div>
    );
  }
  if (rol !== ROLES.PROFESIONAL) return <SinAcceso />;

  return (
    <div ref={contenido}>
      <div className="contenedor navegacion-registro">
        <nav aria-label={ZONA.navegacion}>
          <ul className="navegacion-registro__lista">
            <li>
              <NavLink to="/registro" end className="navegacion__enlace">{ZONA.sesiones}</NavLink>
            </li>
            <li>
              <NavLink to="/registro/nueva" className="navegacion__enlace">{ZONA.nueva}</NavLink>
            </li>
          </ul>
        </nav>
        <div className="sesion-admin">
          <p className="sesion-admin__usuario">
            {ZONA.sesionDe} <strong>{usuario}</strong>
          </p>
          <BotonCerrarSesion />
        </div>
      </div>
      <Outlet context={{ alEntregar }} />
    </div>
  );
}

export default function ZonaProfesional({ alEntregar }) {
  return (
    <ProveedorSesion>
      <Zona alEntregar={alEntregar} />
    </ProveedorSesion>
  );
}
