'use strict';
const { procesarSesion } = require('../src/dominio/registro/motor');
const { clasificarEnsayosMixtos } = require('../src/dominio/registro/indicadores');
const { construirSecuencia } = require('../src/dominio/registro/secuenciador');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { VERSION_ALGORITMO, VERSION_CATALOGO } = require('../src/dominio/registro/version');
const sesionWeb = require('./ayudas/sesionWebCambioRegla.json');

/**
 * Sesion con el formato de la web (T13): la produce el motor de ensayos de
 * web/src/registro/ con una semilla fija y respuestas simuladas
 * (sesionSimulada.js; sesionSimulada.test.js comprueba que este archivo sigue
 * siendo lo que produce la web). M-09, CC-08, CC-09, CC-12, RF-13, RF-14
 *
 * Respuestas simuladas: dos errores perseverativos al empezar el bloque de
 * forma; en los bloques mixtos, 812,5 ms en los cambios y 604,25 ms en las
 * repeticiones, con una pausa de 2 s dentro de un ensayo, una anticipacion,
 * una omision y un error.
 */

describe('M-09 sesión con el formato de la web', () => {
  const r = procesarSesion(sesionWeb);
  const tarea = r.tareas['cambio-regla'];
  const indicador = (codigo) => tarea.indicadores.find((i) => i.codigo === codigo);

  test('se procesa, con la version del algoritmo y la del catalogo de la web', () => {
    expect(r.procesada).toBe(true);
    expect(r.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    expect(r.versionCatalogo).toBe(VERSION_CATALOGO);
    expect(r.contexto).toEqual({ tipoEntrada: 'teclado', pausas: 2, repeticionesInstruccion: 1 });
  });

  test('sigue la estructura del catalogo', () => {
    const s = construirSecuencia('cambio-regla');
    const bloques = [...new Set(sesionWeb.ensayos.map((e) => e.bloque))];
    expect(bloques).toEqual(['CR-PRACTICA', ...s.bloques.map((b) => b.id)]);
    expect(sesionWeb.ensayos).toHaveLength(s.ensayosPractica + s.ensayosPuntuados);
  });

  test('CC-08: 2 errores perseverativos de 7 en el bloque de forma', () => {
    expect(indicador('CC-08').observado).toBeCloseTo(2 / 7, 12);
  });

  test('CC-09 por ensayo en los bloques mixtos, con el tiempo neto (RF-13) y sin anticipaciones ni errores (RF-14)', () => {
    expect(indicador('CC-09').observado).toBeCloseTo(812.5 - 604.25, 9);
    const tipos = clasificarEnsayosMixtos(sesionWeb.ensayos);
    for (const bloque of ['CR-MIXTO-1', 'CR-MIXTO-2', 'CR-MIXTO-3', 'CR-MIXTO-4']) {
      const propios = tipos.filter((e) => e.bloque === bloque).map((e) => e.tipoEnsayo);
      expect(propios.filter((t) => t === 'cambio')).toHaveLength(3);
      expect(propios.filter((t) => t === 'repeticion')).toHaveLength(3);
    }
  });

  test('CC-12: 5 ensayos hasta tres aciertos seguidos', () => {
    expect(indicador('CC-12')).toMatchObject({ observado: 5, criterioAlcanzado: true });
  });

  test('la omision y la anticipacion quedan en el contexto, no en los indicadores', () => {
    expect(tarea.contexto.tasaOmision).toBeCloseTo(1 / 42, 12);
    expect(tarea.contexto.tasaAnticipacion).toBeCloseTo(1 / 42, 12);
  });

  test('la tarea de Navon no tiene ensayos todavia: CC-10 es null', () => {
    expect(r.tareas.navon.indicadores[0]).toMatchObject({ codigo: 'CC-10', observado: null });
  });

  test('M-09 / RCN-03 la salida no tiene vocabulario prohibido', () => {
    expect(buscarVocabularioProhibido(r)).toEqual([]);
  });

  test('la misma sesion da la misma salida', () => {
    expect(procesarSesion(JSON.parse(JSON.stringify(sesionWeb)))).toEqual(r);
  });
});
