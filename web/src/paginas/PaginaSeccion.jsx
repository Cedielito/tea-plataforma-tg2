/**
 * Página provisional de una sección (M-01 a M-06). Muestra las migas de pan, el
 * título, una línea descriptiva y, donde corresponde, el aviso de no diagnóstico
 * (RCN-03). Hoy la usan privacidad y «Acerca de», cuyo contenido llega en T8.
 */
import AvisoNoDiagnostico from '../componentes/AvisoNoDiagnostico.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';

export default function PaginaSeccion({ titulo, descripcion, avisoNoDiagnostico = false }) {
  useTituloPagina(titulo);

  return (
    <div className="contenedor pagina">
      <MigasDePan actual={titulo} />
      <h1>{titulo}</h1>
      <p className="pagina__descripcion">{descripcion}</p>
      {avisoNoDiagnostico && <AvisoNoDiagnostico className="pagina__aviso" />}
      <p className="pagina__pendiente secundario">Contenido en preparación.</p>
    </div>
  );
}
