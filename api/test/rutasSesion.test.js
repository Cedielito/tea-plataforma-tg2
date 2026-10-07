'use strict';
const request = require('supertest');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const {
  USUARIO,
  CLAVE,
  INICIO,
  crearAdministrador,
  crearAppDePrueba,
  iniciarSesion,
  cookieDeSesion
} = require('./ayudas/administrador');
const { Administrador, Contenido } = require('../src/datos/modelos');
const { JSON_INVALIDO } = require('../src/api/servidor');
const { MENSAJES, hashToken } = require('../src/dominio/autenticacion');
const { MENSAJES: MENSAJES_LIMITE } = require('../src/dominio/limiteIntentos');

beforeAll(async () => {
  await levantar();
  await Promise.all([Administrador.init(), Contenido.init()]);
});
afterEach(limpiar);
afterAll(bajar);

/** Token de la cookie `sesion_admin=<token>; Path=...`. */
const tokenDe = (respuesta) => cookieDeSesion(respuesta).split(';')[0].split('=')[1];
const buscarAdministrador = () => Administrador.findOne({ usuario: USUARIO }).lean();

let app;
let reloj;
let registro;
let agente;
beforeEach(async () => {
  ({ app, reloj, registro } = crearAppDePrueba());
  agente = request.agent(app);
  await crearAdministrador();
});

describe('RS-05 toda ruta /api/admin exige sesion', () => {
  const RUTAS = [
    ['get', '/api/admin'],
    ['get', '/api/admin/sesion'],
    ['delete', '/api/admin/sesion'],
    ['get', '/api/admin/contenidos'],
    ['post', '/api/admin/contenidos'],
    ['get', '/api/admin/contenidos/66f000000000000000000000'],
    ['patch', '/api/admin/contenidos/66f000000000000000000000'],
    ['put', '/api/admin/contenidos/66f000000000000000000000'],
    ['delete', '/api/admin/contenidos/66f000000000000000000000'],
    ['get', '/api/admin/pasos-ruta'],
    ['post', '/api/admin/pasos-ruta'],
    ['get', '/api/admin/pasos-ruta/66f000000000000000000000'],
    ['patch', '/api/admin/pasos-ruta/66f000000000000000000000'],
    ['get', '/api/admin/ruta-que-no-existe']
  ];

  test.each(RUTAS)('%s %s responde 401 sin cookie', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta).send({ titulo: 'x' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: MENSAJES.SIN_SESION });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test.each(RUTAS)('%s %s responde 401 con una cookie inventada', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta).set('Cookie', `sesion_admin=${'a'.repeat(43)}`);
    expect(res.status).toBe(401);
  });

  test('sin sesion no se crea ningun contenido', async () => {
    await request(app).post('/api/admin/contenidos').send({ titulo: 'x', seccion: 'S1', cuerpo: 'x' });
    expect(await Contenido.countDocuments()).toBe(0);
  });

  test('con sesion, una ruta que no existe responde 404', async () => {
    await iniciarSesion(agente);
    expect((await agente.get('/api/admin/ruta-que-no-existe')).status).toBe(404);
  });
});

