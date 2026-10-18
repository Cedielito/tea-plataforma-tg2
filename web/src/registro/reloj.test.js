/**
 * Reloj y motor de un ensayo (M-09, CT-07, RF-13, RF-14), sin navegador: el
 * reloj, los fotogramas y los temporizadores son funciones inyectadas.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { crearReloj, elegirVariante, VARIANTES_RELOJ } from './reloj.js';
import { crearEnsayoMedido, tipoDePuntero, redondear } from './motorEnsayo.js';

/** Entorno falso: un reloj que se mueve a mano, fotogramas y temporizadores en cola. */
function entorno(variante = 'animacion', inicio = 1000) {
  const e = { t: inicio, fotogramas: [], temporizadores: [] };
  const programar = (fn, ms) => {
    e.temporizadores.push({ fn, en: e.t + ms });
    return e.temporizadores.length;
  };
  const cancelar = (id) => {
    e.temporizadores[id - 1] = null;
  };
  e.reloj = crearReloj(variante, {
    pedirFotograma: (fn) => e.fotogramas.push(fn),
    cancelarFotograma: () => {},
    ahora: () => e.t,
    programar,
    cancelar
  });
  e.dibujar = () => e.fotogramas.splice(0).forEach((fn) => fn(e.t));
  e.avanzar = (ms) => {
    const fin = e.t + ms;
    for (;;) {
      const i = e.temporizadores.findIndex((x) => x && x.en <= fin);
      if (i === -1) break;
      const { fn, en } = e.temporizadores[i];
      e.temporizadores[i] = null;
      e.t = Math.max(e.t, en);
      fn();
    }
    e.t = fin;
  };
  e.medir = (opciones = {}) => {
    e.resultados = [];
    return crearEnsayoMedido({
      reloj: e.reloj,
      limiteRespuestaMs: 5000,
      alTerminar: (m) => e.resultados.push(m),
      programar,
      cancelar,
      ...opciones
    });
  };
  return e;
}

describe('CT-07 reloj por animación (requestAnimationFrame y event.timeStamp)', () => {
  test('la aparición es performance.now() en el fotograma y la respuesta, event.timeStamp', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.t = 1016.7; // el navegador dibuja en el siguiente fotograma
    e.dibujar();
    e.t = 1600;
    assert.equal(m.responder({ timeStamp: 1540.25 }, 'izquierda', 'teclado'), true);
    assert.equal(e.resultados.length, 1);
    assert.deepEqual(e.resultados[0], {
      estadoItem: 'respondido',
      respuesta: 'izquierda',
      tipoEntrada: 'teclado',
      aparicionMs: 1016.7,
      momentoRespuestaMs: 1540.25,
      tiempoReaccionMs: 523.55,
      pausasDuranteItemMs: 0,
      rectificaciones: 0
    });
  });

  test('el tiempo de reacción conserva los decimales, sin ruido de coma flotante', () => {
    const e = entorno('animacion', 0.1);
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    m.responder({ timeStamp: 0.3 }, 'derecha', 'tactil');
    assert.equal(e.resultados[0].tiempoReaccionMs, 0.2);
    assert.equal(redondear(0.30000000000000004), 0.3);
  });

  test('un timeStamp en época Unix se reemplaza por performance.now()', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    e.t = 1450;
    m.responder({ timeStamp: 1760000000000 }, 'izquierda', 'raton');
    assert.equal(e.resultados[0].tiempoReaccionMs, 450);
  });

  test('cuenta solo la primera respuesta (rectificaciones = 0)', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    assert.equal(m.responder({ timeStamp: 1500 }, 'izquierda', 'teclado'), true);
    assert.equal(m.responder({ timeStamp: 1700 }, 'derecha', 'teclado'), false);
    assert.equal(e.resultados.length, 1);
    assert.equal(e.resultados[0].respuesta, 'izquierda');
    assert.equal(e.resultados[0].rectificaciones, 0);
  });

  test('ignora las respuestas antes de la aparición y las teclas mantenidas', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    assert.equal(m.responder({ timeStamp: 990 }, 'izquierda', 'teclado'), false); // aún no se dibuja
    e.dibujar();
    assert.equal(m.responder({ timeStamp: 995 }, 'izquierda', 'teclado'), false); // evento anterior
    assert.equal(m.responder({ timeStamp: 1300, repeat: true }, 'izquierda', 'teclado'), false);
    assert.equal(m.responder({ timeStamp: 1300 }, 'derecha', 'teclado'), true);
    assert.equal(e.resultados[0].tiempoReaccionMs, 300);
  });
});

