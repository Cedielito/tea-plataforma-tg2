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
const { COLUMNAS_ENSAYOS, COLUMNAS_VALORES } = require('../src/dominio/registro/exportacion');
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
    expect(vacio.eficacia).toMatchObject({ proporcionCompletas: null, cumpleProporcion: null });
    expect(vacio.consistencia.condiciones.cambio).toEqual({ n: 0, r: null, spearmanBrown: null, cumple: null });
    const md = aMarkdown(vacio);
    expect(md).toContain('No calculable');
    expect(md).not.toMatch(/undefined|NaN/);
  });
});

describe('M-09 CC-09 CC-10 CT-08 RF-15 análisis de los perfiles simulados pasados por la exportación', () => {
  const APLICACION = '/api/registro/aplicacion';
  // Por perfil, en el orden del archivo: minutos de la aplicacion y valor SUS.
  const DURACIONES = [12, 14, 16, 18, 21, 25];
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

  async function entrar() {
    const agente = request.agent(app);
    await iniciarSesion(agente, { usuario: USUARIO_PROFESIONAL });
    return agente;
  }

  async function aplicarPerfil({ sesion: sesionWeb }, minutos, valorSUS) {
    const agente = await entrar();
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
  });

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

  test('eficacia: completas sobre las entregadas, no sobre las creadas', () => {
    expect(resumen.eficacia.proporcionCompletas).toBeCloseTo(6 / 7, 12);
    expect(resumen.eficacia).toMatchObject({
      criterioProporcion: CRITERIOS.proporcionCompletasMinima,
      cumpleProporcion: true
    });
    // Sobre las creadas (6 de 8 = 75 %) no cumpliria
    expect(6 / 8).toBeLessThan(CRITERIOS.proporcionCompletasMinima);
    expect(md).toContain('| Sesiones completas | 6 de 7 entregadas (85,7 %); 8 creadas | ≥ 85 % de las entregadas | Cumple |');
  });

  test('CT-08 duración: mediana, máximo y cuántas en 20 minutos o menos', () => {
    expect(resumen.eficacia.duracionMin).toEqual({
      n: 6,
      mediana: 17,
      maximo: 25,
      hastaLimite: 4,
      limite: 20,
      cumple: false
    });
    expect(md).toContain('n = 6; mediana 17,0 min; máximo 25,0 min; 4 de 6 en 20 min o menos | 20 min o menos en todas (CT-08) | No cumple |');
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

  test('línea de comandos: sin los dos archivos, o con uno que no existe, termina con código 1 y lo explica', () => {
    const sinArgumentos = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(sinArgumentos.status).toBe(1);
    expect(sinArgumentos.stderr).toContain('Uso: node api/scripts/analisisEvaluacion.js');
    const noExiste = spawnSync(process.execPath, [SCRIPT, enCarpeta('no-existe.csv'), enCarpeta(VALORES_CSV)], { encoding: 'utf8' });
    expect(noExiste.status).toBe(1);
    expect(noExiste.stderr).toContain('No se pudo leer');
    expect(() => ejecutar(['a.csv', 'b.csv', '--salida'])).toThrow(ErrorDeEntrada);
  });
});
