/**
 * Caja del buscador (M-01). En T1 solo es la caja; la búsqueda llega en T3 (RF-03).
 */
import { useId } from 'react';
import { Search } from 'lucide-react';

export default function Buscador() {
  const idCampo = useId();

  return (
    <form role="search" className="buscador" onSubmit={(evento) => evento.preventDefault()}>
      <label htmlFor={idCampo} className="solo-lector">Buscar en el sitio</label>
      <input
        id={idCampo}
        type="search"
        name="q"
        className="buscador__campo"
        placeholder="Buscar en el sitio"
        autoComplete="off"
      />
      <button type="submit" className="buscador__boton">
        <Search aria-hidden="true" />
        <span className="solo-lector">Buscar</span>
      </button>
    </form>
  );
}
