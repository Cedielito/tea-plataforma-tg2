'use strict';
const { MENSAJES: MENSAJES_GUARDADO } = require('../erroresDeGuardado');
const entidadesDirectorio = require('../../datos/repositorios/entidadesDirectorio');
const { cargaEntidades } = require('../../datos/sincronizacionListas');
const { MENSAJES, leerCambiosEntidad } = require('../../dominio/edicionEntidad');
const { crearRutasAdminDeLista } = require('./adminLista');

/**
 * Entidades del directorio en el panel, bajo /api/admin/directorio y por eso
 * detras de exigirSesion (servidor.js). M-04, M-08, RF-05, RF-10, RS-05,
 * RS-07, RCN-01, RCN-02, HU-14
 *
 * - GET    /       todas, publicadas y borradores
 * - GET    /:id    una, con descripcion, contacto, constancia y fuentes
 * - POST   /       crear (borrador o publicada)
 * - PATCH  /:id    editar, publicar (estado: publicado) o despublicar (estado: borrador)
 *
 * Las rutas son las comunes de adminLista.js. El modelo rechaza publicar sin
 * fuente ni fecha de verificacion (RCN-01, RCN-02) y a un profesional sin
 * constancia de autorizacion (RS-07). Cada entidad lleva `archivo`
 * ('directorio/entidades.yaml') si viene de api/contenidos, o null; su slug no
 * se puede cambiar desde aqui.
 */
function crearRutasAdminDirectorio() {
  return crearRutasAdminDeLista({
    repositorio: entidadesDirectorio,
    listar: entidadesDirectorio.listarTodas,
    carga: cargaEntidades,
    leerCambios: leerCambiosEntidad,
    noEncontrado: 'Entidad no encontrada.',
    slugRepetido: MENSAJES_GUARDADO.SLUG_REPETIDO_ENTIDAD,
    slugDeArchivo: MENSAJES.SLUG_DE_ARCHIVO
  });
}

module.exports = { crearRutasAdminDirectorio };
