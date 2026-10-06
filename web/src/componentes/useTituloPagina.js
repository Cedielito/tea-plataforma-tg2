/**
 * Título del documento por página (RA-01 a RA-11: cada página tiene un título que la describe).
 */
import { useEffect } from 'react';

const NOMBRE_SITIO = 'Plataforma TEA';

export default function useTituloPagina(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} – ${NOMBRE_SITIO}` : `${NOMBRE_SITIO} – Información y orientación`;
  }, [titulo]);
}
