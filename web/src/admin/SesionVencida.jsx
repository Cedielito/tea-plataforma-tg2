/**
 * Aviso de sesión vencida (M-08, RS-05; RA-10). Cada página del panel lo pone
 * justo debajo de su h1. Aparece cuando una acción recibe 401 (también
 * «Seguir conectado» del aviso de vencimiento, AvisoVencimiento.jsx): no es
 * una ventana emergente. La página sigue montada, así que lo escrito en el
 * editor se conserva; al volver a entrar se puede guardar.
 *
 * Al aparecer, el foco pasa a su título; al volver a entrar, a la
 * confirmación.
 */
import { useEffect, useId, useRef, useState } from 'react';
import FormularioAcceso from './FormularioAcceso.jsx';
import { SESION, useSesion } from './ContextoSesion.jsx';

export default function SesionVencida() {
  const { estado } = useSesion();
  const idTitulo = useId();
  const titulo = useRef(null);
  const confirmacion = useRef(null);
  const [reabierta, setReabierta] = useState(false);
  const vencida = estado === SESION.VENCIDA;

  useEffect(() => {
    if (vencida) {
      setReabierta(false);
      titulo.current?.focus();
    }
  }, [vencida]);

  useEffect(() => {
    if (reabierta) confirmacion.current?.focus();
  }, [reabierta]);

  if (!vencida) {
    if (!reabierta) return null;
    return (
      <p ref={confirmacion} tabIndex={-1} className="mensaje mensaje--exito">
        Volviste a iniciar sesión. Lo que escribiste sigue aquí: ya puedes continuar.
      </p>
    );
  }

  return (
    <section className="sesion-vencida" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} ref={titulo} tabIndex={-1}>Tu sesión se cerró</h2>
      <p>
        La sesión se cierra tras 30 minutos sin actividad, o a las 8 horas de haber entrado. Escribe de
        nuevo tu usuario y tu contraseña. Lo que escribiste en esta página se conserva.
      </p>
      <FormularioAcceso alEntrar={() => setReabierta(true)} />
    </section>
  );
}
