'use strict';
const bcrypt = require('bcryptjs');
const {
  COSTO_BCRYPT,
  MS_INACTIVIDAD,
  MS_DURACION_MAXIMA,
  MAXIMO_SESIONES,
  HASH_FICTICIO,
  MENSAJES,
  normalizarUsuario,
  leerCredenciales,
  validarCredencialesNuevas,
  cifrarClave,
  compararClave,
  generarToken,
  esTokenConFormato,
  hashToken,
  sesionVigente,
  sesionesQueSeConservan
} = require('../src/dominio/autenticacion');

const INICIO = new Date('2026-10-01T15:00:00Z');
const despues = (ms) => new Date(INICIO.getTime() + ms);
const MINUTO = 60 * 1000;

describe('RS-05 contrasena cifrada con bcrypt', () => {
  test('el costo es 10, el minimo que recomienda OWASP', async () => {
    expect(COSTO_BCRYPT).toBe(10);
    const hash = await cifrarClave('una clave larga de prueba');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(bcrypt.getRounds(hash)).toBe(10);
  });

  test('el hash no contiene la clave y cambia en cada cifrado (sal)', async () => {
    const clave = 'una clave larga de prueba';
    const [a, b] = await Promise.all([cifrarClave(clave, 4), cifrarClave(clave, 4)]);
    expect(a).not.toContain(clave);
    expect(a).not.toBe(b);
  });

  test('compararClave acepta la clave correcta y rechaza otra', async () => {
    const hash = await cifrarClave('una clave larga de prueba', 4);
    expect(await compararClave('una clave larga de prueba', hash)).toBe(true);
    expect(await compararClave('otra clave larga de prueba', hash)).toBe(false);
  });

  test('sin hash (usuario inexistente) compara contra el hash ficticio y responde que no', async () => {
    expect(bcrypt.getRounds(HASH_FICTICIO)).toBe(COSTO_BCRYPT);
    expect(await compararClave('cualquier clave larga', null)).toBe(false);
    expect(await compararClave('cualquier clave larga', undefined)).toBe(false);
  });

  test('una clave de mas de 72 bytes nunca coincide (bcrypt la recortaria)', async () => {
    const base = 'a'.repeat(72);
    const hash = await cifrarClave(base, 4);
    expect(await compararClave(base, hash)).toBe(true);
    expect(await compararClave(`${base}b`, hash)).toBe(false);
  });
});

describe('RS-05 credenciales del inicio de sesion', () => {
  test('lee usuario y clave, y normaliza el usuario', () => {
    expect(leerCredenciales({ usuario: '  Equipo.TEA ', clave: ' con espacios ' })).toEqual({
      usuario: 'equipo.tea',
      clave: ' con espacios '
    });
  });

  test.each([
    [undefined],
    [null],
    ['texto'],
    [{}],
    [{ usuario: 'equipo' }],
    [{ usuario: '', clave: 'x' }],
    [{ usuario: '   ', clave: 'x' }],
    [{ usuario: 'equipo', clave: '' }],
    [{ usuario: { $gt: '' }, clave: 'x' }],
    [{ usuario: 'equipo', clave: { $ne: null } }],
    [{ usuario: ['equipo'], clave: 'x' }]
  ])('rechaza %p sin llegar a la base', (cuerpo) => {
    expect(leerCredenciales(cuerpo)).toEqual({ error: MENSAJES.CREDENCIALES_INCOMPLETAS });
  });

  test('un usuario muy largo se recorta: no puede existir y acota la memoria del limite', () => {
    const { usuario } = leerCredenciales({ usuario: 'a'.repeat(500), clave: 'x' });
    expect(usuario).toHaveLength(41);
  });

  test('normalizarUsuario devuelve vacio si no es texto', () => {
    expect(normalizarUsuario(undefined)).toBe('');
    expect(normalizarUsuario(' Ana ')).toBe('ana');
  });
});

