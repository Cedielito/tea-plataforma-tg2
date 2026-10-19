'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { CATALOGO, CONDICIONES, ORDEN_TAREAS, TAREAS } = require('../src/dominio/registro/catalogo');
const { ESTADOS_SESION, procesarSesion } = require('../src/dominio/registro/motor');
const { INDICADORES, clasificarEnsayosMixtos, media, soloAciertos, trNeto } = require('../src/dominio/registro/indicadores');
const { NIVEL_CONFIANZA, describirMuestra, mediana, pearson, spearmanBrown } = require('./estadistica');

/**
 * Analisis de la evaluacion de M-09 con adultos: de los dos CSV que exporta
 * el profesional (HU-19) a las cifras agregadas de la evaluacion. M-09,
 * CC-09, CC-10, CT-08, CT-13, RF-14, RF-15, HU-19
 *
 * Uso, desde la raiz del repositorio:
 *   node api/scripts/analisisEvaluacion.js <registro-ensayos.csv> <registro-valores-sus.csv> [--salida <carpeta>]
 * Escribe resumen.json y resumen.md en la carpeta de salida (por defecto, la
 * del CSV de valores, para que los datos no queden dentro del repositorio).
 *
 * Cuatro partes (metodo y lectura en docs/evaluacion/analisis-adultos.md):
 * - Replicacion: CC-09 y CC-10 de valores.csv (el resultado guardado con su
 *   version, CT-13), con media, DE, n e intervalo de confianza del 95 % con
 *   la t de Student, frente a la direccion esperada (CC-09 > 0, CC-10 < 0).
 * - Consistencia por mitades: con ensayos.csv y los filtros de RF-14 (sin
 *   practica, omisiones ni anticipaciones; solo aciertos), tiempo neto medio
 *   de los ensayos impares y pares de cada participante en cada condicion
 *   (cambio y repeticion de los bloques mixtos, con clasificarEnsayosMixtos;
 *   global y local en Navon). Pearson entre mitades y Spearman-Brown; lo
 *   mismo para CC-09 y CC-10 por mitad, como exploratorio.
 * - Usabilidad: valorSUS de los participantes.
 * - Eficacia: sesiones completas sobre las entregadas (las creadas que nunca
 *   se entregaron no son incompletas) y duracion de las completas (CT-08).
 *
 * RF-15: solo las sesiones completas entran a la replicacion y a la
 * consistencia; todas cuentan en las creadas. Comprobacion: CC-09 y CC-10 se
 * recalculan desde ensayos.csv con procesarSesion y se comparan con
 * valores.csv, para detectar archivos de exportaciones o versiones distintas.
 *
 * Nada por persona en la salida: solo agregados y n, sin seudonimos. Sin
 * fecha de generacion: la misma entrada da los mismos archivos.
 */

/** Criterios de la evaluacion (docs/evaluacion/analisis-adultos.md). */
const CRITERIOS = Object.freeze({
  spearmanBrownMinimo: 0.7,
  valorSusReferencia: 68,
  proporcionCompletasMinima: 0.85,
  duracionMaximaMin: 20
});

const USO =
  'Uso: node api/scripts/analisisEvaluacion.js <registro-ensayos.csv> <registro-valores-sus.csv> [--salida <carpeta>]';

/** Un problema con los archivos de entrada: se informa sin la pila y el programa termina con código 1. */
class ErrorDeEntrada extends Error {}

// ---------------------------------------------------------------------------
// Lectura de los CSV

