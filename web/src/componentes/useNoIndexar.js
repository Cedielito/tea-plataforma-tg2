/**
 * Mientras la página está montada, pide a los buscadores que no la indexen
 * (además del encabezado X-Robots-Tag de web/vercel.json). Lo usan el panel
 * (/admin, M-08) y la prueba del registro conductual (/registro, M-09).
 */
import { useEffect } from 'react';

export default function useNoIndexar() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
