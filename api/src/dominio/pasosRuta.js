'use strict';
const { PERFILES, TRAMOS_EDAD, REGIMENES, TIPOS_ENTIDAD } = require('./catalogos');

/**
 * Reglas de los pasos de la ruta de atencion. M-03, RF-04, RF-10, RCN-05
 *
 * Cada paso dice a que respuestas de la guia aplica: perfiles, tramos y
 * regimenes, cada uno con al menos un valor del catalogo. La web descarga
 * todos los pasos publicados y elige en el navegador los que coinciden con las
 * tres respuestas (RF-04, RS-01): la API no recibe ni filtra respuestas.
 *
 * Los tipos de entidad son opcionales: dicen que entidades del directorio
 * (M-04) se muestran junto al paso.
 */

const LISTAS = Object.freeze({
  perfiles: {
    valores: PERFILES,
    obligatoria: true,
    vacia: 'Elige al menos un perfil.',
    invalida: 'El perfil debe ser familia o docente.'
  },
  tramos: {
    valores: TRAMOS_EDAD,
    obligatoria: true,
    vacia: 'Elige al menos un tramo de edad.',
    invalida: 'El tramo de edad debe ser 4-7, 8-12 o 13-17.'
  },
  regimenes: {
    valores: REGIMENES,
    obligatoria: true,
    vacia: 'Elige al menos un régimen de afiliación.',
    invalida: 'El régimen debe ser contributivo, subsidiado o sin-afiliacion.'
  },
  tiposEntidad: {
    valores: TIPOS_ENTIDAD,
    obligatoria: false,
    invalida: `Los tipos de entidad deben ser: ${TIPOS_ENTIDAD.join(', ')}.`
  }
});

const MENSAJES = Object.freeze({
  ORDEN_OBLIGATORIO: 'El orden es obligatorio.',
  ORDEN_NEGATIVO: 'El orden no puede ser negativo.',
  ORDEN_ENTERO: 'El orden debe ser un número entero.'
});

const esListaNoVacia = (valor) => Array.isArray(valor) && valor.length > 0;

/** Todos los valores de la lista estan en el catalogo. */
const todosEn = (valores) => (lista) => Array.isArray(lista) && lista.every((valor) => valores.includes(valor));

module.exports = { LISTAS, MENSAJES, esListaNoVacia, todosEn };