describe('CT-07 reloj de referencia (setTimeout y Date.now)', () => {
  test('marca la aparición en un setTimeout(0) y la respuesta con Date.now() al atender el evento', () => {
    const e = entorno('referencia');
    const m = e.medir();
    m.iniciar();
    assert.equal(e.fotogramas.length, 0);
    e.avanzar(4); // el temporizador corre unos ms después
    e.t = 1700;
    m.responder({ timeStamp: 1 }, 'derecha', 'teclado'); // no usa el timeStamp del evento
    assert.equal(e.resultados[0].aparicionMs, 1000);
    assert.equal(e.resultados[0].tiempoReaccionMs, 700);
  });

  test('las dos variantes se eligen por configuración', () => {
    assert.equal(elegirVariante(), 'animacion');
    assert.equal(elegirVariante('referencia'), 'referencia');
    assert.equal(elegirVariante(null, 'otra', 'referencia'), 'referencia');
    assert.equal(elegirVariante('otra'), 'animacion');
    assert.deepEqual(Object.values(VARIANTES_RELOJ), ['animacion', 'referencia']);
    assert.throws(() => crearReloj('otra'), RangeError);
    assert.equal(crearReloj('referencia', {}).variante, 'referencia');
  });
});

describe('RF-14 omisión sin respuesta en 5 s', () => {
  test('a los 5 s el ensayo queda omitido, con tiempo de reacción null', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    e.avanzar(4999);
    assert.equal(e.resultados.length, 0);
    e.avanzar(1);
    assert.deepEqual(e.resultados[0], {
      estadoItem: 'omitido',
      respuesta: null,
      tipoEntrada: null,
      aparicionMs: 1000,
      momentoRespuestaMs: null,
      tiempoReaccionMs: null,
      pausasDuranteItemMs: 0,
      rectificaciones: 0
    });
    assert.equal(m.responder({ timeStamp: 6100 }, 'izquierda', 'teclado'), false);
  });

  test('una respuesta antes del límite cancela la omisión', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    m.responder({ timeStamp: 5999 }, 'izquierda', 'teclado');
    e.avanzar(10000);
    assert.equal(e.resultados.length, 1);
    assert.equal(e.resultados[0].estadoItem, 'respondido');
  });

  test('al cancelar (salir de la pantalla) no registra nada', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    m.cancelar();
    e.avanzar(10000);
    assert.equal(e.resultados.length, 0);
  });
});

describe('RF-13 pausas con la pestaña oculta', () => {
  test('el tiempo oculta va a pausasDuranteItemMs y el tiempo de reacción la incluye', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    e.t = 1200;
    m.ocultar();
    e.t = 4200.5;
    m.mostrar();
    m.responder({ timeStamp: 4500.5 }, 'izquierda', 'teclado');
    const r = e.resultados[0];
    assert.equal(r.pausasDuranteItemMs, 3000.5);
    assert.equal(r.tiempoReaccionMs, 3500.5);
    assert.equal(r.tiempoReaccionMs - r.pausasDuranteItemMs, 500); // neto, como lo calcula el dominio
  });

  test('la pausa no cuenta para el límite de 5 s', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    e.avanzar(1000);
    m.ocultar();
    e.avanzar(10000); // oculta: el temporizador corre, pero no cierra el ensayo
    assert.equal(e.resultados.length, 0);
    m.mostrar();
    e.avanzar(3999);
    assert.equal(e.resultados.length, 0);
    e.avanzar(1);
    assert.equal(e.resultados[0].estadoItem, 'omitido');
    assert.equal(e.resultados[0].pausasDuranteItemMs, 10000);
  });

  test('una respuesta con la pestaña todavía oculta cierra la pausa en ese momento', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    e.dibujar();
    e.t = 1100;
    m.ocultar();
    m.responder({ timeStamp: 1400 }, 'derecha', 'tactil');
    assert.equal(e.resultados[0].pausasDuranteItemMs, 300);
  });

  test('ocultar antes de la aparición no cuenta como pausa del ensayo', () => {
    const e = entorno();
    const m = e.medir();
    m.iniciar();
    m.ocultar();
    m.mostrar();
    e.dibujar();
    m.responder({ timeStamp: 1250 }, 'derecha', 'teclado');
    assert.equal(e.resultados[0].pausasDuranteItemMs, 0);
  });
});

describe('M-09 tipo de entrada', () => {
  test('pointerType se traduce a ratón, táctil o lápiz', () => {
    assert.equal(tipoDePuntero('mouse'), 'raton');
    assert.equal(tipoDePuntero('touch'), 'tactil');
    assert.equal(tipoDePuntero('pen'), 'lapiz');
    assert.equal(tipoDePuntero(''), 'raton');
  });
});
