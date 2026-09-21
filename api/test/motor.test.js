'use strict';
const motor = require('../src/dominio/puntuacion/motor');
const { ESCALAS } = require('../src/dominio/indicadores/reporte');
const { VERSION_ALGORITMO } = require('../src/dominio/puntuacion/version');

const ensayo = (o) => ({ practica: false, estadoItem: 'respondido', acierto: true, tiempoReaccionMs: 1000, ...o });

const mj1 = [
  ensayo({ constructo: 'emociones_basicas', presentado: 'alegria', respuesta: 'alegria', acierto: true, tiempoReaccionMs: 800 }),
  ensayo({ constructo: 'estados_complejos', presentado: 'duda', respuesta: 'miedo', acierto: false, tiempoReaccionMs: 1500 })
];
const mj2 = [
  ensayo({ constructo: 'falsa_creencia_primer_orden', acierto: true }),
  ensayo({ constructo: 'falsa_creencia_segundo_orden', acierto: false }),
  ensayo({ constructo: 'faux_pas', acierto: true }),
  ensayo({ constructo: 'secuencia_mecanica', acierto: true }),
  ensayo({ constructo: 'secuencia_social', acierto: false })
];
const mj3 = [
  ensayo({ acierto: false, posteriorACambio: true, claseError: 'perseverativa', tiempoReaccionMs: 1500 }),
  ensayo({ acierto: true, posteriorACambio: false, claseError: 'correcta', tiempoReaccionMs: 800 }),
  ensayo({ acierto: true, condicion: 'global', tiempoReaccionMs: 1200 }),
  ensayo({ acierto: true, condicion: 'local', tiempoReaccionMs: 700 })
];

function reporteCompleto() {
  return Object.values(ESCALAS).flatMap((e) => e.items.map((i) => ({ item: i, respuesta: 'a_veces' })));
}

function sesionCompleta(conReporte = true) {
  return {
    uuid: '11111111-1111-4111-8111-111111111111',
    estadoSesion: 'completada',
    versionCatalogo: '1.0.0',
    eventos: mj1.concat(mj2, mj3),
    contexto: { tipoEntrada: 'tactil', repeticionesInstruccion: 0, pausas: [] },
    entrada: {
      'CC-01': mj1, 'CC-02': mj1, 'CC-03': mj1, 'CC-11': mj1,
      'CC-04': mj2, 'CC-05': mj2, 'CC-06': mj2, 'CC-07': mj2,
      'CC-08': mj3, 'CC-09': mj3, 'CC-10': mj3, 'CC-12': mj3
    },
    reporteCuidador: conReporte ? reporteCompleto() : []
  };
}

describe('sesiones no procesables', () => {
  test('RF-24: solo se procesa la sesión completada', () => {
    for (const estado of ['interrumpida', 'abandonada', 'en_curso']) {
      const r = motor.puntuar({ estadoSesion: estado });
      expect(r.procesada).toBe(false);
      expect(r.motivo).toBe('sesion_no_completada');
    }
    expect(motor.puntuar(null).procesada).toBe(false);
  });
});

describe('cobertura de dominios por fuente', () => {
  test('los minijuegos por sí solos cubren el 42,9 % de los dominios', () => {
    expect(motor.coberturaPorDesempeno()).toBeCloseTo(3 / 7, 5);
  });
  test('la combinación con el reporte del informante cubre los siete dominios', () => {
    expect(motor.coberturaCombinada()).toBe(1);
  });
  test('B1, B3 y B4 dependen exclusivamente del reporte del informante', () => {
    for (const d of ['B1', 'B3', 'B4']) {
      expect(motor.FUENTE_POR_DOMINIO[d]).toEqual(['reporte']);
    }
  });
  test('A2 y A3 se declaran de fuente mixta', () => {
    expect(motor.FUENTE_POR_DOMINIO.A2).toEqual(['desempeno', 'reporte']);
    expect(motor.FUENTE_POR_DOMINIO.A3).toEqual(['desempeno', 'reporte']);
  });
});

