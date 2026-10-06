'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const { crearExigirSesion } = require('./autenticacion');
const { crearRutasPublicas } = require('./rutas/publicas');
const { crearRutasSesion } = require('./rutas/sesion');
const { crearRutasAdmin } = require('./rutas/admin');

/**
 * Servidor HTTP de la Fase I: estado del servicio, rutas publicas de
 * contenidos, preguntas frecuentes, recursos y buscador (T2), inicio de sesion
 * y panel de administracion (T4). Las rutas de directorio y contacto se
 * agregan en sus tareas del backlog (T5 a T8).
 *
 * RS-05: todo /api/admin/* pasa primero por exigirSesion, sin excepciones
 * (tambien las rutas que no existen responden 401 sin sesion). El inicio de
 * sesion vive aparte, en POST /api/sesion.
 *
 * @param {{ahora?: () => Date, produccion?: boolean, registro?: Console}} opciones
 *   el reloj y el registro se pueden cambiar en las pruebas; `produccion`
 *   decide si la cookie de sesion lleva Secure (por defecto, NODE_ENV=production)
 */
function crearServidor({
  ahora = () => new Date(),
  produccion = process.env.NODE_ENV === 'production',
  registro = console
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  const salud = (_req, res) => res.json({ estado: 'ok' });
  app.get('/salud', salud);
  app.get('/api/salud', salud);

  app.use('/api/sesion', crearRutasSesion({ ahora, produccion, registro }));
  app.use('/api/admin', crearExigirSesion({ ahora, produccion }), crearRutasAdmin({ produccion }));
  app.use('/api', crearRutasPublicas());

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

  app.use(manejarError);
  return app;
}

const JSON_INVALIDO = 'Los datos enviados no son un JSON válido.';

/**
 * Errores del cliente (4xx: validacion, JSON mal formado, cuerpo muy grande)
 * se devuelven con su mensaje; cualquier otro se responde como error interno
 * sin exponer detalles. El JSON mal formado responde con un texto fijo: el
 * mensaje del analizador repite parte de lo enviado, que en el inicio de
 * sesion podria ser la contrasena.
 */
function manejarError(err, _req, res, _next) {
  const esDelCliente = Number.isInteger(err.status) && err.status >= 400 && err.status < 500;
  const codigo = esDelCliente ? err.status : 500;
  let mensaje = esDelCliente ? err.message : 'Error interno del servidor';
  if (err.type === 'entity.parse.failed') mensaje = JSON_INVALIDO;
  res.status(codigo).json({ error: mensaje });
}

module.exports = { crearServidor, manejarError, JSON_INVALIDO };
