/**
 * Cliente de la API del panel (M-08, RF-09, RF-10, RS-05). Rutas relativas,
 * igual que la zona pública: la cookie de sesión viaja sola porque la web y la
 * API comparten dominio (docs/despliegue.md). La web nunca ve el token: la
 * cookie es HttpOnly.
 *
 * - Un 401 de /api/admin avisa a los oyentes (ContextoSesion): la sesión
 *   venció y la página muestra el formulario para volver a entrar.
 * - Solo las lecturas se reintentan una vez si la API está despertando (502,
 *   503, 504 o falla de red); un envío repetido podría guardar dos veces.
 * - Los errores traen el mensaje del servidor y, al guardar, un mensaje por
 *   campo (`campos`), que el editor muestra junto a cada uno.
 * - Cada respuesta que el servidor atendió con la sesión vigente se anota
 *   como actividad, con la hora en que salió la petición
 *   (cuentaComoActividad en vencimiento.js): con ella, AvisoVencimiento.jsx
 *   avisa antes del cierre por inactividad (RA-10, criterio 2.2.1 de WCAG).
 */
import { ErrorApi, esReintentable } from '../api/cliente.js';
import { cuentaComoActividad } from './vencimiento.js';

export class ErrorAdmin extends ErrorApi {
  constructor(estado, cuerpo) {
    super(estado);
    this.name = 'ErrorAdmin';
    this.mensaje = cuerpo?.error ?? null;
    this.campos = cuerpo?.campos ?? {};
  }
}

const oyentesSesionPerdida = new Set();
const oyentesActividad = new Set();
let ultimaActividad = null;

/** @returns función para dejar de escuchar */
export function alPerderSesion(oyente) {
  oyentesSesionPerdida.add(oyente);
  return () => oyentesSesionPerdida.delete(oyente);
}

/** Hora (Date.now()) de la última petición que contó como actividad, o null. */
export const ultimaActividadRegistrada = () => ultimaActividad;

/**
 * @param {(momento: number) => void} oyente recibe la hora de la última actividad
 * @returns función para dejar de escuchar
 */
export function alRegistrarActividad(oyente) {
  oyentesActividad.add(oyente);
  return () => oyentesActividad.delete(oyente);
}

function anotarActividad(ruta, metodo, estado, enviada) {
  if (!cuentaComoActividad(ruta, metodo, estado)) return;
  // Dos peticiones pueden responder en desorden: vale la que salió más tarde.
  ultimaActividad = Math.max(ultimaActividad ?? 0, enviada);
  oyentesActividad.forEach((oyente) => oyente(ultimaActividad));
}

async function pedir(ruta, { metodo = 'GET', datos, signal } = {}) {
  const opciones = { method: metodo, signal, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (datos !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(datos);
  }
  const enviada = Date.now();
  const respuesta = await fetch(ruta, opciones);
  anotarActividad(ruta, metodo, respuesta.status, enviada);
  if (respuesta.status === 204) return null;
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && ruta.startsWith('/api/admin')) {
      oyentesSesionPerdida.forEach((oyente) => oyente());
    }
    throw new ErrorAdmin(respuesta.status, cuerpo);
  }
  return cuerpo;
}

/**
 * @param {string} ruta
 * @param {{metodo?: string, datos?: any, signal?: AbortSignal}} opciones
 */
export async function pedirAdmin(ruta, opciones = {}) {
  if ((opciones.metodo ?? 'GET') !== 'GET') return pedir(ruta, opciones);
  try {
    return await pedir(ruta, opciones);
  } catch (error) {
    if (opciones.signal?.aborted || !esReintentable(error)) throw error;
    return pedir(ruta, opciones);
  }
}

/**
 * Descarga un archivo del panel (los CSV del registro conductual, M-09,
 * HU-19) con la cookie de sesión. Un 401 avisa a los oyentes, igual que
 * pedirAdmin. Sin reintento: la persona vuelve a pulsar el botón.
 * @returns {Promise<Blob>}
 */
export async function descargarAdmin(ruta) {
  const enviada = Date.now();
  const respuesta = await fetch(ruta, { credentials: 'same-origin', headers: { Accept: 'text/csv' } });
  anotarActividad(ruta, 'GET', respuesta.status, enviada);
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    if (respuesta.status === 401) oyentesSesionPerdida.forEach((oyente) => oyente());
    throw new ErrorAdmin(respuesta.status, cuerpo);
  }
  return respuesta.blob();
}

/** Texto para la persona cuando una acción del panel falla. */
export function mensajeDeError(error) {
  if (error instanceof ErrorAdmin && error.mensaje && error.estado < 500) return error.mensaje;
  return 'No pudimos conectar con el servidor. Puede estar despertando: intenta de nuevo en unos segundos.';
}
