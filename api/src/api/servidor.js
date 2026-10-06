'use strict';
const express = require('express');
const { crearRutasPublicas } = require('./rutas/publicas');

/**
 * Servidor HTTP de la Fase I: estado del servicio y rutas publicas de
 * contenidos, preguntas frecuentes, recursos y buscador (T2). Las rutas de
 * directorio, contacto y administracion se agregan en sus tareas del backlog
 * (T4 a T8).
 */
function crearServidor() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const salud = (_req, res) => res.json({ estado: 'ok' });
  app.get('/salud', salud);
  app.get('/api/salud', salud);

  app.use('/api', crearRutasPublicas());

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

  app.use(manejarError);
  return app;
}

/**
 * Errores del cliente (4xx: validacion, JSON mal formado, cuerpo muy grande)
 * se devuelven con su mensaje; cualquier otro se responde como error interno
 * sin exponer detalles.
 */
function manejarError(err, _req, res, _next) {
  const esDelCliente = Number.isInteger(err.status) && err.status >= 400 && err.status < 500;
  const codigo = esDelCliente ? err.status : 500;
  res.status(codigo).json({ error: esDelCliente ? err.message : 'Error interno del servidor' });
}

module.exports = { crearServidor, manejarError };
