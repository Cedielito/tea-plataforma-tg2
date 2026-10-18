'use strict';
const { procesarSesion } = require('../src/dominio/registro/motor');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { perfiles } = require('./ayudas/perfilesSimulados.json');

/**
 * Perfiles simulados con parametros conocidos (T16): seis personas simuladas
 * que hacen las dos tareas con el formato de la web
 * (web/src/registro/perfilesSimulados.js). procesarSesion debe recuperar sus
 * parametros y distinguir los perfiles que difieren. M-09, CC-08, CC-09,
 * CC-10, CC-12, RF-14
 *
 * Tolerancia de 1 ms en los tiempos (el motor de ensayos redondea a
 * milesimas); las proporciones y los conteos, exactos.
 */

const TOLERANCIA_MS = 1;

/** Valores observados por codigo, el tiempo medio y la tasa de omision de cada tarea. */
function valores(sesion) {
  const r = procesarSesion(sesion);
  expect(r.procesada).toBe(true);
  const indicadores = Object.values(r.tareas).flatMap((t) => t.indicadores);
  const porCodigo = Object.fromEntries(indicadores.map((i) => [i.codigo, i.observado]));
  const contexto = (tarea) => r.tareas[tarea].contexto;
  const medio = (tarea) => contexto(tarea).variabilidadTiempoReaccion / contexto(tarea).coeficienteVariacion;
  return {
    ...porCodigo,
    criterioCC12: indicadores.find((i) => i.codigo === 'CC-12').criterioAlcanzado,
    medioCambioRegla: medio('cambio-regla'),
    medioNavon: medio('navon'),
    omisionCambioRegla: contexto('cambio-regla').tasaOmision,
    omisionNavon: contexto('navon').tasaOmision,
    anticipacion: [contexto('cambio-regla').tasaAnticipacion, contexto('navon').tasaAnticipacion]
  };
}

const porId = Object.fromEntries(perfiles.map((p) => [p.id, { ...p, valores: valores(p.sesion) }]));

describe('CC-09 CC-10 CC-08 CC-12 procesarSesion recupera los parámetros de cada perfil', () => {
  test.each(perfiles.map((p) => [p.id, p]))('%s', (id, { parametros }) => {
    const v = porId[id].valores;
    expect(Math.abs(v['CC-09'] - parametros.costoCambioMs)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(v['CC-10'] - parametros.diferenciaGlobalLocalMs)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(v.medioCambioRegla - parametros.tiempoMedioMs)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(v.medioNavon - parametros.tiempoMedioMs)).toBeLessThanOrEqual(TOLERANCIA_MS);
    // En el bloque de forma todo error es perseverativo y los errores van primero.
    expect(v['CC-08']).toBeCloseTo(parametros.tasaError, 12);
    expect(v['CC-12']).toBe(parametros.erroresPorBloque + 3);
    expect(v.criterioCC12).toBe(true);
    expect(v.omisionCambioRegla).toBeCloseTo(parametros.tasaOmision, 12);
    expect(v.omisionNavon).toBeCloseTo(parametros.tasaOmision, 12);
    expect(v.anticipacion).toEqual([0, 0]);
  });

  test('la salida de los perfiles no tiene vocabulario prohibido', () => {
    for (const { sesion } of perfiles) expect(buscarVocabularioProhibido(procesarSesion(sesion))).toEqual([]);
  });
});

describe('M-09 procesarSesion distingue perfiles con parámetros distintos', () => {
  const CLAVES_TIEMPO = ['CC-09', 'CC-10', 'medioCambioRegla', 'medioNavon'];
  const CLAVES_EXACTAS = ['CC-08', 'CC-12', 'omisionCambioRegla', 'omisionNavon'];

  /**
   * Cada perfil frente al de base: los valores que dependen de un parametro
   * que cambio se mueven en esa diferencia (±1 ms); los demas no se mueven.
   */
  const CAMBIOS = {
    'costo-alto': { 'CC-09': 150 },
    'local-rapida': { 'CC-10': 130 },
    lento: { medioCambioRegla: 250, medioNavon: 250 },
    'con-errores': { 'CC-08': 2 / 7, 'CC-12': 2 },
    'con-omisiones': { 'CC-08': 1 / 6, 'CC-12': 1, omisionCambioRegla: 1 / 7, omisionNavon: 1 / 7 }
  };

  test.each(Object.entries(CAMBIOS))('%s frente a base', (id, cambios) => {
    const base = porId.base.valores;
    const otro = porId[id].valores;
    for (const clave of CLAVES_TIEMPO) {
      const esperado = cambios[clave] || 0;
      expect(Math.abs(otro[clave] - base[clave] - esperado)).toBeLessThanOrEqual(TOLERANCIA_MS);
    }
    for (const clave of CLAVES_EXACTAS) expect(otro[clave] - base[clave]).toBeCloseTo(cambios[clave] || 0, 12);
  });

  test('ningún par de perfiles da los mismos valores', () => {
    const firmas = perfiles.map(({ id }) => {
      const v = porId[id].valores;
      return [...CLAVES_TIEMPO.map((c) => Math.round(v[c])), ...CLAVES_EXACTAS.map((c) => v[c].toFixed(6))].join('|');
    });
    expect(new Set(firmas).size).toBe(perfiles.length);
  });
});

describe('CT-13 la misma entrada de cada perfil da la misma salida', () => {
  test.each(perfiles.map((p) => [p.id, p]))('%s', (_id, { sesion }) => {
    const primera = procesarSesion(sesion);
    expect(procesarSesion(sesion)).toEqual(primera);
    expect(procesarSesion(JSON.parse(JSON.stringify(sesion)))).toEqual(primera);
    expect(JSON.stringify(procesarSesion(sesion))).toBe(JSON.stringify(primera));
  });
});
