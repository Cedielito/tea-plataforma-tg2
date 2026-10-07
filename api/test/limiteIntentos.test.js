'use strict';
const { crearBloqueoPorUsuario, crearLimiteGlobal } = require('../src/dominio/limiteIntentos');

const INICIO = new Date('2026-10-01T15:00:00Z').getTime();
const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;

describe('RS-05 bloqueo por intentos fallidos con un mismo usuario', () => {
  test('5 fallos en 15 minutos bloquean el usuario 15 minutos', () => {
    const bloqueo = crearBloqueoPorUsuario();
    for (let i = 0; i < 4; i += 1) {
      expect(bloqueo.registrarFallo('equipo', INICIO + i * MINUTO)).toEqual({ bloqueado: false });
    }
    expect(bloqueo.registrarFallo('equipo', INICIO + 4 * MINUTO)).toEqual({ bloqueado: true, segundos: 15 * 60 });
    expect(bloqueo.consultar('equipo', INICIO + 10 * MINUTO)).toEqual({ bloqueado: true, segundos: 9 * 60 });
  });

  test('pasado el bloqueo se puede volver a intentar, con el conteo en cero', () => {
    const bloqueo = crearBloqueoPorUsuario();
    for (let i = 0; i < 5; i += 1) bloqueo.registrarFallo('equipo', INICIO);
    expect(bloqueo.consultar('equipo', INICIO + 15 * MINUTO - SEGUNDO).bloqueado).toBe(true);
    expect(bloqueo.consultar('equipo', INICIO + 15 * MINUTO)).toEqual({ bloqueado: false });
    expect(bloqueo.registrarFallo('equipo', INICIO + 16 * MINUTO)).toEqual({ bloqueado: false });
  });

  test('los fallos de hace mas de 15 minutos no cuentan', () => {
    const bloqueo = crearBloqueoPorUsuario();
    for (let i = 0; i < 4; i += 1) bloqueo.registrarFallo('equipo', INICIO);
    expect(bloqueo.registrarFallo('equipo', INICIO + 15 * MINUTO)).toEqual({ bloqueado: false });
  });

  test('un usuario bloqueado no bloquea a otro', () => {
    const bloqueo = crearBloqueoPorUsuario();
    for (let i = 0; i < 5; i += 1) bloqueo.registrarFallo('equipo', INICIO);
    expect(bloqueo.consultar('otra.persona', INICIO)).toEqual({ bloqueado: false });
  });

  test('reiniciar (inicio de sesion correcto) borra los fallos', () => {
    const bloqueo = crearBloqueoPorUsuario();
    for (let i = 0; i < 4; i += 1) bloqueo.registrarFallo('equipo', INICIO);
    bloqueo.reiniciar('equipo');
    expect(bloqueo.registrarFallo('equipo', INICIO)).toEqual({ bloqueado: false });
  });

  test('un solo intento en curso por usuario', () => {
    const bloqueo = crearBloqueoPorUsuario();
    expect(bloqueo.ocupar('equipo')).toBe(true);
    expect(bloqueo.ocupar('equipo')).toBe(false);
    expect(bloqueo.ocupar('otra.persona')).toBe(true);
    bloqueo.liberar('equipo');
    expect(bloqueo.ocupar('equipo')).toBe(true);
  });

  test('la memoria no crece sin limite: descarta el usuario con el fallo mas antiguo', () => {
    const bloqueo = crearBloqueoPorUsuario({ maximoUsuarios: 3 });
    for (let i = 0; i < 5; i += 1) bloqueo.registrarFallo('primero', INICIO);
    ['b', 'c', 'd'].forEach((usuario, i) => bloqueo.registrarFallo(usuario, INICIO + (i + 1) * SEGUNDO));
    expect(bloqueo.cantidad()).toBe(3);
    expect(bloqueo.consultar('primero', INICIO + MINUTO)).toEqual({ bloqueado: false });
  });
});

