/**
 * /registro: sesiones del profesional (M-09, HU-18, HU-19, CT-11; RA-01 a
 * RA-11). Cada sesión se identifica solo por su seudónimo, con la fecha de
 * creación (hora de Colombia), su estado y si se respondió el SUS. La lista
 * no trae valores: están en el detalle de cada sesión completa.
 *
 * Abajo, la descarga de los dos CSV y la eliminación por seudónimo. La tabla
 * se desplaza dentro de su recuadro en pantallas angostas, sin mover la
 * página.
 */
import { Link, useLocation } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import SesionVencida from '../admin/SesionVencida.jsx';
import useDatosAdmin from '../admin/useDatosAdmin.js';
import { SESION, useSesion } from '../admin/ContextoSesion.jsx';
import { ESTADOS } from '../api/useDatos.js';
import { fechaColombia } from '../utilidades/formato.js';
import DescargasCsv from './DescargasCsv.jsx';
import { EliminarPorSeudonimo } from './EliminarSesion.jsx';
import { etiquetaEstado } from './formatoValores.js';
import { RUTA_API_SESIONES, rutaSesionWeb } from './rutasProfesional.js';
import { LISTA } from './textosProfesional.js';

function TablaSesiones({ sesiones }) {
  const { columnas } = LISTA;
  return (
    <div className="tabla-registro" role="region" aria-labelledby="titulo-sesiones" tabIndex={0}>
      <table>
        <caption id="titulo-sesiones" className="solo-lector">{LISTA.titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{columnas.seudonimo}</th>
            <th scope="col">{columnas.creada}</th>
            <th scope="col">{columnas.estado}</th>
            <th scope="col">{columnas.sus}</th>
            <th scope="col">{columnas.ver}</th>
          </tr>
        </thead>
        <tbody>
          {sesiones.map((sesion) => {
            const creada = fechaColombia(sesion.creadaEn);
            return (
              <tr key={sesion.seudonimo}>
                <th scope="row" className="seudonimo-celda">{sesion.seudonimo}</th>
                <td>{creada && <time dateTime={creada.iso}>{creada.texto}</time>}</td>
                <td>{etiquetaEstado(sesion.estado)}</td>
                <td>{sesion.susRespondido ? LISTA.susRespondido : LISTA.susPendiente}</td>
                <td>
                  <Link to={rutaSesionWeb(sesion.seudonimo)}>
                    {LISTA.ver}
                    <span className="solo-lector"> {sesion.seudonimo}</span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ListaSesiones() {
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin(RUTA_API_SESIONES);
  const { state } = useLocation();
  const listo = estado === ESTADOS.LISTO;

  return (
    <div className="contenedor pagina registro-profesional">
      <h1>{LISTA.titulo}</h1>
      <SesionVencida />
      <p className="pagina__descripcion">{LISTA.descripcion}</p>
      <p role="status">{state?.aviso ?? ''}</p>
      <p>
        <Link to="/registro/nueva" className="boton boton-primario">
          <FilePlus2 aria-hidden="true" />
          {LISTA.nueva}
        </Link>
      </p>

      {listo && datos.length === 0 && <p>{LISTA.vacia}</p>}
      {listo && datos.length > 0 && <TablaSesiones sesiones={datos} />}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga={LISTA.queCarga} />
      )}

      <DescargasCsv />
      <EliminarPorSeudonimo alEliminar={reintentar} />
    </div>
  );
}
