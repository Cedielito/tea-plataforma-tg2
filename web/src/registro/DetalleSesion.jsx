/**
 * /registro/sesiones/:seudonimo: una sesión del profesional (M-09, HU-16,
 * HU-18, HU-19, RF-15, CT-13; RA-01 a RA-11).
 *
 * - Datos de la sesión: fecha, estado, versión del formato de consentimiento,
 *   versión del catálogo, reloj, navegador, tareas recibidas y valor SUS. Nada
 *   que identifique a la persona.
 * - Si todavía no empezó, «Entregar el dispositivo».
 * - Los valores observados por tarea, si está completa (ValoresSesion.jsx).
 * - «Eliminar esta sesión», con confirmación; al eliminarla vuelve a la lista
 *   con el aviso.
 */
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import SesionVencida from '../admin/SesionVencida.jsx';
import useDatosAdmin from '../admin/useDatosAdmin.js';
import { SESION, useSesion } from '../admin/ContextoSesion.jsx';
import { ESTADOS } from '../api/useDatos.js';
import { fechaColombia, unirConY } from '../utilidades/formato.js';
import EntregarDispositivo from './EntregarDispositivo.jsx';
import { ConfirmarEliminacion } from './EliminarSesion.jsx';
import ValoresSesion from './ValoresSesion.jsx';
import { etiquetaEstado, valorSus } from './formatoValores.js';
import { RUTA_API_SESIONES } from './rutasProfesional.js';
import { DETALLE, ELIMINAR, NUEVA, TAREAS_RECIBIDAS } from './textosProfesional.js';

function DatosSesion({ sesion }) {
  const creada = fechaColombia(sesion.creadaEn);
  const tareas = sesion.tareasRecibidas.map((t) => TAREAS_RECIBIDAS[t] || t);
  const filas = [
    [DETALLE.creada, creada && <time dateTime={creada.iso}>{creada.texto}</time>],
    [DETALLE.estado, etiquetaEstado(sesion.estado)],
    [DETALLE.consentimiento, sesion.versionConsentimiento],
    [DETALLE.catalogo, sesion.versionCatalogo],
    [DETALLE.reloj, <code>{sesion.reloj}</code>],
    [DETALLE.navegador, sesion.navegador ?? DETALLE.sinNavegador],
    [DETALLE.tareasRecibidas, tareas.length > 0 ? unirConY(tareas) : DETALLE.ninguna],
    [DETALLE.sus, sesion.valorSUS === null ? DETALLE.susPendiente : valorSus(sesion.valorSUS)]
  ];
  return (
    <section className="tarjeta-admin" aria-labelledby="datos-sesion">
      <h2 id="datos-sesion" className="tarjeta-admin__titulo">{DETALLE.datos}</h2>
      <dl className="datos-sesion">
        {filas.map(([nombre, valor]) => (
          <div key={nombre} className="datos-sesion__fila">
            <dt>{nombre}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function EliminarEstaSesion({ seudonimo }) {
  const [confirmando, setConfirmando] = useState(false);
  const boton = useRef(null);
  const navegar = useNavigate();

  function cancelar() {
    setConfirmando(false);
    requestAnimationFrame(() => boton.current?.focus());
  }

  if (confirmando) {
    return (
      <ConfirmarEliminacion
        seudonimo={seudonimo}
        alCancelar={cancelar}
        alTerminar={(_resultado, aviso) => navegar('/registro', { state: { aviso } })}
      />
    );
  }
  return (
    <p>
      <button ref={boton} type="button" className="boton boton-secundario" onClick={() => setConfirmando(true)}>
        <Trash2 aria-hidden="true" />
        {ELIMINAR.botonDetalle}
      </button>
    </p>
  );
}

export default function DetalleSesion() {
  const { seudonimo } = useParams();
  const { estado: estadoSesion } = useSesion();
  const { estado, datos: sesion, reintentar } = useDatosAdmin(`${RUTA_API_SESIONES}/${encodeURIComponent(seudonimo)}`);
  const listo = estado === ESTADOS.LISTO;
  const porEntregar = listo && sesion.estado === 'en_curso' && sesion.tareasRecibidas.length === 0;

  return (
    <div className="contenedor pagina registro-profesional">
      <p className="volver">
        <Link to="/registro">
          <ArrowLeft aria-hidden="true" />
          {DETALLE.volver}
        </Link>
      </p>
      <h1>
        {NUEVA.seudonimoEtiqueta}: <span className="seudonimo-titulo">{listo ? sesion.seudonimo : seudonimo}</span>
      </h1>
      <SesionVencida />
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos
          estado={estado}
          reintentar={reintentar}
          queCarga={DETALLE.queCarga}
          sinContenido={DETALLE.noEncontrada}
        />
      )}
      {listo && (
        <>
          <DatosSesion sesion={sesion} />
          {porEntregar && <EntregarDispositivo seudonimo={sesion.seudonimo} />}
          <ValoresSesion valores={sesion.valores} />
          <EliminarEstaSesion seudonimo={sesion.seudonimo} />
        </>
      )}
    </div>
  );
}