describe('RS-05 reglas para crear un administrador', () => {
  test('acepta un usuario valido y una clave de 12 caracteres o mas', () => {
    expect(validarCredencialesNuevas('equipo.tea', 'doce-letras!')).toEqual([]);
    expect(validarCredencialesNuevas('Equipo_TEA-2', 'clave suficientemente larga')).toEqual([]);
  });

  test.each(['ab', 'con espacio', 'ñandú', 'a'.repeat(41), '', undefined])('rechaza el usuario %p', (usuario) => {
    expect(validarCredencialesNuevas(usuario, 'clave suficientemente larga')).toEqual([MENSAJES.USUARIO_INVALIDO]);
  });

  test('rechaza una clave corta o de mas de 72 bytes', () => {
    expect(validarCredencialesNuevas('equipo', 'corta')).toEqual([MENSAJES.CLAVE_CORTA]);
    expect(validarCredencialesNuevas('equipo', undefined)).toEqual([MENSAJES.CLAVE_CORTA]);
    expect(validarCredencialesNuevas('equipo', 'a'.repeat(73))).toEqual([MENSAJES.CLAVE_LARGA]);
    // 37 «ñ» son 37 caracteres pero 74 bytes
    expect(validarCredencialesNuevas('equipo', 'ñ'.repeat(37))).toEqual([MENSAJES.CLAVE_LARGA]);
  });

  test('los mensajes no repiten la clave', () => {
    const clave = 'x'.repeat(80);
    expect(validarCredencialesNuevas('ab', clave).join(' ')).not.toContain(clave);
  });
});

describe('RS-05 token de sesion', () => {
  test('es aleatorio, de 43 caracteres base64url, y en la base solo va su hash', () => {
    const token = generarToken();
    expect(esTokenConFormato(token)).toBe(true);
    expect(generarToken()).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });

  test.each([undefined, '', 'corto', 'x'.repeat(43) + '=', '!'.repeat(43), { token: 'x' }])(
    'rechaza un token con formato invalido: %p',
    (token) => {
      expect(esTokenConFormato(token)).toBe(false);
    }
  );
});

describe('RS-05 la sesion expira por inactividad (30 minutos) y dura como maximo 8 horas', () => {
  const sesion = { creadaEn: INICIO, ultimaActividad: INICIO };

  test('sigue abierta antes de los 30 minutos sin actividad', () => {
    expect(sesionVigente(sesion, despues(MS_INACTIVIDAD - 1000))).toBe(true);
  });

  test('vence a los 30 minutos sin actividad', () => {
    expect(MS_INACTIVIDAD).toBe(30 * MINUTO);
    expect(sesionVigente(sesion, despues(MS_INACTIVIDAD))).toBe(false);
  });

  test('la actividad reciente la mantiene abierta', () => {
    const activa = { creadaEn: INICIO, ultimaActividad: despues(4 * 60 * MINUTO) };
    expect(sesionVigente(activa, despues(4 * 60 * MINUTO + 29 * MINUTO))).toBe(true);
  });

  test('vence a las 8 horas aunque tenga actividad reciente', () => {
    expect(MS_DURACION_MAXIMA).toBe(8 * 60 * MINUTO);
    const activa = { creadaEn: INICIO, ultimaActividad: despues(MS_DURACION_MAXIMA - MINUTO) };
    expect(sesionVigente(activa, despues(MS_DURACION_MAXIMA - 1000))).toBe(true);
    expect(sesionVigente(activa, despues(MS_DURACION_MAXIMA))).toBe(false);
  });

  test('sin sesion o con fechas invalidas no hay sesion', () => {
    expect(sesionVigente(null, INICIO)).toBe(false);
    expect(sesionVigente({ creadaEn: 'x', ultimaActividad: 'y' }, INICIO)).toBe(false);
  });
});

describe('RS-05 como maximo 5 sesiones por administrador', () => {
  const sesion = (minutos, creadaHaceHoras = 0) => ({
    tokenHash: `s${minutos}`,
    creadaEn: despues(-creadaHaceHoras * 60 * MINUTO),
    ultimaActividad: despues(-minutos * MINUTO)
  });

  test('descarta las vencidas y deja lugar para la nueva', () => {
    const sesiones = [sesion(5), sesion(45), sesion(10), sesion(1, 9)];
    expect(sesionesQueSeConservan(sesiones, INICIO).map((s) => s.tokenHash)).toEqual(['s5', 's10']);
  });

  test('conserva las 4 mas recientes para que con la nueva sean 5', () => {
    const sesiones = [1, 2, 3, 4, 5, 6].map((m) => sesion(m));
    const conservadas = sesionesQueSeConservan(sesiones, INICIO);
    expect(conservadas.map((s) => s.tokenHash)).toEqual(['s1', 's2', 's3', 's4']);
    expect(conservadas).toHaveLength(MAXIMO_SESIONES - 1);
  });

  test('sin sesiones devuelve una lista vacia', () => {
    expect(sesionesQueSeConservan(undefined, INICIO)).toEqual([]);
  });
});
