/**
 * Directorio de orientación en /directorio (M-04; RF-05, RS-01, RS-07,
 * RCN-01, RCN-02; RA-01 a RA-11).
 *
 * - Descarga una sola vez todo el directorio publicado y filtra en el
 *   navegador (filtroDirectorio.js). Las entidades nacionales aparecen con
 *   cualquier ciudad.
 * - Filtros por ciudad y tipo con dos <select> nativos que aplican al
 *   instante: solo cambia la lista, no la página. Van en la dirección
 *   (?ciudad=bogota&tipo=salud, sin tildes ni mayúsculas) para conservarlos al
 *   volver atrás y poder compartir el enlace; se reemplaza la entrada del
 *   historial, igual que en las señales de alerta.
 * - Un resumen role="status" anuncia cuántas entidades quedan; «Quitar
 *   filtros» devuelve el foco a la primera lista.
 * - Resultados agrupados por lugar (h2) y tarjetas con todos los datos a la
 *   vista (TarjetaEntidad.jsx), sin página de detalle.
 * - Notas: solo datos institucionales públicos (RS-07) y qué ciudades tienen
 *   entidades locales.
 */
import { useId, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import { CIUDADES, CIUDADES_LOCALES, NACIONAL, TIPOS_ENTIDAD, etiquetaDe } from '../catalogos.js';
import TarjetaEntidad from './TarjetaEntidad.jsx';
import {
  NOTA_COBERTURA,
  RUTA_DIRECTORIO,
  agruparPorCiudad,
  filtrarEntidades,
  leerFiltros,
  parametrosDeFiltros,
  resumirResultados
} from './filtroDirectorio.js';

const tituloGrupo = (ciudad) =>
  ciudad === NACIONAL ? 'Entidades de todo el país' : `Entidades de ${etiquetaDe(CIUDADES, ciudad)}`;

function GrupoEntidades({ ciudad, entidades }) {
  const idTitulo = useId();
  return (
    <section className="grupo-entidades" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{tituloGrupo(ciudad)}</h2>
      {/* role="list": algunos lectores de pantalla quitan la lista si no tiene viñetas visibles */}
      <ul className="entidades" role="list">
        {entidades.map((entidad) => (
          <TarjetaEntidad key={entidad.slug} entidad={entidad} />
        ))}
      </ul>
    </section>
  );
}

export default function Directorio({ seccion }) {
  const { titulo } = seccion;
  useTituloPagina(titulo);
  const idFiltros = useId();
  const idCiudad = useId();
  const idTipo = useId();
  const listaCiudad = useRef(null);
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const hayFiltros = Boolean(filtros.ciudad || filtros.tipo);

  const { estado, datos, reintentar } = useDatos(RUTA_DIRECTORIO);
  const listo = estado === ESTADOS.LISTO && datos.length > 0;
  const grupos = listo ? agruparPorCiudad(filtrarEntidades(datos, filtros), filtros.ciudad) : [];

  function filtrar(cambios) {
    setParametros(parametrosDeFiltros({ ...filtros, ...cambios }), { replace: true, preventScrollReset: true });
  }

  function quitarFiltros() {
    filtrar({ ciudad: null, tipo: null });
    listaCiudad.current?.focus();
  }

  return (
    <div className="contenedor pagina directorio">
      <MigasDePan actual={titulo} />
      <h1>Directorio de orientación</h1>
      <p className="pagina__descripcion">
        Entidades públicas que orientan a familias y docentes sobre salud, educación y derechos de niñas, niños y
        adolescentes. Antes de ir, confirma el horario por teléfono o en su sitio web.
      </p>
      <div role="note" className="nota-directorio">
        <ShieldCheck aria-hidden="true" />
        <p>
          Solo publicamos datos de contacto institucionales y públicos. Cada entidad dice el día en que verificamos sus
          datos en su fuente oficial.
        </p>
      </div>

      <form className="filtros" aria-labelledby={idFiltros} noValidate onSubmit={(evento) => evento.preventDefault()}>
        <h2 id={idFiltros} className="filtros__titulo">
          Filtrar el directorio
        </h2>
        <div className="filtros__campos">
          <div className="filtro">
            <label htmlFor={idCiudad} className="filtro__etiqueta">
              Ciudad
            </label>
            <select
              ref={listaCiudad}
              id={idCiudad}
              className="selector"
              value={filtros.ciudad ?? ''}
              onChange={(evento) => filtrar({ ciudad: evento.target.value || null })}
            >
              <option value="">Todas las ciudades</option>
              {CIUDADES_LOCALES.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro">
            <label htmlFor={idTipo} className="filtro__etiqueta">
              Tipo de entidad
            </label>
            <select
              id={idTipo}
              className="selector"
              value={filtros.tipo ?? ''}
              onChange={(evento) => filtrar({ tipo: evento.target.value || null })}
            >
              <option value="">Todos los tipos</option>
              {TIPOS_ENTIDAD.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          {hayFiltros && (
            <button type="button" className="boton boton-secundario filtros__quitar" onClick={quitarFiltros}>
              <X aria-hidden="true" />
              Quitar filtros
            </button>
          )}
        </div>
        <p className="filtros__nota">{NOTA_COBERTURA}</p>
      </form>

      {/* Siempre presente para que el lector de pantalla anuncie cada cambio de filtro */}
      <p role="status" className="directorio__resumen">
        {listo ? resumirResultados(grupos) : ''}
      </p>

      {listo ? (
        <>
          {grupos.length === 0 && (
            <p className="directorio__vacio">Prueba con otro tipo de entidad o elige «Todas las ciudades».</p>
          )}
          {grupos.map(({ ciudad, entidades }) => (
            <GrupoEntidades key={ciudad} ciudad={ciudad} entidades={entidades} />
          ))}
        </>
      ) : (
        <EstadoDatos
          estado={estado === ESTADOS.LISTO ? ESTADOS.NO_ENCONTRADO : estado}
          reintentar={reintentar}
          queCarga="el directorio"
          sinContenido="El directorio todavía no tiene entidades publicadas."
          reservarAlto
        />
      )}
    </div>
  );
}
