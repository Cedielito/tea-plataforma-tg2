'use strict';
const {
  MENSAJES,
  RELOJ_APLICACION,
  MS_VIGENCIA,
  MAXIMA_SEMILLA,
  leerNuevaSesion,
  generarSemilla,
  sesionVencida,
  tareasPendientes,
  tipoEntradaPredominante,
  unirContextos,
  resumenSesion
} = require('../src/dominio/registro/sesionRegistro');
const { MENSAJES: MENSAJES_ENVIO, leerEnvioTarea } = require('../src/dominio/registro/envioTarea');
const { planificarSesion } = require('../src/dominio/registro/secuenciador');
const { procesarSesion } = require('../src/dominio/registro/motor');
const { procesarSesionGuardada, aGuardar, deGuardado } = require('../src/dominio/registro/resultado');
const { VERSION_ALGORITMO } = require('../src/dominio/registro/version');
const { AVISO_NO_DIAGNOSTICO } = require('../src/dominio/registro/vocabularioProhibido');
const { describirNavegador, PATRON_NAVEGADOR } = require('../src/dominio/registro/navegador');
const { SESION_WEB, envioDe } = require('./ayudas/envioRegistro');

const PLAN = planificarSesion();
const secuenciaDe = (tarea) => PLAN.secuencias.find((s) => s.tarea === tarea);
const SESION = { versionCatalogo: '1.1.0', semilla: SESION_WEB.semilla, reloj: 'animacion' };
const leer = (tarea, cuerpo) => leerEnvioTarea(cuerpo, { tarea, secuencia: secuenciaDe(tarea), sesion: SESION });

describe('HU-16 la sesion se crea solo con la constancia del consentimiento y la mayoria de edad', () => {
  const valido = { consentimientoFirmado: true, versionConsentimiento: ' 1.0 ', mayorDeEdad: true };

  test('con las dos marcas y la version, devuelve solo la constancia', () => {
    expect(leerNuevaSesion(valido)).toEqual({
      constancia: { consentimientoFirmado: true, versionConsentimiento: '1.0', mayorDeEdad: true }
    });
  });

  test.each([
    ['sin la marca del consentimiento', { consentimientoFirmado: false }, 'consentimientoFirmado', MENSAJES.SIN_CONSENTIMIENTO],
    ['sin la marca de mayoria de edad', { mayorDeEdad: undefined }, 'mayorDeEdad', MENSAJES.SIN_MAYORIA],
    ['con "true" como texto', { mayorDeEdad: 'true' }, 'mayorDeEdad', MENSAJES.SIN_MAYORIA],
    ['sin la version', { versionConsentimiento: '  ' }, 'versionConsentimiento', MENSAJES.SIN_VERSION],
    ['con una version rara', { versionConsentimiento: 'v 1/2' }, 'versionConsentimiento', MENSAJES.VERSION_INVALIDA]
  ])('%s, no la crea', (_caso, cambio, campo, mensaje) => {
    const { errores, constancia } = leerNuevaSesion({ ...valido, ...cambio });
    expect(constancia).toBeUndefined();
    expect(errores[campo]).toBe(mensaje);
  });

  test('sin ninguna de las dos marcas, explica las dos', () => {
    const { errores } = leerNuevaSesion({ versionConsentimiento: '1.0' });
    expect(Object.keys(errores).sort()).toEqual(['consentimientoFirmado', 'mayorDeEdad']);
  });

  test('CT-11 rechaza cualquier otro campo, como un nombre', () => {
    expect(leerNuevaSesion({ ...valido, nombre: 'Ana' })).toEqual({ errores: { general: MENSAJES.SOLO_CAMPOS } });
    expect(leerNuevaSesion(null)).toEqual({ errores: { general: MENSAJES.SOLO_CAMPOS } });
  });

  test('el reloj de la aplicacion es la variante animacion y la semilla es un entero de 32 bits', () => {
    expect(RELOJ_APLICACION).toBe('animacion');
    for (let i = 0; i < 50; i += 1) {
      const semilla = generarSemilla();
      expect(Number.isInteger(semilla) && semilla >= 0 && semilla <= MAXIMA_SEMILLA).toBe(true);
    }
  });
});

