/**
 * Textos de las tareas de cambio de regla y de Navon (M-09, RCN-03, HU-17,
 * CP-03): sin vocabulario prohibido, con el aviso de M-09 igual al de api/,
 * con una pantalla de instrucciones en cada cambio de regla y, en Navon,
 * antes de cada bloque, y con lo que ve el participante en frases de 15
 * palabras o menos.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  AVISO_NO_DIAGNOSTICO,
  buscarVocabularioProhibido
} from '../../../api/src/dominio/registro/vocabularioProhibido.js';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import * as textos from './textos.js';
import { CAJAS, ESTIMULOS_PRUEBA } from './estimulos.js';
import { OPCIONES_LETRA } from './estimulosNavon.js';
import { APLICACION, SUS } from './textosProfesional.js';

const SECUENCIA = planificarSesion().secuencias.find((s) => s.tarea === 'cambio-regla');
const SECUENCIA_NAVON = planificarSesion().secuencias.find((s) => s.tarea === 'navon');
const { animo, etiquetaCaja, nombreFigura, RETROALIMENTACION, SENALES, textosAntesDeBloque } = textos;
const { animoNavon, etiquetaLetra, INSTRUCCIONES_NIVEL, NAVON, nombreCortoNavon, nombreFiguraNavon } = textos;
const ESTIMULOS_NAVON = [
  { global: 'H', local: 'H' },
  { global: 'H', local: 'S' },
  { global: 'S', local: 'H' },
  { global: 'S', local: 'S' }
];

/** Todos los textos que puede ver una persona, también los que salen de funciones. */
function todosLosTextos() {
  const bloques = SECUENCIA.bloques.map((b, i) => textosAntesDeBloque(b, i === 2));
  const total = SECUENCIA.bloques.length;
  return [
    textos,
    bloques,
    SECUENCIA.bloques.map((b) => animo(b.orden, total)),
    ['color', 'forma'].map(RETROALIMENTACION.incorrecta),
    Object.values(CAJAS).map(etiquetaCaja),
    ESTIMULOS_PRUEBA.map(nombreFigura),
    textos.PROGRESO.parte(1, total),
    // Navon
    SECUENCIA_NAVON.bloques.map((b) => animoNavon(b.orden, SECUENCIA_NAVON.bloques.length)),
    ['global', 'local'].flatMap((c) =>
      ESTIMULOS_NAVON.map((estimulo) => NAVON.retroalimentacion.incorrecta(c, { estimulo }))
    ),
    ESTIMULOS_NAVON.flatMap((e) => [nombreFiguraNavon(e), nombreCortoNavon(e)]),
    OPCIONES_LETRA.map(etiquetaLetra),
    NAVON.progreso.parte(1, SECUENCIA_NAVON.bloques.length)
  ];
}

