/**
 * Enlace «Responder por correo» de la bandeja de mensajes (M-08; RF-11, HU-15).
 *
 * La API solo acepta correos con letras sin tildes, números, punto, guion,
 * guion bajo y + (api/src/dominio/contacto.js). Aun así, aquí se vuelve a
 * comprobar: un correo con «?», «&», «%» o espacios podría agregar
 * destinatarios o cambiar el asunto del mailto:, y entonces no hay enlace.
 *
 * Función pura, probada con node --test.
 */

const PATRON_CORREO = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const ASUNTO_RESPUESTA = 'Respuesta a tu mensaje en la plataforma de información sobre el TEA';

/** @returns {string|null} mailto: con el asunto, o null si el correo no es seguro */
export function enlaceRespuesta(correo) {
  if (typeof correo !== 'string' || !PATRON_CORREO.test(correo)) return null;
  // El + del correo se codifica (%2B): algunos programas de correo lo leen como un espacio.
  const destinatario = correo.replace(/\+/g, '%2B');
  return `mailto:${destinatario}?subject=${encodeURIComponent(ASUNTO_RESPUESTA)}`;
}
