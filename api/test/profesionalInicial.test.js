'use strict';
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { crearAdministrador, crearProfesional, crearRegistro, crearAppDePrueba } = require('./ayudas/administrador');
const { Administrador } = require('../src/datos/modelos');
const administradores = require('../src/datos/repositorios/administradores');
const { RESULTADOS, prepararProfesionalInicial } = require('../src/datos/profesionalInicial');
const { RESULTADOS: RESULTADOS_ADMIN, prepararAdministradorInicial } = require('../src/datos/administradorInicial');
const { MENSAJES } = require('../src/dominio/autenticacion');

beforeAll(async () => {
  await levantar();
  await Administrador.init();
});
afterEach(limpiar);
afterAll(bajar);

const CLAVE = 'clave del profesional suficientemente larga';
const entorno = (cambios = {}) => ({ PROFESIONAL_USUARIO: 'Psicologa.Uno', PROFESIONAL_CLAVE: CLAVE, ...cambios });

async function preparar(variables) {
  const registro = crearRegistro();
  const resultado = await prepararProfesionalInicial({ entorno: variables, registro });
  return { resultado, registro, texto: registro.lineas.join('\n') };
}

describe('RS-05 cuenta del profesional desde las variables de entorno', () => {
  test('la crea con rol profesional y la clave cifrada con bcrypt (costo 10)', async () => {
    const { resultado, texto } = await preparar(entorno());
    expect(resultado).toBe(RESULTADOS.CREADO);
    expect(texto).toContain('cuenta creada: psicologa.uno');

    const guardada = await Administrador.findOne().select('+claveCifrada').lean();
    expect(guardada).toMatchObject({ usuario: 'psicologa.uno', rol: 'profesional' });
    expect(bcrypt.getRounds(guardada.claveCifrada)).toBe(10);
    expect(await bcrypt.compare(CLAVE, guardada.claveCifrada)).toBe(true);
  });

  test('con la cuenta creada se inicia sesion y la API responde el rol', async () => {
    await preparar(entorno());
    const { app } = crearAppDePrueba();
    const res = await request(app).post('/api/sesion').send({ usuario: 'psicologa.uno', clave: CLAVE });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ usuario: 'psicologa.uno', rol: 'profesional' });
  });

  test('se crea aunque ya exista un administrador, y no impide crear al administrador', async () => {
    await crearAdministrador();
    expect((await preparar(entorno())).resultado).toBe(RESULTADOS.CREADO);
    expect(await Administrador.countDocuments()).toBe(2);

    await Administrador.deleteMany({ rol: { $ne: 'profesional' } });
    const registro = crearRegistro();
    const admin = await prepararAdministradorInicial({
      entorno: { ADMIN_USUARIO: 'equipo.nuevo', ADMIN_CLAVE: 'clave inicial suficientemente larga' },
      registro
    });
    expect(admin).toBe(RESULTADOS_ADMIN.CREADO);
  });

  test('si ya existe, no crea otra y avisa que hay que borrar PROFESIONAL_CLAVE', async () => {
    await crearProfesional({ usuario: 'psicologa.uno' });
    const { resultado, registro } = await preparar(entorno());
    expect(resultado).toBe(RESULTADOS.EXISTENTE);
    expect(await Administrador.countDocuments()).toBe(1);
    expect(registro.warn).toHaveBeenCalledWith(expect.stringContaining('Bórrala'));
  });

  test('si el usuario es de un administrador, no lo convierte en profesional', async () => {
    await crearAdministrador({ usuario: 'psicologa.uno' });
    const { resultado, texto } = await preparar(entorno());
    expect(resultado).toBe(RESULTADOS.INVALIDO);
    expect(texto).toContain('ya es una cuenta de administrador');
    expect((await Administrador.findOne().lean()).rol).toBe('administrador');
  });

  test('sin variables no crea nada; avisa solo si no hay ningun profesional', async () => {
    let { resultado, texto } = await preparar({});
    expect(resultado).toBe(RESULTADOS.SIN_VARIABLES);
    expect(texto).toContain('PROFESIONAL_USUARIO y PROFESIONAL_CLAVE');

    await crearProfesional();
    ({ resultado, texto } = await preparar({}));
    expect(resultado).toBe(RESULTADOS.SIN_VARIABLES);
    expect(texto).toBe('');
  });

  test('con una sola variable avisa que falta la otra', async () => {
    const { resultado, texto } = await preparar({ PROFESIONAL_USUARIO: 'psicologa.uno' });
    expect(resultado).toBe(RESULTADOS.SIN_VARIABLES);
    expect(texto).toContain('faltan');
    expect(await Administrador.countDocuments()).toBe(0);
  });

  test('con una clave corta no la crea', async () => {
    const { resultado, texto } = await preparar(entorno({ PROFESIONAL_CLAVE: 'corta' }));
    expect(resultado).toBe(RESULTADOS.INVALIDO);
    expect(texto).toContain(MENSAJES.CLAVE_CORTA);
  });

  test('si falla la base no detiene el arranque y el registro nunca muestra la clave', async () => {
    const espia = jest.spyOn(administradores, 'buscarPorUsuario').mockRejectedValue(new Error(`falla con ${CLAVE}`));
    try {
      const { resultado, texto } = await preparar(entorno());
      expect(resultado).toBe(RESULTADOS.ERROR);
      expect(texto).not.toContain(CLAVE);
    } finally {
      espia.mockRestore();
    }
    for (const variables of [entorno(), entorno(), entorno({ PROFESIONAL_CLAVE: 'corta' })]) {
      const { texto } = await preparar(variables);
      expect(texto).not.toContain(CLAVE);
      expect(texto).not.toContain('corta');
    }
  });

  test('si otro arranque la creo al mismo tiempo, la da por existente', async () => {
    const espia = jest.spyOn(administradores, 'crear').mockRejectedValue(Object.assign(new Error('E11000'), { code: 11000 }));
    try {
      expect((await preparar(entorno())).resultado).toBe(RESULTADOS.EXISTENTE);
    } finally {
      espia.mockRestore();
    }
  });
});