describe('RS-05 limite global de intentos de inicio de sesion', () => {
  test('permite 20 intentos por minuto en total y rechaza el siguiente', () => {
    const limite = crearLimiteGlobal();
    for (let i = 0; i < 20; i += 1) expect(limite.registrar(INICIO + i * SEGUNDO).permitido).toBe(true);
    expect(limite.registrar(INICIO + 30 * SEGUNDO)).toEqual({ permitido: false, segundos: 30 });
  });

  test('es una ventana deslizante: al pasar un minuto del primer intento, vuelve a permitir', () => {
    const limite = crearLimiteGlobal({ maximo: 2 });
    limite.registrar(INICIO);
    limite.registrar(INICIO + 10 * SEGUNDO);
    expect(limite.registrar(INICIO + 59 * SEGUNDO).permitido).toBe(false);
    expect(limite.registrar(INICIO + MINUTO).permitido).toBe(true);
    expect(limite.registrar(INICIO + MINUTO + SEGUNDO).permitido).toBe(false);
  });

  test('acepta el tiempo como Date', () => {
    const limite = crearLimiteGlobal({ maximo: 1 });
    expect(limite.registrar(new Date(INICIO)).permitido).toBe(true);
    expect(limite.registrar(new Date(INICIO)).permitido).toBe(false);
  });
});

describe('RS-02 limite de envios por clave (IP del formulario de contacto)', () => {
  const { crearLimitePorClave } = require('../src/dominio/limiteIntentos');
  const MIN = 60 * 1000;
  const T0 = new Date('2026-10-07T15:00:00Z').getTime();

  test('acepta hasta el maximo por clave y luego dice cuantos segundos faltan', () => {
    const limite = crearLimitePorClave({ maximo: 3, ventanaMs: 15 * MIN });
    for (let i = 0; i < 3; i += 1) expect(limite.registrar('ip-a', T0 + i * MIN)).toEqual({ permitido: true });
    expect(limite.registrar('ip-a', T0 + 3 * MIN)).toEqual({ permitido: false, segundos: 12 * 60 });
    expect(limite.consultar('ip-a', T0 + 3 * MIN)).toEqual({ permitido: false, segundos: 12 * 60 });
  });

  test('cada clave tiene su propio cupo', () => {
    const limite = crearLimitePorClave({ maximo: 1, ventanaMs: MIN });
    expect(limite.registrar('ip-a', T0).permitido).toBe(true);
    expect(limite.registrar('ip-b', T0).permitido).toBe(true);
    expect(limite.registrar('ip-a', T0).permitido).toBe(false);
  });

  test('consultar no cuenta', () => {
    const limite = crearLimitePorClave({ maximo: 1, ventanaMs: MIN });
    limite.consultar('ip-a', T0);
    limite.consultar('ip-a', T0);
    expect(limite.registrar('ip-a', T0).permitido).toBe(true);
  });

  test('es una ventana deslizante y olvida las claves cuya ventana vencio', () => {
    const limite = crearLimitePorClave({ maximo: 2, ventanaMs: 15 * MIN });
    limite.registrar('ip-a', T0);
    limite.registrar('ip-a', T0 + 10 * MIN);
    limite.registrar('ip-b', T0 + 12 * MIN);
    expect(limite.registrar('ip-a', T0 + 14 * MIN).permitido).toBe(false);
    expect(limite.registrar('ip-a', new Date(T0 + 15 * MIN)).permitido).toBe(true);
    expect(limite.cantidad()).toBe(2);

    // Pasada la ventana de todos, ninguna IP queda en memoria.
    limite.consultar('otra', T0 + 60 * MIN);
    expect(limite.cantidad()).toBe(0);
  });

  test('la memoria no crece sin limite aunque lleguen muchas claves distintas', () => {
    const limite = crearLimitePorClave({ maximo: 5, ventanaMs: 15 * MIN, maximoClaves: 3 });
    for (let i = 0; i < 10; i += 1) limite.registrar(`ip-${i}`, T0 + i);
    expect(limite.cantidad()).toBe(3);
  });
});
