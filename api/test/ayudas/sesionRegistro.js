'use strict';

/**
 * Sesion completa y fija del registro conductual para las pruebas. M-09
 *
 * Sigue el catalogo: 2 ensayos de practica y 7 por bloque. Incluye a proposito
 * casos que no deben entrar al calculo (practica con errores, una omision,
 * una anticipacion, un error lento y una pausa durante un ensayo), asi las
 * pruebas de reproducibilidad cubren tambien las exclusiones.
 */

const ensayo = (o) => ({
  practica: false,
  estadoItem: 'respondido',
  acierto: true,
  claseError: 'correcta',
  tiempoReaccionMs: 600,
  pausasDuranteItemMs: 0,
  rectificaciones: 0,
  ...o
});

/** Reglas de cada bloque mixto: inicial, rep., cambio, rep., cambio, cambio, rep. */
const REGLAS_MIXTAS = ['color', 'color', 'forma', 'forma', 'color', 'forma', 'forma'];

function ensayosCambioRegla() {
  const tarea = 'cambio-regla';
  const e = [];
  for (let i = 0; i < 2; i += 1) {
    e.push(ensayo({ tarea, bloque: 'CR-PRACTICA', practica: true, regla: 'color', acierto: false, claseError: 'aleatoria' }));
  }
  for (let i = 0; i < 7; i += 1) {
    e.push(ensayo({ tarea, bloque: 'CR-COLOR', fase: 'pre-cambio', regla: 'color', tiempoReaccionMs: 600 + 10 * i }));
  }
  const aciertosForma = [false, false, true, true, true, true, true];
  const erroresForma = ['perseverativa', 'aleatoria'];
  aciertosForma.forEach((acierto, i) => {
    e.push(ensayo({
      tarea,
      bloque: 'CR-FORMA',
      fase: 'post-cambio',
      regla: 'forma',
      acierto,
      claseError: acierto ? 'correcta' : erroresForma[i],
      tiempoReaccionMs: 900 - 20 * i
    }));
  });
  for (let b = 1; b <= 4; b += 1) {
    let anterior = null;
    REGLAS_MIXTAS.forEach((regla, i) => {
      const tipo = i === 0 ? 'inicial' : regla === anterior ? 'repeticion' : 'cambio';
      anterior = regla;
      const base = { inicial: 700, cambio: 800, repeticion: 600 }[tipo] + 10 * b + i;
      const o = { tarea, bloque: `CR-MIXTO-${b}`, fase: 'mixto', regla, tiempoReaccionMs: base };
      if (b === 2 && i === 2) o.tiempoReaccionMs = 150; // anticipacion
      if (b === 2 && i === 3) Object.assign(o, { estadoItem: 'omitido', acierto: false, tiempoReaccionMs: null });
      if (b === 3 && i === 4) Object.assign(o, { acierto: false, claseError: 'perseverativa', tiempoReaccionMs: 2000 });
      e.push(ensayo(o));
    });
  }
  return e;
}

function ensayosNavon() {
  const tarea = 'navon';
  const e = [];
  for (let i = 0; i < 2; i += 1) {
    e.push(ensayo({ tarea, bloque: 'NV-PRACTICA', practica: true, condicion: 'global', acierto: false }));
  }
  ['global', 'local', 'local', 'global'].forEach((condicion, b) => {
    for (let i = 0; i < 7; i += 1) {
      const o = { tarea, bloque: `NV-${b}`, condicion, tiempoReaccionMs: (condicion === 'global' ? 700 : 600) + 5 * i };
      if (b === 0 && i === 6) Object.assign(o, { acierto: false, tiempoReaccionMs: 3000 });
      if (b === 1 && i === 0) Object.assign(o, { tiempoReaccionMs: 4600, pausasDuranteItemMs: 4000 }); // neto 600
      e.push(ensayo(o));
    }
  });
  return e;
}

function sesionCompleta(cambios = {}) {
  return {
    seudonimo: 'K7QM-3XRA',
    estado: 'completada',
    versionCatalogo: '1.0.0',
    ensayos: ensayosCambioRegla().concat(ensayosNavon()),
    contexto: { tipoEntrada: 'raton', pausas: 1, repeticionesInstruccion: 0 },
    ...cambios
  };
}

module.exports = { ensayo, ensayosCambioRegla, ensayosNavon, sesionCompleta };
