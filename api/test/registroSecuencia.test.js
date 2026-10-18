'use strict';
const { CATALOGO, ORDEN_TAREAS, TR_MINIMO_MS } = require('../src/dominio/registro/catalogo');
const { LIMITES, construirSecuencia, planificarSesion, vistaDeEnsayo } = require('../src/dominio/registro/secuenciador');

/**
 * Catalogo y secuencia de bloques de las dos tareas. M-09, CP-01, CP-04,
 * CT-03, CT-08. Adaptadas de fase-ii (api/test/secuenciador.test.js).
 */

describe('M-09 catálogo de las dos tareas', () => {
  test('solo tiene la tarea de cambio de regla y la de Navon', () => {
    expect(Object.keys(CATALOGO)).toEqual(['cambio-regla', 'navon']);
    expect(ORDEN_TAREAS).toEqual(['cambio-regla', 'navon']);
  });

  test('no tiene tramos de edad', () => {
    expect(JSON.stringify(CATALOGO)).not.toMatch(/tramo|edad/i);
  });

  test('cambio de regla: color, forma y 4 bloques mixtos con señal por ensayo', () => {
    const s = construirSecuencia('cambio-regla');
    expect(CATALOGO['cambio-regla'].bloquesMixtos).toBe(4);
    expect(s.bloques.map((b) => b.id)).toEqual([
      'CR-COLOR',
      'CR-FORMA',
      'CR-MIXTO-1',
      'CR-MIXTO-2',
      'CR-MIXTO-3',
      'CR-MIXTO-4'
    ]);
    expect(s.bloques.map((b) => b.fase)).toEqual(['pre-cambio', 'post-cambio', 'mixto', 'mixto', 'mixto', 'mixto']);
    expect(s.bloques.slice(0, 2).map((b) => b.regla)).toEqual(['color', 'forma']);
    expect(s.bloques.slice(2).every((b) => b.senal === 'por-ensayo')).toBe(true);
    expect(s.ensayosPuntuados).toBe(42);
  });

  test('Navon: 4 bloques en orden ABBA', () => {
    const s = construirSecuencia('navon');
    expect(s.bloques.map((b) => b.condicion)).toEqual(['global', 'local', 'local', 'global']);
    expect(s.ensayosPuntuados).toBe(28);
  });

  test('las dos tareas fijan el umbral de anticipacion en 200 ms', () => {
    expect(TR_MINIMO_MS).toBe(200);
    for (const t of ORDEN_TAREAS) expect(construirSecuencia(t).trMinimoMs).toBe(200);
  });

  test('las dos tareas fijan el limite de respuesta en 5 s y el intervalo entre ensayos en 500 ms', () => {
    for (const t of ORDEN_TAREAS) {
      const s = construirSecuencia(t);
      expect(s.limiteRespuestaMs).toBe(5000);
      expect(s.intervaloEntreEnsayosMs).toBe(500);
    }
  });

  test('cada bloque mixto trae 3 cambios; los bloques de una regla no traen cambios', () => {
    const { bloques } = construirSecuencia('cambio-regla');
    expect(bloques.filter((b) => b.fase === 'mixto').map((b) => b.cambios)).toEqual([3, 3, 3, 3]);
    expect(bloques.filter((b) => b.fase !== 'mixto').every((b) => b.cambios === undefined)).toBe(true);
    expect(bloques.every((b) => b.repetir === undefined)).toBe(true);
  });

  test.each([0, 6, 7, 2.5])('rechaza un bloque mixto con %s cambios', (cambios) => {
    jest.isolateModules(() => {
      jest.doMock('../src/dominio/registro/catalogo', () => {
        const real = jest.requireActual('../src/dominio/registro/catalogo');
        const cfg = real.CATALOGO['cambio-regla'];
        const bloques = cfg.bloques.map((b) => (b.fase === 'mixto' ? { ...b, cambios } : b));
        return { ...real, CATALOGO: { ...real.CATALOGO, 'cambio-regla': { ...cfg, bloques } } };
      });
      const { construirSecuencia: construir } = require('../src/dominio/registro/secuenciador');
      expect(() => construir('cambio-regla')).toThrow(/cambios fuera de rango/);
    });
  });

  test('el catalogo no se puede modificar', () => {
    expect(() => {
      CATALOGO['cambio-regla'].bloquesMixtos = 10;
    }).toThrow(TypeError);
    expect(() => {
      CATALOGO.navon.bloques.push({ id: 'NV-OTRO' });
    }).toThrow(TypeError);
  });

  test('rechaza una tarea desconocida', () => {
    expect(() => construirSecuencia('MJ-1')).toThrow(RangeError);
  });
});

describe('CP-01 como máximo 7 ensayos por bloque', () => {
  test.each(ORDEN_TAREAS)('%s', (tarea) => {
    for (const b of construirSecuencia(tarea).bloques) {
      expect(b.ensayos).toBe(7);
      expect(b.ensayos).toBeLessThanOrEqual(LIMITES.ENSAYOS_POR_BLOQUE);
    }
  });
});

describe('CP-04 al menos 2 ensayos de práctica con retroalimentación', () => {
  test.each(ORDEN_TAREAS)('%s', (tarea) => {
    const s = construirSecuencia(tarea);
    expect(s.ensayosPractica).toBeGreaterThanOrEqual(LIMITES.PRACTICA_MINIMA);
    expect(s.practicaConRetroalimentacion).toBe(true);
  });
});

describe('CT-08 20 minutos o menos, con una pausa al menos cada 5 minutos', () => {
  test('la sesion completa cumple los dos limites', () => {
    const plan = planificarSesion();
    expect(plan.duracionTotalMin).toBeLessThanOrEqual(LIMITES.DURACION_MAXIMA_MIN);
    expect(plan.tramoSinPausaMaxMin).toBeLessThanOrEqual(LIMITES.MINUTOS_ENTRE_PAUSAS);
    expect(plan.cumpleCT08).toBe(true);
  });

  test('cada bloque ofrece una pausa al terminar', () => {
    for (const t of ORDEN_TAREAS) {
      expect(construirSecuencia(t).bloques.every((b) => b.pausaDisponible)).toBe(true);
    }
  });

  test('respeta el orden de tareas pedido', () => {
    expect(planificarSesion(['navon', 'cambio-regla']).secuencias.map((s) => s.tarea)).toEqual([
      'navon',
      'cambio-regla'
    ]);
  });
});

describe('CT-03 el participante no ve temporizador, marcador ni acierto', () => {
  const crudo = { id: 'e1', estimulo: 'x', tiempoReaccionMs: 940, pausasDuranteItemMs: 0, acierto: true, claseError: 'correcta' };

  test('fuera de la practica oculta el tiempo, el acierto y la clase de error', () => {
    const v = vistaDeEnsayo(crudo);
    for (const campo of ['tiempoReaccionMs', 'pausasDuranteItemMs', 'acierto', 'claseError']) {
      expect(v).not.toHaveProperty(campo);
    }
    expect(v).toMatchObject({ id: 'e1', estimulo: 'x', mostrarTemporizador: false, mostrarMarcador: false, mostrarAcierto: false });
  });

  test('en la practica muestra el acierto como retroalimentacion, nunca el tiempo', () => {
    const v = vistaDeEnsayo({ ...crudo, practica: true });
    expect(v.acierto).toBe(true);
    expect(v.mostrarAcierto).toBe(true);
    expect(v.mostrarTemporizador).toBe(false);
    expect(v.mostrarMarcador).toBe(false);
    expect(v).not.toHaveProperty('tiempoReaccionMs');
  });
});
