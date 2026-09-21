'use strict';
const { puedeIniciarSesion } = require('../../dominio/privacidad/consentimiento');

/**
 * CT-12 y CT-14. Puerta unica de acceso al registro conductual: ninguna ruta
 * que escriba eventos puede ejecutarse sin consentimiento vigente y
 * asentimiento aceptado.
 */
function exigirConsentimiento(repositorio) {
  return async function (req, res, next) {
    try {
      const uuid = req.params.uuid || req.body.uuid;
      const registro = await repositorio.obtenerConsentimiento(uuid);
      const veredicto = puedeIniciarSesion({
        consentimiento: registro,
        asentimiento: registro && registro.asentimiento
      });
      if (!veredicto.permitido) {
        return res.status(403).json({ error: veredicto.motivo, detalle: veredicto.detalle || null });
      }
      req.consentimiento = registro;
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

module.exports = { exigirConsentimiento };
