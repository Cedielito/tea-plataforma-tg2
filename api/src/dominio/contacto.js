'use strict';

/**
 * Reglas del formulario de contacto y de los mensajes recibidos. M-06, RF-08,
 * RF-11, RS-02, RS-03, RS-04
 *
 * - RS-02: solo se reciben el correo, el mensaje, la autorizacion y la
 *   version de la politica que se mostro. Cualquier otro campo (un nombre, un
 *   telefono) se rechaza: el servidor no recoge mas datos de los que pide la
 *   politica. La autorizacion tiene que ser exactamente `true`.
 * - RS-03: la version enviada debe ser la vigente; si la politica cambio
 *   mientras la persona escribia, tiene que leerla y aceptarla de nuevo.
 * - El correo usa un juego de caracteres seguro (letras sin tildes, numeros,
 *   punto, guion, guion bajo y +): asi el enlace mailto: de la bandeja no se
 *   puede manipular con «?», «&» o «%».
 * - El mensaje se guarda como texto plano: se quitan los caracteres de
 *   control y la bandeja nunca lo interpreta como HTML ni Markdown.
 * - Limites: 5 envios por IP cada 15 minutos y 40 por hora en total (LIMITES).
 * - RS-04: cada mensaje se suprime de forma automatica a los 180 dias de
 *   recibido. Seis meses de calendario son de 181 a 184 dias: asi se borra
 *   unos dias antes de cumplirse los seis meses, nunca despues.
 *
 * Funciones puras. La ruta (api/rutas/contacto.js) aplica los limites de
 * envios y guarda.
 */

const CAMPOS = Object.freeze(['correo', 'mensaje', 'autorizacion', 'versionPolitica']);

const LARGO_MAXIMO_CORREO = 254;
const LARGO_MAXIMO_MENSAJE = 2000;

const DIAS_CONSERVACION = 180;
const SEGUNDOS_CONSERVACION = DIAS_CONSERVACION * 24 * 60 * 60;

/**
 * Limites de envios, en memoria (dominio/limiteIntentos.js): por IP y en
 * total. La IP solo se usa como clave del limite mientras dura su ventana; no
 * se guarda con el mensaje ni se escribe en el registro.
 */
const MINUTO = 60 * 1000;
const LIMITES = Object.freeze({
  porIp: Object.freeze({ maximo: 5, ventanaMs: 15 * MINUTO }),
  total: Object.freeze({ maximo: 40, ventanaMs: 60 * MINUTO })
});

const PATRON_CORREO = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** Caracteres de control salvo el salto de linea y la tabulacion. */
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

const MENSAJES = Object.freeze({
  SOLO_CAMPOS: 'El formulario solo recibe el correo, el mensaje y la autorización.',
  CORREO_FALTA: 'Escribe tu correo electrónico.',
  CORREO_INVALIDO:
    'Escribe un correo válido, como nombre@correo.com. Puede tener letras sin tildes, números, punto, guion, guion bajo y +.',
  CORREO_LARGO: `El correo puede tener como máximo ${LARGO_MAXIMO_CORREO} caracteres.`,
  MENSAJE_FALTA: 'Escribe tu mensaje.',
  MENSAJE_LARGO: `El mensaje puede tener como máximo ${LARGO_MAXIMO_MENSAJE} caracteres.`,
  SIN_AUTORIZACION: 'Para enviar el mensaje, marca la casilla de autorización de tratamiento de datos.',
  SIN_VERSION: 'Falta la versión de la política de privacidad. Recarga la página e intenta de nuevo.',
  POLITICA_CAMBIO:
    'La política de privacidad cambió mientras escribías. Lee el texto nuevo de la casilla y vuelve a marcarla.',
  SIN_POLITICA: 'El formulario de contacto no está disponible en este momento. Intenta de nuevo más tarde.',
  REVISA_CAMPOS: 'No pudimos enviar tu mensaje. Revisa los campos marcados.',
  DEMASIADOS_POR_IP: 'Ya se enviaron varios mensajes desde tu conexión. Espera 15 minutos e intenta de nuevo.',
  DEMASIADOS_EN_TOTAL: 'Estamos recibiendo muchos mensajes en este momento. Intenta de nuevo en una hora.'
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

/** Largo en caracteres visibles, no en unidades UTF-16 (un emoji cuenta como uno). */
const largo = (texto) => [...texto].length;

function leerCorreo(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') return { error: MENSAJES.CORREO_FALTA };
  const correo = valor.trim();
  if (correo.length > LARGO_MAXIMO_CORREO) return { error: MENSAJES.CORREO_LARGO };
  if (!PATRON_CORREO.test(correo) || correo.includes('..')) return { error: MENSAJES.CORREO_INVALIDO };
  return { valor: correo };
}

function leerTextoMensaje(valor) {
  if (typeof valor !== 'string') return { error: MENSAJES.MENSAJE_FALTA };
  const mensaje = valor.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '').trim();
  if (mensaje === '') return { error: MENSAJES.MENSAJE_FALTA };
  if (largo(mensaje) > LARGO_MAXIMO_MENSAJE) return { error: MENSAJES.MENSAJE_LARGO };
  return { valor: mensaje };
}

/**
 * Lee el cuerpo de POST /api/contacto.
 * @returns {{datos: {correo: string, mensaje: string, versionPolitica: string}}
 *   | {errores: Object<string, string>}} un mensaje por campo; `general` si
 *   llegan campos de mas o el cuerpo no es un objeto
 */
function leerMensajeContacto(cuerpo) {
  if (!esObjeto(cuerpo)) return { errores: { general: MENSAJES.SOLO_CAMPOS } };
  if (Object.keys(cuerpo).some((campo) => !CAMPOS.includes(campo))) {
    return { errores: { general: MENSAJES.SOLO_CAMPOS } };
  }

  const errores = {};
  const correo = leerCorreo(cuerpo.correo);
  if (correo.error) errores.correo = correo.error;
  const mensaje = leerTextoMensaje(cuerpo.mensaje);
  if (mensaje.error) errores.mensaje = mensaje.error;
  if (cuerpo.autorizacion !== true) errores.autorizacion = MENSAJES.SIN_AUTORIZACION;
  const version = typeof cuerpo.versionPolitica === 'string' ? cuerpo.versionPolitica.trim() : '';
  if (!version) errores.versionPolitica = MENSAJES.SIN_VERSION;
  if (Object.keys(errores).length > 0) return { errores };

  return { datos: { correo: correo.valor, mensaje: mensaje.valor, versionPolitica: version } };
}

/** Dia en que MongoDB suprime el mensaje (RS-04), para mostrarlo en la bandeja. */
function fechaDeSupresion(fecha) {
  return new Date(new Date(fecha).getTime() + SEGUNDOS_CONSERVACION * 1000);
}

module.exports = {
  CAMPOS,
  LARGO_MAXIMO_CORREO,
  LARGO_MAXIMO_MENSAJE,
  DIAS_CONSERVACION,
  SEGUNDOS_CONSERVACION,
  LIMITES,
  PATRON_CORREO,
  MENSAJES,
  leerMensajeContacto,
  fechaDeSupresion
};
