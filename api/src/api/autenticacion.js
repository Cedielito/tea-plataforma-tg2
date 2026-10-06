'use strict';
const administradores = require('../datos/repositorios/administradores');
const { MENSAJES, esTokenConFormato, hashToken, sesionVigente } = require('../dominio/autenticacion');

/**
 * Cookie de sesion y middleware que protege /api/admin/*. M-08, RF-09, RS-05
 *
 * Cookie `sesion_admin`:
 * - HttpOnly: el JavaScript de la pagina no la puede leer.
 * - SameSite=Strict: el navegador no la envia desde otros sitios (CSRF). La
 *   web y la API comparten dominio gracias al reenvio de Vercel
 *   (docs/despliegue.md), asi que la web si la recibe.
 * - Secure en produccion (NODE_ENV=production): solo viaja por HTTPS.
 * - Path=/api/admin: solo se envia a las rutas del panel.
 * - Sin Max-Age: el navegador la borra al cerrarse. El vencimiento real (30
 *   minutos sin actividad, 8 horas en total) lo controla el servidor.
 *
 * El token nunca se escribe en el registro ni se devuelve en una respuesta.
 */

const NOMBRE_COOKIE = 'sesion_admin';
const RUTA_COOKIE = '/api/admin';

function opcionesCookie({ produccion }) {
  return { httpOnly: true, sameSite: 'strict', secure: produccion, path: RUTA_COOKIE };
}

/** Las respuestas del panel y del inicio de sesion no se guardan en cache. */
function sinCache(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/**
 * @param {{ahora: () => Date, produccion: boolean}} opciones
 * @returns middleware que deja en req.administrador {_id, usuario,
 *   fechaUltimoAcceso, tokenHash} o responde 401
 */
function crearExigirSesion({ ahora, produccion }) {
  const cookie = opcionesCookie({ produccion });

  function rechazar(req, res) {
    if (req.cookies && req.cookies[NOMBRE_COOKIE] !== undefined) res.clearCookie(NOMBRE_COOKIE, cookie);
    res.status(401).json({ error: MENSAJES.SIN_SESION });
  }

  return async function exigirSesion(req, res, next) {
    try {
      res.set('Cache-Control', 'no-store');
      const token = req.cookies && req.cookies[NOMBRE_COOKIE];
      if (!esTokenConFormato(token)) return rechazar(req, res);

      const tokenHash = hashToken(token);
      const encontrado = await administradores.buscarPorSesion(tokenHash);
      const momento = ahora();
      if (!encontrado || !sesionVigente(encontrado.sesion, momento)) {
        if (encontrado) await administradores.cerrarSesion(tokenHash);
        return rechazar(req, res);
      }

      await administradores.registrarActividad(tokenHash, momento);
      const { _id, usuario, fechaUltimoAcceso } = encontrado;
      req.administrador = { _id, usuario, fechaUltimoAcceso, tokenHash };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { NOMBRE_COOKIE, RUTA_COOKIE, opcionesCookie, sinCache, crearExigirSesion };
