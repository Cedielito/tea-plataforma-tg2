'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { NOMBRE_COOKIE, opcionesCookie } = require('../autenticacion');
const { MENSAJES: MENSAJES_GUARDADO, responderErrorDeGuardado } = require('../erroresDeGuardado');
const administradores = require('../../datos/repositorios/administradores');
const contenidos = require('../../datos/repositorios/contenidos');
const { archivosPorSlug } = require('../../datos/sincronizacionContenidos');
const { leerCambiosContenido, validarCambioDeSlug } = require('../../dominio/edicionContenido');
const { crearRutasAdminPasosRuta } = require('./adminPasosRuta');
const { crearRutasAdminDirectorio } = require('./adminDirectorio');

/**
 * Rutas del panel de administracion, todas detras de exigirSesion (ver
 * servidor.js). M-03, M-04, M-08, RF-09, RF-10, RS-05, RCN-01, RCN-02
 *
 * - GET    /sesion            administrador de la sesion
 * - DELETE /sesion            cerrar sesion (la borra de la base)
 * - GET    /contenidos        todos, publicados y borradores
 * - GET    /contenidos/:id    uno, con cuerpo y fuentes
 * - POST   /contenidos        crear (borrador o publicado)
 * - PATCH  /contenidos/:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 * - /pasos-ruta                pasos de la ruta de atencion (adminPasosRuta.js)
 * - /directorio                entidades del directorio (adminDirectorio.js)
 *
 * Toda escritura va por los repositorios (crear, actualizar), asi que el
 * modelo rechaza publicar sin fuente ni fecha de revision (RCN-01, RCN-02).
 * Cada contenido lleva `archivo` con el nombre del archivo de api/contenidos
 * del que viene, o null: el editor avisa que ese archivo puede reemplazar los
 * cambios hechos en el panel.
 */

const NO_ENCONTRADO = 'Contenido no encontrado.';

const conArchivo = (contenido, indice) => ({ ...contenido, archivo: indice.get(contenido.slug) || null });

/** 422 con un mensaje por campo; `general` cuando el cuerpo entero no sirve. */
function responderDatosInvalidos(campos, res) {
  const error = campos.general || MENSAJES_GUARDADO.REVISA_CAMPOS;
  return res.status(422).json({ error, campos });
}

function crearRutasAdmin({ produccion }) {
  const rutas = express.Router();
  const cookie = opcionesCookie({ produccion });

  rutas.get('/sesion', (req, res) => {
    res.json({ usuario: req.administrador.usuario });
  });

  rutas.delete(
    '/sesion',
    envolver(async (req, res) => {
      await administradores.cerrarSesion(req.administrador.tokenHash);
      res.clearCookie(NOMBRE_COOKIE, cookie);
      res.status(204).end();
    })
  );

  rutas.get(
    '/contenidos',
    envolver(async (_req, res) => {
      const [lista, indice] = await Promise.all([contenidos.listarTodos(), archivosPorSlug()]);
      res.json(lista.map((contenido) => conArchivo(contenido, indice)));
    })
  );

  rutas.get(
    '/contenidos/:id',
    envolver(async (req, res) => {
      const contenido = await contenidos.obtenerPorId(req.params.id);
      if (!contenido) return res.status(404).json({ error: NO_ENCONTRADO });
      res.json(conArchivo(contenido, await archivosPorSlug()));
    })
  );

  rutas.post(
    '/contenidos',
    envolver(async (req, res) => {
      const { cambios, errores } = leerCambiosContenido(req.body);
      if (errores) return responderDatosInvalidos(errores, res);
      try {
        const creado = await contenidos.crear(cambios);
        const contenido = await contenidos.obtenerPorId(creado._id);
        return res.status(201).json(conArchivo(contenido, await archivosPorSlug()));
      } catch (error) {
        return responderErrorDeGuardado(error, res);
      }
    })
  );

  rutas.patch(
    '/contenidos/:id',
    envolver(async (req, res) => {
      const { cambios, errores } = leerCambiosContenido(req.body);
      if (errores) return responderDatosInvalidos(errores, res);

      const actual = await contenidos.obtenerPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: NO_ENCONTRADO });
      const indice = await archivosPorSlug();
      const errorSlug = validarCambioDeSlug(actual.slug, cambios, indice.get(actual.slug) || null);
      if (errorSlug) return responderDatosInvalidos({ slug: errorSlug }, res);

      try {
        const guardado = await contenidos.actualizar(req.params.id, cambios);
        if (!guardado) return res.status(404).json({ error: NO_ENCONTRADO });
        return res.json(conArchivo(await contenidos.obtenerPorId(guardado._id), indice));
      } catch (error) {
        return responderErrorDeGuardado(error, res);
      }
    })
  );

  rutas.use('/pasos-ruta', crearRutasAdminPasosRuta());
  rutas.use('/directorio', crearRutasAdminDirectorio());

  return rutas;
}

module.exports = { crearRutasAdmin };
