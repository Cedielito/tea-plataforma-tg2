'use strict';
const {
  MENSAJES,
  esUrlSegura,
  validarFuentes,
  validarFechaRevision,
  validarPublicacion,
  hoyEnColombia
} = require('../src/dominio/publicacion');

/** Instante expresado en hora de Colombia (UTC-5). */
const enColombia = (fechaHora) => new Date(`${fechaHora}-05:00`);

describe('RCN-01 fuente obligatoria para publicar', () => {
  test('sin fuentes no se publica', () => {
    expect(validarFuentes(undefined)).toEqual([MENSAJES.SIN_FUENTES]);
    expect(validarFuentes(null)).toEqual([MENSAJES.SIN_FUENTES]);
    expect(validarFuentes([])).toEqual([MENSAJES.SIN_FUENTES]);
  });

  test('una fuente sin texto no cuenta como fuente', () => {
    expect(validarFuentes([{ texto: '   ' }])).toEqual([MENSAJES.FUENTE_SIN_TEXTO]);
    expect(validarFuentes([{ url: 'https://www.who.int/' }])).toEqual([MENSAJES.FUENTE_SIN_TEXTO]);
    expect(validarFuentes([null])).toEqual([MENSAJES.FUENTE_SIN_TEXTO]);
  });

  test('el enlace de una fuente debe ser http o https', () => {
    expect(validarFuentes([{ texto: 'OMS', url: 'javascript:alert(1)' }])).toEqual([MENSAJES.FUENTE_URL_INSEGURA]);
  });

  test('repite cada problema una sola vez aunque varias fuentes lo tengan', () => {
    expect(validarFuentes([{ texto: '' }, { texto: '' }])).toEqual([MENSAJES.FUENTE_SIN_TEXTO]);
  });

  test('una fuente sin enlace es valida (un libro como el DSM-5-TR)', () => {
    expect(validarFuentes([{ texto: 'American Psychiatric Association. DSM-5-TR. 2022.' }])).toEqual([]);
    expect(validarFuentes([{ texto: 'DSM-5-TR', url: '' }])).toEqual([]);
    expect(validarFuentes([{ texto: 'DSM-5-TR', url: null }])).toEqual([]);
    expect(validarFuentes([{ texto: 'DSM-5-TR', url: '   ' }])).toEqual([]);
  });

  test('una fuente con texto y enlace https es valida', () => {
    expect(validarFuentes([{ texto: 'OMS. Autismo.', url: 'https://www.who.int/' }])).toEqual([]);
  });
});

describe('RCN-02 fecha de revision obligatoria para publicar', () => {
  const ahora = enColombia('2026-10-06T10:00:00');

  test('sin fecha no se publica', () => {
    for (const vacia of [undefined, null, '']) {
      expect(validarFechaRevision(vacia, ahora)).toEqual([MENSAJES.SIN_FECHA]);
    }
  });

  test('una fecha que no existe se rechaza', () => {
    expect(validarFechaRevision('no es fecha', ahora)).toEqual([MENSAJES.FECHA_INVALIDA]);
    expect(validarFechaRevision(new Date('x'), ahora)).toEqual([MENSAJES.FECHA_INVALIDA]);
  });

  test('una fecha pasada es valida, como texto o como Date', () => {
    expect(validarFechaRevision('2026-09-30', ahora)).toEqual([]);
    expect(validarFechaRevision(new Date('2026-09-30'), ahora)).toEqual([]);
  });

  test('una fecha posterior a hoy se rechaza', () => {
    expect(validarFechaRevision('2026-10-07', ahora)).toEqual([MENSAJES.FECHA_FUTURA]);
    expect(validarFechaRevision('2027-01-01', ahora)).toEqual([MENSAJES.FECHA_FUTURA]);
    expect(validarFechaRevision('+010000-01-01', ahora)).toEqual([MENSAJES.FECHA_FUTURA]);
  });

  test('se compara por dia: la fecha de hoy pasa a cualquier hora del dia en Colombia', () => {
    for (const hora of ['00:00:00', '00:01:00', '12:00:00', '19:00:00', '23:59:59']) {
      expect(validarFechaRevision('2026-10-06', enColombia(`2026-10-06T${hora}`))).toEqual([]);
    }
  });

  test('manana se rechaza aunque en UTC ya sea manana (Colombia es UTC-5)', () => {
    const nocheEnColombia = enColombia('2026-10-06T23:30:00');
    expect(nocheEnColombia.toISOString().slice(0, 10)).toBe('2026-10-07');
    expect(validarFechaRevision('2026-10-07', nocheEnColombia)).toEqual([MENSAJES.FECHA_FUTURA]);
  });

  test('hoyEnColombia usa la zona horaria de Colombia y no la del servidor', () => {
    expect(hoyEnColombia(new Date('2026-10-07T04:59:00Z'))).toBe('2026-10-06');
    expect(hoyEnColombia(new Date('2026-10-07T05:00:00Z'))).toBe('2026-10-07');
  });
});

describe('RCN-01 y RCN-02 validarPublicacion', () => {
  const ahora = enColombia('2026-10-06T10:00:00');
  const completo = { fuentes: [{ texto: 'OMS' }], fechaRevision: '2026-10-01' };

  test('un borrador se puede guardar sin fuentes ni fecha', () => {
    expect(validarPublicacion({ estado: 'borrador' }, ahora)).toEqual([]);
    expect(validarPublicacion({}, ahora)).toEqual([]);
    expect(validarPublicacion(null, ahora)).toEqual([]);
  });

  test('un publicado sin fuentes ni fecha devuelve un error por campo', () => {
    expect(validarPublicacion({ estado: 'publicado' }, ahora)).toEqual([
      { campo: 'fuentes', mensaje: MENSAJES.SIN_FUENTES },
      { campo: 'fechaRevision', mensaje: MENSAJES.SIN_FECHA }
    ]);
  });

  test('un publicado con fuente y fecha pasa', () => {
    expect(validarPublicacion({ ...completo, estado: 'publicado' }, ahora)).toEqual([]);
  });

  test('sin fecha de "ahora" usa la fecha actual', () => {
    expect(validarPublicacion({ ...completo, estado: 'publicado' })).toEqual([]);
  });
});

describe('esUrlSegura', () => {
  test.each(['http://www.icbf.gov.co', 'https://www.minsalud.gov.co/ruta?x=1'])('acepta %s', (url) => {
    expect(esUrlSegura(url)).toBe(true);
  });

  test.each(['javascript:alert(1)', 'data:text/html,hola', 'ftp://x.org', 'no es url', '', '   ', null, 42])(
    'rechaza %p',
    (url) => {
      expect(esUrlSegura(url)).toBe(false);
    }
  );

  test('una ruta del sitio solo se acepta si se permite', () => {
    expect(esUrlSegura('/recursos/guia.pdf')).toBe(false);
    expect(esUrlSegura('/recursos/guia.pdf', { permitirRuta: true })).toBe(true);
  });

  test('una ruta que empieza por // o /\\ se rechaza porque apunta a otro dominio', () => {
    expect(esUrlSegura('//otro.com/guia.pdf', { permitirRuta: true })).toBe(false);
    expect(esUrlSegura('/\\otro.com/guia.pdf', { permitirRuta: true })).toBe(false);
  });
});
