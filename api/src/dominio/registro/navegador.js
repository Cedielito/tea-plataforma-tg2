'use strict';

/**
 * Navegador de la aplicacion: solo la familia y la version mayor. M-09, CT-11
 *
 * El registro guarda en que navegador se hicieron las tareas (CT-07: la
 * precision del reloj depende de el), pero nunca la cadena User-Agent
 * completa, que junto con otros datos puede ayudar a reconocer un equipo.
 * describirNavegador la reduce a «Firefox 131», «Chrome 130», «Edge 130»,
 * «Safari 18», «Samsung Internet 26», «Opera 113» u «Otro». El esquema de la
 * sesion solo acepta ese formato (PATRON_NAVEGADOR), asi que la cadena
 * completa no se puede guardar ni por descuido.
 *
 * El orden importa: Edge, Opera y Samsung Internet tambien dicen «Chrome» y
 * «Safari»; Chrome tambien dice «Safari». En iOS cada navegador usa su propia
 * marca (CriOS, FxiOS, EdgiOS). Chrome sin ventana (HeadlessChrome, el de las
 * pruebas automaticas y de T16) cuenta como Chrome.
 *
 * Funcion pura.
 */

const FAMILIAS = Object.freeze([
  { familia: 'Edge', patron: /\bEdg(?:e|A|iOS)?\/(\d+)/ },
  { familia: 'Opera', patron: /\b(?:OPR|OPT)\/(\d+)/ },
  { familia: 'Samsung Internet', patron: /\bSamsungBrowser\/(\d+)/ },
  { familia: 'Firefox', patron: /\b(?:Firefox|FxiOS)\/(\d+)/ },
  { familia: 'Chrome', patron: /\b(?:Chrome|CriOS|HeadlessChrome)\/(\d+)/ },
  { familia: 'Safari', patron: /\bVersion\/(\d+)(?:\.\d+)*\b.*\bSafari\// }
]);

const OTRO = 'Otro';
const PATRON_NAVEGADOR = /^(?:(?:Edge|Opera|Samsung Internet|Firefox|Chrome|Safari) \d{1,4}|Otro)$/;
/** Ninguna cadena real necesita mas para llegar a la marca del navegador. */
const LARGO_MAXIMO_LEIDO = 1024;

/** @returns {string} familia y version mayor, u «Otro» */
function describirNavegador(userAgent) {
  if (typeof userAgent !== 'string') return OTRO;
  const texto = userAgent.slice(0, LARGO_MAXIMO_LEIDO);
  for (const { familia, patron } of FAMILIAS) {
    const encontrado = texto.match(patron);
    if (encontrado && encontrado[1].length <= 4) return `${familia} ${Number(encontrado[1])}`;
  }
  return OTRO;
}

module.exports = { OTRO, PATRON_NAVEGADOR, describirNavegador };
