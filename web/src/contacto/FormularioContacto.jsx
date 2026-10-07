/**
 * Formulario de contacto (M-06; RF-08, RS-02, RS-03; RA-03, RA-05, RA-11).
 *
 * - Solo correo y mensaje (RS-02). Junto al mensaje, la indicación de la
 *   política: no escribir nombres, documentos ni información de salud de
 *   niños, niñas o adolescentes.
 * - Casilla de autorización sin marcar, con el texto de la política
 *   (`textoAutorizacion`) y un enlace a /privacidad (RS-03). Sin marcarla no
 *   se envía: lo comprueba el navegador y lo vuelve a comprobar la API.
 * - Validación propia (noValidate), sin las ventanas del navegador: los
 *   errores aparecen en un resumen que recibe el foco y enlaza a cada campo,
 *   y junto a cada campo con ícono y la palabra «Error».
 * - Correo y mensaje se conservan en memoria al ir a la política y volver
 *   (borrador.js); la casilla no.
 * - Sin reintento automático: si el envío falla, lo escrito se conserva y la
 *   persona decide cuándo intentar de nuevo.
 * - Al enviar, el formulario se cambia por una confirmación que recibe el foco.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Send } from 'lucide-react';
import Campo, { MensajeError, describir } from '../componentes/Campo.jsx';
import ResumenErrores from '../componentes/ResumenErrores.jsx';
import { ErrorApi, enviarJson } from '../api/cliente.js';
import { RUTA_API_CONTACTO, RUTA_PRIVACIDAD_WEB } from '../secciones.js';
import { LARGO_MAXIMO_MENSAJE, cuerpoDelEnvio, validarContacto } from './validacion.js';
import { borrarBorrador, guardarBorrador, leerBorrador } from './borrador.js';

export const INDICACION_MENSAJE =
  'No escribas nombres, documentos ni información de salud de niños, niñas o adolescentes.';

const ETIQUETAS = { correo: 'Correo electrónico', mensaje: 'Mensaje', autorizacion: 'Autorización' };

const SIN_CONEXION =
  'No pudimos enviar tu mensaje. Revisa tu conexión e intenta de nuevo en unos segundos. Lo que escribiste sigue aquí.';
const POLITICA_SIN_CARGAR =
  'No pudimos cargar la política nueva. Recarga la página para leerla antes de enviar. Copia tu mensaje antes de recargar.';

/** Errores del servidor: por campo, o un mensaje general (límite, política, servidor). */
function erroresDeLaApi(error) {
  if (!(error instanceof ErrorApi) || error.estado >= 500 || !error.cuerpo?.error) {
    return { campos: {}, general: SIN_CONEXION };
  }
  const { campos = {}, error: mensaje } = error.cuerpo;
  const porCampo = Object.fromEntries(Object.entries(campos).filter(([campo]) => campo in ETIQUETAS));
  const general = Object.keys(porCampo).length > 0 ? campos.general ?? campos.versionPolitica ?? null : mensaje;
  return { campos: porCampo, general };
}

function Confirmacion({ alEscribirOtro }) {
  const recuadro = useRef(null);
  const idTitulo = useId();
  useEffect(() => recuadro.current?.focus(), []);

  return (
    <section ref={recuadro} tabIndex={-1} className="confirmacion-contacto" aria-labelledby={idTitulo}>
      <CircleCheck aria-hidden="true" className="confirmacion-contacto__icono" />
      <div>
        <h2 id={idTitulo}>Recibimos tu mensaje</h2>
        <p>
          Te responderemos al correo que escribiste. Tu mensaje se elimina de forma automática a más tardar
          seis meses después de recibido, o antes si lo pides.
        </p>
        <button type="button" className="boton boton-secundario" onClick={alEscribirOtro}>
          Escribir otro mensaje
        </button>
      </div>
    </section>
  );
}

