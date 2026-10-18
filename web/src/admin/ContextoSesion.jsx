/**
 * Estado de la sesión del panel (M-08, M-09, RF-09, RS-05). Lo usan el panel
 * (/admin) y la zona del profesional del registro conductual (/registro).
 *
 * - comprobando: al abrir /admin se pregunta a la API si hay sesión. La API
 *   gratuita puede tardar en despertar, así que se dice con calma.
 * - sin-sesion: se muestra el inicio de sesión.
 * - activa: se muestran las páginas del panel.
 * - vencida: una acción recibió 401 (30 minutos sin actividad u 8 horas en
 *   total). La página sigue montada, con lo que se haya escrito, y muestra el
 *   formulario para volver a entrar (SesionVencida.jsx). Sin temporizadores ni
 *   ventanas emergentes (RA-10): se nota al hacer la siguiente acción.
 * - error: no se pudo comprobar la sesión (servidor caído o sin red).
 *
 * `generacion` aumenta en cada inicio de sesión: las páginas la usan para
 * volver a pedir sus datos. `rol` es el de la cuenta: `administrador` (panel)
 * o `profesional` (registro conductual); cada zona muestra un aviso a la otra.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ErrorAdmin, alPerderSesion, pedirAdmin } from './clienteAdmin.js';

export const SESION = Object.freeze({
  COMPROBANDO: 'comprobando',
  SIN_SESION: 'sin-sesion',
  ACTIVA: 'activa',
  VENCIDA: 'vencida',
  ERROR: 'error'
});

export const ROLES = Object.freeze({ ADMINISTRADOR: 'administrador', PROFESIONAL: 'profesional' });

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [estado, setEstado] = useState(SESION.COMPROBANDO);
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [generacion, setGeneracion] = useState(0);
  const [cerrada, setCerrada] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setEstado(SESION.COMPROBANDO);
    pedirAdmin('/api/admin/sesion', { signal: control.signal }).then(
      (datos) => {
        setUsuario(datos.usuario);
        setRol(datos.rol);
        setEstado(SESION.ACTIVA);
      },
      (error) => {
        if (control.signal.aborted) return;
        setEstado(error instanceof ErrorAdmin && error.estado === 401 ? SESION.SIN_SESION : SESION.ERROR);
      }
    );
    return () => control.abort();
  }, [intento]);

  useEffect(
    () => alPerderSesion(() => setEstado((actual) => (actual === SESION.ACTIVA ? SESION.VENCIDA : actual))),
    []
  );

  const iniciarSesion = useCallback(async (nombre, clave) => {
    const datos = await pedirAdmin('/api/sesion', { metodo: 'POST', datos: { usuario: nombre, clave } });
    setUsuario(datos.usuario);
    setRol(datos.rol);
    setCerrada(false);
    setEstado(SESION.ACTIVA);
    setGeneracion((n) => n + 1);
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await pedirAdmin('/api/admin/sesion', { metodo: 'DELETE' });
    } catch {
      // Si ya había vencido (401) o no hay red, en esta pestaña igual se cierra.
    }
    setUsuario(null);
    setRol(null);
    setCerrada(true);
    setEstado(SESION.SIN_SESION);
  }, []);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  const valor = useMemo(
    () => ({ estado, usuario, rol, generacion, cerrada, iniciarSesion, cerrarSesion, reintentar }),
    [estado, usuario, rol, generacion, cerrada, iniciarSesion, cerrarSesion, reintentar]
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return contexto;
}
