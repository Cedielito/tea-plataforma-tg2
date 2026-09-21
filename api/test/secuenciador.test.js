'use strict';
const { construirSecuencia, planificarSesion, vistaDeEnsayo, LIMITES } = require('../src/dominio/minijuegos/secuenciador');
const { CATALOGO, tramoDeEdad } = require('../src/dominio/minijuegos/catalogo');

describe('tramos de edad', () => {
  test('clasifica correctamente los limites', () => {
    expect(tramoDeEdad(4)).toBe('4-7');
    expect(tramoDeEdad(7)).toBe('4-7');
    expect(tramoDeEdad(8)).toBe('8-17');
    expect(tramoDeEdad(17)).toBe('8-17');
  });
  test('rechaza edades fuera del alcance declarado', () => {
    expect(() => tramoDeEdad(18)).toThrow(RangeError);
    expect(() => tramoDeEdad(null)).toThrow(TypeError);
  });
});

describe('CP-01 y CP-04 en la secuencia de cada minijuego', () => {
  test.each(Object.keys(CATALOGO))('%s respeta los limites de bloque y practica', (codigo) => {
    const s = construirSecuencia(codigo, 10);
    expect(s.ensayosPractica).toBeGreaterThanOrEqual(LIMITES.PRACTICA_MINIMA);
    for (const b of s.bloques) {
      expect(b.ensayos).toBeLessThanOrEqual(LIMITES.ENSAYOS_POR_BLOQUE);
      expect(b.pausaDisponible).toBe(true);
    }
  });
  test('MJ-2 omite el bloque de segundo orden en el tramo de 4 a 7 anos', () => {
    const menor = construirSecuencia('MJ-2', 5);
    const mayor = construirSecuencia('MJ-2', 13);
    expect(menor.bloques.map((b) => b.id)).not.toContain('MJ2-B2');
    expect(mayor.bloques.map((b) => b.id)).toContain('MJ2-B2');
    expect(menor.ensayosPuntuados).toBeLessThan(mayor.ensayosPuntuados);
  });
  test('MJ-3 anade la dimension de tamano solo en el tramo mayor', () => {
    expect(construirSecuencia('MJ-3', 6).ajuste.dimensiones).toEqual(['color', 'forma']);
    expect(construirSecuencia('MJ-3', 15).ajuste.dimensiones).toContain('tamano');
  });
  test('rechaza un minijuego inexistente', () => {
    expect(() => construirSecuencia('MJ-9', 10)).toThrow(RangeError);
  });
});

describe('CT-08 duracion de la sesion', () => {
  test('la sesion completa no supera los 20 minutos en ambos tramos', () => {
    for (const edad of [5, 14]) {
      const plan = planificarSesion(edad);
      expect(plan.duracionTotalMin).toBeLessThanOrEqual(LIMITES.DURACION_MAXIMA_MIN);
      expect(plan.cumpleCT08).toBe(true);
    }
  });
  test('ofrece al menos una pausa cada cinco minutos de juego', () => {
    const plan = planificarSesion(10);
    expect(plan.pausas.length).toBeGreaterThanOrEqual(1);
  });
  test('CP-06: respeta el orden elegido por el participante', () => {
    const plan = planificarSesion(10, ['MJ-3', 'MJ-1']);
    expect(plan.secuencias.map((s) => s.minijuego)).toEqual(['MJ-3', 'MJ-1']);
  });
});

describe('CT-03 vista del ensayo', () => {
  test('no expone tiempo de reaccion ni acierto al participante', () => {
    const v = vistaDeEnsayo({ id: 'e1', estimulo: 'x', tiempoReaccionMs: 940, acierto: true });
    expect(v).not.toHaveProperty('tiempoReaccionMs');
    expect(v).not.toHaveProperty('acierto');
    expect(v.mostrarTemporizador).toBe(false);
    expect(v.mostrarMarcador).toBe(false);
  });
});
