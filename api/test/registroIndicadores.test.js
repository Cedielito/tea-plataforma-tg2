'use strict';
const c = require('../src/dominio/registro/indicadores');
const { ensayo } = require('./ayudas/sesionRegistro');

/**
 * Indicadores de las dos tareas del registro conductual. M-09, CC-08, CC-09,
 * CC-10, CC-12. Adaptadas de fase-ii (api/test/indicadores.test.js); las
 * exclusiones de RF-13 y RF-14 estan en registroRestricciones.test.js.
 */

const post = (o) => ensayo({ tarea: 'cambio-regla', bloque: 'CR-FORMA', fase: 'post-cambio', regla: 'forma', ...o });
const mixto = (bloque, regla, o) => ensayo({ tarea: 'cambio-regla', bloque, fase: 'mixto', regla, ...o });
const navon = (condicion, o) => ensayo({ tarea: 'navon', condicion, ...o });

describe('CC-08 perseveración tras el cambio de regla', () => {
  const e = [
    ensayo({ fase: 'pre-cambio', regla: 'color', acierto: false, claseError: 'perseverativa' }),
    post({ acierto: false, claseError: 'perseverativa' }),
    post({ acierto: false, claseError: 'aleatoria' }),
    post({}),
    post({})
  ];

  test('solo cuenta el error perseverativo, no el aleatorio', () => {
    expect(c.cc08(e)).toBe(1 / 4);
  });

  test('solo mira el bloque posterior al cambio', () => {
    expect(c.cc08(e.slice(0, 1))).toBeNull();
    expect(c.cc08([])).toBeNull();
    expect(c.cc08(undefined)).toBeNull();
  });
});

describe('CC-12 ensayos hasta criterio', () => {
  test('cuenta los ensayos hasta tres aciertos seguidos', () => {
    const e = [post({ acierto: false }), post({}), post({ acierto: false }), post({}), post({}), post({})];
    expect(c.cc12(e)).toBe(6);
    expect(c.criterioAlcanzadoCC12(e)).toBe(true);
  });

  test('sin el criterio da null y criterioAlcanzado false', () => {
    const e = [post({}), post({}), post({ acierto: false }), post({}), post({}), post({ acierto: false }), post({})];
    expect(c.cc12(e)).toBeNull();
    expect(c.criterioAlcanzadoCC12(e)).toBe(false);
  });

  test('sin ensayos tambien da null, pero criterioAlcanzado queda null: es un dato faltante', () => {
    expect(c.cc12([])).toBeNull();
    expect(c.criterioAlcanzadoCC12([])).toBeNull();
  });
});

describe('CC-09 costo de cambio por ensayo en los bloques mixtos', () => {
  test('clasifica cada ensayo como inicial, cambio o repeticion dentro de su bloque', () => {
    const e = [
      mixto('M1', 'color'),
      mixto('M1', 'color'),
      mixto('M1', 'forma'),
      mixto('M2', 'forma'),
      mixto('M2', 'color')
    ];
    expect(c.clasificarEnsayosMixtos(e).map((x) => x.tipoEnsayo)).toEqual([
      'inicial',
      'repeticion',
      'cambio',
      'inicial',
      'cambio'
    ]);
  });

  test('no modifica los ensayos de entrada', () => {
    const e = [mixto('M1', 'color'), mixto('M1', 'forma')];
    c.clasificarEnsayosMixtos(e);
    expect(e[1]).not.toHaveProperty('tipoEnsayo');
  });

  test('es el tiempo medio de cambio menos el de repeticion', () => {
    const e = [
      mixto('M1', 'color', { tiempoReaccionMs: 5000 }), // inicial: no cuenta
      mixto('M1', 'forma', { tiempoReaccionMs: 900 }), // cambio
      mixto('M1', 'forma', { tiempoReaccionMs: 600 }), // repeticion
      mixto('M1', 'color', { tiempoReaccionMs: 700 }), // cambio
      mixto('M1', 'color', { tiempoReaccionMs: 500 }) // repeticion
    ];
    expect(c.cc09(e)).toBe(800 - 550);
  });

  test('el primer ensayo de cada bloque no cuenta aunque cambie la regla respecto al bloque anterior', () => {
    const e = [
      mixto('M1', 'color', { tiempoReaccionMs: 600 }),
      mixto('M1', 'color', { tiempoReaccionMs: 600 }),
      mixto('M1', 'forma', { tiempoReaccionMs: 800 }),
      mixto('M2', 'color', { tiempoReaccionMs: 3000 }),
      mixto('M2', 'color', { tiempoReaccionMs: 600 })
    ];
    expect(c.cc09(e)).toBe(200);
  });

  test('los bloques de una sola regla no alteran el valor', () => {
    const mixtos = [
      mixto('M1', 'color', { tiempoReaccionMs: 600 }),
      mixto('M1', 'forma', { tiempoReaccionMs: 900 }),
      mixto('M1', 'forma', { tiempoReaccionMs: 600 })
    ];
    const puros = [
      ensayo({ bloque: 'CR-COLOR', fase: 'pre-cambio', regla: 'color', tiempoReaccionMs: 400 }),
      post({ tiempoReaccionMs: 2000 }),
      post({ tiempoReaccionMs: 1800 })
    ];
    expect(c.cc09(puros.concat(mixtos))).toBe(c.cc09(mixtos));
    expect(c.cc09(puros)).toBeNull();
  });

  test('solo promedia aciertos', () => {
    const e = [
      mixto('M1', 'color', { tiempoReaccionMs: 600 }),
      mixto('M1', 'forma', { tiempoReaccionMs: 900 }),
      mixto('M1', 'color', { tiempoReaccionMs: 3000, acierto: false, claseError: 'perseverativa' }),
      mixto('M1', 'color', { tiempoReaccionMs: 600 })
    ];
    expect(c.cc09(e)).toBe(300);
  });

  test('sin ensayos de cambio o de repeticion no hay valor', () => {
    expect(c.cc09([mixto('M1', 'color'), mixto('M1', 'forma')])).toBeNull();
    expect(c.cc09([])).toBeNull();
  });
});

