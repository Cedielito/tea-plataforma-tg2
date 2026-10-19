'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { USUARIO_PROFESIONAL, crearProfesional, iniciarSesion } = require('./ayudas/administrador');
const { crearAppRegistro, crearSesion, sesionEntregada } = require('./ayudas/registro');
const { Administrador, SesionRegistro, EnsayoRegistro } = require('../src/datos/modelos');
const { COLUMNAS_ENSAYOS, COLUMNAS_VALORES, aCsv } = require('../src/dominio/registro/exportacion');
const { buscarVocabularioProhibido } = require('../src/dominio/registro/vocabularioProhibido');
const { cuantilT, describirMuestra, mediana, pearson, spearmanBrown } = require('../scripts/estadistica');
const {
  CRITERIOS,
  ErrorDeEntrada,
  TIPOS_ENSAYOS,
  TIPOS_VALORES,
  analizar,
  analizarTextos,
  aMarkdown,
  ejecutar,
  ensayosPorCondicion,
  ensayosPorSesion,
  leerCsv,
  leerTabla,
  mitades,
  mitadesDeSesion
} = require('../scripts/analisisEvaluacion');
const { perfiles } = require('./ayudas/perfilesSimulados.json');

/**
 * Analisis de la evaluacion con adultos (api/scripts/analisisEvaluacion.js).
 * M-09, CC-09, CC-10, CT-08, CT-13, RF-14, RF-15, HU-19
 *
 * Los 6 perfiles simulados de T16 se aplican por la API de T15, con valores
 * SUS y duraciones conocidas; ademas, una sesion interrumpida (con los
 * ensayos de cambio de regla) y una creada que nunca se entrego. Los dos CSV
 * del profesional pasan por el script como lo correra el equipo, y el
 * resumen debe recuperar las medias conocidas, sin nada por persona.
 */

const SCRIPT = path.join(__dirname, '..', 'scripts', 'analisisEvaluacion.js');
const TOLERANCIA_MS = 1;
const copia = (valor) => JSON.parse(JSON.stringify(valor));

describe('CT-13 estadística del análisis', () => {
  test('el cuantil 0,975 de la t de Student coincide con la tabla', () => {
    const tabla = { 1: 12.706, 2: 4.303, 5: 2.571, 14: 2.145, 19: 2.093, 30: 2.042 };
    for (const [gl, t] of Object.entries(tabla)) expect(cuantilT(0.975, Number(gl))).toBeCloseTo(t, 3);
  });

  test('media, DE muestral e IC 95 % calculados a mano', () => {
    // Desvios: cinco de −25 y uno de 125 → Σd² = 18 750; DE = √(18 750 / 5) = 61,237
    const m = describirMuestra([150, 300, 150, 150, 150, 150]);
    expect(m).toMatchObject({ n: 6, media: 175, gl: 5 });
    expect(m.de).toBeCloseTo(Math.sqrt(3750), 10);
    // Margen = 2,570582 × 61,237 / √6 = 64,265
    expect(m.ic95[0]).toBeCloseTo(110.735, 3);
    expect(m.ic95[1]).toBeCloseTo(239.265, 3);
  });

  test('con menos de dos valores no hay DE ni intervalo', () => {
    expect(describirMuestra([5])).toEqual({ n: 1, media: 5, de: null, gl: null, t: null, ic95: null });
    expect(describirMuestra([null, undefined])).toMatchObject({ n: 0, media: null, ic95: null });
  });

  test('Pearson y Spearman-Brown con un caso calculado a mano', () => {
    // x = 1..5, y = 2, 4, 5, 4, 5: Σdxdy = 6, Σdx² = 10, Σdy² = 6 → r = 6 / √60 = √0,6
    const r = pearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(r).toBeCloseTo(Math.sqrt(0.6), 12);
    // 2r / (1 + r) = 2 × 0,774597 / 1,774597 = 0,872983
    expect(spearmanBrown(r)).toBeCloseTo(0.872983, 6);
    expect(spearmanBrown(0.5)).toBeCloseTo(2 / 3, 12);
    expect(spearmanBrown(0.7)).toBeCloseTo(1.4 / 1.7, 12);
    expect(spearmanBrown(0)).toBe(0);
  });

  test('sin varianza, con menos de tres pares o con r = −1 no se calcula', () => {
    expect(pearson([1, 2, 3], [4, 4, 4])).toBeNull();
    expect(pearson([1, 2], [3, 4])).toBeNull();
    expect(pearson([1, 2, 3], [1, 2])).toBeNull();
    expect(spearmanBrown(-1)).toBeNull();
    expect(spearmanBrown(null)).toBeNull();
  });

  test('mediana con cantidad par e impar', () => {
    expect(mediana([25, 12, 18])).toBe(18);
    expect(mediana([12, 14, 16, 18, 21, 25])).toBe(17);
    expect(mediana([])).toBeNull();
  });
});