describe('RF-15 estados de la sesion', () => {
  const creadaEn = new Date('2026-10-23T14:00:00Z');

  test('vence a las 2 horas de creada', () => {
    expect(sesionVencida({ creadaEn }, new Date(creadaEn.getTime() + MS_VIGENCIA - 1))).toBe(false);
    expect(sesionVencida({ creadaEn }, new Date(creadaEn.getTime() + MS_VIGENCIA))).toBe(true);
  });

  test('las tareas pendientes siguen el orden de aplicacion', () => {
    expect(tareasPendientes({ tareasRecibidas: [] })).toEqual(['cambio-regla', 'navon']);
    expect(tareasPendientes({ tareasRecibidas: ['cambio-regla'] })).toEqual(['navon']);
    expect(tareasPendientes({ tareasRecibidas: ['navon', 'cambio-regla'] })).toEqual([]);
  });

  test('el contexto suma pausas y repeticiones y toma el tipo de entrada mas usado fuera de la practica', () => {
    const ensayos = [
      { practica: true, tipoEntrada: 'raton' },
      { practica: true, tipoEntrada: 'raton' },
      { practica: false, tipoEntrada: 'teclado' },
      { practica: false, tipoEntrada: null },
      { practica: false, tipoEntrada: 'tactil' },
      { practica: false, tipoEntrada: 'teclado' }
    ];
    expect(tipoEntradaPredominante(ensayos)).toBe('teclado');
    expect(
      unirContextos([{ pausas: 1, repeticionesInstruccion: 2 }, { pausas: 3, repeticionesInstruccion: 0 }], ensayos)
    ).toEqual({ tipoEntrada: 'teclado', pausas: 4, repeticionesInstruccion: 2 });
  });

  test('la fila de la lista no trae valores ni la constancia', () => {
    const fila = resumenSesion({
      seudonimo: 'ABCD-2345',
      estado: 'completada',
      creadaEn,
      entregadaEn: creadaEn,
      tareasRecibidas: ['cambio-regla', 'navon'],
      constancia: { versionConsentimiento: '1.0' },
      resultado: { versionAlgoritmo: '1.0.0' },
      sus: { valorSUS: 70 }
    });
    expect(fila).toEqual({
      seudonimo: 'ABCD-2345',
      estado: 'completada',
      creadaEn,
      entregada: true,
      tareasRecibidas: ['cambio-regla', 'navon'],
      susRespondido: true
    });
  });
});

describe('CT-11 envio de los ensayos de una tarea', () => {
  test.each(['cambio-regla', 'navon'])('acepta los ensayos de %s con el formato de la web', (tarea) => {
    const { ensayos, contexto, error } = leer(tarea, envioDe(tarea));
    expect(error).toBeUndefined();
    expect(ensayos).toHaveLength(secuenciaDe(tarea).ensayosPractica + secuenciaDe(tarea).ensayosPuntuados);
    expect(contexto).toEqual(envioDe(tarea).contexto);
  });

  test('rechaza campos de mas o de menos con 400', () => {
    expect(leer('navon', { ...envioDe('navon'), estado: 'completada' })).toEqual({ estado: 400, error: MENSAJES_ENVIO.SOLO_CAMPOS });
    const { contexto, ...sinContexto } = envioDe('navon');
    expect(leer('navon', sinContexto).estado).toBe(400);
    expect(leer('navon', [envioDe('navon')]).estado).toBe(400);
  });

  test('rechaza con 422 un dato identificable en cualquier nivel', () => {
    const envio = envioDe('cambio-regla');
    envio.ensayos[5].estimulo.Correo = 'a@b.co';
    expect(leer('cambio-regla', envio)).toEqual({ estado: 422, error: MENSAJES_ENVIO.DATOS_IDENTIFICABLES });
  });

  test('otro catalogo responde 409; otro reloj u otra semilla, 422', () => {
    expect(leer('navon', envioDe('navon', { versionCatalogo: '1.0.0' })).estado).toBe(409);
    expect(leer('navon', envioDe('navon', { reloj: 'referencia' }))).toEqual({ estado: 422, error: MENSAJES_ENVIO.RELOJ_DISTINTO });
    expect(leer('navon', envioDe('navon', { semilla: 7 }))).toEqual({ estado: 422, error: MENSAJES_ENVIO.SEMILLA_DISTINTA });
  });

  test.each([
    ['un contexto con texto', (e) => { e.contexto.pausas = '1'; }],
    ['un contexto negativo', (e) => { e.contexto.repeticionesInstruccion = -1; }],
    ['un contexto con otro campo', (e) => { e.contexto.tipoEntrada = 'teclado'; }]
  ])('rechaza %s', (_caso, cambiar) => {
    const envio = envioDe('navon');
    cambiar(envio);
    expect(leer('navon', envio)).toEqual({ estado: 422, error: MENSAJES_ENVIO.CONTEXTO_INVALIDO });
  });

  test.each([
    ['un ensayo de menos', (e) => e.ensayos.pop()],
    ['un ensayo repetido', (e) => e.ensayos.splice(10, 1, e.ensayos[9])],
    ['un ensayo de la otra tarea', (e) => { e.ensayos[3].tarea = 'navon'; }],
    ['la practica sin marcar', (e) => { e.ensayos[0].practica = false; }],
    ['un ensayo en otro bloque', (e) => { e.ensayos[2].bloque = 'CR-FORMA'; }],
    ['un ensayo con otra semilla', (e) => { e.ensayos[8].semilla = 1; }],
    ['ensayos que no son lista', (e) => { e.ensayos = {}; }]
  ])('rechaza %s (CP-01, CP-04)', (_caso, cambiar) => {
    const envio = envioDe('cambio-regla');
    cambiar(envio);
    expect(leer('cambio-regla', envio)).toEqual({ estado: 422, error: MENSAJES_ENVIO.ENSAYOS_INCOMPLETOS });
  });
});

