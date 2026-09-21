'use strict';
const { generarSeudonimo, esSeudonimoValido, contieneDatoIdentificable } = require('../src/dominio/privacidad/seudonimo');
const {
  validarConsentimiento, puedeIniciarSesion, modalidadAsentimiento, revocar, planificarSupresion,
  FINALIDADES, COLECCIONES_SUPRIMIBLES, COLECCIONES_CONSERVADAS
} = require('../src/dominio/privacidad/consentimiento');
const { COLECCIONES } = require('../src/datos/modelos');

const consentimientoValido = () => ({
  finalidades: { registro_conductual: true, devolucion_resultados: true, uso_academico_anonimizado: false },
  versionFormato: 'v1', fecha: '2026-09-10'
});

describe('CT-11 seudonimizacion', () => {
  test('genera identificadores validos y distintos', () => {
    const a = generarSeudonimo();
    const b = generarSeudonimo();
    expect(esSeudonimoValido(a)).toBe(true);
    expect(a).not.toBe(b);
  });
  test('rechaza valores que no son UUID', () => {
    expect(esSeudonimoValido('menor-01')).toBe(false);
    expect(esSeudonimoValido(null)).toBe(false);
  });
  test('detecta campos identificables, con y sin tilde', () => {
    expect(contieneDatoIdentificable({ nombre: 'x' })).toBe(true);
    expect(contieneDatoIdentificable({ Teléfono: '300' })).toBe(true);
    expect(contieneDatoIdentificable({ tiempoReaccionMs: 800 })).toBe(false);
    expect(contieneDatoIdentificable(null)).toBe(false);
  });
});

describe('CT-12 consentimiento granular', () => {
  test('acepta un consentimiento completo', () => {
    expect(validarConsentimiento(consentimientoValido()).valido).toBe(true);
  });
  test('exige que las tres finalidades esten declaradas', () => {
    const c = consentimientoValido();
    delete c.finalidades.uso_academico_anonimizado;
    const r = validarConsentimiento(c);
    expect(r.valido).toBe(false);
    expect(r.errores.join(' ')).toContain('uso_academico_anonimizado');
  });
  test('sin registro conductual no hay sesion posible', () => {
    const c = consentimientoValido();
    c.finalidades.registro_conductual = false;
    expect(validarConsentimiento(c).valido).toBe(false);
  });
  test('rechaza consentimiento ausente o sin version ni fecha', () => {
    expect(validarConsentimiento(null).valido).toBe(false);
    expect(validarConsentimiento({ finalidades: {} }).valido).toBe(false);
    const c = consentimientoValido();
    delete c.versionFormato; delete c.fecha;
    expect(validarConsentimiento(c).errores.length).toBeGreaterThanOrEqual(2);
  });
  test('FINALIDADES declara exactamente tres finalidades', () => {
    expect(FINALIDADES).toHaveLength(3);
  });
});

describe('CT-14 asentimiento del menor', () => {
  test('la negativa del menor bloquea la sesion pese a la autorizacion parental', () => {
    const r = puedeIniciarSesion({ consentimiento: consentimientoValido(), asentimiento: { aceptado: false } });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe('asentimiento_negado');
  });
  test('permite iniciar con consentimiento y asentimiento validos', () => {
    expect(puedeIniciarSesion({ consentimiento: consentimientoValido(), asentimiento: { aceptado: true } }).permitido).toBe(true);
  });
  test('un consentimiento revocado impide iniciar y declara el motivo real', () => {
    const c = revocar(consentimientoValido(), '2026-09-11');
    const r = puedeIniciarSesion({ consentimiento: c, asentimiento: { aceptado: true } });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe('consentimiento_revocado');
  });
  test('un consentimiento ausente sigue siendo invalido, no revocado ni excepcion', () => {
    expect(() => puedeIniciarSesion({ consentimiento: null })).not.toThrow();
    expect(puedeIniciarSesion({ consentimiento: null }).motivo).toBe('consentimiento_invalido');
    expect(puedeIniciarSesion({ consentimiento: undefined }).motivo).toBe('consentimiento_invalido');
    expect(puedeIniciarSesion({ consentimiento: 'revocado' }).motivo).toBe('consentimiento_invalido');
  });
  test('la modalidad depende del tramo de edad', () => {
    expect(modalidadAsentimiento(6)).toBe('pictografico');
    expect(modalidadAsentimiento(11)).toBe('pictografico');
    expect(modalidadAsentimiento(12)).toBe('escrito');
    expect(() => modalidadAsentimiento(3)).toThrow(RangeError);
    expect(() => modalidadAsentimiento('ocho')).toThrow(TypeError);
  });
});

describe('CT-12 supresion tras la revocacion', () => {
  test('la lista suprimible es el Cuadro 19 menos consentimiento y profesional', () => {
    const esperadas = COLECCIONES.filter((c) => c !== 'consentimiento' && c !== 'profesional');
    expect([...COLECCIONES_SUPRIMIBLES].sort()).toEqual([...esperadas].sort());
  });
  test('sesion figura entre las colecciones suprimibles', () => {
    expect(COLECCIONES_SUPRIMIBLES).toContain('sesion');
  });
  test('el consentimiento se conserva y nunca se suprime', () => {
    expect(COLECCIONES_CONSERVADAS).toEqual(['consentimiento']);
    expect(COLECCIONES_SUPRIMIBLES).not.toContain('consentimiento');
  });
  test('el plan describe que suprimir y que conservar sin tocar la base', () => {
    const plan = planificarSupresion(consentimientoValido(), '2026-09-21');
    expect(plan.suprimir).toEqual(COLECCIONES_SUPRIMIBLES);
    expect(plan.conservar).toEqual(['consentimiento']);
    expect(plan.yaEstabaRevocado).toBe(false);
    expect(plan.consentimiento.revocado).toBe(true);
    expect(plan.consentimiento.finalidades.registro_conductual).toBe(false);
  });
  test('el plan no muta el consentimiento de entrada', () => {
    const original = consentimientoValido();
    planificarSupresion(original, '2026-09-21');
    expect(original.revocado).toBeUndefined();
    expect(original.finalidades.registro_conductual).toBe(true);
  });
  test('el plan no expone listas mutables compartidas', () => {
    const plan = planificarSupresion(consentimientoValido(), '2026-09-21');
    plan.suprimir.push('profesional');
    expect(COLECCIONES_SUPRIMIBLES).not.toContain('profesional');
  });
  test('revocar dos veces conserva la fecha de la primera revocacion', () => {
    const primera = revocar(consentimientoValido(), '2026-09-21');
    const segunda = revocar(primera, '2026-10-05');
    expect(segunda.fechaRevocacion).toBe('2026-09-21');
    expect(segunda.revocado).toBe(true);
  });
  test('planificar sobre un consentimiento ya revocado lo declara y no falla', () => {
    const primera = planificarSupresion(consentimientoValido(), '2026-09-21');
    const segunda = planificarSupresion(primera.consentimiento, '2026-10-05');
    expect(segunda.yaEstabaRevocado).toBe(true);
    expect(segunda.consentimiento.fechaRevocacion).toBe('2026-09-21');
    expect(segunda.suprimir).toEqual(COLECCIONES_SUPRIMIBLES);
  });
  test('planificar sin consentimiento es un error de tipo', () => {
    expect(() => planificarSupresion(null, '2026-09-21')).toThrow(TypeError);
  });
});
