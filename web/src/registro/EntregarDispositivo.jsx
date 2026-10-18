/**
 * Entrega del dispositivo al participante (M-09, HU-16, HU-17, CT-11, RS-05).
 *
 * POST /api/admin/registro/sesiones/:seudonimo/entrega cierra la sesión del
 * profesional en este navegador y deja una cookie que solo sirve para aplicar
 * esta sesión. Después, la página pasa a /registro/aplicacion reemplazando la
 * entrada del historial: al volver atrás no quedan a la vista las sesiones,
 * y la zona del profesional pide iniciar sesión de nuevo.
 */
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MonitorSmartphone } from 'lucide-react';
import { mensajeDeError, pedirAdmin } from '../admin/clienteAdmin.js';
import { RUTA_API_SESIONES } from './rutasProfesional.js';
import { ENTREGA } from './textosProfesional.js';

export default function EntregarDispositivo({ seudonimo }) {
  const { alEntregar } = useOutletContext();
  const navegar = useNavigate();
  const [entregando, setEntregando] = useState(false);
  const [error, setError] = useState(null);

  async function entregar() {
    if (entregando) return;
    setEntregando(true);
    setError(null);
    try {
      await pedirAdmin(`${RUTA_API_SESIONES}/${encodeURIComponent(seudonimo)}/entrega`, { metodo: 'POST' });
      alEntregar();
      navegar('/registro/aplicacion', { replace: true });
    } catch (problema) {
      setError(mensajeDeError(problema));
      setEntregando(false);
    }
  }

  return (
    <section className="tarjeta-admin entrega" aria-labelledby={`entrega-${seudonimo}`}>
      <h2 id={`entrega-${seudonimo}`} className="tarjeta-admin__titulo">{ENTREGA.titulo}</h2>
      {ENTREGA.explicacion.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <button type="button" className="boton boton-primario" onClick={entregar} aria-disabled={entregando || undefined}>
        <MonitorSmartphone aria-hidden="true" />
        {entregando ? ENTREGA.entregando : ENTREGA.boton}
      </button>
      <div role="status">{error && <p className="mensaje mensaje--error">{error}</p>}</div>
    </section>
  );
}