describe('M-09 / RCN-03 textos de la tarea sin vocabulario prohibido', () => {
  test('ningún texto de la tarea tiene vocabulario prohibido', () => {
    assert.deepEqual(buscarVocabularioProhibido(todosLosTextos()), []);
  });

  test('tampoco las pantallas (el código de los .jsx, sin comentarios)', () => {
    const pantallas = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.jsx'));
    assert.ok(pantallas.length >= 6);
    assert.ok(pantallas.includes('TareaNavon.jsx') && pantallas.includes('FiguraNavon.jsx'));
    for (const archivo of pantallas) {
      const codigo = readFileSync(new URL(archivo, import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      assert.deepEqual(buscarVocabularioProhibido(codigo), [], archivo);
    }
  });

  test('la prueba sí detecta una palabra prohibida', () => {
    assert.notDeepEqual(buscarVocabularioProhibido([todosLosTextos(), 'tu puntaje']), []);
  });

  test('el aviso de M-09 de la web es el mismo de la API', () => {
    assert.equal(textos.AVISO_REGISTRO, AVISO_NO_DIAGNOSTICO);
  });

  test('ningún texto habla de puntos, vidas, rankings ni tiempo restante', () => {
    const texto = JSON.stringify(todosLosTextos());
    assert.doesNotMatch(texto, /\bpuntos?\b|\bvidas?\b|ranking|marcador|tiempo restante|cron[oó]metro/i);
  });
});

describe('HU-17 instrucciones en cada cambio de regla', () => {
  const [color, forma, mixto1, mixto2] = SECUENCIA.bloques;

  test('antes del bloque de forma se dice explícitamente que ahora se clasifica por forma', () => {
    const t = textosAntesDeBloque(forma, false);
    assert.match(t.titulo, /cambió la regla/);
    assert.match(t.parrafos[0], /^Ahora la regla es FORMA/);
    assert.match(t.parrafos[1], /Ya no se guarda por COLOR/);
  });

  test('antes del primer bloque mixto se explica que la palabra de arriba indica la regla en cada ensayo', () => {
    const t = textosAntesDeBloque(mixto1, true);
    assert.match(t.parrafos[0], /Arriba de cada juguete aparece una palabra: COLOR o FORMA/);
    assert.match(t.parrafos.join(' '), /puede cambiar de uno a otro/);
    assert.notDeepEqual(textosAntesDeBloque(mixto2, false), t);
  });

  test('el bloque de color repite la regla de la práctica', () => {
    assert.match(textosAntesDeBloque(color, false).parrafos[0], /^La regla es COLOR/);
  });

  test('las señales son COLOR y FORMA', () => {
    assert.deepEqual(SENALES, { color: 'COLOR', forma: 'FORMA' });
  });
});

describe('HU-17 mensaje de ánimo', () => {
  test('hay uno por bloque y el último cierra la tarea', () => {
    const total = SECUENCIA.bloques.length;
    const mensajes = SECUENCIA.bloques.map((b) => animo(b.orden, total));
    assert.equal(new Set(mensajes).size, total);
    assert.match(mensajes.at(-1), /Terminaste todas las partes/);
    assert.match(mensajes.at(-2), /Solo queda una parte/);
  });

  test('depende solo del número del bloque, no del desempeño', () => {
    assert.equal(animo.length, 2);
  });
});

describe('HU-17 instrucciones de la tarea de Navon', () => {
  test('cada nivel tiene su pantalla: «Mira la letra grande» y «Mira las letras pequeñas»', () => {
    assert.equal(INSTRUCCIONES_NIVEL.global.titulo, 'Mira la letra grande');
    assert.equal(INSTRUCCIONES_NIVEL.local.titulo, 'Mira las letras pequeñas');
    for (const condicion of SECUENCIA_NAVON.bloques.map((b) => b.condicion)) {
      assert.ok(INSTRUCCIONES_NIVEL[condicion].ejemplo, condicion);
    }
  });

  test('el ejemplo dice la respuesta correcta de su nivel', () => {
    const { EJEMPLO_NAVON } = textos;
    assert.match(INSTRUCCIONES_NIVEL.global.ejemplo, new RegExp(`La respuesta es ${EJEMPLO_NAVON.global}\\.`));
    assert.match(INSTRUCCIONES_NIVEL.local.ejemplo, new RegExp(`La respuesta es ${EJEMPLO_NAVON.local}\\.`));
    assert.notEqual(EJEMPLO_NAVON.global, EJEMPLO_NAVON.local);
  });

  test('los recordatorios son GRANDE y PEQUEÑAS', () => {
    assert.deepEqual(textos.RECORDATORIOS_NAVON, { global: 'GRANDE', local: 'PEQUEÑAS' });
  });

  test('la retroalimentación de un error dice la letra del nivel pedido', () => {
    const estimulo = { global: 'H', local: 'S' };
    assert.match(NAVON.retroalimentacion.incorrecta('global', { estimulo }), /letra grande era H/);
    assert.match(NAVON.retroalimentacion.incorrecta('local', { estimulo }), /letras pequeñas eran S/);
  });

  test('el ánimo es uno por bloque, fijo, y el último cierra la tarea', () => {
    const total = SECUENCIA_NAVON.bloques.length;
    const mensajes = SECUENCIA_NAVON.bloques.map((b) => animoNavon(b.orden, total));
    assert.equal(new Set(mensajes).size, total);
    assert.match(mensajes.at(-1), /Terminaste todos los carteles/);
    assert.equal(animoNavon.length, 2);
  });
});

/**
 * Lo que ve el participante: los textos de las dos tareas y, de
 * textosProfesional.js, los de la aplicación y el SUS. Quedan fuera el aviso
 * de M-09, que es para el profesional y tiene un texto fijo (regla 10 de
 * CLAUDE.md), y la nota de /registro/prueba, que es para el equipo. Los ítems
 * del SUS llegan de la API (api/contenidos/registro/sus.yaml) y tampoco
 * entran: su redacción la fija la versión validada.
 */
const NO_LOS_VE_EL_PARTICIPANTE = new Set([textos.AVISO_REGISTRO, textos.PAGINA_PRUEBA.nota]);

/** Todas las cadenas de un valor, recorriendo lo anidado. */
const cadenas = (valor) => {
  if (typeof valor === 'string') return [valor];
  if (valor === null || typeof valor !== 'object') return [];
  return Object.values(valor).flatMap(cadenas);
};

const textosDelParticipante = () =>
  cadenas([todosLosTextos(), APLICACION, SUS, SUS.enunciado(1, 10)]).filter(
    (texto) => !NO_LOS_VE_EL_PARTICIPANTE.has(texto)
  );

const MAXIMO_PALABRAS = 15;

/** Una frase termina en punto, signo de interrogación o de exclamación, o puntos suspensivos. */
const frases = (texto) => texto.split(/(?<=[.?!…])\s+/u).filter(Boolean);

/** Una palabra es lo que separa un espacio y tiene al menos una letra o un número. */
const palabras = (frase) => frase.split(/\s+/u).filter((p) => /[\p{L}\p{N}]/u.test(p));

/** Frases de más de 15 palabras, con su número de palabras. */
const frasesLargas = (lista) =>
  lista
    .flatMap(frases)
    .map((frase) => ({ frase, palabras: palabras(frase).length }))
    .filter((f) => f.palabras > MAXIMO_PALABRAS);

describe('CP-03 frases de 15 palabras o menos', () => {
  test('ninguna frase de lo que ve el participante pasa de 15 palabras', () => {
    assert.deepEqual(frasesLargas(textosDelParticipante()), []);
  });

  test('recorre las instrucciones de las dos tareas y la aplicación, sin el aviso de M-09 ni la nota de la prueba', () => {
    const vistos = textosDelParticipante();
    const [color, forma, mixto1] = SECUENCIA.bloques;
    const esperados = [
      textos.PRACTICA.parrafos[0],
      ...textosAntesDeBloque(color, false).parrafos,
      ...textosAntesDeBloque(forma, false).parrafos,
      ...textosAntesDeBloque(mixto1, true).parrafos,
      RETROALIMENTACION.incorrecta('forma'),
      NAVON.practica.parrafos[0],
      APLICACION.interrumpida[0],
      SUS.descripcion[0]
    ];
    for (const texto of esperados) assert.ok(vistos.includes(texto), texto);
    assert.ok(!vistos.includes(textos.AVISO_REGISTRO));
    assert.ok(!vistos.includes(textos.PAGINA_PRUEBA.nota));
  });

  test('la prueba sí detecta las frases largas que tenían las instrucciones', () => {
    const antes = [
      'La regla es COLOR: cada juguete va en la caja de su mismo color: lo rojo con lo rojo y lo azul con lo azul.',
      'Primero vas a practicar con dos carteles: en uno miras la letra grande y en el otro, las letras pequeñas.'
    ];
    assert.deepEqual(
      frasesLargas(antes).map((f) => f.palabras),
      [25, 20]
    );
  });

  test('una frase termina en punto, interrogación o exclamación, y una palabra tiene una letra o un número', () => {
    assert.deepEqual(frases('Mira. ¿Listo? ¡Vamos! Uno: dos; tres.'), ['Mira.', '¿Listo?', '¡Vamos!', 'Uno: dos; tres.']);
    assert.deepEqual(palabras('Presiona la tecla F — o toca 1.'), ['Presiona', 'la', 'tecla', 'F', 'o', 'toca', '1.']);
    const quince = `${Array(15).fill('palabra').join(' ')}.`;
    assert.deepEqual(frasesLargas([quince]), []);
    assert.equal(frasesLargas([`Una ${quince}`])[0].palabras, 16);
  });
});
