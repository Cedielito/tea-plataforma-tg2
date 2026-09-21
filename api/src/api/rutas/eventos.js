'use strict';
const express = require('express');
const { contieneDatoIdentificable } = require('../../dominio/privacidad/seudonimo');
const { exigirConsentimiento } = require('../middleware/exigirConsentimiento');

function rutasEventos(repositorio) {
  const router = express.Router();

  router.post('/:uuid/eventos', exigirConsentimiento(repositorio), async (req, res, next) => {
    try {
      const lote = Array.isArray(req.body.eventos) ? req.body.eventos : [];
      // CT-11. Rechaza cualquier evento que traiga campos identificables.
      if (lote.some(contieneDatoIdentificable)) {
        return res.status(422).json({ error: 'dato_identificable_en_evento_conductual' });
      }
      const guardados = await repositorio.guardarEventos(req.params.uuid, lote);
      res.status(201).json({ registrados: guardados });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { rutasEventos };
