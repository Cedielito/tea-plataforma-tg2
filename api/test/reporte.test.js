'use strict';
const r = require('../src/dominio/indicadores/reporte');

const responder = (item, valor) => ({ item, respuesta: valor });

function reporteCompleto(valor = 'a_veces') {
  return Object.values(r.ESCALAS).flatMap((e) => e.items.map((i) => responder(i, valor)));
}

describe('instrumento de reporte del cuidador', () => {
  test('declara cinco escalas y quince ítems', () => {
    expect(Object.keys(r.ESCALAS)).toHaveLength(5);
    expect(r.TOTAL_ITEMS).toBe(15);
  });
  test('cubre exactamente los dominios que la tarea no puede observar', () => {
    const dominios = Object.values(r.ESCALAS).map((e) => e.dominio).sort();
    expect(dominios).toEqual(['A2', 'A3', 'B1', 'B3', 'B4']);
  });
  test('la escala de A2 y A3 se declara en su vertiente no observable', () => {
    expect(r.ESCALAS['RC-01'].vertiente).toBe('expresiva');
    expect(r.ESCALAS['RC-02'].vertiente).toBe('relacional');
  });
  test('la escala ordinal tiene cuatro niveles de frecuencia', () => {
    expect(Object.keys(r.ESCALA)).toHaveLength(4);
    expect(r.normalizarRespuesta('casi_siempre')).toBe(3);
    expect(r.normalizarRespuesta('siempre')).toBeNull();
  });
});

describe('cálculo de las escalas', () => {
  test('un reporte completo produce valor observado en las cinco escalas', () => {
    const e = r.calcularEscalas(reporteCompleto('con_frecuencia'));
    for (const codigo of Object.keys(r.ESCALAS)) {
      expect(e[codigo].completa).toBe(true);
      expect(e[codigo].valorObservado).toBe(6);
      expect(e[codigo].valorMaximoPosible).toBe(9);
      expect(e[codigo].origen).toBe('reporte_informante');
    }
    expect(r.estaCompleto(reporteCompleto())).toBe(true);
  });
  test('un reporte parcial marca la escala como incompleta sin inventar el faltante', () => {
    const e = r.calcularEscalas([responder('B1-1', 'nunca')]);
    expect(e['RC-03'].completa).toBe(false);
    expect(e['RC-03'].itemsRespondidos).toBe(1);
    expect(e['RC-01'].valorObservado).toBeNull();
    expect(r.estaCompleto([])).toBe(false);
  });
  test('no emite puntaje agregado ni categoría de riesgo', () => {
    const e = r.calcularEscalas(reporteCompleto());
    const texto = JSON.stringify(e);
    expect(texto).not.toMatch(/riesgo|banda|severidad|nivel de apoyo/i);
    expect(e).not.toHaveProperty('total');
  });
});
