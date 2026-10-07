/**
 * Validación del formulario de contacto en el navegador (M-06; RF-08, RS-02;
 * RA-11). Repite las reglas de la API (api/src/dominio/contacto.js) para
 * avisar antes de enviar; la API las vuelve a aplicar.
 *
 * Funciones puras, probadas con node --test.
 */

export const LARGO_MAXIMO_CORREO = 254;
export const LARGO_MAXIMO_MENSAJE = 2000;

/** Letras sin tildes, números, punto, guion, guion bajo y +, como en la API. */
const PATRON_CORREO = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const MENSAJES = Object.freeze({
  CORREO_FALTA: 'Escribe tu correo electrónico.',
  CORREO_INVALIDO:
    'Escribe un correo válido, como nombre@correo.com. Puede tener letras sin tildes, números, punto, guion, guion bajo y +.',
  CORREO_LARGO: `El correo puede tener como máximo ${LARGO_MAXIMO_CORREO} caracteres.`,
  MENSAJE_FALTA: 'Escribe tu mensaje.',
  MENSAJE_LARGO: `El mensaje puede tener como máximo ${LARGO_MAXIMO_MENSAJE} caracteres.`,
  SIN_AUTORIZACION: 'Para enviar el mensaje, marca la casilla de autorización de tratamiento de datos.'
});

/** Caracteres visibles, no unidades UTF-16: un emoji cuenta como uno, igual que en la API. */
export const contarCaracteres = (texto) => [...texto.replace(/\r\n?/g, '\n').trim()].length;

/**
 * @param {{correo: string, mensaje: string, autorizacion: boolean}} valores
 * @returns {Object<string, string>} un mensaje por campo con error; vacío si todo está bien
 */
export function validarContacto({ correo, mensaje, autorizacion }) {
  const errores = {};
  const correoLimpio = correo.trim();
  if (correoLimpio === '') errores.correo = MENSAJES.CORREO_FALTA;
  else if (correoLimpio.length > LARGO_MAXIMO_CORREO) errores.correo = MENSAJES.CORREO_LARGO;
  else if (!PATRON_CORREO.test(correoLimpio) || correoLimpio.includes('..')) errores.correo = MENSAJES.CORREO_INVALIDO;

  const caracteres = contarCaracteres(mensaje);
  if (caracteres === 0) errores.mensaje = MENSAJES.MENSAJE_FALTA;
  else if (caracteres > LARGO_MAXIMO_MENSAJE) errores.mensaje = MENSAJES.MENSAJE_LARGO;

  if (autorizacion !== true) errores.autorizacion = MENSAJES.SIN_AUTORIZACION;
  return errores;
}

/** Cuerpo de POST /api/contacto: solo lo que pide la política, nada más (RS-02). */
export function cuerpoDelEnvio({ correo, mensaje, autorizacion }, versionPolitica) {
  return { correo: correo.trim(), mensaje, autorizacion: autorizacion === true, versionPolitica };
}
