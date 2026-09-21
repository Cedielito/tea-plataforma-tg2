'use strict';
const c = require('../src/dominio/indicadores/calculos');

const ensayo = (o) => ({ practica: false, estadoItem: 'respondido', acierto: true, tiempoReaccionMs: 1000, ...o });

describe('exclusiones obligatorias en todo cálculo', () => {
  test('los ensayos de práctica no entran', () => {
    const e = [ensayo({ practica: true, acierto: false }), ensayo({ acierto: true })];
    expect(c.soloPuntuados(e)).toHaveLength(1);
    expect(c.proporcionAciertos(e)).toBe(1);
  });
  test('RF-23: la omisión no se computa como error', () => {
    const e = [ensayo({ acierto: true }), ensayo({ estadoItem: 'omitido', acierto: false })];
    expect(c.proporcionAciertos(e)).toBe(1);
    expect(c.tasaOmision(e)).toBe(0.5);
  });
  test('sin ensayos respondidos no hay valor', () => {
    expect(c.proporcionAciertos([])).toBeNull();
    expect(c.tasaOmision([])).toBeNull();
    expect(c.mediana([])).toBeNull();
    expect(c.desviacionEstandar([1])).toBeNull();
  });
});

describe('RF-20: el intervalo pausado se descuenta del tiempo de reacción', () => {
  test('el TR neto resta la pausa ocurrida durante el ítem', () => {
    expect(c.trNeto({ tiempoReaccionMs: 5000, pausasDuranteItemMs: 3000 })).toBe(2000);
    expect(c.trNeto({ tiempoReaccionMs: 900 })).toBe(900);
    expect(c.trNeto(null)).toBeNull();
  });
  test('CC-02 usa la mediana del TR neto', () => {
    const e = [
      ensayo({ tiempoReaccionMs: 800 }),
      ensayo({ tiempoReaccionMs: 5000, pausasDuranteItemMs: 4000 }),
      ensayo({ tiempoReaccionMs: 1200 })
    ];
    expect(c.cc02(e)).toBe(1000);
  });
});

describe('CC-01 a CC-03 y CC-11 · MJ-1', () => {
  const e = [
    ensayo({ constructo: 'emociones_basicas', presentado: 'alegria', respuesta: 'alegria', acierto: true, tiempoReaccionMs: 800 }),
    ensayo({ constructo: 'emociones_basicas', presentado: 'tristeza', respuesta: 'tristeza', acierto: true, tiempoReaccionMs: 900 }),
    ensayo({ constructo: 'estados_complejos', presentado: 'duda', respuesta: 'miedo', acierto: false, tiempoReaccionMs: 1600 }),
    ensayo({ constructo: 'estados_complejos', presentado: 'duda', respuesta: 'miedo', acierto: false, tiempoReaccionMs: 1400 })
  ];
  test('CC-01 promedia los aciertos de ambos bloques', () => {
    expect(c.cc01(e)).toBe(0.5);
  });
  test('CC-03 contrasta básicas contra complejas en el mismo participante', () => {
    expect(c.cc03(e)).toBe(1);
    expect(c.cc03([])).toBeNull();
  });
  test('RF-27: CC-11 construye la matriz de confusión', () => {
    const m = c.cc11(e);
    expect(m.duda.miedo).toBe(2);
    expect(m.alegria.alegria).toBe(1);
    expect(c.cc11([])).toBeNull();
  });
});

describe('CC-04 a CC-07 · MJ-2', () => {
  const e = [
    ensayo({ constructo: 'falsa_creencia_primer_orden', acierto: true }),
    ensayo({ constructo: 'falsa_creencia_primer_orden', acierto: false }),
    ensayo({ constructo: 'falsa_creencia_segundo_orden', acierto: false }),
    ensayo({ constructo: 'faux_pas', acierto: true }),
    ensayo({ constructo: 'secuencia_mecanica', acierto: true }),
    ensayo({ constructo: 'secuencia_mecanica', acierto: true }),
    ensayo({ constructo: 'secuencia_social', acierto: false }),
    ensayo({ constructo: 'secuencia_social', acierto: true })
  ];
  test('separa primer orden, segundo orden y faux pas', () => {
    expect(c.cc04(e)).toBe(0.5);
    expect(c.cc05(e)).toBe(0);
    expect(c.cc06(e)).toBe(1);
  });
  test('CC-07 aísla la dificultad social controlando la secuenciación general', () => {
    expect(c.cc07(e)).toBe(0.5);
    expect(c.cc07([])).toBeNull();
  });
});