describe('normalización sin muestra normativa', () => {
  test('reporta el valor observado y deja el percentil sin calcular', () => {
    const n = motor.normalizar(0.75, null);
    expect(n.observado).toBe(0.75);
    expect(n.percentil).toBeNull();
    expect(n.provisional).toBe(true);
  });
  test('con muestra suficiente sí calcula el percentil', () => {
    const muestra = Array.from({ length: 40 }, (_, i) => i / 40);
    const n = motor.normalizar(0.5, { muestra });
    expect(n.provisional).toBe(false);
    expect(n.percentil).toBeGreaterThanOrEqual(0);
  });
  test('una muestra insuficiente sigue siendo provisional', () => {
    expect(motor.normalizar(0.5, { muestra: [0.1, 0.2] }).provisional).toBe(true);
  });
  test('un valor no escalar, como la matriz de confusión, se conserva sin normalizar', () => {
    const n = motor.normalizar({ duda: { miedo: 2 } });
    expect(n.percentil).toBeNull();
    expect(n.observado).toEqual({ duda: { miedo: 2 } });
  });
});

describe('RF-28 y RN-01: la salida no clasifica', () => {
  test('no emite banda, puntaje de riesgo ni etiqueta diagnóstica', () => {
    const r = motor.puntuar(sesionCompleta());
    const texto = JSON.stringify(r);
    expect(texto).not.toMatch(/nivel(es)? de apoyo|severidad|diagn[oó]stico de TEA|riesgo/i);
    expect(r).not.toHaveProperty('banda');
    expect(r.avisos.sinPuntosDeCorte).toBe(true);
    expect(r.avisos.noDiagnostico).toBe(true);
  });
  test('declara explícitamente que los ajustes sensoriales no son interpretables', () => {
    expect(motor.puntuar(sesionCompleta()).avisos.ajustesSensorialesNoInterpretables).toBe(true);
  });
});

describe('RF-42: el perfil distingue el origen de cada dato', () => {
  test('cada elemento del dominio declara si es desempeño o reporte', () => {
    const r = motor.puntuar(sesionCompleta());
    for (const d of motor.DOMINIOS) {
      for (const el of r.perfil[d].elementos) {
        expect(['desempeno', 'reporte_informante']).toContain(el.origen);
      }
    }
    expect(r.perfil.B4.elementos.every((e) => e.origen === 'reporte_informante')).toBe(true);
    expect(r.perfil.B2.elementos.every((e) => e.origen === 'desempeno')).toBe(true);
  });
  test('con reporte completo ningún dominio queda sin datos suficientes', () => {
    const r = motor.puntuar(sesionCompleta(true));
    expect(r.cobertura.dominiosSinDatos).toEqual([]);
  });
  test('RF-29: sin el reporte del cuidador señala los dominios sin datos', () => {
    const r = motor.puntuar(sesionCompleta(false));
    expect(r.cobertura.dominiosSinDatos).toEqual(expect.arrayContaining(['B1', 'B3', 'B4']));
    expect(r.perfil.B2.datosSuficientes).toBe(true);
  });
});

describe('CT-13 y RF-33: versionado', () => {
  test('toda salida declara la versión del algoritmo y del catálogo', () => {
    const r = motor.puntuar(sesionCompleta());
    expect(r.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    expect(r.versionCatalogo).toBe('1.0.0');
    expect(motor.puntuar({ estadoSesion: 'abandonada' }).versionAlgoritmo).toBe(VERSION_ALGORITMO);
  });
});

describe('variables contextuales en la salida', () => {
  test('viajan en una sección propia, fuera del perfil por dominio', () => {
    const r = motor.puntuar(sesionCompleta());
    expect(r.contexto).toHaveProperty('tasaOmision');
    expect(r.contexto).toHaveProperty('tipoEntrada');
    expect(r.perfil).not.toHaveProperty('contexto');
  });
});
