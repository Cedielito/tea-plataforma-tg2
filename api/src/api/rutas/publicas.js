'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { leerFiltrosContenidos } = require('../../dominio/contenidos');
const { leerConsulta } = require('../../dominio/busqueda');
const { esSlugValido } = require('../../dominio/slug');
const contenidos = require('../../datos/repositorios/contenidos');
const preguntas = require('../../datos/repositorios/preguntas');
const recursos = require('../../datos/repositorios/recursos');
const pasosRuta = require('../../datos/repositorios/pasosRuta');
const entidadesDirectorio = require('../../datos/repositorios/entidadesDirectorio');

/**
 * Rutas publicas de solo lectura. M-01, M-02, M-03, M-04, M-05, M-06, RF-02,
 * RF-03, RF-04, RF-05, RF-06, RF-07, RF-12, RCN-01, RCN-02, RS-01, RS-03, RS-07
 *
 * Solo devuelven lo publicado, con sus fuentes y su fecha de revision. No piden
 * registro ni guardan nada de quien consulta. Las rutas de escritura van en
 * /api/admin y llegan con la autenticacion de T4.
 *
 * /pasos-ruta devuelve todos los pasos publicados y no recibe respuestas: la
 * guia elige en el navegador los que corresponden (RF-04, RS-01). Si llegan
 * parametros en la consulta, se ignoran.
 *
 * /directorio devuelve todas las entidades publicadas, sin filtros: la web
 * filtra por ciudad y tipo en el navegador, asi que la ciudad que elige la
 * persona en la guia de la ruta no llega a la API (RF-04, RS-01). Sin la
 * constancia de autorizacion de los profesionales (RS-07).
 *
 * /preguntas, /recursos y /buscar identifican cada pregunta y cada recurso por
 * su slug, sin el _id: la web enlaza cada pregunta como
 * /preguntas-frecuentes#slug.
 *
 * /paginas/:slug devuelve una pagina fija de api/contenidos/paginas (M-06,
 * RF-12, RS-03): la politica de privacidad, con su version, su vigencia y el
 * texto de la casilla del formulario de contacto, y «Acerca de». No estan en
 * la base ni se editan desde el panel (datos/paginasFijas.js).
 */

const NO_ENCONTRADO = 'Contenido no encontrado.';
const PAGINA_NO_ENCONTRADA = 'Página no encontrada.';

/** @param {{paginas: {obtener: (slug: string) => Promise<object|null>}}} opciones */
function crearRutasPublicas({ paginas }) {
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
    '/pasos-ruta',
    envolver(async (_req, res) => {
      res.json(await pasosRuta.listarPublicados());
    })
  );

  rutas.get(
    '/directorio',
    envolver(async (_req, res) => {
      res.json(await entidadesDirectorio.listarPublicadas());
    })
  );

  rutas.get(
    '/paginas/:slug',
    envolver(async (req, res) => {
      const { slug } = req.params;
      const pagina = esSlugValido(slug) ? await paginas.obtener(slug) : null;
      if (!pagina) return res.status(404).json({ error: PAGINA_NO_ENCONTRADA });
      res.json(pagina);
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
