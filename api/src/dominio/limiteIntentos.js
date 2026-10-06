'use strict';

/**
 * Limites del inicio de sesion del panel, sin servicios externos. M-08, RS-05
 *
 * - Bloqueo por usuario: 5 intentos fallidos con un mismo usuario en 15
 *   minutos lo bloquean 15 minutos, aunque luego llegue la clave correcta.
 *   No depende de la IP, que a traves de Vercel y Render todavia no es
 *   confiable. Contrapartida: quien conozca el usuario puede bloquearlo, por
 *   eso el usuario no debe ser obvio.
 * - Un solo intento en curso por usuario: sin esto, varias peticiones en
 *   paralelo pasarian la consulta antes de que se registre el primer fallo y
 *   se podrian probar mas de 5 claves.
 * - Limite global: como maximo 20 intentos por minuto en total, para que nadie
 *   sature la CPU (cada intento hace una comparacion bcrypt) probando muchos
 *   usuarios distintos.
 *
 * El estado vive en memoria: se reinicia si la API se reinicia. El tiempo
 * llega como argumento (`ahora`), asi las pruebas no esperan minutos reales.
 */

const MINUTO = 60 * 1000;

const MENSAJES = Object.freeze({
  USUARIO_BLOQUEADO:
    'Hubo demasiados intentos fallidos con este usuario. Por seguridad, espera 15 minutos antes de intentar de nuevo.',
  DEMASIADOS_INTENTOS:
    'Hay demasiados intentos de inicio de sesión en este momento. Espera un minuto e intenta de nuevo.',
  INTENTO_EN_CURSO: 'Ya hay un inicio de sesión en curso con este usuario. Espera un momento e intenta de nuevo.'
});

const ms = (ahora) => (ahora instanceof Date ? ahora.getTime() : ahora);
const segundosHasta = (fin, momento) => Math.max(1, Math.ceil((fin - momento) / 1000));

/**
 * @returns {{
 *   consultar(usuario: string, ahora: Date): {bloqueado: boolean, segundos?: number},
 *   registrarFallo(usuario: string, ahora: Date): {bloqueado: boolean, segundos?: number},
 *   reiniciar(usuario: string): void,
 *   ocupar(usuario: string): boolean,
 *   liberar(usuario: string): void,
 *   cantidad(): number
 * }} ocupar devuelve false si ya hay un intento en curso con ese usuario
 */
function crearBloqueoPorUsuario({
  maximoFallos = 5,
  ventanaMs = 15 * MINUTO,
  bloqueoMs = 15 * MINUTO,
  maximoUsuarios = 10000
} = {}) {
  /** usuario -> { fallos: number[] (instantes), bloqueadoHasta: number } */
  const registros = new Map();
  /** Usuarios con un intento en curso (mientras se compara la clave). */
  const enCurso = new Set();

  function consultar(usuario, ahora) {
    const registro = registros.get(usuario);
    const momento = ms(ahora);
    if (registro && registro.bloqueadoHasta > momento) {
      return { bloqueado: true, segundos: segundosHasta(registro.bloqueadoHasta, momento) };
    }
    return { bloqueado: false };
  }

  function registrarFallo(usuario, ahora) {
    const momento = ms(ahora);
    const anterior = registros.get(usuario);
    const fallos = (anterior ? anterior.fallos : []).filter((instante) => momento - instante < ventanaMs);
    fallos.push(momento);
    const registro = { fallos, bloqueadoHasta: 0 };
    if (fallos.length >= maximoFallos) {
      registro.fallos = [];
      registro.bloqueadoHasta = momento + bloqueoMs;
    }
    // Se reinserta para que el Map quede en orden de ultimo fallo; si se pasa
    // del maximo, se descarta el usuario con el fallo mas antiguo. Asi la
    // memoria no crece aunque prueben miles de usuarios distintos.
    registros.delete(usuario);
    registros.set(usuario, registro);
    if (registros.size > maximoUsuarios) registros.delete(registros.keys().next().value);
    return consultar(usuario, momento);
  }

  return {
    consultar,
    registrarFallo,
    reiniciar: (usuario) => registros.delete(usuario),
    ocupar(usuario) {
      if (enCurso.has(usuario)) return false;
      enCurso.add(usuario);
      return true;
    },
    liberar: (usuario) => enCurso.delete(usuario),
    cantidad: () => registros.size
  };
}

/**
 * Ventana deslizante: cuenta los intentos del ultimo minuto.
 * @returns {{ registrar(ahora: Date): {permitido: boolean, segundos?: number} }}
 */
function crearLimiteGlobal({ maximo = 20, ventanaMs = MINUTO } = {}) {
  const intentos = [];

  function registrar(ahora) {
    const momento = ms(ahora);
    while (intentos.length > 0 && momento - intentos[0] >= ventanaMs) intentos.shift();
    if (intentos.length >= maximo) {
      return { permitido: false, segundos: segundosHasta(intentos[0] + ventanaMs, momento) };
    }
    intentos.push(momento);
    return { permitido: true };
  }

  return { registrar };
}

module.exports = { MENSAJES, crearBloqueoPorUsuario, crearLimiteGlobal };
