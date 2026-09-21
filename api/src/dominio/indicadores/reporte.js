'use strict';

/**
 * Modulo de reporte del cuidador (RC-01 a RC-05).
 *
 * Cubre los dominios que no se manifiestan en la ejecucion de una tarea en
 * navegador: la vertiente expresiva de A2, la conducta relacional de A3, y los
 * dominios B1, B3 y B4. La combinacion de desempeno directo y reporte de
 * informante es la estrategia que emplean los instrumentos de tamizaje
 * establecidos; no es un recurso para alcanzar una cifra de cobertura.
 *
 * Los ajustes sensoriales de la interfaz NO se emplean para estimar B4: la
 * accion puede ejecutarla el acudiente, puede responder al entorno fisico y
 * convertir una opcion de accesibilidad en dato clinico penalizaria su uso.
 */

/** Escala ordinal de frecuencia, en lenguaje no clinico. */
const ESCALA = { nunca: 0, a_veces: 1, con_frecuencia: 2, casi_siempre: 3 };
const VALOR_MAXIMO = 3;

/** Tres items por dominio: quince items en total. */
const ESCALAS = {
  'RC-01': { dominio: 'A2', vertiente: 'expresiva', items: ['A2E-1', 'A2E-2', 'A2E-3'],
    descripcion: 'Uso de gestos, contacto visual y expresión facial en la interacción cotidiana' },
  'RC-02': { dominio: 'A3', vertiente: 'relacional', items: ['A3R-1', 'A3R-2', 'A3R-3'],
    descripcion: 'Iniciativa, mantenimiento y ajuste de las relaciones con pares' },
  'RC-03': { dominio: 'B1', items: ['B1-1', 'B1-2', 'B1-3'],
    descripcion: 'Movimientos, uso de objetos o habla repetitivos observados en el entorno' },
  'RC-04': { dominio: 'B3', items: ['B3-1', 'B3-2', 'B3-3'],
    descripcion: 'Intensidad y foco de los intereses' },
  'RC-05': { dominio: 'B4', items: ['B4-1', 'B4-2', 'B4-3'],
    descripcion: 'Respuesta a sonidos, texturas, luces y otros estímulos sensoriales' }
};

const TOTAL_ITEMS = Object.values(ESCALAS).reduce((s, e) => s + e.items.length, 0);

function normalizarRespuesta(valor) {
  if (typeof valor === 'number') return valor;
  return Object.prototype.hasOwnProperty.call(ESCALA, valor) ? ESCALA[valor] : null;
}

/**
 * Calcula el valor observado de cada escala. No se emite puntaje agregado ni
 * categoria de riesgo: el profesional interpreta los valores observados.
 */
function calcularEscalas(respuestas) {
  const porItem = {};
  for (const r of respuestas || []) {
    const v = normalizarRespuesta(r && r.respuesta);
    if (r && r.item && v !== null) porItem[r.item] = v;
  }
  const salida = {};
  for (const [codigo, cfg] of Object.entries(ESCALAS)) {
    const valores = cfg.items.map((i) => porItem[i]).filter((v) => typeof v === 'number');
    salida[codigo] = {
      dominio: cfg.dominio,
      vertiente: cfg.vertiente || null,
      descripcion: cfg.descripcion,
      itemsRespondidos: valores.length,
      itemsTotales: cfg.items.length,
      completa: valores.length === cfg.items.length,
      valorObservado: valores.length ? valores.reduce((a, b) => a + b, 0) : null,
      valorMaximoPosible: cfg.items.length * VALOR_MAXIMO,
      origen: 'reporte_informante'
    };
  }
  return salida;
}

function estaCompleto(respuestas) {
  const e = calcularEscalas(respuestas);
  return Object.values(e).every((x) => x.completa);
}

module.exports = { ESCALA, ESCALAS, TOTAL_ITEMS, VALOR_MAXIMO, normalizarRespuesta, calcularEscalas, estaCompleto };
