'use strict';
const express = require('express');
const { planificarSesion } = require('../../dominio/registro/secuenciador');

/**
 * Rutas publicas del registro conductual. M-09, CP-01, CP-04, CT-08, CT-11
 *
 * GET /plan devuelve el plan de la sesion (planificarSesion): las dos tareas
 * con sus bloques, la practica, los parametros de medicion y la version del
 * catalogo. Es la fuente unica de la web: el motor de ensayos
 * (web/src/registro/) genera los ensayos a partir de este plan y no copia el
 * catalogo ni el secuenciador.
 *
 * Es de solo lectura y no trae datos de nadie: no recibe nada de quien la
 * consulta, ignora los parametros de la consulta y no guarda nada.
 */
function crearRutasRegistro() {
  const rutas = express.Router();
  rutas.get('/plan', (_req, res) => res.json(planificarSesion()));
  return rutas;
}

module.exports = { crearRutasRegistro };
