/**
 * Cliente de la aplicación de una sesión del registro conductual (M-09,
 * HU-17, CT-11). Rutas relativas bajo /api/registro/aplicacion, con la cookie
 * de aplicación que entregó el profesional (HttpOnly: la web nunca ve el
 * token). Esa cookie no abre el panel ni ninguna otra ruta.
 *
 * - La lectura del estado se reintenta una vez si la API está despertando
 *   (502, 503, 504 o falla de red), como el resto de la web.
 * - Los envíos (ensayos de una tarea, SUS) no se reintentan aquí: los ordena
 *   y los reintenta la cola de envíos (colaEnvios.js). La API los recibe una
 *   sola vez aunque lleguen repetidos.
 * - Un 401 quiere decir que en este dispositivo no hay una aplicación activa.
 */
import { ErrorApi, esReintentable } from '../api/cliente.js';

export const RUTA_API_APLICACION = '/api/registro/aplicacion';

async function pedir(ruta, { metodo = 'GET', datos, signal } = {}) {
  const opciones = { method: metodo, signal, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (datos !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(datos);
  }
  const respuesta = await fetch(ruta, opciones);
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo);
  return cuerpo;
}

/** Estado de la aplicación: plan, semilla, reloj, lo recibido y el SUS. */
export async function obtenerAplicacion({ signal } = {}) {
  try {
    return await pedir(RUTA_API_APLICACION, { signal });
  } catch (error) {
    if (signal?.aborted || !esReintentable(error)) throw error;
    return pedir(RUTA_API_APLICACION, { signal });
  }
}

/** Un envío de la cola: { ruta, metodo, datos }. */
export function enviarAplicacion({ ruta, metodo = 'PUT', datos }) {
  return pedir(ruta, { metodo, datos });
}
