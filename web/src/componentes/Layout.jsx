/**
 * Layout común (M-01; RA-01 a RA-11): enlace «Saltar al contenido»,
 * encabezado, <main> y pie. Al navegar entre rutas (no en la primera carga)
 * mueve el foco al <h1> de la nueva página para que el lector de pantalla la anuncie.
 */
import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Encabezado from './Encabezado.jsx';
import Pie from './Pie.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  const rutaAnterior = useRef(pathname);
  const principal = useRef(null);

  useEffect(() => {
    if (rutaAnterior.current === pathname) return;
    rutaAnterior.current = pathname;
    window.scrollTo(0, 0);
    const titulo = principal.current?.querySelector('h1');
    if (titulo) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus();
    }
  }, [pathname]);

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <Encabezado />
      <main id="contenido" ref={principal} tabIndex={-1}>
        <Outlet />
      </main>
      <Pie />
    </>
  );
}
