'use strict';
const { procesarSesion } = require('../src/dominio/registro/motor');
const { AVISO_NO_DIAGNOSTICO } = require('../src/dominio/registro/vocabularioProhibido');
const { VERSION_ALGORITMO } = require('../src/dominio/registro/version');
const { sesionCompleta, ensayosCambioRegla } = require('./ayudas/sesionRegistro');

/**
 * Salida del motor del registro conductual. M-09, RCN-03. Adaptadas de
 * fase-ii (api/test/motor.test.js); las restricciones del Cuadro 27 estan en
 * registroRestricciones.test.js.
 */

describe('M-09 salida por tarea y constructo', () => {
  const r = procesarSesion(sesionCompleta());

  test('agrupa los indicadores por tarea, en el orden del catalogo', () => {
    expect(r.procesada).toBe(true);
    expect(Object.keys(r.tareas)).toEqual(['cambio-regla', 'navon']);
    expect(r.tareas['cambio-regla'].indicadores.map((i) => i.codigo)).toEqual(['CC-08', 'CC-09', 'CC-12']);
    expect(r.tareas.navon.indicadores.map((i) => i.codigo)).toEqual(['CC-10']);
  });

  test('cada indicador trae su constructo, metrica, unidad y valor observado', () => {
    for (const tarea of Object.values(r.tareas)) {
      expect(tarea.titulo).toEqual(expect.any(String));
      for (const ind of tarea.indicadores) {
        expect(Object.keys(ind)).toEqual(expect.arrayContaining(['codigo', 'constructo', 'metrica', 'unidad', 'observado']));
      }
    }
    const cc10 = r.tareas.navon.indicadores[0];
    expect(cc10.constructo).toBe('Diferencia global-local');
    expect(cc10.unidad).toBe('ms');
  });

  test('CC-12 dice si se alcanzo el criterio', () => {
    const cc12 = r.tareas['cambio-regla'].indicadores.find((i) => i.codigo === 'CC-12');
    expect(cc12).toMatchObject({ observado: 5, criterioAlcanzado: true });
  });

  test('una tarea sin ensayos da valores nulos, sin inventar datos', () => {
    const solo = procesarSesion(sesionCompleta({ ensayos: ensayosCambioRegla() }));
    expect(solo.tareas.navon.indicadores[0].observado).toBeNull();
    expect(solo.tareas.navon.contexto.tasaOmision).toBeNull();
    const vacia = procesarSesion(sesionCompleta({ ensayos: undefined }));
    const cc12 = vacia.tareas['cambio-regla'].indicadores.find((i) => i.codigo === 'CC-12');
    expect(cc12).toMatchObject({ observado: null, criterioAlcanzado: null });
  });

  test('las variables de contexto viajan aparte de los indicadores', () => {
    expect(r.tareas['cambio-regla'].contexto).toHaveProperty('tasaOmision');
    expect(r.tareas['cambio-regla'].contexto).toHaveProperty('tasaAnticipacion');
    expect(r.contexto).toEqual({ tipoEntrada: 'raton', pausas: 1, repeticionesInstruccion: 0 });
  });

  test('del contexto de la sesion solo pasan las variables previstas', () => {
    const otra = procesarSesion(sesionCompleta({ contexto: { tipoEntrada: 'tactil', navegador: 'x' } }));
    expect(otra.contexto).toEqual({ tipoEntrada: 'tactil', pausas: null, repeticionesInstruccion: null });
  });

  test('conserva el seudonimo y las versiones', () => {
    expect(r.seudonimo).toBe('K7QM-3XRA');
    expect(r.versionAlgoritmo).toBe(VERSION_ALGORITMO);
    expect(r.versionCatalogo).toBe('1.0.0');
    expect(procesarSesion(sesionCompleta({ versionCatalogo: undefined })).versionCatalogo).toBeNull();
  });
});

describe('RCN-03 aviso de no diagnóstico en toda salida de M-09', () => {
  test('lleva el texto exacto, se procese o no la sesion', () => {
    expect(AVISO_NO_DIAGNOSTICO).toBe(
      'Estos valores describen el desempeño en dos tareas. No constituyen diagnóstico ni clasificación ' +
        'y no sustituyen la valoración profesional; su interpretación corresponde al profesional.'
    );
    expect(procesarSesion(sesionCompleta()).avisos.texto).toBe(AVISO_NO_DIAGNOSTICO);
    expect(procesarSesion({ estado: 'en_curso' }).avisos.texto).toBe(AVISO_NO_DIAGNOSTICO);
  });
});
