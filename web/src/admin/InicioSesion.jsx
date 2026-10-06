/**
 * Página de inicio de sesión del panel (M-08, RF-09, HU-12). No hay registro
 * público: la cuenta se crea al desplegar (docs/despliegue.md).
 */
import { useEffect, useRef } from 'react';
import FormularioAcceso from './FormularioAcceso.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { useSesion } from './ContextoSesion.jsx';

export default function InicioSesion() {
  const { cerrada } = useSesion();
  const confirmacion = useRef(null);
  useTituloPagina('Iniciar sesión · Panel');

  // Al cerrar sesión, el foco pasa a la confirmación (el botón desapareció).
  useEffect(() => {
    if (cerrada) confirmacion.current?.focus();
  }, [cerrada]);

  return (
    <div className="contenedor pagina pagina-admin pagina-acceso">
      <h1>Iniciar sesión</h1>
      {cerrada && (
        <p ref={confirmacion} tabIndex={-1} className="mensaje mensaje--exito">
          Cerraste la sesión.
        </p>
      )}
      <p className="pagina__descripcion">
        Este panel es solo para el equipo que administra la plataforma.
      </p>
      <FormularioAcceso />
    </div>
  );
}
