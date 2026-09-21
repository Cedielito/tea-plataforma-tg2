'use strict';
const express = require('express');
const { planificarSupresion } = require('../../dominio/privacidad/consentimiento');

/**
 * CT-12, HU-10 y RF-09/RF-10. Revocacion del consentimiento con supresion
 * efectiva de los datos conductuales del seudonimo.
 *
 * No pasa por exigirConsentimiento: esa puerta rechaza un consentimiento ya
 * revocado, y revocar dos veces debe responder 200, no 403.
 *
 * Pendiente: esta ruta aun no exige autenticacion del acudiente, porque las
 * cuentas son otra tarea del Sprint 1. Ver docs/decisiones/0003.
 */
function rutasRevocacion(repositorio) {
  const router = express.Router();

  router.post('/:uuid/revocacion', async (req, res, next) => {
    try {
      const uuid = req.params.uuid;
      const registro = await repositorio.obtenerConsentimiento(uuid);
      if (!registro) return res.status(404).json({ error: 'consentimiento_no_encontrado' });

      const plan = planificarSupresion(registro, new Date());

      // Primero la constancia, despues el borrado: asi exigirConsentimiento ya
      // rechaza cualquier lote en vuelo y no queda escritura posterior a la
      // supresion. La supresion corre tambien si ya estaba revocado, para
      // terminar un borrado que hubiera quedado a medias.
      const marcado = await repositorio.marcarConsentimientoRevocado(uuid, plan.consentimiento.fechaRevocacion);
      const suprimido = await repositorio.suprimirDatosSesion(uuid);

      res.json({
        uuid,
        revocado: true,
        fechaRevocacion: marcado.consentimiento.fechaRevocacion,
        yaEstabaRevocado: plan.yaEstabaRevocado,
        suprimido,
        conservado: plan.conservar
      });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { rutasRevocacion };
