'use strict';

/**
 * Configuracion declarativa de los tres minijuegos y de los dos modulos
 * complementarios, tomada del Cuadro 21 del documento de trabajo de grado.
 * Los bancos de estimulos no se incluyen: cada bloque declara una ranura
 * (`fuenteEstimulo`) que se resuelve en tiempo de ejecucion, de modo que el
 * banco pueda sustituirse sin tocar la logica del minijuego.
 */
const TRAMOS = { MENOR: '4-7', MAYOR: '8-17' };

function tramoDeEdad(edad) {
  if (typeof edad !== 'number' || Number.isNaN(edad)) throw new TypeError('edad invalida');
  if (edad < 4 || edad > 17) throw new RangeError('edad fuera del rango 4-17');
  return edad <= 7 ? TRAMOS.MENOR : TRAMOS.MAYOR;
}

const CATALOGO = {
  'MJ-1': {
    nombre: 'El detective de miradas',
    paradigma: 'child-eyes-test',
    ensayosPractica: 2,
    duracionEstimadaMin: 5,
    bloques: [
      { id: 'MJ1-B1', constructo: 'emociones_basicas', ensayos: 7, alternativas: 4, fuenteEstimulo: 'banco.miradas.basicas' },
      { id: 'MJ1-B2', constructo: 'estados_complejos', ensayos: 7, alternativas: 4, fuenteEstimulo: 'banco.miradas.complejas' }
    ],
    porTramo: {
      '4-7': { apoyoAlternativas: 'pictografico' },
      '8-17': { apoyoAlternativas: 'escrito' }
    }
  },
  'MJ-2': {
    nombre: 'La fiesta de sorpresas',
    paradigma: 'faux-pas-falsa-creencia',
    ensayosPractica: 2,
    duracionEstimadaMin: 7,
    bloques: [
      { id: 'MJ2-B1', constructo: 'falsa_creencia_primer_orden', ensayos: 4, alternativas: 3, fuenteEstimulo: 'banco.escenas.primer_orden' },
      { id: 'MJ2-B2', constructo: 'falsa_creencia_segundo_orden', ensayos: 4, alternativas: 3, fuenteEstimulo: 'banco.escenas.segundo_orden' },
      { id: 'MJ2-B3', constructo: 'faux_pas', ensayos: 4, alternativas: 3, fuenteEstimulo: 'banco.escenas.faux_pas' }
    ],
    porTramo: {
      '4-7': { bloquesOmitidos: ['MJ2-B2'], variante: 'simplificada' },
      '8-17': { bloquesOmitidos: [], variante: 'completa' }
    }
  },
  'MJ-3': {
    nombre: 'El taller que cambia',
    paradigma: 'dccs-navon',
    ensayosPractica: 2,
    duracionEstimadaMin: 5,
    bloques: [
      { id: 'MJ3-B1', constructo: 'clasificacion_regla_a', ensayos: 7, alternativas: 2, fuenteEstimulo: 'banco.objetos.taller' },
      { id: 'MJ3-B2', constructo: 'clasificacion_cambio_1', ensayos: 7, alternativas: 2, cambioDeRegla: true, fuenteEstimulo: 'banco.objetos.taller' },
      { id: 'MJ3-B3', constructo: 'clasificacion_cambio_2', ensayos: 7, alternativas: 2, cambioDeRegla: true, fuenteEstimulo: 'banco.objetos.taller' },
      { id: 'MJ3-B4', constructo: 'figuras_jerarquicas', ensayos: 7, alternativas: 2, fuenteEstimulo: 'banco.figuras.navon' }
    ],
    porTramo: {
      '4-7': { dimensiones: ['color', 'forma'] },
      '8-17': { dimensiones: ['color', 'forma', 'tamano'] }
    }
  }
};

const ORDEN_LIBRE = Object.keys(CATALOGO);

module.exports = { CATALOGO, ORDEN_LIBRE, TRAMOS, tramoDeEdad };
