'use strict';
const motor = require('../src/dominio/registro/motor');
const c = require('../src/dominio/registro/indicadores');
const { CATALOGO } = require('../src/dominio/registro/catalogo');
const { construirSecuencia, planificarSesion } = require('../src/dominio/registro/secuenciador');
const { contieneDatoIdentificable, generarSeudonimo } = require('../src/dominio/registro/seudonimo');
const { AVISO_NO_DIAGNOSTICO, buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const versiones = require('../src/dominio/registro/version');
const { ensayo, sesionCompleta } = require('./ayudas/sesionRegistro');

/**
 * Restricciones del registro conductual que vienen del documento anterior
 * (Cuadro 27), escritas como pruebas que fallan si alguien rompe la regla.
 * M-09, CT-11, CT-13, RF-13, RF-14, RF-15, RCN-03
 */

describe('CT-11 sin datos identificables', () => {
  test('ni el seudonimo, ni la salida del motor, ni el catalogo tienen campos identificables', () => {
    const r = motor.procesarSesion(sesionCompleta({ seudonimo: generarSeudonimo() }));
    expect(contieneDatoIdentificable(r)).toBe(false);
    expect(contieneDatoIdentificable(CATALOGO)).toBe(false);
    expect(contieneDatoIdentificable(planificarSesion())).toBe(false);
  });

  test('una sesion con datos identificables no se procesa, aunque esten anidados', () => {
    const conNombre = sesionCompleta({ nombre: 'Ana' });
    const conCorreoEnEnsayo = sesionCompleta();
    conCorreoEnEnsayo.ensayos[3].correo = 'ana@correo.co';
    for (const s of [conNombre, conCorreoEnEnsayo]) {
      const r = motor.procesarSesion(s);
      expect(r).toMatchObject({ procesada: false, motivo: motor.MOTIVOS.DATOS_IDENTIFICABLES });
      expect(JSON.stringify(r)).not.toMatch(/Ana|ana@correo/);
    }
  });
});

describe('M-09 salida sin clasificación ni nombres de dominios del DSM-5-TR', () => {
  test('el detector encuentra cada tipo de expresion prohibida', () => {
    for (const texto of ['Compatible con TEA', 'rasgos autistas', 'Nivel de apoyo 2', 'riesgo alto', 'punto de corte',
      'puntaje global', 'Puntuación total', 'percentil 80', 'banda amarilla', 'comunicación social',
      'conductas repetitivas', 'insistencia en la monotonía', 'perfil sensorial', 'dominio B2', 'DSM-5-TR']) {
      expect(buscarVocabularioProhibido({ texto })).not.toEqual([]);
    }
    expect(buscarVocabularioProhibido({ nivelDeRiesgo: 1 })).not.toEqual([]);
  });

  test('no marca las palabras de las instrucciones de las tareas', () => {
    for (const texto of ['Clasifica la figura por su color', 'Ensayo de repetición', 'No verbalices la respuesta',
      'Bloque CR-MIXTO-2', 'Toca la figura grande', 'Tea de lavanda']) {
      expect(buscarVocabularioProhibido({ texto })).toEqual([]);
    }
  });

  test('el aviso oficial es la unica excepcion', () => {
    expect(buscarVocabularioProhibido({ aviso: AVISO_NO_DIAGNOSTICO })).toEqual([]);
    expect(buscarVocabularioProhibido({ aviso: 'No constituye diagnóstico' })).not.toEqual([]);
  });

  test('ni la salida del motor ni el catalogo tienen vocabulario prohibido', () => {
    expect(buscarVocabularioProhibido(motor.procesarSesion(sesionCompleta()))).toEqual([]);
    expect(buscarVocabularioProhibido(motor.procesarSesion({ estado: 'en_curso' }))).toEqual([]);
    expect(buscarVocabularioProhibido(CATALOGO)).toEqual([]);
    expect(buscarVocabularioProhibido(planificarSesion())).toEqual([]);
    const textosIndicadores = Object.values(c.INDICADORES).map(({ constructo, metrica }) => ({ constructo, metrica }));
    expect(buscarVocabularioProhibido(textosIndicadores)).toEqual([]);
  });

  test('la salida no agrega valores: no hay total, banda, dominio ni categoria', () => {
    const r = motor.procesarSesion(sesionCompleta());
    const claves = JSON.stringify(r).match(/"[^"]+":/g).map((k) => k.slice(1, -2).toLowerCase());
    for (const prohibida of ['total', 'banda', 'dominio', 'dominios', 'categoria', 'clasificacion', 'riesgo', 'perfil']) {
      expect(claves).not.toContain(prohibida);
    }
  });
});

describe('RF-14 práctica, omisiones y anticipaciones fuera del cálculo', () => {
  const post = (o) => ensayo({ bloque: 'CR-FORMA', fase: 'post-cambio', regla: 'forma', ...o });
  const mixto = (regla, o) => ensayo({ bloque: 'M1', fase: 'mixto', regla, ...o });
  const navon = (condicion, o) => ensayo({ condicion, ...o });

  const basePost = [post({ acierto: false, claseError: 'perseverativa' }), post({}), post({}), post({})];
  const baseMixto = [mixto('color'), mixto('forma', { tiempoReaccionMs: 900 }), mixto('forma', { tiempoReaccionMs: 600 })];
  const baseNavon = [navon('global', { tiempoReaccionMs: 900 }), navon('local', { tiempoReaccionMs: 600 })];

  const extras = {
    practica: (o) => ({ practica: true, acierto: false, claseError: 'perseverativa', tiempoReaccionMs: 5000, ...o }),
    omision: (o) => ({ estadoItem: 'omitido', acierto: false, claseError: 'perseverativa', tiempoReaccionMs: 5000, ...o }),
    anticipacion: (o) => ({ acierto: false, claseError: 'perseverativa', tiempoReaccionMs: 199, ...o })
  };

  test.each(Object.keys(extras))('un ensayo de %s no cambia ningun indicador', (tipo) => {
    const extra = extras[tipo];
    expect(c.cc08([post(extra({})), ...basePost])).toBe(c.cc08(basePost));
    expect(c.cc12([...basePost.slice(0, 2), post(extra({})), ...basePost.slice(2)])).toBe(c.cc12(basePost));
    // En mixtos el ensayo agregado es una repeticion acertada, salvo por lo que lo excluye
    expect(c.cc09([...baseMixto, mixto('forma', extra({ acierto: true }))])).toBe(c.cc09(baseMixto));
    expect(c.cc10([...baseNavon, navon('global', extra({ acierto: true }))])).toBe(c.cc10(baseNavon));
  });

  test('la omision no cuenta como error', () => {
    expect(c.cc08([...basePost, post({ estadoItem: 'omitido', acierto: false })])).toBe(1 / 4);
    expect(c.tasaOmision([...basePost, post({ estadoItem: 'omitido' })])).toBe(1 / 5);
  });

  test('la anticipacion es un tiempo neto menor de 200 ms; 200 ms ya cuenta', () => {
    expect(c.esAnticipacion(ensayo({ tiempoReaccionMs: 199 }))).toBe(true);
    expect(c.esAnticipacion(ensayo({ tiempoReaccionMs: 200 }))).toBe(false);
    expect(c.esAnticipacion(ensayo({ tiempoReaccionMs: 4150, pausasDuranteItemMs: 4000 }))).toBe(true);
    expect(c.esAnticipacion(ensayo({ estadoItem: 'omitido', tiempoReaccionMs: 0 }))).toBe(false);
  });

  test('el umbral es un parametro del catalogo', () => {
    for (const tarea of Object.keys(CATALOGO)) expect(CATALOGO[tarea].trMinimoMs).toBe(200);
    const e = [ensayo({ tiempoReaccionMs: 250 })];
    expect(c.soloRespondidos(e)).toHaveLength(1);
    expect(c.soloRespondidos(e, { trMinimoMs: 300 })).toHaveLength(0);
  });

  test('no se recortan tiempos extremos de aciertos: con 7 ensayos no hay datos suficientes', () => {
    expect(c.cc10([navon('global', { tiempoReaccionMs: 9000 }), navon('local', { tiempoReaccionMs: 600 })])).toBe(8400);
  });
});

describe('RF-13 tiempo de reacción neto', () => {
  test('la pausa durante el ensayo se resta', () => {
    expect(c.trNeto({ tiempoReaccionMs: 5000, pausasDuranteItemMs: 3000 })).toBe(2000);
    expect(c.trNeto({ tiempoReaccionMs: 900 })).toBe(900);
    expect(c.trNeto({ tiempoReaccionMs: null })).toBeNull();
    expect(c.trNeto(null)).toBeNull();
  });

  test('una pausa durante un ensayo no cambia CC-09 ni CC-10', () => {
    const mixtos = (pausa) => [
      ensayo({ bloque: 'M1', fase: 'mixto', regla: 'color' }),
      ensayo({ bloque: 'M1', fase: 'mixto', regla: 'forma', tiempoReaccionMs: 900 + pausa, pausasDuranteItemMs: pausa }),
      ensayo({ bloque: 'M1', fase: 'mixto', regla: 'forma', tiempoReaccionMs: 600 })
    ];
    expect(c.cc09(mixtos(4000))).toBe(c.cc09(mixtos(0)));
    const navon = (pausa) => [
      ensayo({ condicion: 'global', tiempoReaccionMs: 900 + pausa, pausasDuranteItemMs: pausa }),
      ensayo({ condicion: 'local', tiempoReaccionMs: 600 })
    ];
    expect(c.cc10(navon(4000))).toBe(300);
    expect(c.cc10(navon(4000))).toBe(c.cc10(navon(0)));
  });
});

describe('RF-15 las sesiones incompletas no se procesan', () => {
  test.each(['en_curso', 'interrumpida', 'abandonada', undefined])('estado %s', (estado) => {
    const r = motor.procesarSesion(sesionCompleta({ estado }));
    expect(r).toMatchObject({ procesada: false, motivo: motor.MOTIVOS.NO_COMPLETADA });
    expect(r).not.toHaveProperty('tareas');
  });

  test('sin sesion tampoco', () => {
    expect(motor.procesarSesion(null).procesada).toBe(false);
    expect(motor.procesarSesion(undefined).procesada).toBe(false);
  });
});

describe('CT-13 reproducibilidad por versión', () => {
  /**
   * Valores esperados de la sesion fija (ayudas/sesionRegistro.js) con cada
   * version del algoritmo. Un cambio en un calculo sin subir la version rompe
   * esta prueba; al subirla se agrega su fila y se conservan las anteriores.
   */
  const ESPERADOS = {
    '1.0.0': {
      'CC-08': 1 / 7,
      // cambio: 8288 / 10 ms; repeticion: 6917 / 11 ms
      'CC-09': 8288 / 10 - 6917 / 11,
      'CC-12': 5,
      // global: 9280 / 13 ms; local: 8610 / 14 ms
      'CC-10': 9280 / 13 - 8610 / 14
    }
  };

  /** Cantidades del catalogo con cada version. */
  const CATALOGOS = {
    '1.0.0': {
      'cambio-regla': { practica: 2, bloques: ['CR-COLOR', 'CR-FORMA', 'CR-MIXTO-1', 'CR-MIXTO-2', 'CR-MIXTO-3', 'CR-MIXTO-4'] },
      navon: { practica: 2, bloques: ['NV-GLOBAL-1', 'NV-LOCAL-1', 'NV-LOCAL-2', 'NV-GLOBAL-2'] },
      ensayosPorBloque: 7,
      trMinimoMs: 200
    }
  };

  const valores = (r) =>
    Object.fromEntries(Object.values(r.tareas).flatMap((t) => t.indicadores.map((i) => [i.codigo, i.observado])));

  test('la version vigente del algoritmo tiene sus valores esperados y la salida los reproduce', () => {
    const esperados = ESPERADOS[versiones.VERSION_ALGORITMO];
    expect(esperados).toBeDefined();
    const obtenidos = valores(motor.procesarSesion(sesionCompleta()));
    expect(Object.keys(obtenidos).sort()).toEqual(Object.keys(esperados).sort());
    for (const [codigo, valor] of Object.entries(esperados)) expect(obtenidos[codigo]).toBeCloseTo(valor, 9);
  });

  test('la version vigente del catalogo tiene sus cantidades esperadas', () => {
    const esperado = CATALOGOS[versiones.VERSION_CATALOGO];
    expect(esperado).toBeDefined();
    for (const tarea of ['cambio-regla', 'navon']) {
      const s = construirSecuencia(tarea);
      expect(s.ensayosPractica).toBe(esperado[tarea].practica);
      expect(s.bloques.map((b) => b.id)).toEqual(esperado[tarea].bloques);
      expect(s.bloques.every((b) => b.ensayos === esperado.ensayosPorBloque)).toBe(true);
      expect(s.trMinimoMs).toBe(esperado.trMinimoMs);
      expect(s.versionCatalogo).toBe(versiones.VERSION_CATALOGO);
    }
  });

  test('la misma entrada da la misma salida, sin depender de la hora', () => {
    const a = motor.procesarSesion(sesionCompleta());
    const b = motor.procesarSesion(sesionCompleta());
    expect(b).toEqual(a);
    expect(JSON.stringify(a)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test('toda salida lleva la version del algoritmo, tambien la que no se procesa', () => {
    expect(motor.procesarSesion(sesionCompleta()).versionAlgoritmo).toBe(versiones.VERSION_ALGORITMO);
    expect(motor.procesarSesion({ estado: 'abandonada' }).versionAlgoritmo).toBe(versiones.VERSION_ALGORITMO);
  });

  test('la version no se puede modificar', () => {
    expect(Object.isFrozen(versiones)).toBe(true);
    expect(() => {
      versiones.VERSION_ALGORITMO = '9.9.9';
    }).toThrow(TypeError);
  });

  test('procesar no modifica la sesion de entrada', () => {
    const s = sesionCompleta();
    const copia = JSON.parse(JSON.stringify(s));
    motor.procesarSesion(s);
    expect(s).toEqual(copia);
  });
});