describe('CT-13 el resultado guardado es la salida de procesarSesion con su version', () => {
  const sesion = {
    seudonimo: 'ABCD-2345',
    estado: 'completada',
    versionCatalogo: SESION_WEB.versionCatalogo,
    contexto: SESION_WEB.contexto
  };
  const conMongo = (ensayo, i) => ({ ...ensayo, _id: `id${i}`, sesion: 'x', orden: i + 1 });

  test('los campos del almacenamiento no cambian la salida', () => {
    const salida = procesarSesionGuardada(sesion, SESION_WEB.ensayos.map(conMongo));
    expect(salida).toEqual(procesarSesion({ ...sesion, ensayos: SESION_WEB.ensayos }));
    expect(salida.procesada).toBe(true);
    expect(salida.versionAlgoritmo).toBe(VERSION_ALGORITMO);
  });

  test('guardar y leer devuelve la misma salida, con el aviso de M-09', () => {
    const salida = procesarSesionGuardada(sesion, SESION_WEB.ensayos);
    const guardado = JSON.parse(JSON.stringify(aGuardar(salida)));
    expect(guardado.tareas.map((t) => t.tarea)).toEqual(['cambio-regla', 'navon']);
    const vista = deGuardado({ ...sesion, resultado: guardado });
    expect(vista).toEqual(salida);
    expect(vista.avisos.texto).toBe(AVISO_NO_DIAGNOSTICO);
  });

  test('RF-15 una sesion incompleta no trae valores, aunque tuviera resultado', () => {
    const salida = procesarSesionGuardada(sesion, SESION_WEB.ensayos);
    for (const estado of ['en_curso', 'interrumpida', 'abandonada']) {
      const vista = deGuardado({ ...sesion, estado, resultado: aGuardar(salida) });
      expect(vista).toEqual({
        procesada: false,
        motivo: 'sesion_no_completada',
        avisos: { texto: AVISO_NO_DIAGNOSTICO, soloValoresObservados: true }
      });
    }
  });
});

describe('CT-11 del navegador solo se guardan la familia y la version mayor', () => {
  const CASOS = [
    ['Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox 131'],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Chrome 130'
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68',
      'Edge 130'
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15',
      'Safari 18'
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
      'Chrome 130'
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
      'Firefox 131'
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
      'Samsung Internet 26'
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0',
      'Opera 114'
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36',
      'Chrome 141'
    ],
    ['curl/8.5.0', 'Otro'],
    ['', 'Otro'],
    [undefined, 'Otro']
  ];

  test.each(CASOS)('%s → %s', (userAgent, esperado) => {
    const descrito = describirNavegador(userAgent);
    expect(descrito).toBe(esperado);
    expect(PATRON_NAVEGADOR.test(descrito)).toBe(true);
  });

  test('el patron del esquema no acepta una cadena completa', () => {
    expect(PATRON_NAVEGADOR.test(CASOS[0][0])).toBe(false);
    expect(PATRON_NAVEGADOR.test('Firefox 131.0')).toBe(false);
  });
});
