/**
 * Valores y nombres visibles de la ruta de atención (M-03, RF-04), de los
 * tipos de entidad y ciudades del directorio (M-04, RF-05) y de los tipos de
 * recurso (M-05, RF-06). Los valores
 * coinciden con los de la API (api/src/dominio/catalogos.js); los nombres son
 * los que ve la persona. Los tramos de edad están en secciones.js, junto a las
 * señales de alerta.
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
  { valor: 'proteccion-ninez', etiqueta: 'Protección de niñas, niños y adolescentes' },
  { valor: 'quejas-salud', etiqueta: 'Quejas sobre servicios de salud' },
  { valor: 'linea-apoyo', etiqueta: 'Líneas de orientación y apoyo emocional' },
  { valor: 'organizacion', etiqueta: 'Organizaciones de familias y personas autistas' }
];

/**
 * Ciudades del directorio, en orden. `valor` es el de la API; `parametro`, el
 * que va en la dirección de /directorio (?ciudad=bogota), sin tildes ni
 * mayúsculas. Las entidades nacionales atienden en todo el país.
 */
export const NACIONAL = 'Nacional';
export const CIUDADES = [
  { valor: NACIONAL, parametro: 'nacional', etiqueta: 'Todo el país' },
  { valor: 'Bogotá', parametro: 'bogota', etiqueta: 'Bogotá' },
  { valor: 'Medellín', parametro: 'medellin', etiqueta: 'Medellín' },
  { valor: 'Cali', parametro: 'cali', etiqueta: 'Cali' },
  { valor: 'Barranquilla', parametro: 'barranquilla', etiqueta: 'Barranquilla' }
];

/** Tipos de recurso (M-05): un archivo para descargar o una página oficial. */
export const TIPOS_RECURSO = [
  { valor: 'archivo', etiqueta: 'Archivo para descargar (por ejemplo, un PDF)' },
  { valor: 'enlace', etiqueta: 'Enlace a una página oficial' }
];

/** Las que se pueden elegir en los filtros: las nacionales aparecen siempre. */
export const CIUDADES_LOCALES = CIUDADES.filter(({ valor }) => valor !== NACIONAL);

/** Nombre visible de un valor; si no está en la lista, el valor tal cual. */
export const etiquetaDe = (lista, valor) => lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