/** Filas de un texto CSV (RFC 4180): comillas, comillas dobles, CRLF o LF y BOM. */
function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;
  for (let i = texto.charCodeAt(0) === 0xfeff ? 1 : 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (entreComillas) {
      if (c !== '"') campo += c;
      else if (texto[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else entreComillas = false;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || fila.length > 0) filas.push([...fila, campo]);
  return filas;
}

/** Columnas que usa el analisis y su tipo; las demas se ignoran. */
const TIPOS_ENSAYOS = Object.freeze({
  seudonimo: 'texto',
  estadoSesion: 'texto',
  versionCatalogo: 'texto',
  tarea: 'texto',
  numero: 'numero',
  bloque: 'texto',
  fase: 'texto',
  regla: 'texto',
  condicion: 'texto',
  practica: 'logico',
  estadoItem: 'texto',
  acierto: 'logico',
  claseError: 'texto',
  tiempoReaccionMs: 'numero',
  pausasDuranteItemMs: 'numero',
  rectificaciones: 'numero'
});

const TIPOS_VALORES = Object.freeze({
  seudonimo: 'texto',
  estado: 'texto',
  entregada: 'logico',
  duracionMin: 'numero',
  versionAlgoritmo: 'texto',
  versionCatalogo: 'texto',
  cc09: 'numero',
  cc10: 'numero',
  valorSUS: 'numero'
});

const NUMERO = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

function convertir(texto, tipo, donde) {
  if (texto === '') return null;
  if (tipo === 'texto') return texto;
  if (tipo === 'logico' && (texto === 'true' || texto === 'false')) return texto === 'true';
  if (tipo === 'numero' && NUMERO.test(texto)) return Number(texto);
  throw new ErrorDeEntrada(`${donde}: «${texto}» no es un valor válido.`);
}

/** Objetos con las columnas de `tipos`, ya convertidas. */
function leerTabla(texto, tipos, archivo) {
  const [cabecera = [], ...filas] = leerCsv(texto);
  const faltan = Object.keys(tipos).filter((c) => !cabecera.includes(c));
  if (faltan.length > 0) {
    throw new ErrorDeEntrada(
      `${archivo}: faltan las columnas ${faltan.join(', ')}. Usa el archivo tal como lo descarga la zona del ` +
        'profesional, sin abrirlo y guardarlo en una hoja de cálculo.'
    );
  }
  return filas.map((fila, i) => {
    if (fila.length !== cabecera.length) {
      throw new ErrorDeEntrada(`${archivo}, fila ${i + 2}: tiene ${fila.length} columnas y la cabecera ${cabecera.length}.`);
    }
    return Object.fromEntries(
      Object.entries(tipos).map(([columna, tipo]) => [
        columna,
        convertir(fila[cabecera.indexOf(columna)], tipo, `${archivo}, fila ${i + 2}, columna ${columna}`)
      ])
    );
  });
}

// ---------------------------------------------------------------------------
// Sesiones y ensayos

const esCompleta = (fila) => fila.estado === ESTADOS_SESION.COMPLETADA;

/**
 * RF-15. Ensayos de cada sesion completa de ensayos.csv, por tarea y en el
 * orden en que se presentaron. La clave es el seudonimo y no sale de aqui.
 */
function ensayosPorSesion(filasEnsayos) {
  const porSesion = new Map();
  for (const { seudonimo, estadoSesion, versionCatalogo, ...ensayo } of filasEnsayos) {
    if (estadoSesion !== ESTADOS_SESION.COMPLETADA) continue;
    if (!porSesion.has(seudonimo)) porSesion.set(seudonimo, { versionCatalogo, ensayos: [] });
    porSesion.get(seudonimo).ensayos.push(ensayo);
  }
  for (const { ensayos } of porSesion.values()) {
    ensayos.sort((a, b) => ORDEN_TAREAS.indexOf(a.tarea) - ORDEN_TAREAS.indexOf(b.tarea) || a.numero - b.numero);
  }
  return porSesion;
}

const opcionesDe = (tarea) => ({ trMinimoMs: CATALOGO[tarea].trMinimoMs });

/**
 * RF-14. Aciertos de cada condicion, sin practica, omisiones ni
 * anticipaciones: cambio y repeticion de los bloques mixtos (el primer ensayo
 * de cada bloque no cuenta) y global y local en Navon. Los mismos ensayos que
 * usan CC-09 y CC-10.
 */
function ensayosPorCondicion(ensayos) {
  const deTarea = (tarea) => ensayos.filter((e) => e.tarea === tarea);
  const mixtos = soloAciertos(clasificarEnsayosMixtos(deTarea(TAREAS.CAMBIO_REGLA)), opcionesDe(TAREAS.CAMBIO_REGLA));
  const navon = soloAciertos(deTarea(TAREAS.NAVON), opcionesDe(TAREAS.NAVON));
  return {
    cambio: mixtos.filter((e) => e.tipoEnsayo === 'cambio'),
    repeticion: mixtos.filter((e) => e.tipoEnsayo === 'repeticion'),
    global: navon.filter((e) => e.condicion === CONDICIONES.GLOBAL),
    local: navon.filter((e) => e.condicion === CONDICIONES.LOCAL)
  };
}

/**
 * Tiempo neto medio (sin las pausas del ensayo) de los ensayos impares (1.º,
 * 3.º, 5.º...) y pares (2.º, 4.º...), contados en orden despues de los filtros.
 */
function mitades(ensayos) {
  const tiempos = ensayos.map(trNeto);
  return { impar: media(tiempos.filter((_t, i) => i % 2 === 0)), par: media(tiempos.filter((_t, i) => i % 2 === 1)) };
}

const CONDICIONES_MITADES = Object.freeze(['cambio', 'repeticion', 'global', 'local']);

/** Mitades de cada condicion de una sesion. */
function mitadesDeSesion(ensayos) {
  const grupos = ensayosPorCondicion(ensayos);
  return Object.fromEntries(CONDICIONES_MITADES.map((condicion) => [condicion, mitades(grupos[condicion])]));
}

// ---------------------------------------------------------------------------
// Analisis

function conteo(valores) {
  const salida = {};
  for (const v of valores.filter((x) => x !== null).sort()) salida[v] = (salida[v] || 0) + 1;
  return salida;
}

const ORDEN_ESTADOS = Object.freeze([
  ESTADOS_SESION.COMPLETADA,
  ESTADOS_SESION.INTERRUMPIDA,
  ESTADOS_SESION.ABANDONADA,
  ESTADOS_SESION.EN_CURSO
]);

function sesiones(filasValores) {
  const porEstado = conteo(filasValores.map((f) => f.estado));
  const orden = [...ORDEN_ESTADOS, ...Object.keys(porEstado).filter((e) => !ORDEN_ESTADOS.includes(e))];
  const entregadas = filasValores.filter((f) => f.entregada === true);
  return {
    creadas: filasValores.length,
    entregadas: entregadas.length,
    completas: entregadas.filter(esCompleta).length,
    porEstado: Object.fromEntries(orden.filter((e) => porEstado[e]).map((e) => [e, porEstado[e]]))
  };
}

const DIRECCIONES = Object.freeze({ cc09: 'mayor', cc10: 'menor' });

function enDireccion(valor, direccion) {
  if (valor === null) return null;
  return direccion === 'mayor' ? valor > 0 : valor < 0;
}

/** CC-09 y CC-10 de las sesiones completas frente a la direccion esperada. */
function replicacion(filasValores) {
  const completas = filasValores.filter(esCompleta);
  const salida = {};
  for (const [indicador, direccion] of Object.entries(DIRECCIONES)) {
    const muestra = describirMuestra(completas.map((f) => f[indicador]));
    salida[indicador] = {
      ...muestra,
      direccionEsperada: `${direccion} que 0`,
      mediaEnDireccionEsperada: enDireccion(muestra.media, direccion),
      // El intervalo entero queda del lado esperado: el limite inferior > 0 o el superior < 0.
      cumple: muestra.ic95 ? enDireccion(muestra.ic95[direccion === 'mayor' ? 0 : 1], direccion) : null
    };
  }
  return salida;
}

/** r entre las mitades impares y pares de los participantes que tienen las dos. */
function correlacionMitades(paresDeMitades) {
  const completos = paresDeMitades.filter((m) => m.impar !== null && m.par !== null);
  const r = pearson(
    completos.map((m) => m.impar),
    completos.map((m) => m.par)
  );
  return { n: completos.length, r, spearmanBrown: spearmanBrown(r) };
}

const resta = (a, b) => (a === null || b === null ? null : a - b);

const DIFERENCIAS = Object.freeze({ cc09: ['cambio', 'repeticion'], cc10: ['global', 'local'] });

function consistencia(porSesion) {
  const mitadesPorSesion = [...porSesion.values()].map(({ ensayos }) => mitadesDeSesion(ensayos));
  const condiciones = {};
  for (const condicion of CONDICIONES_MITADES) {
    const resultado = correlacionMitades(mitadesPorSesion.map((m) => m[condicion]));
    const { spearmanBrown: sb } = resultado;
    condiciones[condicion] = { ...resultado, cumple: sb === null ? null : sb >= CRITERIOS.spearmanBrownMinimo };
  }
  const exploratorio = {};
  for (const [indicador, [a, b]] of Object.entries(DIFERENCIAS)) {
    exploratorio[indicador] = correlacionMitades(
      mitadesPorSesion.map((m) => ({ impar: resta(m[a].impar, m[b].impar), par: resta(m[a].par, m[b].par) }))
    );
  }
  return { criterioSpearmanBrown: CRITERIOS.spearmanBrownMinimo, condiciones, exploratorio };
}

function usabilidad(filasValores) {
  const muestra = describirMuestra(filasValores.map((f) => f.valorSUS));
  return {
    valorSUS: {
      ...muestra,
      referencia: CRITERIOS.valorSusReferencia,
      cumple: muestra.media === null ? null : muestra.media >= CRITERIOS.valorSusReferencia
    }
  };
}

/** Completas sobre entregadas y duracion de las completas (CT-08). */
function eficacia(filasValores, { entregadas, completas }) {
  const proporcion = entregadas === 0 ? null : completas / entregadas;
  const duraciones = filasValores
    .filter(esCompleta)
    .map((f) => f.duracionMin)
    .filter((d) => d !== null);
  const maximo = duraciones.length > 0 ? Math.max(...duraciones) : null;
  return {
    proporcionCompletas: proporcion,
    criterioProporcion: CRITERIOS.proporcionCompletasMinima,
    cumpleProporcion: proporcion === null ? null : proporcion >= CRITERIOS.proporcionCompletasMinima,
    duracionMin: {
      n: duraciones.length,
      mediana: mediana(duraciones),
      maximo,
      hastaLimite: duraciones.filter((d) => d <= CRITERIOS.duracionMaximaMin).length,
      limite: CRITERIOS.duracionMaximaMin,
      // Todas las completas en el limite o menos.
      cumple: maximo === null ? null : maximo <= CRITERIOS.duracionMaximaMin
    }
  };
}

const TOLERANCIA_MS = 0.001;
const mismoValor = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) <= TOLERANCIA_MS);

