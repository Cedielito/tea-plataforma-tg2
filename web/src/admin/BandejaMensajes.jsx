/**
 * Bandeja de mensajes de contacto en /admin/mensajes (M-06, M-08; RF-11,
 * RS-04, HU-15; RA-03, RA-05, RA-11).
 *
 * - Del más reciente al más antiguo, con la fecha de llegada (hora de
 *   Colombia), la versión de la política aceptada y el día en que MongoDB lo
 *   suprimirá (180 días después de recibido).
 * - El mensaje se muestra como texto plano: React lo escribe como texto, con
 *   sus saltos de línea. Nunca pasa por Markdown ni por HTML.
 * - «Responder por correo» abre el programa de correo con el asunto escrito
 *   (enlaceRespuesta.js).
 * - «Eliminar» pide confirmación en la misma tarjeta, sin ventanas emergentes:
 *   la pregunta recibe el foco; «Cancelar» lo devuelve a «Eliminar». Al
 *   eliminar, una región role="status" lo anuncia y el foco pasa al mensaje
 *   siguiente, o al título si era el último.
 * - Una nota recuerda la regla de la política para los mensajes con datos de
 *   niños, niñas o adolescentes.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Info, Reply, Trash2 } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ESTADOS } from '../api/useDatos.js';
import { contar, fechaColombia } from '../utilidades/formato.js';
import SesionVencida from './SesionVencida.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { ErrorAdmin, mensajeDeError, pedirAdmin } from './clienteAdmin.js';
import { enlaceRespuesta } from './enlaceRespuesta.js';

export const RUTA_API_MENSAJES = '/api/admin/mensajes';

export const NOTA_DATOS_SENSIBLES =
  'Si un mensaje trae nombres, documentos o datos de salud de niños, niñas o adolescentes, responde de forma ' +
  'general, sin usar esos datos, y elimina el mensaje después de responder (Política de privacidad).';

function DatosMensaje({ mensaje }) {
  const recibido = fechaColombia(mensaje.fecha);
  const supresion = fechaColombia(mensaje.fechaSupresion, { conHora: false });
  return (
    <ul className="tarjeta-admin__datos">
      {recibido && (
        <li>
          Recibido el <time dateTime={recibido.iso}>{recibido.texto}</time>
        </li>
      )}
      <li>Política aceptada: versión {mensaje.versionPolitica}</li>
      {supresion && (
        <li>
          Se borra solo el <time dateTime={supresion.iso}>{supresion.texto}</time>
        </li>
      )}
    </ul>
  );
}

function TarjetaMensaje({ mensaje, alEliminar, refTitulo }) {
  const { _id, correo } = mensaje;
  const idPregunta = useId();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState(null);
  const pregunta = useRef(null);
  const botonEliminar = useRef(null);
  const enlace = enlaceRespuesta(correo);

  useEffect(() => {
    if (confirmando) pregunta.current?.focus();
  }, [confirmando]);

  function cancelar() {
    setConfirmando(false);
    // Tras el render, «Eliminar» vuelve a estar en la página.
    requestAnimationFrame(() => botonEliminar.current?.focus());
  }

  async function eliminar() {
    if (eliminando) return;
    setEliminando(true);
    setError(null);
    try {
      await pedirAdmin(`${RUTA_API_MENSAJES}/${_id}`, { metodo: 'DELETE' });
      alEliminar(_id, 'Mensaje eliminado.');
    } catch (problema) {
      if (problema instanceof ErrorAdmin && problema.estado === 404) {
        alEliminar(_id, 'El mensaje ya no estaba en la bandeja.');
        return;
      }
      if (problema instanceof ErrorAdmin && problema.estado === 401) return;
      setError(mensajeDeError(problema));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <li className="tarjeta-admin tarjeta-mensaje">
      <h2 ref={refTitulo} tabIndex={-1} className="tarjeta-admin__titulo tarjeta-mensaje__correo">
        Mensaje de {correo}
      </h2>
      <DatosMensaje mensaje={mensaje} />
      <p className="tarjeta-mensaje__texto">{mensaje.mensaje}</p>

      {confirmando ? (
        <div className="confirmar-eliminar" role="group" aria-labelledby={idPregunta}>
          <p id={idPregunta} ref={pregunta} tabIndex={-1} className="confirmar-eliminar__pregunta">
            ¿Eliminar el mensaje de {correo}? No se puede deshacer.
          </p>
          <div className="acciones">
            <button type="button" className="boton boton-primario" onClick={eliminar} aria-disabled={eliminando || undefined}>
              <Trash2 aria-hidden="true" />
              {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button type="button" className="boton boton-secundario" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="acciones">
          {enlace && (
            <a href={enlace} className="boton boton-secundario">
              <Reply aria-hidden="true" />
              Responder por correo<span className="solo-lector"> a {correo}</span>
            </a>
          )}
          <button ref={botonEliminar} type="button" className="boton boton-secundario" onClick={() => setConfirmando(true)}>
            <Trash2 aria-hidden="true" />
            Eliminar<span className="solo-lector"> el mensaje de {correo}</span>
          </button>
        </div>
      )}
      <div role="status" className="tarjeta-admin__resultado">
        {error && <p className="mensaje mensaje--error">No se pudo eliminar. {error}</p>}
      </div>
    </li>
  );
}

export default function BandejaMensajes() {
  useTituloPagina('Mensajes · Panel');
  const { estado: estadoSesion } = useSesion();
  const { estado, datos, reintentar } = useDatosAdmin(RUTA_API_MENSAJES);
  const [eliminados, setEliminados] = useState(() => new Set());
  const [aviso, setAviso] = useState('');
  const [enfocar, setEnfocar] = useState(null);
  const titulos = useRef(new Map());
  const listo = estado === ESTADOS.LISTO;

  // Si la lista se vuelve a pedir (por ejemplo, al iniciar sesión de nuevo), manda la del servidor.
  useEffect(() => setEliminados(new Set()), [datos]);

  const mensajes = listo ? datos.filter((m) => !eliminados.has(m._id)) : [];

  useEffect(() => {
    if (enfocar === null) return;
    const destino = titulos.current.get(enfocar) ?? document.querySelector('main h1');
    destino?.focus();
    setEnfocar(null);
  }, [enfocar]);

  function alEliminar(id, texto) {
    const indice = mensajes.findIndex((m) => m._id === id);
    const siguiente = mensajes[indice + 1] ?? mensajes[indice - 1] ?? null;
    setEliminados((anteriores) => new Set(anteriores).add(id));
    setAviso(texto);
    setEnfocar(siguiente ? siguiente._id : 'titulo');
  }

  return (
    <div className="contenedor pagina pagina-admin">
      <h1 tabIndex={-1}>Mensajes</h1>
      <SesionVencida />
      <p className="pagina__descripcion">
        Mensajes del formulario de contacto, del más reciente al más antiguo. Cada uno se borra solo 180 días
        después de recibido; puedes eliminarlo antes, por ejemplo cuando ya lo respondiste o si quien escribió
        lo pide.
      </p>
      <div role="note" className="aviso pagina__aviso">
        <Info aria-hidden="true" />
        <p>{NOTA_DATOS_SENSIBLES}</p>
      </div>
      <p role="status" className="bandeja__aviso">{aviso}</p>

      {listo && <p className="secundario">{contar(mensajes.length, 'mensaje', 'mensajes')} en la bandeja.</p>}
      {listo && mensajes.length > 0 && (
        <ul className="tarjetas-admin">
          {mensajes.map((mensaje) => (
            <TarjetaMensaje
              key={mensaje._id}
              mensaje={mensaje}
              alEliminar={alEliminar}
              refTitulo={(elemento) =>
                elemento ? titulos.current.set(mensaje._id, elemento) : titulos.current.delete(mensaje._id)
              }
            />
          ))}
        </ul>
      )}
      {!listo && estadoSesion !== SESION.VENCIDA && (
        <EstadoDatos estado={estado} reintentar={reintentar} queCarga="los mensajes" />
      )}
    </div>
  );
}
