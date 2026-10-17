'use strict';
const {
  ALFABETO,
  generarSeudonimo,
  esSeudonimoValido,
  normalizarSeudonimo,
  contieneDatoIdentificable
} = require('../src/dominio/registro/seudonimo');

/**
 * Seudonimo de la sesion y deteccion de campos identificables. M-09, CT-11.
 * Adaptadas de fase-ii (api/test/privacidad.test.js, solo CT-11).
 */

describe('CT-11 seudónimo aleatorio de la sesión', () => {
  test('tiene 8 caracteres en formato XXXX-XXXX', () => {
    for (let i = 0; i < 200; i += 1) {
      const s = generarSeudonimo();
      expect(s).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(esSeudonimoValido(s)).toBe(true);
    }
  });

  test('el alfabeto no tiene caracteres ambiguos', () => {
    for (const ambiguo of ['0', 'O', '1', 'I', 'L']) expect(ALFABETO).not.toContain(ambiguo);
    expect(ALFABETO).toHaveLength(31);
    expect(new Set(ALFABETO).size).toBe(31);
  });

  test('genera seudonimos distintos', () => {
    const vistos = new Set(Array.from({ length: 500 }, generarSeudonimo));
    expect(vistos.size).toBe(500);
  });

  test('rechaza lo que no es un seudonimo', () => {
    for (const valor of ['K7QM3XRA', 'k7qm-3xra', 'K7QM-3XR0', 'KOQM-3XRA', 'K1QM-3XRA', 'KLQM-3XRA', null, 12345678]) {
      expect(esSeudonimoValido(valor)).toBe(false);
    }
  });

  test('normaliza un seudonimo escrito a mano', () => {
    expect(normalizarSeudonimo(' k7qm 3xra ')).toBe('K7QM-3XRA');
    expect(normalizarSeudonimo('k7qm-3xra')).toBe('K7QM-3XRA');
    expect(normalizarSeudonimo('K7QM-3XR')).toBeNull();
    expect(normalizarSeudonimo('K0QM-3XRA')).toBeNull();
    expect(normalizarSeudonimo(undefined)).toBeNull();
  });
});

describe('CT-11 detección de campos identificables', () => {
  test('detecta nombre, documento y contacto, con y sin tilde ni separadores', () => {
    for (const clave of ['nombre', 'Apellidos', 'cédula', 'numero_documento', 'Teléfono', 'celular', 'correo', 'email',
      'contacto', 'fechaNacimiento', 'fecha_nacimiento', 'Dirección', 'WhatsApp', 'identificacion']) {
      expect(contieneDatoIdentificable({ [clave]: 'x' })).toBe(true);
    }
  });

  test('revisa tambien los objetos y arreglos anidados', () => {
    expect(contieneDatoIdentificable({ ensayos: [{ tiempoReaccionMs: 1 }, { nombre: 'x' }] })).toBe(true);
    expect(contieneDatoIdentificable({ contexto: { participante: { correo: 'x' } } })).toBe(true);
    expect(contieneDatoIdentificable([{ telefono: '300' }])).toBe(true);
  });

  test('no marca los campos del registro', () => {
    expect(contieneDatoIdentificable({ seudonimo: 'K7QM-3XRA', ensayos: [{ tiempoReaccionMs: 800, regla: 'color' }] })).toBe(false);
    expect(contieneDatoIdentificable(null)).toBe(false);
    expect(contieneDatoIdentificable('nombre')).toBe(false);
  });

  test('no se queda en un ciclo', () => {
    const a = { b: {} };
    a.b.a = a;
    expect(contieneDatoIdentificable(a)).toBe(false);
  });
});
