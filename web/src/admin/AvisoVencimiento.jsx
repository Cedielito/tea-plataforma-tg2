/**
 * Aviso de que la sesión se va a cerrar por inactividad (M-08, M-09, RS-05;
 * RA-10, criterio 2.2.1 de WCAG, «Tiempo ajustable»). Va arriba del contenido
 * en el panel (LayoutAdmin.jsx) y en la zona del profesional
 * (ZonaProfesional.jsx). Las reglas de tiempo están en vencimiento.js.
 *
 * - No es una ventana emergente ni mueve el foco: es una franja fija arriba
 *   de la ventana dentro de una región role="status", que está en la página
 *   desde el principio para que el lector de pantalla anuncie el aviso cuando
 *   aparece. La región es la que lleva position: sticky (su padre, <main> o la
 *   zona del profesional, ocupa toda la página) y, mientras se ve la franja,
 *   su alto va a scroll-padding-top para que no tape el control que recibe el
 *   foco al tabular.
 * - Muestra la hora de cierre, sin cuenta regresiva. Un temporizador interno
 *   decide cuándo aparece; al volver a la pestaña se recalcula, porque el
 *   navegador frena los temporizadores de las pestañas ocultas.
 * - «Seguir conectado» pide GET /api/admin/sesion, que renueva la sesión. Si
 *   ya venció, la respuesta 401 lleva al formulario para volver a entrar
 *   (SesionVencida.jsx) y lo escrito se conserva. Al renovarla, el foco
 *   vuelve a donde estaba antes de ir al botón (o al contenido principal) y la
 *   región anuncia que la sesión sigue abierta. Ese mensaje, o el de error,
 *   se muestra solo mientras no haya otra actividad ni cambie la etapa.
 */
import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { SESION, useSesion } from './ContextoSesion.jsx';
import { ErrorAdmin, alRegistrarActividad, pedirAdmin, ultimaActividadRegistrada } from './clienteAdmin.js';
import { ETAPAS, TEXTOS_VENCIMIENTO, etapaDeLaSesion, horaDeCierre, msHastaElCambio } from './vencimiento.js';

/** Hora de la última actividad, al día con cada petición del panel. */
function useUltimaActividad() {
  const [ultima, setUltima] = useState(ultimaActividadRegistrada);
  useEffect(() => {
    setUltima(ultimaActividadRegistrada());
    return alRegistrarActividad(setUltima);
  }, []);
  return ultima;
}

export default function AvisoVencimiento() {
  const { estado } = useSesion();
  const ultima = useUltimaActividad();
  const [ahora, setAhora] = useState(() => Date.now());
  const [renovando, setRenovando] = useState(false);
  // { texto, ultima, etapa }: se muestra solo mientras no haya otra actividad ni cambie la etapa.
  const [mensaje, setMensaje] = useState(null);
  const focoAnterior = useRef(null);
  const activa = estado === SESION.ACTIVA && ultima !== null;
  const etapa = activa ? etapaDeLaSesion(ultima, ahora) : ETAPAS.VIGENTE;

  // Una petición nueva (otra actividad) mueve los plazos: se recalcula enseguida.
  useEffect(() => setAhora(Date.now()), [ultima]);

  useEffect(() => {
    if (!activa) return undefined;
    const espera = msHastaElCambio(ultima, ahora);
    if (espera === null) return undefined;
    const id = setTimeout(() => setAhora(Date.now()), espera);
    return () => clearTimeout(id);
  }, [activa, ultima, ahora]);

  useEffect(() => {
    const alVolver = () => {
      if (!document.hidden) setAhora(Date.now());
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, []);

  const visible = etapa !== ETAPAS.VIGENTE;
  const franja = useRef(null);
  // Mientras se ve, la franja reserva su alto arriba al desplazar hasta el foco (--alto-aviso-vencimiento).
  useEffect(() => {
    const elemento = franja.current;
    const raiz = document.documentElement;
    if (!visible || !elemento) return undefined;
    const medir = () => raiz.style.setProperty('--alto-aviso-vencimiento', `${elemento.offsetHeight}px`);
    medir();
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    observador?.observe(elemento);
    return () => {
      observador?.disconnect();
      raiz.style.removeProperty('--alto-aviso-vencimiento');
    };
  }, [visible]);

  async function seguirConectado() {
    if (renovando) return;
    setRenovando(true);
    setMensaje(null);
    try {
      await pedirAdmin('/api/admin/sesion');
      // La renovación ya quedó anotada como actividad: el mensaje es de la etapa vigente que empieza.
      setMensaje({ texto: TEXTOS_VENCIMIENTO.renovada, ultima: ultimaActividadRegistrada(), etapa: ETAPAS.VIGENTE });
      const destino = focoAnterior.current?.isConnected ? focoAnterior.current : document.getElementById('contenido');
      destino?.focus();
    } catch (error) {
      // Con 401 la sesión ya venció: ContextoSesion pasa a «vencida» y aparece el formulario.
      if (!(error instanceof ErrorAdmin && error.estado === 401)) {
        setMensaje({ texto: TEXTOS_VENCIMIENTO.error, ultima, etapa });
      }
    } finally {
      setRenovando(false);
    }
  }

  const textoMensaje = activa && mensaje && mensaje.ultima === ultima && mensaje.etapa === etapa ? mensaje.texto : null;
  return (
    <div role="status" className="aviso-vencimiento__region">
      {visible ? (
        <div ref={franja} className="aviso-vencimiento">
          <div className="contenedor aviso-vencimiento__contenido">
            <Clock aria-hidden="true" className="aviso-vencimiento__icono" />
            <p className="aviso-vencimiento__texto">
              {etapa === ETAPAS.POR_VENCER ? TEXTOS_VENCIMIENTO.porVencer(horaDeCierre(ultima)) : TEXTOS_VENCIMIENTO.vencida}
            </p>
            <button
              type="button"
              className="boton boton-primario"
              onClick={seguirConectado}
              onFocus={(evento) => {
                focoAnterior.current = evento.relatedTarget;
              }}
              aria-disabled={renovando || undefined}
            >
              {renovando ? TEXTOS_VENCIMIENTO.renovando : TEXTOS_VENCIMIENTO.boton}
            </button>
            {textoMensaje && <p className="aviso-vencimiento__mensaje">{textoMensaje}</p>}
          </div>
        </div>
      ) : (
        textoMensaje && <p className="solo-lector">{textoMensaje}</p>
      )}
    </div>
  );
}
