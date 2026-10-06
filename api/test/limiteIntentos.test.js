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