/** CT-13. CC-09 y CC-10 recalculados desde ensayos.csv con el motor, frente a valores.csv. */
function comprobacion(filasValores, porSesion) {
  const completas = filasValores.filter(esCompleta);
  const seudonimos = new Set(completas.map((f) => f.seudonimo));
  let conDiferencia = 0;
  let sinEnsayos = 0;
  for (const fila of completas) {
    const sesion = porSesion.get(fila.seudonimo);
    if (!sesion) {
      sinEnsayos += 1;
      continue;
    }
    const { tareas } = procesarSesion({ estado: ESTADOS_SESION.COMPLETADA, ...sesion });
    const observado = (codigo) =>
      tareas[INDICADORES[codigo].tarea].indicadores.find((i) => i.codigo === codigo).observado;
    if (!mismoValor(observado('CC-09'), fila.cc09) || !mismoValor(observado('CC-10'), fila.cc10)) conDiferencia += 1;
  }
  const soloEnEnsayos = [...porSesion.keys()].filter((s) => !seudonimos.has(s)).length;
  return {
    sesionesCompletas: completas.length,
    conDiferencia,
    sinEnsayos,
    soloEnEnsayos,
    coinciden: conDiferencia === 0 && sinEnsayos === 0 && soloEnEnsayos === 0
  };
}

