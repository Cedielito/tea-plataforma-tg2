'use strict';
const { procesarSesion } = require('../src/dominio/registro/motor');
const { construirSecuencia } = require('../src/dominio/registro/secuenciador');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { VERSION_ALGORITMO, VERSION_CATALOGO } = require('../src/dominio/registro/version');
const sesionWeb = require('./ayudas/sesionWebDosTareas.json');

/**
 * Sesion de las dos tareas con el formato de la web (T14): la produce el
 * motor de ensayos de web/src/registro/ con una semilla fija y respuestas
 * simuladas (simularSesionDosTareas en sesionSimulada.js;
 * sesionSimulada.test.js comprueba que este archivo sigue siendo lo que
 * produce la web). M-09, CC-08, CC-09, CC-10, CC-12, RF-13, RF-14
 *
 * La parte de cambio de regla es la misma de sesionWebCambioRegla.json. En
 * Navon: aciertos con 520,25 ms en los bloques globales y 610,25 ms en los
 * locales, con una pausa de 2,5 s dentro de un ensayo, una anticipacion, una
 * omision y un error rapido, que no deben mover CC-10.
 */

describe('M-09 sesión de las dos tareas con el formato de la web', () => {
  const r = procesarSesion(sesionWeb);
  const indicador = (tarea, codigo) => r.tareas[tarea].indicadores.find((i) => i.codigo === codigo);

  test('se procesa, con la version del algoritmo, la del catalogo y el contexto de toda la sesion', () => {
    expect(r.procesada).toBe(true);
    expect(r.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    expect(r.versionCatalogo).toBe(VERSION_CATALOGO);
    expect(r.contexto).toEqual({ tipoEntrada: 'teclado', pausas: 3, repeticionesInstruccion: 1 });
  });

  test('sigue la estructura del catalogo en las dos tareas, en orden', () => {
    const esperado = [];
    for (const [tarea, practica] of [['cambio-regla', 'CR-PRACTICA'], ['navon', 'NV-PRACTICA']]) {
      const s = construirSecuencia(tarea);
      esperado.push(practica, ...s.bloques.map((b) => b.id));
      expect(sesionWeb.ensayos.filter((e) => e.tarea === tarea)).toHaveLength(s.ensayosPractica + s.ensayosPuntuados);
    }
    expect([...new Set(sesionWeb.ensayos.map((e) => e.bloque))]).toEqual(esperado);
  });

  test('CC-08, CC-09 y CC-12 de la tarea de cambio de regla', () => {
    expect(indicador('cambio-regla', 'CC-08').observado).toBeCloseTo(2 / 7, 12);
    expect(indicador('cambio-regla', 'CC-09').observado).toBeCloseTo(812.5 - 604.25, 9);
    expect(indicador('cambio-regla', 'CC-12')).toMatchObject({ observado: 5, criterioAlcanzado: true });
  });

  test('CC-10: global menos local con el tiempo neto (RF-13), solo aciertos y sin anticipaciones (RF-14)', () => {
    expect(indicador('navon', 'CC-10').observado).toBeCloseTo(520.25 - 610.25, 9);
  });

  test('la pausa dentro del ensayo esta en el tiempo guardado y el dominio la descuenta', () => {
    const conPausa = sesionWeb.ensayos.filter((e) => e.tarea === 'navon' && e.pausasDuranteItemMs > 0);
    expect(conPausa).toHaveLength(1);
    expect(conPausa[0].tiempoReaccionMs - conPausa[0].pausasDuranteItemMs).toBeCloseTo(520.25, 9);
  });

  test('cada tarea tiene su contexto: la omision y la anticipacion de Navon no estan en cambio de regla', () => {
    expect(r.tareas.navon.contexto.tasaOmision).toBeCloseTo(1 / 28, 12);
    expect(r.tareas.navon.contexto.tasaAnticipacion).toBeCloseTo(1 / 28, 12);
    expect(r.tareas['cambio-regla'].contexto.tasaOmision).toBeCloseTo(1 / 42, 12);
  });

  test('la tarea de cambio de regla da lo mismo que procesada sola', () => {
    const sola = procesarSesion(require('./ayudas/sesionWebCambioRegla.json'));
    expect(r.tareas['cambio-regla']).toEqual(sola.tareas['cambio-regla']);
  });

  test('M-09 / RCN-03 la salida no tiene vocabulario prohibido', () => {
    expect(buscarVocabularioProhibido(r)).toEqual([]);
  });

  test('CT-13 la misma sesion da la misma salida', () => {
    expect(procesarSesion(JSON.parse(JSON.stringify(sesionWeb)))).toEqual(r);
  });
});