describe('CC-08 a CC-10 y CC-12 · MJ-3', () => {
  const e = [
    ensayo({ acierto: true, posteriorACambio: false, claseError: 'correcta', tiempoReaccionMs: 700 }),
    ensayo({ acierto: false, posteriorACambio: true, claseError: 'perseverativa', tiempoReaccionMs: 1500 }),
    ensayo({ acierto: false, posteriorACambio: true, claseError: 'aleatoria', tiempoReaccionMs: 1300 }),
    ensayo({ acierto: true, posteriorACambio: true, claseError: 'correcta', tiempoReaccionMs: 900 }),
    ensayo({ acierto: true, posteriorACambio: true, claseError: 'correcta', tiempoReaccionMs: 850 }),
    ensayo({ acierto: true, posteriorACambio: true, claseError: 'correcta', tiempoReaccionMs: 800 }),
    ensayo({ acierto: true, condicion: 'global', tiempoReaccionMs: 1200 }),
    ensayo({ acierto: true, condicion: 'local', tiempoReaccionMs: 700 })
  ];
  test('CC-08 solo cuenta el error perseverativo, no el aleatorio', () => {
    expect(c.cc08(e)).toBeCloseTo(1 / 5, 5);
    expect(c.cc08([])).toBeNull();
  });
  test('CC-12 cuenta los ensayos hasta tres aciertos consecutivos', () => {
    expect(c.cc12(e)).toBe(5);
    expect(c.cc12([ensayo({ posteriorACambio: true, acierto: false })])).toBeNull();
  });
  test('CC-09 calcula el costo de cambio sobre TR neto', () => {
    expect(c.cc09(e)).toBeGreaterThan(0);
  });
  test('CC-10 calcula el sesgo local-global', () => {
    expect(c.cc10(e)).toBe(500);
    expect(c.cc10([])).toBeNull();
  });
});

describe('el catálogo de desempeño no atribuye dominios inobservables', () => {
  test('declara doce indicadores, todos de origen desempeño', () => {
    const claves = Object.keys(c.INDICADORES);
    expect(claves).toHaveLength(12);
    for (const k of claves) {
      expect(c.INDICADORES[k].origen).toBe('desempeno');
      expect(typeof c.INDICADORES[k].fn).toBe('function');
    }
  });
  test('ningún indicador de desempeño se asigna a B1, B3 ni B4', () => {
    const dominios = Object.values(c.INDICADORES).map((i) => i.dominio);
    expect(dominios).not.toContain('B1');
    expect(dominios).not.toContain('B3');
    expect(dominios).not.toContain('B4');
  });
  test('A2 por desempeño se declara solo en su vertiente receptiva', () => {
    const a2 = Object.values(c.INDICADORES).filter((i) => i.dominio === 'A2');
    expect(a2.length).toBeGreaterThan(0);
    for (const i of a2) expect(i.vertiente).toBe('receptiva');
  });
});

describe('variables contextuales', () => {
  test('se reportan aparte y nunca como indicador de dominio', () => {
    const e = [ensayo({ tiempoReaccionMs: 800, rectificaciones: 2 }), ensayo({ tiempoReaccionMs: 1200 })];
    const v = c.variablesContextuales(e, { tipoEntrada: 'tactil', repeticionesInstruccion: 1 });
    expect(v.coeficienteVariacion).toBeGreaterThan(0);
    expect(v.rectificacionesPromedio).toBe(1);
    expect(v.tipoEntrada).toBe('tactil');
    expect(v).not.toHaveProperty('dominio');
  });
});
