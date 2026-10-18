/**
 * Pruebas de los cálculos del experimento de precisión temporal (M-09, CT-07,
 * T16), sin navegador: el plan de latencias y teclas, la aparición de
 * referencia, la fila de cada ensayo, el emparejamiento con la web, el CSV y
 * el script que se inyecta en la página. Corren en el CI normal; el
 * experimento (precision.spec.js) solo en el flujo manual.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { crearAzar } from '../../src/registro/azar.js';
import { AVISO, mulberry32, scriptDeArnes, TAREAS_LARGAS, TECLAS_RESPUESTA } from './arnes.js';
import { aCsv, leerCsv } from './csv.js';
import {
  aparicionDeReferencia,
  COLUMNAS,
  comprobarEmparejamiento,
  filaDeEnsayo,
  LATENCIAS_MS,
  planDeRespuestas
} from './medicion.js';
import { convertirFila } from './resumir.js';

describe('CT-07 plan de latencias y teclas del arnés', () => {
  test('cada grupo de tres ensayos tiene las tres latencias', () => {
    const plan = planDeRespuestas(20261024, 74);
    assert.equal(plan.length, 74);
    for (let i = 0; i + 3 <= plan.length; i += 3) {
      assert.deepEqual(plan.slice(i, i + 3).map((p) => p.latenciaMs).sort((a, b) => a - b), [...LATENCIAS_MS]);
    }
    assert.ok(plan.every((p) => TECLAS_RESPUESTA.includes(p.tecla)));
    assert.ok(plan.some((p) => p.tecla === 'KeyF') && plan.some((p) => p.tecla === 'KeyJ'));
  });

  test('con la misma semilla, el mismo plan; con otra, otro', () => {
    assert.deepEqual(planDeRespuestas(7, 30), planDeRespuestas(7, 30));
    assert.notDeepEqual(planDeRespuestas(7, 30), planDeRespuestas(8, 30));
  });
});

describe('CT-07 aparición de referencia', () => {
  const registro = { insercionMs: 990, rafMs: 1000, dibujadoMs: 1001.5 };

  test('es el final del fotograma que dibuja el estímulo', () => {
    assert.equal(aparicionDeReferencia(registro), 1001.5);
    // Una tarea larga antes del fotograma o después del mensaje no la cambia.
    assert.equal(aparicionDeReferencia(registro, [[900, 980], [1001.5, 1080]]), 1001.5);
  });

  test('si una tarea larga se coló antes del mensaje, es el inicio de esa tarea', () => {
    const tarde = { ...registro, dibujadoMs: 1071.2 };
    assert.equal(aparicionDeReferencia(tarde, [[1001.1, 1071]]), 1001.1);
  });
});

describe('CT-07 fila de cada ensayo', () => {
  const celda = { motor: 'chromium', versionMotor: '141.0', reloj: 'animacion', carga: 'normal', sesion: 1, semilla: 5 };
  const registro = {
    insercionMs: 990,
    fotogramaMs: 985,
    rafMs: 1000,
    dibujadoMs: 1001,
    desfaseEpocaMs: 1_760_000_000_000,
    pulsacionMs: 1504,
    atencionMs: 1504.2,
    code: 'KeyF',
    confiable: true
  };
  const ensayo = {
    tarea: 'cambio-regla',
    numero: 3,
    practica: false,
    estadoItem: 'respondido',
    respuesta: 'izquierda',
    tiempoReaccionMs: 504.3,
    aparicionMs: 999.7,
    momentoRespuestaMs: 1504
  };
  const programado = { latenciaMs: 500, tecla: 'KeyF' };

  test('separa la latencia del arnés y calcula el error y su cota superior', () => {
    const fila = filaDeEnsayo({ celda, registro, ensayo, programado });
    assert.deepEqual(Object.keys(fila), COLUMNAS);
    assert.equal(fila.latenciaArnesMs, 503);
    assert.equal(fila.desvioArnesMs, 3);
    assert.equal(fila.errorMs, 1.3);
    assert.equal(fila.errorCotaMs, 4.3);
    // El error se reparte en sus dos marcas.
    assert.equal(fila.errorAparicionMs, 1.3);
    assert.equal(fila.errorRespuestaMs, 0);
    assert.equal(fila.tareasLargas, 0);
  });

  test("con el reloj 'referencia' pasa las marcas de Date.now() a la escala del arnés", () => {
    const epoca = registro.desfaseEpocaMs;
    const fila = filaDeEnsayo({
      celda: { ...celda, reloj: 'referencia' },
      // Una tarea larga demoró la atención de la tecla.
      registro: { ...registro, atencionMs: 1531.8 },
      ensayo: { ...ensayo, tiempoReaccionMs: 534, aparicionMs: epoca + 998, momentoRespuestaMs: epoca + 1532 },
      programado,
      tareasLargas: [[1480, 1531.5]]
    });
    assert.equal(fila.errorMs, 31);
    assert.equal(fila.errorAparicionMs, 3);
    assert.equal(fila.errorRespuestaMs, 28);
    assert.equal(fila.tareasLargas, 1);
  });
});

describe('CT-07 emparejamiento del arnés con la web', () => {
  const registro = { pulsacionMs: 1, dibujadoMs: 0, code: 'KeyJ', confiable: true };
  const ensayo = { tarea: 'navon', numero: 1, estadoItem: 'respondido', respuesta: 'S' };
  const programado = { latenciaMs: 300, tecla: 'KeyJ' };

  test('acepta ensayos que coinciden en número, tecla y respuesta', () => {
    assert.doesNotThrow(() => comprobarEmparejamiento([registro], [ensayo], [programado]));
    assert.doesNotThrow(() =>
      comprobarEmparejamiento([{ ...registro, code: 'KeyF' }], [{ ...ensayo, respuesta: 'izquierda' }], [{ ...programado, tecla: 'KeyF' }])
    );
  });

  test('rechaza un ensayo de más, una omisión, otra respuesta o un evento que no es del navegador', () => {
    const casos = [
      [[registro, registro], [ensayo]],
      [[registro], [{ ...ensayo, estadoItem: 'omitido', respuesta: null }]],
      [[registro], [{ ...ensayo, respuesta: 'H' }]],
      [[{ ...registro, confiable: false }], [ensayo]],
      [[{ dibujadoMs: 0, code: 'KeyJ', confiable: true }], [ensayo]]
    ];
    for (const [registros, ensayos] of casos) {
      assert.throws(() => comprobarEmparejamiento(registros, ensayos, [programado, programado]));
    }
  });
});

describe('CT-07 CSV del experimento', () => {
  test('coma, punto decimal y CRLF; vuelve a leerse igual', () => {
    const filas = [{ a: 1.5, b: 'x,y', c: null }, { a: -2, b: 'con "comillas"', c: true }];
    const texto = aCsv(['a', 'b', 'c'], filas);
    assert.equal(texto, 'a,b,c\r\n1.5,"x,y",\r\n-2,"con ""comillas""",true\r\n');
    assert.deepEqual(leerCsv(texto), [
      { a: '1.5', b: 'x,y', c: '' },
      { a: '-2', b: 'con "comillas"', c: 'true' }
    ]);
  });

  test('una fila del CSV vuelve con números y booleanos', () => {
    const fila = Object.fromEntries(COLUMNAS.map((c) => [c, '1']));
    Object.assign(fila, { motor: 'firefox', reloj: 'animacion', carga: 'normal', tarea: 'navon', tecla: 'KeyF', practica: 'false', versionMotor: '157.0' });
    const convertida = convertirFila(fila);
    assert.equal(convertida.errorMs, 1);
    assert.equal(convertida.practica, false);
    assert.equal(convertida.versionMotor, '157.0');
  });
});

describe('CT-07 script que se inyecta en la página', () => {
  test('su copia de mulberry32 da la misma secuencia que azar.js', () => {
    const a = mulberry32(123);
    const b = crearAzar(123);
    for (let i = 0; i < 100; i += 1) assert.equal(a(), b());
  });

  test('es código válido y lleva la carga, la semilla y los parámetros de las tareas largas', () => {
    const script = scriptDeArnes({ carga: 'hilo-ocupado', semillaCarga: 42 });
    assert.doesNotThrow(() => new Function(script));
    assert.match(script, /"carga":"hilo-ocupado"/);
    assert.match(script, /"semillaCarga":42/);
    assert.ok(script.includes(JSON.stringify(TAREAS_LARGAS.tareaLargaMs)));
    assert.ok(script.includes(`"aviso":"${AVISO}"`));
  });
});