describe('RF-14 mitades impares y pares después de los filtros', () => {
  const base = {
    tarea: 'navon',
    bloque: 'NV-GLOBAL-1',
    fase: null,
    regla: null,
    condicion: 'global',
    practica: false,
    estadoItem: 'respondido',
    acierto: true,
    claseError: 'correcta',
    pausasDuranteItemMs: 0,
    rectificaciones: 0
  };
  const ensayos = [
    { ...base, numero: 1, bloque: 'NV-PRACTICA', practica: true, tiempoReaccionMs: 900 },
    { ...base, numero: 2, tiempoReaccionMs: 600 }, // 1.º: impar
    { ...base, numero: 3, estadoItem: 'omitido', acierto: false, claseError: null, tiempoReaccionMs: null },
    { ...base, numero: 4, tiempoReaccionMs: 650 }, // 2.º: par
    { ...base, numero: 5, tiempoReaccionMs: 150 }, // anticipacion
    { ...base, numero: 6, tiempoReaccionMs: 620, pausasDuranteItemMs: 20 }, // 3.º: impar, neto 600
    { ...base, numero: 7, acierto: false, claseError: 'aleatoria', tiempoReaccionMs: 500 },
    { ...base, numero: 8, tiempoReaccionMs: 640 }, // 4.º: par
    { ...base, numero: 9, bloque: 'NV-LOCAL-1', condicion: 'local', tiempoReaccionMs: 700 }
  ];

  test('sin práctica, omisiones, anticipaciones ni errores, y con el tiempo neto', () => {
    const grupos = ensayosPorCondicion(ensayos);
    expect(grupos.global.map((e) => e.numero)).toEqual([2, 4, 6, 8]);
    expect(mitades(grupos.global)).toEqual({ impar: 600, par: 645 });
    expect(mitades(grupos.local)).toEqual({ impar: 700, par: null });
    expect(mitades([])).toEqual({ impar: null, par: null });
  });

  test('RF-15 solo las sesiones completas, con sus ensayos en el orden presentado', () => {
    const fila = (seudonimo, estadoSesion, tarea, numero) => ({
      ...base,
      seudonimo,
      estadoSesion,
      versionCatalogo: '1.1.0',
      tarea,
      numero
    });
    const porSesion = ensayosPorSesion([
      fila('AAAA-2222', 'completada', 'navon', 2),
      fila('AAAA-2222', 'completada', 'cambio-regla', 1),
      fila('AAAA-2222', 'completada', 'navon', 1),
      fila('BBBB-3333', 'interrumpida', 'cambio-regla', 1)
    ]);
    expect([...porSesion.keys()]).toEqual(['AAAA-2222']);
    const { ensayos: ordenados, versionCatalogo } = porSesion.get('AAAA-2222');
    expect(versionCatalogo).toBe('1.1.0');
    expect(ordenados.map((e) => `${e.tarea} ${e.numero}`)).toEqual(['cambio-regla 1', 'navon 1', 'navon 2']);
    expect(ordenados[0]).not.toHaveProperty('seudonimo');
  });
});

