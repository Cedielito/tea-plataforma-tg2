/**
 * Aviso antes de que la sesión del panel o de la zona del profesional venza
 * por inactividad (M-08, M-09, RS-05; RA-10, criterio 2.2.1 de WCAG,
 * «Tiempo ajustable»). Lógica pura; el aviso está en AvisoVencimiento.jsx.
 *
 * - El servidor cierra la sesión tras 30 minutos sin actividad
 *   (MS_INACTIVIDAD en api/src/dominio/autenticacion.js; la prueba comprueba
 *   que esta copia es igual). Cada petición a /api/admin cuenta como
 *   actividad (clienteAdmin.js la anota con la hora en que se envió, así que
 *   aquí la sesión parece un poco más vieja que en el servidor, nunca menos).
 * - Dos minutos antes (MS_AVISO_ANTES), el aviso dice la hora de cierre y
 *   ofrece «Seguir conectado», que renueva la sesión con una petición. WCAG
 *   pide al menos 20 segundos para hacerlo con una acción simple.
 * - Pasados los 30 minutos el aviso no desaparece: dice que la sesión puede
 *   haberse cerrado. Al pulsar el botón, si el servidor ya la cerró, responde
 *   401 y la página muestra el formulario para volver a entrar
 *   (SesionVencida.jsx), con lo escrito intacto.
 * - El tope de 8 horas desde el inicio de sesión no se puede extender (RS-05):
 *   no se avisa; al vencer se vuelve a entrar y lo escrito se conserva.
 *
 * Nada cuenta el tiempo en pantalla: el aviso muestra una hora fija.
 */

/** Copia de MS_INACTIVIDAD de la API. */
export const MS_INACTIVIDAD = 30 * 60 * 1000;
export const MS_AVISO_ANTES = 2 * 60 * 1000;

export const ETAPAS = Object.freeze({ VIGENTE: 'vigente', POR_VENCER: 'por-vencer', VENCIDA: 'vencida' });

/**
 * @param {number} ultimaActividad ms (Date.now()) de la última petición que contó como actividad
 * @param {number} ahora ms
 */
export function etapaDeLaSesion(ultimaActividad, ahora) {
  const transcurrido = ahora - ultimaActividad;
  if (transcurrido >= MS_INACTIVIDAD) return ETAPAS.VENCIDA;
  if (transcurrido >= MS_INACTIVIDAD - MS_AVISO_ANTES) return ETAPAS.POR_VENCER;
  return ETAPAS.VIGENTE;
}

/** Milisegundos hasta que cambia la etapa; null si ya pasó a VENCIDA (no hay otra después). */
export function msHastaElCambio(ultimaActividad, ahora) {
  const transcurrido = ahora - ultimaActividad;
  if (transcurrido >= MS_INACTIVIDAD) return null;
  if (transcurrido >= MS_INACTIVIDAD - MS_AVISO_ANTES) return MS_INACTIVIDAD - transcurrido;
  return MS_INACTIVIDAD - MS_AVISO_ANTES - transcurrido;
}

/** Hora de cierre por inactividad, «3:42 p. m.», en la zona horaria del dispositivo. */
export function horaDeCierre(ultimaActividad, zonaHoraria) {
  return new Date(ultimaActividad + MS_INACTIVIDAD).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {})
  });
}

/**
 * Cuenta una respuesta como actividad si el servidor la atendió con la sesión
 * vigente: una ruta de /api/admin con cualquier respuesta menos 401 o error
 * del servidor (exigirSesion ya anotó la actividad, también ante un 400 o un
 * 403), o el inicio de sesión aceptado.
 */
export function cuentaComoActividad(ruta, metodo, estado) {
  if (ruta === '/api/sesion') return metodo === 'POST' && estado >= 200 && estado < 300;
  return ruta.startsWith('/api/admin') && estado !== 401 && estado < 500;
}

export const TEXTOS_VENCIMIENTO = Object.freeze({
  porVencer: (hora) =>
    `Tu sesión se cerrará a las ${hora} por falta de actividad. Si sigues trabajando, pulsa «Seguir conectado».`,
  vencida:
    'Tu sesión pudo haberse cerrado por falta de actividad. Pulsa «Seguir conectado»: si se cerró, podrás volver a entrar sin perder lo que escribiste.',
  boton: 'Seguir conectado',
  renovando: 'Renovando la sesión…',
  renovada: 'Listo: tu sesión sigue abierta.',
  error: 'No pudimos conectar con el servidor. Intenta de nuevo en unos segundos.'
});
