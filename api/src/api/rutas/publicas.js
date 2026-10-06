'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { leerFiltrosContenidos } = require('../../dominio/contenidos');
const { leerConsulta } = require('../../dominio/busqueda');
const { esSlugValido } = require('../../dominio/slug');
const contenidos = require('../../datos/repositorios/contenidos');
const preguntas = require('../../datos/repositorios/preguntas');
const recursos = require('../../datos/repositorios/recursos');

/**
 * Rutas publicas de solo lectura. M-01, M-02, M-05, RF-02, RF-03, RF-06, RF-07,
 * RCN-01, RCN-02, RS-01
 *
 * Solo devuelven lo publicado, con sus fuentes y su fecha de revision. No piden
 * registro ni guardan nada de quien consulta. Las rutas de escritura van en
 * /api/admin y llegan con la autenticacion de T4.
 */

const NO_ENCONTRADO = 'Contenido no encontrado.';

function crearRutasPublicas() {
  const rutas = express.Router();

  rutas.get(
    '/contenidos',
    envolver(async (req, res) => {
      const { filtros, error } = leerFiltrosContenidos(req.query);
      if (error) return res.status(400).json({ error });
      res.json(await contenidos.listarPublicados(filtros));
    })
  );

  rutas.get(
    '/contenidos/:slug',
    envolver(async (req, res) => {
      const { slug } = req.params;
      const contenido = esSlugValido(slug) ? await contenidos.obtenerPublicadoPorSlug(slug) : null;
      if (!contenido) return res.status(404).json({ error: NO_ENCONTRADO });
      res.json(contenido);
    })
  );

  rutas.get(
    '/preguntas',
    envolver(async (_req, res) => {
      res.json(await preguntas.listarPublicadas());
    })
  );

  rutas.get(
    '/recursos',
    envolver(async (_req, res) => {
      res.json(await recursos.listarPublicados());
    })
  );

  rutas.get(
    '/buscar',
    envolver(async (req, res) => {
      const { palabras, error } = leerConsulta(req.query.q);
      if (error) return res.status(400).json({ error });
      const [contenidosEncontrados, preguntasEncontradas] = await Promise.all([
        contenidos.buscarPublicados(palabras),
        preguntas.buscarPublicadas(palabras)
      ]);
      res.json({ contenidos: contenidosEncontrados, preguntas: preguntasEncontradas });
    })
  );

  return rutas;
}

module.exports = { crearRutasPublicas };
