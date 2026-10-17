'use strict';

/**
 * Vocabulario que no puede aparecer en la salida ni en la interfaz del
 * registro conductual. M-09, RCN-03
 *
 * M-09 no tamiza, no clasifica y no sugiere: entrega valores observados por
 * tarea con el aviso de no diagnostico. Quedan prohibidos las etiquetas
 * diagnosticas, los niveles de riesgo o de apoyo, los puntos de corte, los
 * puntajes globales y los nombres de los dominios del DSM-5-TR.
 *
 * El aviso de M-09 (AVISO_NO_DIAGNOSTICO) dice «no constituyen diagnostico ni
 * clasificacion» y es la unica excepcion: se quita antes de buscar. Lo usan
 * las pruebas del dominio y lo podran usar las de la interfaz (T13 a T15).
 */

const AVISO_NO_DIAGNOSTICO =
  'Estos valores describen el desempeño en dos tareas. No constituyen diagnóstico ni clasificación ' +
  'y no sustituyen la valoración profesional; su interpretación corresponde al profesional.';

const EXPRESIONES_PROHIBIDAS = Object.freeze([
  // Etiquetas diagnosticas
  /\bTEA\b/,
  /autis/i,
  /asperger/i,
  /trastorno/i,
  /diagn[oó]stic/i,
  /sospecha/i,
  /\bDSM\b/i,
  // Riesgo, niveles de apoyo y severidad
  /riesgo/i,
  /nivel(es)?\s*(de\s*)?(apoyo|severidad|gravedad)/i,
  /severidad/i,
  /gravedad/i,
  // Puntos de corte, puntajes globales y comparaciones con una norma
  /punto(s)?\s*de\s*corte/i,
  /cut-?off/i,
  /puntaje/i,
  /puntuaci[oó]n/i,
  /\bscore/i,
  /percentil/i,
  /\bbanda/i,
  // Dominios del DSM-5-TR, por nombre y por codigo (A1 a A3, B1 a B4)
  /comunicaci[oó]n\s*social/i,
  /interacci[oó]n\s*social/i,
  /reciprocidad/i,
  /\bno\s+verbal(es)?\b/i,
  /relaciones\s*sociales/i,
  /restrictiv/i,
  /repetitiv/i,
  /monoton[ií]a/i,
  /intereses\s*restringidos/i,
  /reactividad/i,
  /sensorial/i,
  /\b(A[1-3]|B[1-4])\b/
]);

/** Une en un solo texto las claves y los textos de un valor, recorriendo lo anidado. */
function textoDe(valor) {
  if (typeof valor === 'string') return valor;
  if (valor === null || typeof valor !== 'object') return '';
  if (Array.isArray(valor)) return valor.map(textoDe).join('\n');
  return Object.entries(valor)
    .map(([clave, v]) => `${clave}\n${textoDe(v)}`)
    .join('\n');
}

/** Expresiones prohibidas que aparecen en el valor, sin contar el aviso de M-09. */
function buscarVocabularioProhibido(valor) {
  const texto = textoDe(valor).split(AVISO_NO_DIAGNOSTICO).join('\n');
  return EXPRESIONES_PROHIBIDAS.filter((re) => re.test(texto)).map((re) => texto.match(re)[0]);
}

module.exports = { AVISO_NO_DIAGNOSTICO, EXPRESIONES_PROHIBIDAS, buscarVocabularioProhibido };