describe('CC-10 diferencia global-local', () => {
  test('es el tiempo medio global menos el local, solo con aciertos', () => {
    const e = [
      navon('global', { tiempoReaccionMs: 1200 }),
      navon('global', { tiempoReaccionMs: 1000 }),
      navon('global', { tiempoReaccionMs: 4000, acierto: false }),
      navon('local', { tiempoReaccionMs: 700 })
    ];
    expect(c.cc10(e)).toBe(400);
  });

  test('sin una de las dos condiciones no hay valor', () => {
    expect(c.cc10([navon('global')])).toBeNull();
    expect(c.cc10([])).toBeNull();
  });
});

describe('M-09 catálogo de indicadores por tarea y constructo', () => {
  test('declara CC-08, CC-09 y CC-12 en cambio de regla y CC-10 en Navon', () => {
    const porTarea = (t) => Object.keys(c.INDICADORES).filter((k) => c.INDICADORES[k].tarea === t);
    expect(porTarea('cambio-regla')).toEqual(['CC-08', 'CC-09', 'CC-12']);
    expect(porTarea('navon')).toEqual(['CC-10']);
  });

  test('cada indicador tiene funcion, constructo, metrica y unidad, y ninguno dice dominio', () => {
    for (const ind of Object.values(c.INDICADORES)) {
      expect(typeof ind.fn).toBe('function');
      expect(ind.constructo).toEqual(expect.any(String));
      expect(ind.metrica).toEqual(expect.any(String));
      expect(['proporcion', 'ms', 'ensayos']).toContain(ind.unidad);
      expect(ind).not.toHaveProperty('dominio');
    }
  });
});

describe('variables de contexto', () => {
  test('se calculan por tarea y nunca como indicador', () => {
    const e = [
      ensayo({ tiempoReaccionMs: 800, rectificaciones: 2 }),
      ensayo({ tiempoReaccionMs: 1200 }),
      ensayo({ estadoItem: 'omitido', tiempoReaccionMs: null }),
      ensayo({ tiempoReaccionMs: 100 })
    ];
    const v = c.variablesContextuales(e);
    expect(v.tasaOmision).toBe(1 / 4);
    expect(v.tasaAnticipacion).toBe(1 / 4);
    expect(v.rectificacionesPromedio).toBe(1);
    expect(v.coeficienteVariacion).toBeGreaterThan(0);
    expect(v).not.toHaveProperty('dominio');
  });

  test('sin ensayos todo queda en null', () => {
    expect(c.variablesContextuales([])).toEqual({
      tasaOmision: null,
      tasaAnticipacion: null,
      variabilidadTiempoReaccion: null,
      coeficienteVariacion: null,
      rectificacionesPromedio: null
    });
    expect(c.media([])).toBeNull();
    expect(c.desviacionEstandar([1])).toBeNull();
  });
});
