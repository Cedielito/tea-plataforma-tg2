'use strict';
const { MENSAJES: MENSAJES_GUARDADO } = require('../erroresDeGuardado');
const recursos = require('../../datos/repositorios/recursos');
const { cargaRecursos } = require('../../datos/sincronizacionListas');
const { MENSAJES, leerCambiosRecurso } = require('../../dominio/edicionRecurso');
const { crearRutasAdminDeLista } = require('./adminLista');

/**
 * Recursos en el panel, bajo /api/admin/recursos y por eso detras de
 * exigirSesion (servidor.js). M-05, M-08, RF-06, RF-10, RS-05, RCN-01, RCN-02
 *
 * - GET    /       todos, publicados y borradores
 * - GET    /:id    uno, con descripcion, enlace y fuentes
 * - POST   /       crear (borrador o publicado)
 * - PATCH  /:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 *
 * Las rutas son las comunes de adminLista.js. Cada recurso lleva `archivo`
 * ('recursos/recursos.yaml') si viene de api/contenidos, o null; su slug no
 * se puede cambiar desde aqui.
 */
function crearRutasAdminRecursos() {
  return crearRutasAdminDeLista({
    repositorio: recursos,
    listar: recursos.listarTodos,
    carga: cargaRecursos,
    leerCambios: leerCambiosRecurso,
    noEncontrado: 'Recurso no encontrado.',
    slugRepetido: MENSAJES_GUARDADO.SLUG_REPETIDO_RECURSO,
    slugDeArchivo: MENSAJES.SLUG_DE_ARCHIVO
  });
}

module.exports = { crearRutasAdminRecursos };
