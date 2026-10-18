'use strict';
const YAML = require('yaml');

/**
 * Cuestionario SUS (System Usability Scale) del registro conductual. M-09
 *
 * El participante lo responde al terminar las dos tareas. Valora la
 * herramienta, no a la persona: el resultado se llama `valorSUS` y nunca se
 * muestra al participante.
 *
 * - Los 10 items, la escala y la version estan en
 *   api/contenidos/registro/sus.yaml, para poder cambiar la traduccion sin
 *   tocar el codigo (leerArchivoSus). La version viaja con cada respuesta.
 * - Escala de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo).
 * - valorSUS = 2,5 x (suma de (respuesta - 1) en los items impares + suma de
 *   (5 - respuesta) en los pares): de 0 a 100.
 *
 * Funciones puras.
 */

const NUMERO_ITEMS = 10;
const MINIMO = 1;
const MAXIMO = 5;
const FACTOR = 2.5;

const CAMPOS_ARCHIVO = Object.freeze(['version', 'fuente', 'escala', 'items']);
const CAMPOS_ESCALA = Object.freeze(['minimo', 'maximo', 'etiquetaMinimo', 'etiquetaMaximo']);
const CAMPOS_RESPUESTA = Object.freeze(['version', 'respuestas']);
const PATRON_VERSION = /^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/;

const MENSAJES = Object.freeze({
  YAML_INVALIDO: 'El archivo no se pudo leer como YAML.',
  CAMPOS: `El archivo debe tener solo ${CAMPOS_ARCHIVO.join(', ')}.`,
  VERSION: 'La versión es obligatoria: letras sin tildes, números, punto, guion o guion bajo.',
  FUENTE: 'La fuente es obligatoria.',
  ESCALA: `La escala debe ir de ${MINIMO} a ${MAXIMO}, con las etiquetas de los dos extremos.`,
  ITEMS: `El cuestionario debe tener exactamente ${NUMERO_ITEMS} ítems, cada uno con su texto.`,
  SOLO_CAMPOS: 'El cuestionario solo recibe la versión y las respuestas.',
  VERSION_DISTINTA: 'El cuestionario cambió mientras se respondía. Avisa a la persona que te acompaña.',
  RESPUESTAS: `Responde los ${NUMERO_ITEMS} enunciados, cada uno con un número de ${MINIMO} a ${MAXIMO}.`
});

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const esTextoLleno = (valor) => typeof valor === 'string' && valor.trim() !== '';
const soloCampos = (objeto, campos) =>
  Object.keys(objeto).length === campos.length && campos.every((campo) => campo in objeto);

function erroresDelArchivo(datos) {
  if (!esObjeto(datos) || !soloCampos(datos, CAMPOS_ARCHIVO)) return [MENSAJES.CAMPOS];
  const errores = [];
  if (typeof datos.version !== 'string' || !PATRON_VERSION.test(datos.version)) errores.push(MENSAJES.VERSION);
  if (!esTextoLleno(datos.fuente)) errores.push(MENSAJES.FUENTE);
  const { escala } = datos;
  const escalaValida =
    esObjeto(escala) &&
    soloCampos(escala, CAMPOS_ESCALA) &&
    escala.minimo === MINIMO &&
    escala.maximo === MAXIMO &&
    esTextoLleno(escala.etiquetaMinimo) &&
    esTextoLleno(escala.etiquetaMaximo);
  if (!escalaValida) errores.push(MENSAJES.ESCALA);
  if (!Array.isArray(datos.items) || datos.items.length !== NUMERO_ITEMS || !datos.items.every(esTextoLleno)) {
    errores.push(MENSAJES.ITEMS);
  }
  return errores;
}

/**
 * Lee api/contenidos/registro/sus.yaml.
 * @returns {{datos: {version: string, fuente: string, escala: object,
 *   items: {numero: number, texto: string}[]}} | {error: string}}
 */
function leerArchivoSus(texto) {
  let datos;
  try {
    datos = YAML.parse(texto);
  } catch {
    return { error: MENSAJES.YAML_INVALIDO };
  }
  const errores = erroresDelArchivo(datos);
  if (errores.length > 0) return { error: errores.join(' ') };
  return {
    datos: {
      version: datos.version,
      fuente: datos.fuente.trim(),
      escala: {
        minimo: MINIMO,
        maximo: MAXIMO,
        etiquetaMinimo: datos.escala.etiquetaMinimo.trim(),
        etiquetaMaximo: datos.escala.etiquetaMaximo.trim()
      },
      items: datos.items.map((item, i) => ({ numero: i + 1, texto: item.trim() }))
    }
  };
}

const esRespuesta = (valor) => Number.isInteger(valor) && valor >= MINIMO && valor <= MAXIMO;

/**
 * Lee el cuerpo de PUT /api/registro/aplicacion/sus.
 * @param {{version: string}} cuestionario el que esta vigente
 * @returns {{respuestas: number[], version: string} | {estado: number, error: string}}
 */
function leerRespuestasSus(cuerpo, cuestionario) {
  if (!esObjeto(cuerpo) || !soloCampos(cuerpo, CAMPOS_RESPUESTA)) return { estado: 400, error: MENSAJES.SOLO_CAMPOS };
  if (cuerpo.version !== cuestionario.version) return { estado: 409, error: MENSAJES.VERSION_DISTINTA };
  const { respuestas } = cuerpo;
  if (!Array.isArray(respuestas) || respuestas.length !== NUMERO_ITEMS || !respuestas.every(esRespuesta)) {
    return { estado: 422, error: MENSAJES.RESPUESTAS };
  }
  return { respuestas: [...respuestas], version: cuerpo.version };
}

/**
 * valorSUS de 10 respuestas de 1 a 5, en el orden de los items. Los items
 * impares (1, 3, 5, 7, 9) estan redactados a favor de la herramienta y los
 * pares, en contra: por eso se invierten.
 */
function calcularValorSUS(respuestas) {
  if (!Array.isArray(respuestas) || respuestas.length !== NUMERO_ITEMS || !respuestas.every(esRespuesta)) {
    throw new RangeError(MENSAJES.RESPUESTAS);
  }
  const suma = respuestas.reduce((s, r, i) => s + (i % 2 === 0 ? r - MINIMO : MAXIMO - r), 0);
  return suma * FACTOR;
}

module.exports = {
  NUMERO_ITEMS,
  MINIMO,
  MAXIMO,
  MENSAJES,
  leerArchivoSus,
  leerRespuestasSus,
  calcularValorSUS
};