describe('HU-19 lectura de los CSV que exporta el profesional', () => {
  test('comillas, comillas dobles, CRLF o LF y BOM (RFC 4180)', () => {
    const texto = '﻿a,b,c\r\n"uno, dos","dice ""hola""",x\n"con\r\nsalto",,3\r\n';
    expect(leerCsv(texto)).toEqual([
      ['a', 'b', 'c'],
      ['uno, dos', 'dice "hola"', 'x'],
      ['con\r\nsalto', '', '3']
    ]);
    expect(leerCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2']
    ]);
  });

  test('las columnas que usa el análisis existen en la exportación', () => {
    expect(COLUMNAS_ENSAYOS).toEqual(expect.arrayContaining(Object.keys(TIPOS_ENSAYOS)));
    expect(COLUMNAS_VALORES).toEqual(expect.arrayContaining(Object.keys(TIPOS_VALORES)));
  });

  test('convierte números, lógicos y vacíos, y conserva las versiones como texto', () => {
    const cabecera = Object.keys(TIPOS_VALORES);
    const fila = ['ABCD-2345', 'completada', 'true', '12.5', '1.0.0', '1.1.0', '-12.25', '', '72.5'];
    const [leida] = leerTabla(`${cabecera.join(',')},otra\r\n${fila.join(',')},x\r\n`, TIPOS_VALORES, 'valores.csv');
    expect(leida).toEqual({
      seudonimo: 'ABCD-2345',
      estado: 'completada',
      entregada: true,
      duracionMin: 12.5,
      versionAlgoritmo: '1.0.0',
      versionCatalogo: '1.1.0',
      cc09: -12.25,
      cc10: null,
      valorSUS: 72.5
    });
  });

  test('una columna que falta, un valor inválido o una fila incompleta se explican', () => {
    expect(() => leerTabla('seudonimo;estado\r\n', TIPOS_VALORES, 'valores.csv')).toThrow(ErrorDeEntrada);
    expect(() => leerTabla('seudonimo;estado\r\n', TIPOS_VALORES, 'valores.csv')).toThrow(/faltan las columnas.*hoja de cálculo/);
    const cabecera = Object.keys(TIPOS_VALORES).join(',');
    expect(() => leerTabla(`${cabecera}\r\nA,completada,true,"12,5",1,1,1,1,1\r\n`, TIPOS_VALORES, 'valores.csv')).toThrow(
      'valores.csv, fila 2, columna duracionMin: «12,5» no es un valor válido.'
    );
    expect(() => leerTabla(`${cabecera}\r\nA,completada,si,1,1,1,1,1,1\r\n`, TIPOS_VALORES, 'valores.csv')).toThrow(/columna entregada/);
    expect(() => leerTabla(`${cabecera}\r\nA,completada\r\n`, TIPOS_VALORES, 'valores.csv')).toThrow(/fila 2: tiene 2 columnas/);
  });

  test('sin sesiones el resumen dice «No calculable» sin fallar', () => {
    const vacio = analizarTextos(`${COLUMNAS_ENSAYOS.join(',')}\r\n`, `${COLUMNAS_VALORES.join(',')}\r\n`);
    expect(vacio.sesiones).toEqual({ creadas: 0, entregadas: 0, completas: 0, porEstado: {} });
    expect(vacio.replicacion.cc09).toMatchObject({ n: 0, media: null, cumple: null });
    expect(vacio.eficacia).toMatchObject({ proporcionEnLimite: null, proporcionCompletas: null, cumple: null });
    expect(vacio.consistencia.condiciones.cambio).toEqual({ n: 0, r: null, spearmanBrown: null, cumple: null });
    const md = aMarkdown(vacio);
    expect(md).toContain('No calculable');
    expect(md).not.toMatch(/undefined|NaN/);
  });
});