describe('RF-09 inicio de sesion', () => {
  test('con usuario y clave correctos entrega la cookie de sesion', async () => {
    const res = await iniciarSesion(agente);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ usuario: USUARIO });
    expect(res.headers['cache-control']).toBe('no-store');

    const cookie = cookieDeSesion(res);
    expect(cookie).toMatch(/; HttpOnly/);
    expect(cookie).toMatch(/; SameSite=Strict/);
    expect(cookie).toMatch(/; Path=\/api\/admin(;|$)/);
    expect(cookie).not.toMatch(/; Secure/);
    // Sin Max-Age ni Expires: el navegador la borra al cerrarse.
    expect(cookie).not.toMatch(/Max-Age|Expires/);

    const sesion = await agente.get('/api/admin/sesion');
    expect(sesion.status).toBe(200);
    expect(sesion.body).toEqual({ usuario: USUARIO });
  });

  test('en produccion la cookie lleva Secure', async () => {
    const produccion = crearAppDePrueba({ produccion: true });
    const res = await iniciarSesion(request(produccion.app));
    expect(res.status).toBe(200);
    expect(cookieDeSesion(res)).toMatch(/; Secure/);
  });

  test('el usuario no distingue mayusculas ni espacios alrededor', async () => {
    const res = await iniciarSesion(agente, { usuario: `  ${USUARIO.toUpperCase()} ` });
    expect(res.status).toBe(200);
  });

  test('la base guarda el hash del token, no el token, y la fecha del ultimo acceso', async () => {
    const token = tokenDe(await iniciarSesion(agente));
    const administrador = await buscarAdministrador();
    expect(administrador.fechaUltimoAcceso).toEqual(INICIO);
    expect(administrador.sesiones).toEqual([{ tokenHash: hashToken(token), creadaEn: INICIO, ultimaActividad: INICIO }]);
    expect(JSON.stringify(administrador)).not.toContain(token);
    expect(JSON.stringify(administrador)).not.toContain(CLAVE);
  });

  test('con la clave incorrecta responde 401 sin cookie', async () => {
    const res = await iniciarSesion(agente, { clave: 'otra clave cualquiera' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: MENSAJES.CREDENCIALES_INCORRECTAS });
    expect(cookieDeSesion(res)).toBeNull();
    expect((await buscarAdministrador()).sesiones).toEqual([]);
  });

  test('un usuario que no existe recibe la misma respuesta que una clave incorrecta', async () => {
    const res = await iniciarSesion(agente, { usuario: 'no.existe' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: MENSAJES.CREDENCIALES_INCORRECTAS });
  });

  test.each([{}, { usuario: USUARIO }, { usuario: { $gt: '' }, clave: { $gt: '' } }])(
    'un cuerpo incompleto o con objetos responde 400: %p',
    async (cuerpo) => {
      const res = await agente.post('/api/sesion').send(cuerpo);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: MENSAJES.CREDENCIALES_INCOMPLETAS });
    }
  );

  test('un JSON mal formado responde 400 sin repetir lo enviado', async () => {
    const res = await agente
      .post('/api/sesion')
      .set('Content-Type', 'application/json')
      .send(`{"usuario":"${USUARIO}","clave":"${CLAVE}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: JSON_INVALIDO });
    expect(res.text).not.toContain(CLAVE);
  });

  test('las respuestas nunca incluyen la clave cifrada ni las sesiones', async () => {
    const res = await iniciarSesion(agente);
    const sesion = await agente.get('/api/admin/sesion');
    for (const cuerpo of [res.text, sesion.text]) {
      expect(cuerpo).not.toMatch(/claveCifrada|sesiones|tokenHash|\$2[aby]\$/);
    }
  });

  test('deja en el registro cuanto tardo la primera comparacion, una sola vez', async () => {
    await iniciarSesion(agente, { clave: 'otra clave cualquiera' });
    await iniciarSesion(agente);
    const medidas = registro.lineas.filter((linea) => linea.includes('primera comparación'));
    expect(medidas).toHaveLength(1);
    expect(medidas[0]).toMatch(/tardó \d+ ms \(bcrypt, costo 10\)/);
  });
});

describe('RS-05 la sesion expira tras 30 minutos de inactividad', () => {
  test('cada peticion renueva el plazo; a los 30 minutos sin actividad vence', async () => {
    await iniciarSesion(agente);
    reloj.avanzar(29);
    expect((await agente.get('/api/admin/sesion')).status).toBe(200);
    reloj.avanzar(29);
    expect((await agente.get('/api/admin/sesion')).status).toBe(200);

    reloj.avanzar(30);
    const vencida = await agente.get('/api/admin/sesion');
    expect(vencida.status).toBe(401);
    expect(vencida.body).toEqual({ error: MENSAJES.SIN_SESION });
    // La cookie se borra en el navegador y la sesion en la base.
    expect(cookieDeSesion(vencida)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await buscarAdministrador()).sesiones).toEqual([]);
  });

  test('la ultima actividad queda en la base', async () => {
    await iniciarSesion(agente);
    reloj.avanzar(10);
    await agente.get('/api/admin/contenidos');
    const [sesion] = (await buscarAdministrador()).sesiones;
    expect(sesion.ultimaActividad).toEqual(reloj.ahora);
    expect(sesion.creadaEn).toEqual(INICIO);
  });

  test('ninguna sesion dura mas de 8 horas, aunque tenga actividad', async () => {
    await iniciarSesion(agente);
    for (let minutos = 25; minutos < 8 * 60; minutos += 25) {
      reloj.avanzar(25);
      expect((await agente.get('/api/admin/sesion')).status).toBe(200);
    }
    reloj.avanzar(25);
    expect((await agente.get('/api/admin/sesion')).status).toBe(401);
  });
});

describe('RS-05 cierre de sesion', () => {
  test('borra la sesion de la base: la cookie copiada deja de servir', async () => {
    const token = tokenDe(await iniciarSesion(agente));
    const res = await agente.delete('/api/admin/sesion');
    expect(res.status).toBe(204);
    expect(cookieDeSesion(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await buscarAdministrador()).sesiones).toEqual([]);

    const copiada = await request(app).get('/api/admin/sesion').set('Cookie', `sesion_admin=${token}`);
    expect(copiada.status).toBe(401);
  });

  test('cerrar una sesion no cierra las demas del mismo administrador', async () => {
    const otroAgente = request.agent(app);
    await iniciarSesion(agente);
    await iniciarSesion(otroAgente);
    await agente.delete('/api/admin/sesion');
    expect((await otroAgente.get('/api/admin/sesion')).status).toBe(200);
  });
});

describe('RS-05 como maximo 5 sesiones por administrador', () => {
  test('al iniciar sesion borra las vencidas y conserva las 5 mas recientes', async () => {
    const tokens = [];
    for (let i = 0; i < 7; i += 1) {
      tokens.push(tokenDe(await iniciarSesion(request(app))));
      reloj.avanzar(1);
    }
    const { sesiones } = await buscarAdministrador();
    expect(sesiones).toHaveLength(5);
    expect(sesiones.map((s) => s.tokenHash).sort()).toEqual(tokens.slice(2).map(hashToken).sort());

    const conToken = (token) => request(app).get('/api/admin/sesion').set('Cookie', `sesion_admin=${token}`);
    expect((await conToken(tokens[0])).status).toBe(401);
    expect((await conToken(tokens[6])).status).toBe(200);
  });

  test('las sesiones vencidas se descartan al abrir una nueva', async () => {
    await iniciarSesion(request(app));
    await iniciarSesion(request(app));
    reloj.avanzar(31);
    await iniciarSesion(request(app));
    expect((await buscarAdministrador()).sesiones).toHaveLength(1);
  });
});

describe('RS-05 bloqueo por intentos fallidos', () => {
  const fallar = () => iniciarSesion(agente, { clave: 'clave equivocada de prueba' });

  test('el quinto fallo bloquea el usuario 15 minutos, incluso con la clave correcta', async () => {
    for (let i = 0; i < 4; i += 1) expect((await fallar()).status).toBe(401);

    const quinto = await fallar();
    expect(quinto.status).toBe(429);
    expect(quinto.body).toEqual({ error: MENSAJES_LIMITE.USUARIO_BLOQUEADO });
    expect(quinto.headers['retry-after']).toBe('900');

    const correcta = await iniciarSesion(agente);
    expect(correcta.status).toBe(429);
    expect(cookieDeSesion(correcta)).toBeNull();

    reloj.avanzar(15);
    expect((await iniciarSesion(agente)).status).toBe(200);
  });

  test('un usuario bloqueado no bloquea a otro', async () => {
    await crearAdministrador({ usuario: 'otra.persona' });
    for (let i = 0; i < 5; i += 1) await fallar();
    expect((await iniciarSesion(agente, { usuario: 'otra.persona' })).status).toBe(200);
  });

  test('tambien cuenta para usuarios que no existen, sin revelar cuales existen', async () => {
    for (let i = 0; i < 4; i += 1) expect((await iniciarSesion(agente, { usuario: 'no.existe' })).status).toBe(401);
    expect((await iniciarSesion(agente, { usuario: 'no.existe' })).status).toBe(429);
  });

  test('intentos en paralelo con el mismo usuario no superan los 5 fallos', async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 12 }, () => request(app).post('/api/sesion').send({ usuario: 'no.existe', clave: 'x' }))
    );
    const estados = respuestas.map((r) => r.status);
    expect(estados.filter((estado) => estado === 401).length).toBeLessThanOrEqual(4);
    expect(estados.every((estado) => estado === 401 || estado === 429)).toBe(true);
    const enCurso = respuestas.find((r) => r.body.error === MENSAJES_LIMITE.INTENTO_EN_CURSO);
    expect(enCurso).toBeDefined();
    expect(enCurso.headers['retry-after']).toBe('1');
  });

  test('un inicio de sesion correcto reinicia el conteo', async () => {
    for (let i = 0; i < 4; i += 1) await fallar();
    expect((await iniciarSesion(agente)).status).toBe(200);
    for (let i = 0; i < 4; i += 1) expect((await fallar()).status).toBe(401);
  });
});

describe('RS-05 limite global de intentos de inicio de sesion', () => {
  test('mas de 20 intentos en un minuto responden 429, aunque sean de usuarios distintos', async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await request(app).post('/api/sesion').send({ usuario: `usuario.${i}` });
      expect(res.status).toBe(400);
    }
    const res = await iniciarSesion(agente);
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: MENSAJES_LIMITE.DEMASIADOS_INTENTOS });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);

    reloj.avanzar(1);
    expect((await iniciarSesion(agente)).status).toBe(200);
  });
});

describe('RS-05 el registro nunca muestra la clave, el token ni la cookie', () => {
  test('en inicios de sesion correctos, fallidos, bloqueados y cierres', async () => {
    const token = tokenDe(await iniciarSesion(agente));
    await agente.get('/api/admin/sesion');
    await agente.delete('/api/admin/sesion');
    for (let i = 0; i < 6; i += 1) await iniciarSesion(agente, { clave: `${CLAVE}-${i}` });

    const todo = registro.lineas.join('\n');
    expect(todo).not.toContain(CLAVE);
    expect(todo).not.toContain(token);
    expect(todo).not.toContain('sesion_admin');
  });
});