/**
 * @param {{ensayos: object[], valores: object[]}} filas las de leerTabla
 * @returns {object} el resumen: solo agregados y n
 */
function analizar({ ensayos, valores }) {
  const porSesion = ensayosPorSesion(ensayos);
  const cuentas = sesiones(valores);
  return {
    nivelConfianza: NIVEL_CONFIANZA,
    versiones: {
      algoritmo: conteo(valores.map((f) => f.versionAlgoritmo)),
      catalogo: conteo(valores.map((f) => f.versionCatalogo))
    },
    sesiones: cuentas,
    comprobacion: comprobacion(valores, porSesion),
    replicacion: replicacion(valores),
    consistencia: consistencia(porSesion),
    usabilidad: usabilidad(valores),
    eficacia: eficacia(valores, cuentas)
  };
}

function analizarTextos(textoEnsayos, textoValores) {
  return analizar({
    ensayos: leerTabla(textoEnsayos, TIPOS_ENSAYOS, 'ensayos.csv'),
    valores: leerTabla(textoValores, TIPOS_VALORES, 'valores.csv')
  });
}

// ---------------------------------------------------------------------------
// Salida

/** Numero con coma decimal y signo menos tipografico; raya si no existe. */
function numero(valor, decimales = 1) {
  if (valor === null || valor === undefined) return '—';
  const texto = Math.abs(valor).toFixed(decimales);
  const signo = valor < 0 && Number(texto) !== 0 ? '−' : '';
  return signo + texto.replace('.', ',');
}

