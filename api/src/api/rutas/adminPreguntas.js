'use strict';
const { MENSAJES: MENSAJES_GUARDADO } = require('../erroresDeGuardado');
const preguntas = require('../../datos/repositorios/preguntas');
const { cargaPreguntas } = require('../../datos/sincronizacionListas');
const { MENSAJES, leerCambiosPregunta } = require('../../dominio/edicionPregunta');
const { crearRutasAdminDeLista } = require('./adminLista');

/**
 * Preguntas frecuentes en el panel, bajo /api/admin/preguntas y por eso
 * detras de exigirSesion (servidor.js). M-05, M-08, RF-07, RF-10, RS-05,
 * RCN-01, RCN-02
 *
 * - GET    /       todas, publicadas y borradores
 * - GET    /:id    una, con respuesta y fuentes
 * - POST   /       crear (borrador o publicada)
 * - PATCH  /:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 *
 * Las rutas son las comunes de adminLista.js. Cada pregunta lleva `archivo`
 * ('preguntas/preguntas.yaml') si viene de api/contenidos, o null; su slug no
 * se puede cambiar desde aqui.
 */
function crearRutasAdminPreguntas() {
  return crearRutasAdminDeLista({
    repositorio: preguntas,
    listar: preguntas.listarTodas,
    carga: cargaPreguntas,
    leerCambios: leerCambiosPregunta,
    noEncontrado: 'Pregunta no encontrada.',
    slugRepetido: MENSAJES_GUARDADO.SLUG_REPETIDO_PREGUNTA,
    slugDeArchivo: MENSAJES.SLUG_DE_ARCHIVO
  });
}

module.exports = { crearRutasAdminPreguntas };
