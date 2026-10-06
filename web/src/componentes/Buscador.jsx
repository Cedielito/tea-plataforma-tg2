/**
 * Caja del buscador (M-01, RF-02). Lleva a /buscar?q=..., donde se muestran
 * los resultados. Se usa en el encabezado (etiqueta oculta) y en la página de
 * resultados (etiqueta visible). Busca solo al enviar, no con cada tecla.
 */
import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Buscador({
  nombre = 'Buscar en el sitio',
  etiqueta = 'Buscar en el sitio',
  etiquetaVisible = false,
  valorInicial = '',
  className = '',
  limpiarAlBuscar = false,
  alBuscar
}) {
  const idCampo = useId();
  const navegar = useNavigate();

  function alEnviar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const consulta = new FormData(formulario).get('q')?.toString().trim() ?? '';
    navegar(consulta ? `/buscar?q=${encodeURIComponent(consulta)}` : '/buscar');
    // La caja del encabezado queda vacía: la consulta sigue visible en la página de resultados.
    if (limpiarAlBuscar) formulario.reset();
    alBuscar?.();
  }

  return (
    <form role="search" aria-label={nombre} className={`buscador ${className}`.trim()} onSubmit={alEnviar}>
      <label htmlFor={idCampo} className={etiquetaVisible ? 'buscador__etiqueta' : 'solo-lector'}>
        {etiqueta}
      </label>
      <div className="buscador__fila">
        <input
          id={idCampo}
          type="search"
          name="q"
          className="buscador__campo"
          placeholder={etiquetaVisible ? undefined : 'Buscar en el sitio'}
          defaultValue={valorInicial}
          maxLength={100}
          autoComplete="off"
        />
        <button type="submit" className="buscador__boton">
          <Search aria-hidden="true" />
          <span className="solo-lector">Buscar</span>
        </button>
      </div>
    </form>
  );
}