const intervalo = (ic, decimales = 1) => (ic ? `[${numero(ic[0], decimales)}; ${numero(ic[1], decimales)}]` : '—');
const porcentaje = (p) => (p === null ? '—' : `${numero(p * 100, 1)} %`);
const lectura = (cumple, siNo = 'No cumple') => {
  if (cumple === null) return 'No calculable';
  return cumple ? 'Cumple' : siNo;
};

const NOMBRES_ESTADOS = Object.freeze({
  completada: 'completadas',
  interrumpida: 'interrumpidas',
  abandonada: 'abandonadas',
  en_curso: 'en curso'
});

const NOMBRES_CONDICIONES = Object.freeze({
  cambio: 'Cambio (bloques mixtos)',
  repeticion: 'Repetición (bloques mixtos)',
  global: 'Global (Navon)',
  local: 'Local (Navon)'
});

const listaDeVersiones = (porVersion) =>
  Object.entries(porVersion)
    .map(([version, n]) => `${version} (${n} ${n === 1 ? 'sesión' : 'sesiones'})`)
    .join(', ') || '—';

function encabezado(resumen) {
  const { versiones, comprobacion: c } = resumen;
  const lineas = [
    '# Análisis de la evaluación con adultos',
    '',
    'Capa 2 de la evaluación de M-09, con los criterios del Cuadro 31 del documento 2.3. Solo agregados y n:',
    'ningún valor por participante. Generado con `api/scripts/analisisEvaluacion.js` a partir de los dos CSV',
    'que exporta el profesional; método y lectura en `docs/evaluacion/analisis-adultos.md`.',
    '',
    `- Intervalos de confianza del ${numero(resumen.nivelConfianza * 100, 0)} % con la t de Student.`,
    `- Versión del algoritmo: ${listaDeVersiones(versiones.algoritmo)}.`,
    `- Versión del catálogo: ${listaDeVersiones(versiones.catalogo)}.`
  ];
  if (Object.keys(versiones.algoritmo).length > 1 || Object.keys(versiones.catalogo).length > 1) {
    lineas.push('- **Atención:** hay más de una versión del algoritmo o del catálogo. Revisar antes de reportar.');
  }
  lineas.push(
    c.coinciden
      ? `- Comprobación: CC-09 y CC-10 recalculados desde ensayos.csv coinciden con valores.csv en las ${c.sesionesCompletas} sesiones completas.`
      : `- **Atención:** ensayos.csv y valores.csv no coinciden (${c.conDiferencia} sesiones con valores distintos, ` +
          `${c.sinEnsayos} sin ensayos y ${c.soloEnEnsayos} solo en ensayos.csv). Revisar que los dos archivos sean de la misma exportación.`
  );
  return lineas;
}