describe('CT-08 eficacia: entregadas que se completaron en 20 minutos o menos', () => {
  /** valores.csv con el formato de la exportacion: una fila por sesion, con su estado y su duracion. */
  function valoresCsv(sesiones) {
    const filas = sesiones.map(([estado, entregada, duracionMin], i) => ({
      seudonimo: `ABCD-${String(2222 + i)}`,
      estado,
      entregada,
      duracionMin
    }));
    return aCsv(COLUMNAS_VALORES, filas);
  }
  const ensayosVacio = `${COLUMNAS_ENSAYOS.join(',')}\r\n`;
  const completa = (minutos) => ['completada', true, minutos];
  const NO_ENTREGADA = ['en_curso', false, null];

  test('una completa de más de 20 minutos no hace fallar el criterio si las demás cumplen', () => {
    // 6 de 7 entregadas en 20 minutos o menos (85,7 %); la de 20 justos cuenta
    const sesiones = [10, 12, 14, 15, 16, 20, 23].map(completa).concat([NO_ENTREGADA]);
    const { sesiones: cuentas, eficacia } = analizarTextos(ensayosVacio, valoresCsv(sesiones));
    expect(cuentas).toMatchObject({ creadas: 8, entregadas: 7, completas: 7 });
    expect(eficacia).toEqual({
      limiteMin: 20,
      completasEnLimite: 6,
      proporcionEnLimite: 6 / 7,
      criterioProporcion: CRITERIOS.proporcionEnLimiteMinima,
      cumple: true,
      proporcionCompletas: 1,
      duracionMin: { n: 7, mediana: 15, maximo: 23, pasanDelLimite: 1 }
    });
  });

  test('una incompleta y una completa de más de 20 minutos cuentan igual en contra', () => {
    const conLarga = [10, 12, 14, 15, 16, 21, 23].map(completa);
    expect(analizarTextos(ensayosVacio, valoresCsv(conLarga)).eficacia).toMatchObject({ completasEnLimite: 5, cumple: false });
    const conIncompleta = [10, 12, 14, 15, 16, 23].map(completa).concat([['interrumpida', true, null]]);
    expect(analizarTextos(ensayosVacio, valoresCsv(conIncompleta)).eficacia).toMatchObject({ completasEnLimite: 5, cumple: false });
    // Las creadas que nunca se entregaron no cuentan
    const sinEntregar = [10, 12, 14, 15, 16, 18].map(completa).concat([NO_ENTREGADA, NO_ENTREGADA, NO_ENTREGADA]);
    expect(analizarTextos(ensayosVacio, valoresCsv(sinEntregar)).eficacia).toMatchObject({ proporcionEnLimite: 1, cumple: true });
  });
});

