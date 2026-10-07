'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { MENSAJES: MENSAJES_GUARDADO, responderErrorDeGuardado } = require('../erroresDeGuardado');
const { validarCambioDeSlug } = require('../../dominio/edicionContenido');

/**
 * Rutas del panel para una coleccion que se carga desde una lista YAML de
 * api/contenidos: pasos de la ruta (T5) y directorio (T6). Van bajo
 * /api/admin, asi que pasan antes por exigirSesion (servidor.js).
 * M-08, RF-10, RS-05, RCN-01, RCN-02
 *
 * - GET    /       todos, publicados y borradores
 * - GET    /:id    uno, con todos sus campos
 * - POST   /       crear (borrador o publicado)
 * - PATCH  /:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 *
 * Toda escritura va por el repositorio, asi que el modelo aplica sus reglas
 * al guardar (RCN-01, RCN-02 y las de cada coleccion). Cada registro lleva
 * `archivo` (la ruta dentro de api/contenidos) si viene de la lista, o null;
 * su slug no se puede cambiar desde aqui.
 */

/** 422 con un mensaje por campo; `general` cuando el cuerpo entero no sirve. */
function responderDatosInvalidos(campos, res) {
  const error = campos.general || MENSAJES_GUARDADO.REVISA_CAMPOS;
  return res.status(422).json({ error, campos });
}

/**
 * @param {{repositorio: {obtenerPorId: Function, crear: Function, actualizar: Function},
 *   listar: () => Promise<object[]>, carga: {archivo: string, slugsDelArchivo: () => Promise<Set<string>>},
 *   leerCambios: (cuerpo: object) => ({cambios: object} | {errores: object}),
 *   noEncontrado: string, slugRepetido: string, slugDeArchivo: (archivo: string) => string}} configuracion
 *   `carga` es la de datos/sincronizacionListas.js; `leerCambios`, el lector
 *   del cuerpo de dominio/; los textos son los mensajes de cada coleccion
 */
function crearRutasAdminDeLista(configuracion) {
  const { repositorio, listar, carga, leerCambios, noEncontrado, slugRepetido, slugDeArchivo } = configuracion;
  const rutas = express.Router();
  const guardado = { slugRepetido };
  const conArchivo = (registro, slugs) => ({ ...registro, archivo: slugs.has(registro.slug) ? carga.archivo : null });

  rutas.get(
    '/',
    envolver(async (_req, res) => {
      const [lista, slugs] = await Promise.all([listar(), carga.slugsDelArchivo()]);
      res.json(lista.map((registro) => conArchivo(registro, slugs)));
    })
  );

  rutas.get(
    '/:id',
    envolver(async (req, res) => {
      const registro = await repositorio.obtenerPorId(req.params.id);
      if (!registro) return res.status(404).json({ error: noEncontrado });
      res.json(conArchivo(registro, await carga.slugsDelArchivo()));
    })
  );

  rutas.post(
    '/',
    envolver(async (req, res) => {
      const { cambios, errores } = leerCambios(req.body);
      if (errores) return responderDatosInvalidos(errores, res);
      try {
        const creado = await repositorio.crear(cambios);
        const registro = await repositorio.obtenerPorId(creado._id);
        return res.status(201).json(conArchivo(registro, await carga.slugsDelArchivo()));
      } catch (error) {
        return responderErrorDeGuardado(error, res, guardado);
      }
    })
  );

  rutas.patch(
    '/:id',
    envolver(async (req, res) => {
      const { cambios, errores } = leerCambios(req.body);
      if (errores) return responderDatosInvalidos(errores, res);

      const actual = await repositorio.obtenerPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: noEncontrado });
      const slugs = await carga.slugsDelArchivo();
      const archivo = slugs.has(actual.slug) ? carga.archivo : null;
      const errorSlug = validarCambioDeSlug(actual.slug, cambios, archivo, slugDeArchivo);
      if (errorSlug) return responderDatosInvalidos({ slug: errorSlug }, res);

      try {
        const actualizado = await repositorio.actualizar(req.params.id, cambios);
        if (!actualizado) return res.status(404).json({ error: noEncontrado });
        return res.json(conArchivo(await repositorio.obtenerPorId(actualizado._id), slugs));
      } catch (error) {
        return responderErrorDeGuardado(error, res, guardado);
      }
    })
  );

  return rutas;
}

module.exports = { crearRutasAdminDeLista };