export default function FormularioContacto({ politica, actualizarPolitica }) {
  const id = useId();
  const ids = { correo: `${id}-correo`, mensaje: `${id}-mensaje`, autorizacion: `${id}-autorizacion` };
  const [valores, setValores] = useState(() => ({ ...leerBorrador(), autorizacion: false }));
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [intento, setIntento] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [otro, setOtro] = useState(0);
  const resumen = useRef(null);

  // Cada intento fallido pone el foco en el resumen, aunque los errores sean los mismos.
  useEffect(() => {
    if (intento > 0) resumen.current?.focus();
  }, [intento]);

  // Al pedir «Escribir otro mensaje», el foco pasa al primer campo del formulario nuevo.
  useEffect(() => {
    if (otro > 0) document.getElementById(ids.correo)?.focus();
  }, [otro, ids.correo]);

  function cambiar(campo, valor) {
    const siguientes = { ...valores, [campo]: valor };
    setValores(siguientes);
    if (campo !== 'autorizacion') guardarBorrador(siguientes);
  }

  function fallar(porCampo, mensajeGeneral) {
    setErrores(porCampo);
    setGeneral(mensajeGeneral);
    setIntento((n) => n + 1);
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    const encontrados = validarContacto(valores);
    if (Object.keys(encontrados).length > 0) return fallar(encontrados, null);

    setEnviando(true);
    try {
      await enviarJson(RUTA_API_CONTACTO, cuerpoDelEnvio(valores, politica.version));
      borrarBorrador();
      setErrores({});
      setGeneral(null);
      setEnviado(true);
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 409) {
        // La política cambió: hay que leer el texto nuevo y volver a marcar la casilla.
        setValores((anteriores) => ({ ...anteriores, autorizacion: false }));
        const actualizada = await actualizarPolitica();
        return fallar({}, actualizada ? error.cuerpo?.error ?? SIN_CONEXION : POLITICA_SIN_CARGAR);
      }
      const { campos, general: mensaje } = erroresDeLaApi(error);
      return fallar(campos, mensaje);
    } finally {
      setEnviando(false);
    }
    return undefined;
  }

  function escribirOtro() {
    setValores({ ...leerBorrador(), autorizacion: false });
    setIntento(0);
    setEnviado(false);
    setOtro((n) => n + 1);
  }

  if (enviado) return <Confirmacion alEscribirOtro={escribirOtro} />;

  const lista = [
    ...(general ? [{ id: null, etiqueta: '', mensaje: general }] : []),
    ...Object.entries(errores).map(([campo, mensaje]) => ({ id: ids[campo], etiqueta: ETIQUETAS[campo], mensaje }))
  ];
  const errorAutorizacion = errores.autorizacion;
  const propsCasilla = describir(ids.autorizacion, { error: errorAutorizacion });

  return (
    <>
      {lista.length > 0 && <ResumenErrores ref={resumen} titulo="No pudimos enviar tu mensaje" errores={lista} />}

      <form className="formulario formulario-contacto" onSubmit={enviar} noValidate>
        <Campo id={ids.correo} etiqueta="Correo electrónico" error={errores.correo} pista="Te responderemos a este correo.">
          {(props) => (
            <input
              {...props}
              type="email"
              name="correo"
              autoComplete="email"
              spellCheck={false}
              className="campo__control"
              value={valores.correo}
              onChange={(evento) => cambiar('correo', evento.target.value)}
            />
          )}
        </Campo>

        <Campo
          id={ids.mensaje}
          etiqueta="Mensaje"
          error={errores.mensaje}
          pista={
            <>
              <strong>{INDICACION_MENSAJE}</strong> Puedes escribir hasta {LARGO_MAXIMO_MENSAJE} caracteres.
            </>
          }
        >
          {(props) => (
            <textarea
              {...props}
              name="mensaje"
              rows={8}
              className="campo__control campo__control--mensaje"
              value={valores.mensaje}
              onChange={(evento) => cambiar('mensaje', evento.target.value)}
            />
          )}
        </Campo>

        <div className={`campo autorizacion${errorAutorizacion ? ' campo--con-error' : ''}`}>
          <MensajeError id={`${ids.autorizacion}-error`}>{errorAutorizacion}</MensajeError>
          <div className="autorizacion__casilla">
            <input
              {...propsCasilla}
              type="checkbox"
              name="autorizacion"
              checked={valores.autorizacion}
              onChange={(evento) => cambiar('autorizacion', evento.target.checked)}
            />
            <label htmlFor={ids.autorizacion}>{politica.textoAutorizacion}</label>
          </div>
          <p className="autorizacion__enlace">
            <Link to={RUTA_PRIVACIDAD_WEB}>
              Leer la política de tratamiento de datos personales (versión {politica.version})
            </Link>
          </p>
        </div>

        <button type="submit" className="boton boton-primario" aria-disabled={enviando || undefined}>
          <Send aria-hidden="true" />
          {enviando ? 'Enviando tu mensaje…' : 'Enviar mensaje'}
        </button>
        <p role="status" className="solo-lector">{enviando ? 'Enviando tu mensaje.' : ''}</p>
      </form>
    </>
  );
}
