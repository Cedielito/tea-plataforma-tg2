'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const mensajesContacto = require('../../datos/repositorios/mensajesContacto');
const { fechaDeSupresion } = require('../../dominio/contacto');

/**
 * Bandeja de mensajes de contacto en el panel, bajo /api/admin/mensajes y por
 * eso detras de exigirSesion (servidor.js). M-06, M-08, RF-11, RS-04, RS-05
 *
 * - GET    /       todos, del mas reciente al mas antiguo, con la fecha en
 *                   que MongoDB los suprimira (`fechaSupresion`, calculada:
 *                   no se guarda)
 * - DELETE /:id    eliminar uno: 204, o 404 si no existe
 *
 * Los mensajes no se editan. La web los muestra como texto plano.
 */

const NO_ENCONTRADO = 'Mensaje no encontrado.';

function crearRutasAdminMensajes() {
  const rutas = express.Router();

  rutas.get(
    '/',
    envolver(async (_req, res) => {
      const lista = await mensajesContacto.listar();
      res.json(lista.map((mensaje) => ({ ...mensaje, fechaSupresion: fechaDeSupresion(mensaje.fecha) })));
    })
  );

  rutas.delete(
    '/:id',
    envolver(async (req, res) => {
      const eliminado = await mensajesContacto.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: NO_ENCONTRADO });
      return res.status(204).end();
    })
  );

  return rutas;
}

module.exports = { crearRutasAdminMensajes };
