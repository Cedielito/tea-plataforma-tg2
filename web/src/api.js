const BASE = import.meta.env?.VITE_API ?? '/api';

async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${BASE}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  });
  if (!res.ok) throw Object.assign(new Error('error_api'), { estado: res.status, cuerpo: await res.json().catch(() => null) });
  return res.json();
}

export const crearSesion = (datos) => pedir('/sesiones', { method: 'POST', body: datos });
export const obtenerPlan = (uuid, orden) => pedir(`/sesiones/${uuid}/plan${orden ? `?orden=${orden.join(',')}` : ''}`);
export const enviarEventos = (uuid, eventos) => pedir(`/sesiones/${uuid}/eventos`, { method: 'POST', body: { eventos } });
export const obtenerPuntuacion = (uuid) => pedir(`/sesiones/${uuid}/puntuacion`);
