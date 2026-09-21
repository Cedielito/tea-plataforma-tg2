'use strict';
const express = require('express');
const { rutasSesiones } = require('./rutas/sesiones');
const { rutasEventos } = require('./rutas/eventos');
const { rutasPuntuacion } = require('./rutas/puntuacion');
const { rutasCuidador } = require('./rutas/cuidador');

function crearServidor(repositorio) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.get('/salud', (_req, res) => res.json({ estado: 'ok' }));
  app.use('/api/sesiones', rutasSesiones(repositorio));
  app.use('/api/sesiones', rutasEventos(repositorio));
  app.use('/api/sesiones', rutasPuntuacion(repositorio));
  app.use('/api/sesiones', rutasCuidador(repositorio));
  app.use((err, _req, res, _next) => {
    const codigo = err instanceof RangeError || err instanceof TypeError ? 400 : 500;
    res.status(codigo).json({ error: err.message });
  });
  return app;
}

module.exports = { crearServidor };
