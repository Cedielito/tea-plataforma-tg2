/**
 * Secciones, tramos de edad y catálogos de la ruta, del directorio y de los
 * recursos que usa el panel (M-08, RF-10). Salen de secciones.js y
 * catalogos.js, las mismas fuentes de la zona pública, para que los nombres
 * coincidan con los del sitio.
 */
import { SECCIONES, TRAMOS_EDAD } from '../secciones.js';
import { CIUDADES, NACIONAL, PERFILES, REGIMENES, TIPOS_ENTIDAD, TIPOS_RECURSO } from '../catalogos.js';

/** S1 a S5, en orden: código, nombre, ruta pública y slug fijo de su página (si tiene). */
export const SECCIONES_CONTENIDO = SECCIONES.filter((s) => s.seccion).map(({ seccion, titulo, ruta, slug }) => ({
  codigo: seccion,
  titulo,
  ruta,
  slug: slug ?? null
}));

export const seccionDe = (codigo) => SECCIONES_CONTENIDO.find((s) => s.codigo === codigo) ?? null;

export const nombreSeccion = (codigo) => {
  const seccion = seccionDe(codigo);
  return seccion ? `${codigo} · ${seccion.titulo}` : codigo;
};

export const etiquetaTramo = (valor) => TRAMOS_EDAD.find((t) => t.valor === valor)?.etiqueta ?? null;

export { unirConY } from '../utilidades/formato.js';
export { TRAMOS_EDAD, PERFILES, REGIMENES, TIPOS_ENTIDAD, TIPOS_RECURSO, CIUDADES, NACIONAL };
