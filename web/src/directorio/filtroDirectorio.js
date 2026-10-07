/**
 * Filtros del directorio (M-04, RF-05) y entidades junto a cada paso de la
 * guía de la ruta (M-03, RF-04, RS-01).
 *
 * Corre en el navegador: la web descarga una sola vez todo el directorio
 * publicado y aquí elige qué mostrar. En /directorio los filtros van en la
 * dirección (?ciudad=bogota&tipo=salud); en la guía, la ciudad que elige la
 * persona vive solo en el estado de React: no va a la API, ni a la dirección,
 * ni a sessionStorage.
 *
 * Las entidades nacionales atienden en todo el país: aparecen con cualquier
 * ciudad que se elija.
 *
 * Funciones puras, sin React ni fetch, para probarlas con node --test
 * (filtroDirectorio.test.js).
 */
import { CIUDADES, CIUDADES_LOCALES, NACIONAL, TIPOS_ENTIDAD } from '../catalogos.js';
import { contar, unirConY } from '../utilidades/formato.js';

/** Todo el directorio publicado. Sin parámetros: la API no recibe ni la ciudad ni el tipo (RS-01). */
export const RUTA_DIRECTORIO = '/api/directorio';

/** Nota de la página y de la guía: qué ciudades tienen entidades locales. */
export const NOTA_COBERTURA =
  `Por ahora hay entidades locales de ${unirConY(CIUDADES_LOCALES.map(({ etiqueta }) => etiqueta))}. ` +
  'Si tu ciudad no está, puedes acudir a las de todo el país.';

const posicion = (lista, valor) => {
  const indice = lista.findIndex((opcion) => opcion.valor === valor);
  return indice === -1 ? lista.length : indice;
};

const comparar = (a, b) =>
  posicion(TIPOS_ENTIDAD, a.tipo) - posicion(TIPOS_ENTIDAD, b.tipo) || a.nombre.localeCompare(b.nombre, 'es');

/** Por tipo, en el orden del catálogo, y luego por nombre. No cambia la lista que recibe. */
export function ordenarEntidades(entidades) {
  return [...entidades].sort(comparar);
}

/**
 * @param {{ciudad?: string|null, tipo?: string|null}} filtros null es «todas»
 * @returns las entidades de la ciudad elegida y las nacionales, del tipo elegido
 */
export function filtrarEntidades(entidades, { ciudad = null, tipo = null } = {}) {
  if (!Array.isArray(entidades)) return [];
  return entidades.filter(
    (entidad) =>
      (!ciudad || entidad.ciudad === ciudad || entidad.ciudad === NACIONAL) && (!tipo || entidad.tipo === tipo)
  );
}

/**
 * Grupos de la página. Con una ciudad elegida, primero esa ciudad y luego
 * todo el país; sin ciudad, todo el país y luego cada ciudad, en el orden del
 * catálogo. Los grupos vacíos no aparecen.
 * @returns {{ciudad: string, entidades: object[]}[]}
 */
export function agruparPorCiudad(entidades, ciudadElegida = null) {
  const orden = ciudadElegida ? [ciudadElegida, NACIONAL] : CIUDADES.map(({ valor }) => valor);
  return orden
    .map((ciudad) => ({ ciudad, entidades: ordenarEntidades(entidades.filter((e) => e.ciudad === ciudad)) }))
    .filter((grupo) => grupo.entidades.length > 0);
}

/**
 * Entidades que la guía muestra junto a un paso: las nacionales de sus tipos
 * y, si la persona eligió una ciudad, primero las de esa ciudad.
 * @param {string[]} tiposEntidad los del paso
 * @param {string|null} ciudad la elegida en la guía, o null
 */
export function entidadesDelPaso(entidades, tiposEntidad, ciudad = null) {
  if (!Array.isArray(entidades) || !Array.isArray(tiposEntidad) || tiposEntidad.length === 0) return [];
  const delPaso = entidades.filter((entidad) => tiposEntidad.includes(entidad.tipo));
  const locales = ciudad && ciudad !== NACIONAL ? delPaso.filter((entidad) => entidad.ciudad === ciudad) : [];
  const nacionales = delPaso.filter((entidad) => entidad.ciudad === NACIONAL);
  return [...ordenarEntidades(locales), ...ordenarEntidades(nacionales)];
}

/**
 * Filtros de la dirección de /directorio (?ciudad=bogota&tipo=salud). Un
 * valor desconocido se ignora.
 * @param {URLSearchParams} parametros
 * @returns {{ciudad: string|null, tipo: string|null}} valores de la API
 */
export function leerFiltros(parametros) {
  const ciudad = CIUDADES_LOCALES.find(({ parametro }) => parametro === parametros.get('ciudad'))?.valor ?? null;
  const tipo = TIPOS_ENTIDAD.find(({ valor }) => valor === parametros.get('tipo'))?.valor ?? null;
  return { ciudad, tipo };
}

/** Parámetros de la dirección para los filtros; los vacíos no van. */
export function parametrosDeFiltros({ ciudad = null, tipo = null } = {}) {
  const parametros = {};
  const deCiudad = CIUDADES_LOCALES.find(({ valor }) => valor === ciudad);
  if (deCiudad) parametros.ciudad = deCiudad.parametro;
  if (TIPOS_ENTIDAD.some(({ valor }) => valor === tipo)) parametros.tipo = tipo;
  return parametros;
}

const deDonde = (ciudad) => (ciudad === NACIONAL ? 'de todo el país' : `de ${ciudad}`);

/** «Mostramos 9 entidades: 5 de Bogotá y 4 de todo el país.» */
export function resumirResultados(grupos) {
  const total = grupos.reduce((suma, grupo) => suma + grupo.entidades.length, 0);
  if (total === 0) return 'No hay entidades con estos filtros.';
  const cuantas = `Mostramos ${contar(total, 'entidad', 'entidades')}`;
  if (grupos.length === 1) return `${cuantas} ${deDonde(grupos[0].ciudad)}.`;
  const partes = grupos.map(({ ciudad, entidades }) => `${entidades.length} ${deDonde(ciudad)}`);
  return `${cuantas}: ${unirConY(partes)}.`;
}
