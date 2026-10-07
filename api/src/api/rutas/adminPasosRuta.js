'use strict';
const { MENSAJES: MENSAJES_GUARDADO } = require('../erroresDeGuardado');
const pasosRuta = require('../../datos/repositorios/pasosRuta');
const { cargaPasosRuta } = require('../../datos/sincronizacionListas');
const { MENSAJES, leerCambiosPasoRuta } = require('../../dominio/edicionPasoRuta');
const { crearRutasAdminDeLista } = require('./adminLista');

/**
 * Pasos de la ruta en el panel, bajo /api/admin/pasos-ruta y por eso detras
 * de exigirSesion (servidor.js). M-03, M-08, RF-10, RS-05, RCN-01, RCN-02
 *
 * - GET    /       todos, publicados y borradores
 * - GET    /:id    uno, con texto, tipos de entidad y fuentes
 * - POST   /       crear (borrador o publicado)
 * - PATCH  /:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 *
 * Las rutas son las comunes de adminLista.js. Cada paso lleva `archivo`
 * ('ruta/pasos.yaml') si viene de api/contenidos, o null; su slug no se puede
 * cambiar desde aqui.
 */
function crearRutasAdminPasosRuta() {
  return crearRutasAdminDeLista({
    repositorio: pasosRuta,
    listar: pasosRuta.listarTodos,
    carga: cargaPasosRuta,
    leerCambios: leerCambiosPasoRuta,
    noEncontrado: 'Paso no encontrado.',
    slugRepetido: MENSAJES_GUARDADO.SLUG_REPETIDO_PASO,
    slugDeArchivo: MENSAJES.SLUG_DE_ARCHIVO
  });
}

module.exports = { crearRutasAdminPasosRuta };