describe('M-09 CC-09 CC-10 CT-08 RF-15 análisis de los perfiles simulados pasados por la exportación', () => {
  const APLICACION = '/api/registro/aplicacion';
  // Por perfil, en el orden del archivo: minutos de la aplicacion y valor SUS.
  const DURACIONES = [12, 14, 16, 18, 20, 25];
  const VALORES_SUS = [65, 70, 75, 80, 85, 90];

  let app;
  let reloj;
  let carpeta;
  let textos;
  let resumen;
  let md;
  let json;
  const seudonimos = {};
  const ENSAYOS_CSV = 'registro-ensayos.csv';
  const VALORES_CSV = 'registro-valores-sus.csv';
  const enCarpeta = (archivo) => path.join(carpeta, archivo);
  // Aplicar las sesiones por la API y correr el programa pasa de los 5 s por defecto de Jest
  const ESPERA_MS = 60000;

  /** Respuestas (1 a 5) que dan el valor pedido: cada item aporta de 0 a 4 y el valor es 2,5 × la suma. */
  function respuestasSus(valor) {
    let resto = valor / 2.5;
    return Array.from({ length: 10 }, (_, i) => {
      const aporte = Math.min(4, resto);
      resto -= aporte;
      return i % 2 === 0 ? aporte + 1 : 5 - aporte;
    });
  }

  function envioDePerfil(sesionWeb, tarea, semilla) {
    return {
      versionCatalogo: sesionWeb.versionCatalogo,
      semilla,
      reloj: sesionWeb.reloj,
      ensayos: copia(sesionWeb.ensayos.filter((e) => e.tarea === tarea)).map((e) => ({ ...e, semilla })),
      contexto: { pausas: 0, repeticionesInstruccion: 0 }
    };
  }

  async function entrar(usuario = USUARIO_PROFESIONAL) {
    const agente = request.agent(app);
    await iniciarSesion(agente, { usuario });
    return agente;
  }

  async function aplicarPerfil({ sesion: sesionWeb }, minutos, valorSUS, usuario = USUARIO_PROFESIONAL) {
    const agente = await entrar(usuario);
    const { sesion, estado } = await sesionEntregada(agente);
    await agente
      .put(`${APLICACION}/tareas/cambio-regla`)
      .send(envioDePerfil(sesionWeb, 'cambio-regla', estado.semilla))
      .expect(200);
    reloj.avanzar(minutos);
    await agente.put(`${APLICACION}/tareas/navon`).send(envioDePerfil(sesionWeb, 'navon', estado.semilla)).expect(200);
    await agente
      .put(`${APLICACION}/sus`)
      .send({ version: estado.cuestionarioSus.version, respuestas: respuestasSus(valorSUS) })
      .expect(200);
    return sesion.seudonimo;
  }

  beforeAll(async () => {
    await levantar();
    await Promise.all([Administrador.init(), SesionRegistro.init(), EnsayoRegistro.init()]);
    ({ app, reloj } = crearAppRegistro());
    await crearProfesional();

    for (const [i, perfil] of perfiles.entries()) {
      seudonimos[perfil.id] = await aplicarPerfil(perfil, DURACIONES[i], VALORES_SUS[i]);
    }
    // Interrumpida con una tarea recibida: sus ensayos estan en ensayos.csv
    const participante = await entrar();
    const interrumpida = await sesionEntregada(participante);
    const costoAlto = perfiles.find((p) => p.id === 'costo-alto').sesion;
    await participante
      .put(`${APLICACION}/tareas/cambio-regla`)
      .send(envioDePerfil(costoAlto, 'cambio-regla', interrumpida.estado.semilla))
      .expect(200);
    await participante.post(`${APLICACION}/interrupcion`).expect(200);
    seudonimos.interrumpida = interrumpida.sesion.seudonimo;
    // Creada y nunca entregada
    const agente = await entrar();
    seudonimos.noEntregada = (await crearSesion(agente)).seudonimo;

    const ensayos = await agente.get('/api/admin/registro/exportacion/ensayos.csv').expect(200);
    const valores = await agente.get('/api/admin/registro/exportacion/valores.csv').expect(200);
    textos = { ensayos: ensayos.text, valores: valores.text };

    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'analisis-evaluacion-'));
    fs.writeFileSync(enCarpeta(ENSAYOS_CSV), textos.ensayos);
    fs.writeFileSync(enCarpeta(VALORES_CSV), textos.valores);
    // Como lo correra el equipo; sin --salida escribe junto al CSV de valores
    const corrida = spawnSync(process.execPath, [SCRIPT, enCarpeta(ENSAYOS_CSV), enCarpeta(VALORES_CSV)], { encoding: 'utf8' });
    if (corrida.status !== 0) throw new Error(`El script falló: ${corrida.stderr}`);
    json = fs.readFileSync(path.join(carpeta, 'resumen.json'), 'utf8');
    md = fs.readFileSync(path.join(carpeta, 'resumen.md'), 'utf8');
    resumen = JSON.parse(json);
  }, ESPERA_MS);

  afterAll(async () => {
    await limpiar();
    await bajar();
    if (carpeta) fs.rmSync(carpeta, { recursive: true, force: true });
  });

  const parametro = (clave) => perfiles.map((p) => p.parametros[clave]);

  test('CC-09: recupera la media de los perfiles y su IC 95 % excluye 0, porque el efecto simulado es grande', () => {
    const esperado = describirMuestra(parametro('costoCambioMs'));
    const cc09 = resumen.replicacion.cc09;
    expect(cc09.n).toBe(6);
    expect(Math.abs(cc09.media - 175)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(cc09.de - esperado.de)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(cc09.ic95[0] - esperado.ic95[0])).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(cc09.ic95[1] - esperado.ic95[1])).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(cc09.ic95[0]).toBeGreaterThan(100);
    expect(cc09).toMatchObject({ direccionEsperada: 'mayor que 0', mediaEnDireccionEsperada: true, cumple: true });
    expect(md).toMatch(/\| CC-09 Costo de cambio \| 6 \| 175,0 \| 61,2 \| \[110,7; 239,3\] \| IC 95 % mayor que 0 \| Cumple \|/);
  });

  test('CC-10: con un perfil en sentido contrario el IC incluye 0 y se reporta como hallazgo', () => {
    const esperado = describirMuestra(parametro('diferenciaGlobalLocalMs'));
    const cc10 = resumen.replicacion.cc10;
    expect(cc10.n).toBe(6);
    expect(Math.abs(cc10.media - esperado.media)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(Math.abs(cc10.de - esperado.de)).toBeLessThanOrEqual(TOLERANCIA_MS);
    expect(cc10.ic95[0]).toBeLessThan(0);
    expect(cc10.ic95[1]).toBeGreaterThan(0);
    expect(cc10).toMatchObject({ direccionEsperada: 'menor que 0', mediaEnDireccionEsperada: true, cumple: false });
    expect(md).toContain('| IC 95 % menor que 0 | No cumple: se reporta como hallazgo |');
  });

  test('RF-15: la interrumpida y la no entregada no entran a la replicación ni a la consistencia, pero cuentan en las creadas', () => {
    expect(resumen.sesiones).toEqual({
      creadas: 8,
      entregadas: 7,
      completas: 6,
      porEstado: { completada: 6, interrumpida: 1, en_curso: 1 }
    });
    expect(Object.keys(resumen.sesiones.porEstado)).toEqual(['completada', 'interrumpida', 'en_curso']);
    expect(md).toContain('Por estado: completadas 6, interrumpidas 1, en curso 1.');
    expect(textos.ensayos).toContain(seudonimos.interrumpida);
    for (const condicion of ['cambio', 'repeticion', 'global', 'local']) {
      expect(resumen.consistencia.condiciones[condicion].n).toBe(6);
    }
    expect(resumen.comprobacion).toEqual({
      sesionesCompletas: 6,
      conDiferencia: 0,
      sinEnsayos: 0,
      soloEnEnsayos: 0,
      coinciden: true
    });

    // Aunque una incompleta trajera valores, no entraria
    const filas = {
      ensayos: leerTabla(textos.ensayos, TIPOS_ENSAYOS, ENSAYOS_CSV),
      valores: leerTabla(textos.valores, TIPOS_VALORES, VALORES_CSV)
    };
    const fila = filas.valores.find((f) => f.seudonimo === seudonimos.interrumpida);
    expect(fila).toMatchObject({ estado: 'interrumpida', entregada: true, duracionMin: null, cc09: null });
    Object.assign(fila, { cc09: 5000, cc10: 5000, valorSUS: null });
    const conValores = analizar(filas);
    expect(conValores.replicacion).toEqual(resumen.replicacion);
    expect(conValores.consistencia).toEqual(resumen.consistencia);
  });

  test('CT-08 eficacia: completas en 20 minutos o menos sobre las entregadas, con la duración de las completas', () => {
    // 5 de 7 entregadas: la interrumpida y la de 25 minutos cuentan en contra; la no entregada no cuenta
    expect(resumen.eficacia).toEqual({
      limiteMin: 20,
      completasEnLimite: 5,
      proporcionEnLimite: 5 / 7,
      criterioProporcion: CRITERIOS.proporcionEnLimiteMinima,
      cumple: false,
      proporcionCompletas: 6 / 7,
      duracionMin: { n: 6, mediana: 17, maximo: 25, pasanDelLimite: 1 }
    });
    expect(md).toContain(
      '| Sesiones completas en 20 min o menos (CT-08) | 5 de 7 entregadas (71,4 %); completas: 6 de 7 (85,7 %); ' +
        'creadas: 8 | ≥ 85 % de las entregadas | No cumple |'
    );
    expect(md).toContain('| Duración de las completas | n = 6; mediana 17,0 min; máximo 25,0 min; 1 pasa de 20 min |');
  });

  test('usabilidad: media del valor SUS con su IC 95 %', () => {
    const esperado = describirMuestra(VALORES_SUS);
    expect(resumen.usabilidad.valorSUS).toEqual({ ...esperado, referencia: 68, cumple: true });
    expect(esperado.media).toBe(77.5);
    // El limite inferior queda por debajo de 68: la referencia se lee con la media
    expect(esperado.ic95[0]).toBeLessThan(68);
    expect(md).toContain('| Valor SUS de los participantes | n = 6; media 77,5; DE 9,4; IC 95 % [67,7; 87,3] |');
  });

  test('consistencia: las mitades de cada participante recuperan su perfil y dan la misma r que los perfiles sin exportar', () => {
    const porSesion = ensayosPorSesion(leerTabla(textos.ensayos, TIPOS_ENSAYOS, ENSAYOS_CSV));
    expect(porSesion.size).toBe(6);
    const mitadesPerfil = perfiles.map((p) => mitadesDeSesion(p.sesion.ensayos));
    perfiles.forEach((perfil, i) => {
      const { ensayos } = porSesion.get(seudonimos[perfil.id]);
      expect(mitadesDeSesion(ensayos)).toEqual(mitadesPerfil[i]);

      // Las dos mitades juntas dan la media de cada condicion
      const grupos = ensayosPorCondicion(ensayos);
      const mediaDe = (condicion) => {
        const { impar, par } = mitadesPerfil[i][condicion];
        const n = grupos[condicion].length;
        return (impar * Math.ceil(n / 2) + par * Math.floor(n / 2)) / n;
      };
      const { costoCambioMs, diferenciaGlobalLocalMs } = perfil.parametros;
      expect(Math.abs(mediaDe('cambio') - mediaDe('repeticion') - costoCambioMs)).toBeLessThanOrEqual(TOLERANCIA_MS);
      expect(Math.abs(mediaDe('global') - mediaDe('local') - diferenciaGlobalLocalMs)).toBeLessThanOrEqual(TOLERANCIA_MS);
    });

    for (const condicion of ['cambio', 'repeticion', 'global', 'local']) {
      const r = pearson(
        mitadesPerfil.map((m) => m[condicion].impar),
        mitadesPerfil.map((m) => m[condicion].par)
      );
      const c = resumen.consistencia.condiciones[condicion];
      expect(c.r).toBe(r);
      expect(c.spearmanBrown).toBeCloseTo((2 * r) / (1 + r), 12);
      expect(c.cumple).toBe(c.spearmanBrown >= 0.7);
    }
    expect(resumen.consistencia.criterioSpearmanBrown).toBe(0.7);
    for (const indicador of ['cc09', 'cc10']) {
      expect(resumen.consistencia.exploratorio[indicador].n).toBe(6);
      expect(resumen.consistencia.exploratorio[indicador]).not.toHaveProperty('cumple');
    }
    expect(md).toContain('### Exploratorio: diferencias por mitad, sin criterio');
  });

  test('nada por participante: ningún seudónimo, ninguna lista de valores y sin vocabulario prohibido', () => {
    expect(Object.keys(seudonimos)).toHaveLength(8);
    for (const seudonimo of Object.values(seudonimos)) {
      expect(md).not.toContain(seudonimo);
      expect(json).not.toContain(seudonimo);
    }
    // Las unicas listas son los intervalos [inferior, superior]
    const listas = [];
    const recorrer = (valor) => {
      if (Array.isArray(valor)) listas.push(valor);
      if (valor && typeof valor === 'object') Object.values(valor).forEach(recorrer);
    };
    recorrer(resumen);
    expect(listas.every((l) => l.length === 2)).toBe(true);
    expect(buscarVocabularioProhibido(md)).toEqual([]);
    expect(buscarVocabularioProhibido(resumen)).toEqual([]);
    for (const titulo of ['Replicación de los efectos esperados', 'Consistencia por mitades', 'Usabilidad y eficacia']) {
      expect(md).toContain(titulo);
    }
  });

  test('CT-13 la misma entrada da los mismos archivos', () => {
    const { resumen: deNuevo, archivos } = ejecutar([enCarpeta(ENSAYOS_CSV), enCarpeta(VALORES_CSV), '--salida', enCarpeta('otra')]);
    expect(deNuevo).toEqual(resumen);
    expect(fs.readFileSync(archivos.json, 'utf8')).toBe(json);
    expect(fs.readFileSync(archivos.md, 'utf8')).toBe(md);
  });

  test('varias cuentas: une un par de CSV por profesional y rechaza un seudónimo repetido', async () => {
    const OTRO = 'otro.profesional';
    await crearProfesional({ usuario: OTRO });
    const otros = [];
    for (const [id, minutos, valorSUS] of [
      ['base', 15, 80],
      ['lento', 17, 70]
    ]) {
      otros.push(await aplicarPerfil(perfiles.find((p) => p.id === id), minutos, valorSUS, OTRO));
    }
    const agente = await entrar(OTRO);
    const otro = {
      ensayos: (await agente.get('/api/admin/registro/exportacion/ensayos.csv').expect(200)).text,
      valores: (await agente.get('/api/admin/registro/exportacion/valores.csv').expect(200)).text
    };
    fs.mkdirSync(enCarpeta('otro'));
    fs.writeFileSync(enCarpeta(path.join('otro', ENSAYOS_CSV)), otro.ensayos);
    fs.writeFileSync(enCarpeta(path.join('otro', VALORES_CSV)), otro.valores);

    const parUno = ['--par', enCarpeta(ENSAYOS_CSV), enCarpeta(VALORES_CSV)];
    const parDos = ['--par', enCarpeta(path.join('otro', ENSAYOS_CSV)), enCarpeta(path.join('otro', VALORES_CSV))];
    const corrida = spawnSync(process.execPath, [SCRIPT, ...parUno, ...parDos, '--salida', enCarpeta('dos')], { encoding: 'utf8' });
    expect(corrida.status).toBe(0);
    const dos = JSON.parse(fs.readFileSync(enCarpeta(path.join('dos', 'resumen.json')), 'utf8'));
    const mdDos = fs.readFileSync(enCarpeta(path.join('dos', 'resumen.md')), 'utf8');

    expect(dos.pares).toBe(2);
    expect(mdDos).toContain('- Pares de CSV (uno por cuenta de profesional): 2.');
    expect(dos.sesiones).toEqual({
      creadas: 10,
      entregadas: 9,
      completas: 8,
      porEstado: { completada: 8, interrumpida: 1, en_curso: 1 }
    });
    expect(dos.comprobacion.coinciden).toBe(true);
    expect(dos.replicacion.cc09.n).toBe(8);
    expect(dos.consistencia.condiciones.cambio.n).toBe(8);
    expect(Math.abs(dos.replicacion.cc09.media - describirMuestra([...parametro('costoCambioMs'), 150, 150]).media)).toBeLessThanOrEqual(
      TOLERANCIA_MS
    );
    expect(dos.usabilidad.valorSUS.media).toBe(describirMuestra([...VALORES_SUS, 80, 70]).media);
    expect(dos.eficacia).toMatchObject({ completasEnLimite: 7, proporcionEnLimite: 7 / 9 });
    // Lo mismo que analizar las filas de los dos pares juntas
    const filas = (t) => ({ ensayos: leerTabla(t.ensayos, TIPOS_ENSAYOS, 'e'), valores: leerTabla(t.valores, TIPOS_VALORES, 'v') });
    const [uno, otroLeido] = [filas(textos), filas(otro)];
    expect(dos).toEqual(
      analizar({ ensayos: [...uno.ensayos, ...otroLeido.ensayos], valores: [...uno.valores, ...otroLeido.valores], pares: 2 })
    );
    for (const seudonimo of [...Object.values(seudonimos), ...otros]) expect(mdDos + JSON.stringify(dos)).not.toContain(seudonimo);

    // Un solo par con --par es la forma corta
    expect(ejecutar([...parUno, '--salida', enCarpeta('un-par')]).resumen).toEqual(resumen);

    // El mismo par dos veces: los 8 seudonimos del primero se repiten, y no se escriben
    const repetido = spawnSync(process.execPath, [SCRIPT, ...parUno, ...parUno, '--salida', enCarpeta('repetido')], {
      encoding: 'utf8'
    });
    expect(repetido.status).toBe(1);
    expect(repetido.stderr).toContain('Hay seudónimos repetidos en más de un par (8 entre los pares 1 y 2).');
    for (const seudonimo of Object.values(seudonimos)) expect(repetido.stderr).not.toContain(seudonimo);
    expect(fs.existsSync(enCarpeta('repetido'))).toBe(false);
  }, ESPERA_MS);

  test('línea de comandos: sin los dos archivos, o con uno que no existe, termina con código 1 y lo explica', () => {
    const sinArgumentos = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(sinArgumentos.status).toBe(1);
    expect(sinArgumentos.stderr).toContain('Uso: node api/scripts/analisisEvaluacion.js');
    const noExiste = spawnSync(process.execPath, [SCRIPT, enCarpeta('no-existe.csv'), enCarpeta(VALORES_CSV)], { encoding: 'utf8' });
    expect(noExiste.status).toBe(1);
    expect(noExiste.stderr).toContain('No se pudo leer');
    expect(() => ejecutar(['a.csv', 'b.csv', '--salida'])).toThrow(ErrorDeEntrada);
    // Un --par incompleto, o --par mezclado con la forma corta
    expect(() => ejecutar(['--par', 'a.csv'])).toThrow(ErrorDeEntrada);
    expect(() => ejecutar(['--par', 'a.csv', '--salida', 'x'])).toThrow(ErrorDeEntrada);
    expect(() => ejecutar(['a.csv', 'b.csv', '--par', 'c.csv', 'd.csv'])).toThrow(ErrorDeEntrada);
  });
});
