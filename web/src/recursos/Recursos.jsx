/**
 * Recursos en /recursos (M-05; RF-06, HU-09, RCN-01, RCN-02; RA-01 a RA-11):
 * documentos y páginas oficiales para leer o descargar, cada uno en su
 * tarjeta (TarjetaRecurso.jsx), en el orden en que se publicaron.
 *
 * Hoy todos los recursos son para familias y docentes, así que no hay filtro
 * por perfil: cada tarjeta dice para quién es.
 */
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import TarjetaRecurso from './TarjetaRecurso.jsx';
import { RUTA_RECURSOS } from './enlaceRecurso.js';

export default function Recursos({ seccion }) {
  const { titulo } = seccion;
  useTituloPagina(titulo);
  const { estado, datos, reintentar } = useDatos(RUTA_RECURSOS);
  const listo = estado === ESTADOS.LISTO && datos.length > 0;

  return (
    <div className="contenedor pagina recursos">
      <MigasDePan actual={titulo} />
      <h1>{titulo}</h1>
      <p className="pagina__descripcion">
        Guías, normas y documentos oficiales para leer o descargar. Cada recurso dice para quién es y quién lo
        publica. Los enlaces llevan al sitio oficial de cada entidad.
      </p>

      {listo ? (
        // role="list": algunos lectores de pantalla quitan la lista si no tiene viñetas visibles
        <ul className="lista-recursos" role="list">
          {datos.map((recurso) => (
            <TarjetaRecurso key={recurso.slug} recurso={recurso} />
          ))}
        </ul>
      ) : (
        <EstadoDatos
          estado={estado === ESTADOS.LISTO ? ESTADOS.NO_ENCONTRADO : estado}
          reintentar={reintentar}
          queCarga="los recursos"
          sinContenido="Todavía no hay recursos publicados."
        />
      )}
    </div>
  );
}
