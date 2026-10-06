'use strict';
const { Contenido } = require('../modelos');
const { ESTADOS } = require('../../dominio/catalogos');
const { construirFiltroContenidos, ordenarContenidos } = require('../../dominio/contenidos');
const { construirFiltroBusqueda, LIMITE_RESULTADOS } = require('../../dominio/busqueda');
const { crearEscritura } = require('./escritura');

/**
 * Repositorio de la coleccion `contenido`. M-02, RF-02, RF-03, RCN-01, RCN-02
 * Las lecturas publicas solo devuelven lo publicado e incluyen fuentes y fecha
 * de revision, que la web muestra al final de cada pagina.
 */

const CAMPOS_PUBLICOS = 'titulo slug seccion tramoEdad cuerpo fuentes fechaRevision';
const CAMPOS_RESULTADO_BUSQUEDA = 'titulo slug seccion tramoEdad';
const CAMPOS_BUSCABLES = ['titulo', 'cuerpo'];

async function listarPublicados(filtros = {}) {
  const contenidos = await Contenido.find(construirFiltroContenidos(filtros))
    .select(CAMPOS_PUBLICOS)
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  return ordenarContenidos(contenidos);
}

function obtenerPublicadoPorSlug(slug) {
  return Contenido.findOne({ slug, estado: ESTADOS.PUBLICADO }).select(CAMPOS_PUBLICOS).lean();
}

async function buscarPublicados(palabras) {
  const contenidos = await Contenido.find({
    estado: ESTADOS.PUBLICADO,
    ...construirFiltroBusqueda(palabras, CAMPOS_BUSCABLES)
  })
    .select(CAMPOS_RESULTADO_BUSQUEDA)
    .sort({ createdAt: 1, _id: 1 })
    .limit(LIMITE_RESULTADOS)
    .lean();
  return ordenarContenidos(contenidos);
}

module.exports = {
  listarPublicados,
  obtenerPublicadoPorSlug,
  buscarPublicados,
  ...crearEscritura(Contenido)
};
