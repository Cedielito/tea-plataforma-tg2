'use strict';
const express = require('express');
const { generarSeudonimo } = require('../../dominio/privacidad/seudonimo');
const { modalidadAsentimiento } = require('../../dominio/privacidad/consentimiento');
const { tramoDeEdad } = require('../../dominio/minijuegos/catalogo');
const { planificarSesion } = require('../../dominio/minijuegos/secuenciador');

function rutasSesiones(repositorio) {
  const router = express.Router();

  // Crea la sesion bajo seudonimo. No recibe ningun dato identificable.
  router.post('/', async (req, res, next) => {
    try {
      const { edad, sexo, region } = req.body;
      const uuid = generarSeudonimo();
      const participante = await repositorio.crearParticipante({
        uuid, edad, tramo: tramoDeEdad(edad), sexo, region
      });
      res.status(201).json({
        uuid: participante.uuid,
        tramo: participante.tramo,
        modalidadAsentimiento: modalidadAsentimiento(edad)
      });
    } catch (e) { next(e); }
  });

  // Plan de la sesion: bloques, practica y pausas para el tramo del participante.
  router.get('/:uuid/plan', async (req, res, next) => {
    try {
      const participante = await repositorio.obtenerParticipante(req.params.uuid);
      if (!participante) return res.status(404).json({ error: 'sesion_no_encontrada' });
      const orden = req.query.orden ? String(req.query.orden).split(',') : null;
      res.json(planificarSesion(participante.edad, orden));
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { rutasSesiones };
