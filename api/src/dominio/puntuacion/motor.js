'use strict';
const { INDICADORES, variablesContextuales } = require('../indicadores/calculos');
const { calcularEscalas } = require('../indicadores/reporte');
const { VERSION_ALGORITMO } = require('./version');

const DOMINIOS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4'];

/**
 * Cobertura por fuente. Los dominios B1, B3, B4 y la vertiente expresiva de A2
 * no son observables en la ejecucion de una tarea en navegador; se cubren por
 * reporte del informante. La distincion se conserva en toda la salida para que
 * el profesional sepa de donde procede cada dato.
 */
const FUENTE_POR_DOMINIO = {
  A1: ['desempeno'],
  A2: ['desempeno', 'reporte'],
  A3: ['desempeno', 'reporte'],
  B1: ['reporte'],
  B2: ['desempeno'],
  B3: ['reporte'],
  B4: ['reporte']
};

/** Cobertura alcanzada solo con los minijuegos, sin el reporte del cuidador. */
function coberturaPorDesempeno() {
  const pesos = DOMINIOS.map((d) => {
    const f = FUENTE_POR_DOMINIO[d];
    if (!f.includes('desempeno')) return 0;
    return f.includes('reporte') ? 0.5 : 1;
  });
  return pesos.reduce((a, b) => a + b, 0) / DOMINIOS.length;
}

/** Cobertura combinando desempeno en tarea y reporte del informante. */
function coberturaCombinada() {
  return DOMINIOS.filter((d) => FUENTE_POR_DOMINIO[d].length > 0).length / DOMINIOS.length;
}

/**
 * Normalizacion. Sin muestra normativa por estrato de edad el sistema reporta
 * el valor observado y marca el percentil como no disponible. Establecer un
 * punto de corte exigiria un estudio con muestra amplia y grupo de comparacion
 * clinico, fuera del alcance de este trabajo.
 */
function normalizar(valor, referencia) {
  if (valor === null || valor === undefined) return { observado: null, percentil: null, provisional: true };
  if (typeof valor !== 'number') return { observado: valor, percentil: null, provisional: true };
  if (!referencia || !Array.isArray(referencia.muestra) || referencia.muestra.length < 30) {
    return { observado: valor, percentil: null, provisional: true };
  }
  const menores = referencia.muestra.filter((x) => x < valor).length;
  return { observado: valor, percentil: Math.round((menores / referencia.muestra.length) * 100), provisional: false };
}

/**
 * Agrega los valores observados por dominio, identificando el origen de cada
 * uno. No produce puntaje de dominio ni categoria: solo agrupa y declara si el
 * dominio quedo con datos suficientes.
 */
function agruparPorDominio(indicadores, escalas) {
  const salida = {};
  for (const d of DOMINIOS) {
    const desempeno = Object.entries(indicadores)
      .filter(([, v]) => v.dominio === d && v.observado !== null)
      .map(([k, v]) => ({ codigo: k, origen: 'desempeno', vertiente: v.vertiente || null }));
    const reporte = Object.entries(escalas || {})
      .filter(([, v]) => v.dominio === d && v.valorObservado !== null)
      .map(([k, v]) => ({ codigo: k, origen: 'reporte_informante', vertiente: v.vertiente || null }));
    const fuentes = FUENTE_POR_DOMINIO[d];
    const obtenidas = [];
    if (desempeno.length) obtenidas.push('desempeno');
    if (reporte.length) obtenidas.push('reporte');
    salida[d] = {
      elementos: desempeno.concat(reporte),
      fuentesPrevistas: fuentes,
      fuentesObtenidas: obtenidas,
      datosSuficientes: fuentes.every((f) => obtenidas.includes(f))
    };
  }
  return salida;
}

/** Una sesion incompleta no se procesa. */
function puntuar(sesion) {
  if (!sesion || sesion.estadoSesion !== 'completada') {
    return {
      procesada: false,
      motivo: 'sesion_no_completada',
      versionAlgoritmo: VERSION_ALGORITMO
    };
  }

  const indicadores = {};
  for (const [codigo, cfg] of Object.entries(INDICADORES)) {
    let bruto = null;
    try {
      bruto = cfg.fn(sesion.entrada && sesion.entrada[codigo]);
    } catch (e) {
      bruto = null;
    }
    const n = normalizar(bruto, sesion.referencia && sesion.referencia[codigo]);
    indicadores[codigo] = {
      ...n,
      dominio: cfg.dominio,
      componente: cfg.componente,
      vertiente: cfg.vertiente || null,
      tipo: cfg.tipo || 'escalar',
      origen: 'desempeno'
    };
  }

  const escalas = calcularEscalas(sesion.reporteCuidador);
  const perfil = agruparPorDominio(indicadores, escalas);

  return {
    procesada: true,
    uuid: sesion.uuid,
    indicadores,
    escalasReporte: escalas,
    perfil,
    contexto: variablesContextuales(sesion.eventos, sesion.contexto),
    cobertura: {
      soloDesempeno: coberturaPorDesempeno(),
      combinada: coberturaCombinada(),
      dominiosSinDatos: DOMINIOS.filter((d) => !perfil[d].datosSuficientes)
    },
    avisos: {
      noDiagnostico: true,
      sinPuntosDeCorte: true,
      sinPercentiles: Object.values(indicadores).every((i) => i.percentil === null),
      dominiosPorReporte: DOMINIOS.filter((d) => FUENTE_POR_DOMINIO[d].includes('reporte')),
      ajustesSensorialesNoInterpretables: true
    },
    versionAlgoritmo: VERSION_ALGORITMO,
    versionCatalogo: sesion.versionCatalogo || null
  };
}

module.exports = {
  DOMINIOS, FUENTE_POR_DOMINIO, coberturaPorDesempeno, coberturaCombinada,
  normalizar, agruparPorDominio, puntuar
};