function seccionSesiones({ sesiones: s }) {
  const estados = Object.entries(s.porEstado)
    .map(([estado, n]) => `${NOMBRES_ESTADOS[estado] || estado} ${n}`)
    .join(', ');
  return [
    '## Sesiones',
    '',
    '| Creadas | Entregadas | Completas |',
    '|---|---|---|',
    `| ${s.creadas} | ${s.entregadas} | ${s.completas} |`,
    '',
    `Por estado: ${estados || 'ninguna'}. Las creadas que nunca se entregaron no cuentan como incompletas.`
  ];
}

function seccionReplicacion({ replicacion: r }) {
  const fila = (codigo, clave) => {
    const m = r[clave];
    return (
      `| ${codigo} ${INDICADORES[codigo].constructo} | ${m.n} | ${numero(m.media)} | ${numero(m.de)} | ` +
      `${intervalo(m.ic95)} | IC 95 % ${m.direccionEsperada} | ${lectura(m.cumple, 'No cumple: se reporta como hallazgo')} |`
    );
  };
  return [
    '## H3. Replicación de los efectos esperados',
    '',
    'Sesiones completas (RF-15), con los valores guardados en valores.csv. Se espera CC-09 mayor que 0 y CC-10',
    'menor que 0 (la letra grande se reconoce antes).',
    '',
    '| Indicador | n | Media (ms) | DE (ms) | IC 95 % (ms) | Criterio | Resultado |',
    '|---|---|---|---|---|---|---|',
    fila('CC-09', 'cc09'),
    fila('CC-10', 'cc10')
  ];
}

function seccionConsistencia({ consistencia: c }) {
  const criterio = `≥ ${numero(c.criterioSpearmanBrown, 2)}`;
  return [
    '## H4. Consistencia por mitades',
    '',
    'Tiempo neto medio de los ensayos impares y pares de cada participante en cada condición, contados en orden',
    'después de quitar la práctica, las omisiones, las anticipaciones y los errores (RF-14). r de Pearson entre',
    'las dos mitades a través de los participantes y corrección de Spearman-Brown, 2r / (1 + r).',
    '',
    '| Condición | n | r entre mitades | Spearman-Brown | Criterio | Resultado |',
    '|---|---|---|---|---|---|',
    ...CONDICIONES_MITADES.map((condicion) => {
      const m = c.condiciones[condicion];
      return `| ${NOMBRES_CONDICIONES[condicion]} | ${m.n} | ${numero(m.r, 3)} | ${numero(m.spearmanBrown, 3)} | ${criterio} | ${lectura(m.cumple)} |`;
    }),
    '',
    '### Exploratorio: diferencias por mitad, sin criterio',
    '',
    '| Diferencia | n | r entre mitades | Spearman-Brown |',
    '|---|---|---|---|',
    `| CC-09 ${INDICADORES['CC-09'].constructo} (cambio − repetición) | ${c.exploratorio.cc09.n} | ${numero(c.exploratorio.cc09.r, 3)} | ${numero(c.exploratorio.cc09.spearmanBrown, 3)} |`,
    `| CC-10 ${INDICADORES['CC-10'].constructo} (global − local) | ${c.exploratorio.cc10.n} | ${numero(c.exploratorio.cc10.r, 3)} | ${numero(c.exploratorio.cc10.spearmanBrown, 3)} |`
  ];
}

