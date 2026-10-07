/**
 * Valores y nombres visibles de la ruta de atención (M-03, RF-04) y de los
 * tipos de entidad del directorio (M-04). Los valores coinciden con los de la
 * API (api/src/dominio/catalogos.js); los nombres son los que ve la persona.
 * Los tramos de edad están en secciones.js, junto a las señales de alerta.
 */

export const PERFILES = [
  { valor: 'familia', etiqueta: 'Familia o cuidador' },
  { valor: 'docente', etiqueta: 'Docente' }
];

export const REGIMENES = [
  { valor: 'contributivo', etiqueta: 'Régimen contributivo' },
  { valor: 'subsidiado', etiqueta: 'Régimen subsidiado' },
  { valor: 'sin-afiliacion', etiqueta: 'Sin afiliación' }
];

/** Etiquetas de api/contenidos/README.md, las mismas del filtro del directorio. */
export const TIPOS_ENTIDAD = [
  { valor: 'salud', etiqueta: 'Salud' },
  { valor: 'educacion', etiqueta: 'Educación' },
  { valor: 'proteccion', etiqueta: 'Protección de derechos' },
  { valor: 'quejas-salud', etiqueta: 'Quejas sobre servicios de salud' },
  { valor: 'linea-apoyo', etiqueta: 'Líneas de orientación y apoyo emocional' },
  { valor: 'organizacion', etiqueta: 'Organizaciones de familias y personas autistas' }
];

/** Nombre visible de un valor; si no está en la lista, el valor tal cual. */
export const etiquetaDe = (lista, valor) => lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
