'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { MENSAJES: MENSAJES_GUARDADO, responderErrorDeGuardado } = require('../erroresDeGuardado');
const pasosRuta = require('../../datos/repositorios/pasosRuta');
const { cargaPasosRuta } = require('../../datos/sincronizacionListas');
const { validarCambioDeSlug } = require('../../dominio/edicionContenido');
const { MENSAJES, leerCambiosPasoRuta } = require('../../dominio/edicionPasoRuta');

/**
 * Pasos de la ruta en el panel, bajo /api/admin/pasos-ruta y por eso detras
 * de exigirSesion (servidor.js). M-03, M-08, RF-10, RS-05, RCN-01, RCN-02
 *
 * - GET    /       todos, publicados y borradores
 * - GET    /:id    uno, con texto, tipos de entidad y fuentes
 * - POST   /       crear (borrador o publicado)
 * - PATCH  /:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 *
 * Toda escritura va por el repositorio, asi que el modelo rechaza publicar
 * sin fuente ni fecha de revision (RCN-01, RCN-02). Cada paso lleva `archivo`
 * ('ruta/pasos.yaml') si viene de api/contenidos, o null; su slug no se puede
 * cambiar desde aqui.
 */

const NO_ENCONTRADO = 'Paso no encontrado.';
const GUARDADO = { slugRepetido: MENSAJES_GUARDADO.SLUG_REPETIDO_PASO };

const conArchivo = (paso, slugs) => ({ ...paso, archivo: slugs.has(paso.slug) ? cargaPasosRuta.archivo : null });

/** 422 con un mensaje por campo; `general` cuando el cuerpo entero no sirve. */
function responderDatosInvalidos(campos, res) {
  const error = campos.general || MENSAJES_GUARDADO.REVISA_CAMPOS;
  return res.status(422).json({ error, campos });
}

function crearRutasAdminPasosRuta() {
  const rutas = express.Router();

  rutas.get(
    '/',
    envolver(async (_req, res) => {
      const [lista, slugs] = await Promise.all([pasosRuta.listarTodos(), cargaPasosRuta.slugsDelArchivo()]);
      res.json(lista.map((paso) => conArchivo(paso, slugs)));
    })
  );

  rutas.get(
    '/:id',
    envolver(async (req, res) => {
      const paso = await pasosRuta.obtenerPorId(req.params.id);
      if (!paso) return res.status(404).json({ error: NO_ENCONTRADO });
      res.json(conArchivo(paso, await cargaPasosRuta.slugsDelArchivo()));
    })
  );

  rutas.post(
    '/',
    envolver(async (req, res) => {
      const { cambios, errores } = leerCambiosPasoRuta(req.body);
      if (errores) return responderDatosInvalidos(errores, res);
      try {
        const creado = await pasosRuta.crear(cambios);
        const paso = await pasosRuta.obtenerPorId(creado._id);
        return res.status(201).json(conArchivo(paso, await cargaPasosRuta.slugsDelArchivo()));
      } catch (error) {
        return responderErrorDeGuardado(error, res, GUARDADO);
      }
    })
  );

  rutas.patch(
    '/:id',
    envolver(async (req, res) => {
      const { cambios, errores } = leerCambiosPasoRuta(req.body);
      if (errores) return responderDatosInvalidos(errores, res);

      const actual = await pasosRuta.obtenerPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: NO_ENCONTRADO });
      const slugs = await cargaPasosRuta.slugsDelArchivo();
      const archivo = slugs.has(actual.slug) ? cargaPasosRuta.archivo : null;
      const errorSlug = validarCambioDeSlug(actual.slug, cambios, archivo, MENSAJES.SLUG_DE_ARCHIVO);
      if (errorSlug) return responderDatosInvalidos({ slug: errorSlug }, res);

      try {
        const guardado = await pasosRuta.actualizar(req.params.id, cambios);
        if (!guardado) return res.status(404).json({ error: NO_ENCONTRADO });
        return res.json(conArchivo(await pasosRuta.obtenerPorId(guardado._id), slugs));
      } catch (error) {
        return responderErrorDeGuardado(error, res, GUARDADO);
      }
    })
  );

  return rutas;
}

module.exports = { crearRutasAdminPasosRuta };