function seccionUsabilidadEficacia({ usabilidad: u, eficacia: e, sesiones: s }) {
  const sus = u.valorSUS;
  const d = e.duracionMin;
  return [
    '## H5. Usabilidad y eficacia',
    '',
    '| Medida | Observado | Criterio | Resultado |',
    '|---|---|---|---|',
    `| Valor SUS de los participantes | n = ${sus.n}; media ${numero(sus.media)}; DE ${numero(sus.de)}; IC 95 % ${intervalo(sus.ic95)} | ` +
      `Media ≥ ${numero(sus.referencia, 0)} (referencia de aceptabilidad, no es una prueba estadística) | ${lectura(sus.cumple)} |`,
    `| Sesiones completas | ${s.completas} de ${s.entregadas} entregadas (${porcentaje(e.proporcionCompletas)}); ${s.creadas} creadas | ` +
      `≥ ${numero(e.criterioProporcion * 100, 0)} % de las entregadas | ${lectura(e.cumpleProporcion)} |`,
    `| Duración de la aplicación (de la entrega del dispositivo a la llegada de las dos tareas) | n = ${d.n}; mediana ` +
      `${numero(d.mediana)} min; máximo ${numero(d.maximo)} min; ${d.hastaLimite} de ${d.n} en ${d.limite} min o menos | ` +
      `${d.limite} min o menos en todas (CT-08) | ${lectura(d.cumple)} |`,
    '',
    'El valor SUS de los profesionales se aplica en papel y se reporta aparte.'
  ];
}

function aMarkdown(resumen) {
  const partes = [
    encabezado(resumen),
    seccionSesiones(resumen),
    seccionReplicacion(resumen),
    seccionConsistencia(resumen),
    seccionUsabilidadEficacia(resumen)
  ];
  return `${partes.map((p) => p.join('\n')).join('\n\n')}\n`;
}

const aJson = (resumen) => `${JSON.stringify(resumen, null, 2)}\n`;

// ---------------------------------------------------------------------------
// Linea de comandos

function leerArgumentos(argv) {
  const posicionales = [];
  let salida = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== '--salida') posicionales.push(argv[i]);
    else {
      salida = argv[i + 1];
      i += 1;
    }
  }
  if (posicionales.length !== 2 || salida === undefined) throw new ErrorDeEntrada(USO);
  const [ensayos, valores] = posicionales;
  return { ensayos, valores, salida: salida || path.dirname(valores) };
}

function leerArchivo(ruta) {
  try {
    return fs.readFileSync(ruta, 'utf8');
  } catch (error) {
    throw new ErrorDeEntrada(`No se pudo leer ${ruta}: ${error.code || error.message}.`);
  }
}

/** Lee los dos CSV, escribe resumen.json y resumen.md y devuelve el resumen y sus rutas. */
function ejecutar(argv) {
  const args = leerArgumentos(argv);
  const resumen = analizarTextos(leerArchivo(args.ensayos), leerArchivo(args.valores));
  fs.mkdirSync(args.salida, { recursive: true });
  const archivos = { json: path.join(args.salida, 'resumen.json'), md: path.join(args.salida, 'resumen.md') };
  fs.writeFileSync(archivos.json, aJson(resumen));
  fs.writeFileSync(archivos.md, aMarkdown(resumen));
  return { resumen, archivos };
}

if (require.main === module) {
  try {
    const { archivos } = ejecutar(process.argv.slice(2));
    console.log(`Listo: ${archivos.md} y ${archivos.json}`);
  } catch (error) {
    if (!(error instanceof ErrorDeEntrada)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  CRITERIOS,
  TIPOS_ENSAYOS,
  TIPOS_VALORES,
  ErrorDeEntrada,
  leerCsv,
  leerTabla,
  ensayosPorSesion,
  ensayosPorCondicion,
  mitades,
  mitadesDeSesion,
  analizar,
  analizarTextos,
  aMarkdown,
  aJson,
  ejecutar
};
