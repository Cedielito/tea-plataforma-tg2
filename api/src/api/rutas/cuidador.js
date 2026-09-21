'use strict';
const express = require('express');
const { ESCALAS, TOTAL_ITEMS, normalizarRespuesta } = require('../../dominio/indicadores/reporte');
const { exigirConsentimiento } = require('../middleware/exigirConsentimiento');

/**
 * Modulo de reporte del cuidador. Se administra en sesion independiente de la
 * del menor y admite avance guardado por item.
 */
function rutasCuidador(repositorio) {
  const router = express.Router();

  router.get('/reporte/instrumento', (_req, res) => {
    res.json({ escalas: ESCALAS, totalItems: TOTAL_ITEMS });
  });

  router.post('/:uuid/reporte', exigirConsentimiento(repositorio), async (req, res, next) => {
    try {
      const lote = Array.isArray(req.body.respuestas) ? req.body.respuestas : [];
      const invalidas = lote.filter((r) => normalizarRespuesta(r && r.respuesta) === null);
      if (invalidas.length) {
        return res.status(422).json({ error: 'respuesta_fuera_de_escala', items: invalidas.map((r) => r.item) });
      }
      const guardadas = await repositorio.guardarReporteCuidador(req.params.uuid, lote);
      res.status(201).json({ registradas: guardadas, totalItems: TOTAL_ITEMS });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { rutasCuidador };
