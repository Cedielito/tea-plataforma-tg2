'use strict';
const express = require('express');
const { puntuar } = require('../../dominio/puntuacion/motor');

function rutasPuntuacion(repositorio) {
  const router = express.Router();

  router.get('/:uuid/puntuacion', async (req, res, next) => {
    try {
      const sesion = await repositorio.armarSesionParaPuntuar(req.params.uuid);
      if (!sesion) return res.status(404).json({ error: 'sesion_no_encontrada' });
      const resultado = puntuar(sesion);
      if (!resultado.procesada) return res.status(409).json(resultado);
      await repositorio.guardarPuntuacion(resultado);
      res.json(resultado);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { rutasPuntuacion };
