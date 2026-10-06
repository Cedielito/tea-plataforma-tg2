/**
 * Al navegar entre rutas (no en la primera carga) sube al inicio y mueve el
 * foco al <h1> de la nueva página, para que el lector de pantalla la anuncie.
 * RA-03, RA-11. Lo usan el layout público y el del panel (M-08).
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function useFocoAlNavegar(principal) {
  const { pathname } = useLocation();
  const rutaAnterior = useRef(pathname);

  useEffect(() => {
    if (rutaAnterior.current === pathname) return;
    rutaAnterior.current = pathname;
    window.scrollTo(0, 0);
    const titulo = principal.current?.querySelector('h1');
    if (titulo) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus();
    }
  }, [pathname, principal]);
}
