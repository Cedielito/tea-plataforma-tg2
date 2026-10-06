'use strict';
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');
const { crearAdministrador, crearRegistro, crearAppDePrueba } = require('./ayudas/administrador');
const { Administrador } = require('../src/datos/modelos');
const administradores = require('../src/datos/repositorios/administradores');
const { RESULTADOS, prepararAdministradorInicial } = require('../src/datos/administradorInicial');
const { MENSAJES } = require('../src/dominio/autenticacion');

beforeAll(async () => {
  await levantar();
  await Administrador.init();
});
afterEach(limpiar);
afterAll(bajar);

const CLAVE = 'clave inicial suficientemente larga';
const entorno = (cambios = {}) => ({ ADMIN_USUARIO: 'Equipo.TEA', ADMIN_CLAVE: CLAVE, ...cambios });

async function preparar(variables) {
  const registro = crearRegistro();
  const resultado = await prepararAdministradorInicial({ entorno: variables, registro });
  return { resultado, registro, texto: registro.lineas.join('\n') };
}

describe('RS-05 primer administrador desde las variables de entorno', () => {
  test('sin administradores y con las variables, lo crea con la clave cifrada con bcrypt (costo 10)', async () => {
    const { resultado, texto } = await preparar(entorno());
    expect(resultado).toBe(RESULTADOS.CREADO);
    expect(texto).toContain('administrador inicial creado: equipo.tea');

    const guardado = await Administrador.findOne().select('+claveCifrada').lean();
    expect(guardado.usuario).toBe('equipo.tea');
    expect(guardado.claveCifrada).not.toContain(CLAVE);
    expect(bcrypt.getRounds(guardado.claveCifrada)).toBe(10);
    expect(await bcrypt.compare(CLAVE, guardado.claveCifrada)).toBe(true);
  });

  test('con el administrador creado se puede iniciar sesion', async () => {
    await preparar(entorno());
    const { app } = crearAppDePrueba();
    const res = await request(app).post('/api/sesion').send({ usuario: 'equipo.tea', clave: CLAVE });
    expect(res.status).toBe(200);
  });

  test('si ya existe uno no crea otro, y avisa que hay que borrar ADMIN_CLAVE', async () => {
    await crearAdministrador({ usuario: 'existente' });
    const { resultado, registro } = await preparar(entorno());
    expect(resultado).toBe(RESULTADOS.EXISTENTE);
    expect(await Administrador.countDocuments()).toBe(1);
    expect(registro.warn).toHaveBeenCalledWith(expect.stringContaining('Bórrala'));
  });

  test('si ya existe uno y no estan las variables, no escribe nada', async () => {
    await crearAdministrador();
    const { resultado, registro } = await preparar({});
    expect(resultado).toBe(RESULTADOS.EXISTENTE);
    expect(registro.lineas).toEqual([]);
  });

  test('sin variables no crea nada y explica que configurar', async () => {
    const { resultado, texto } = await preparar({ ADMIN_USUARIO: 'equipo.tea' });
    expect(resultado).toBe(RESULTADOS.SIN_VARIABLES);
    expect(texto).toContain('ADMIN_USUARIO y ADMIN_CLAVE');
    expect(await Administrador.countDocuments()).toBe(0);
  });

  test('con una clave corta o un usuario invalido no lo crea', async () => {
    let { resultado, texto } = await preparar(entorno({ ADMIN_CLAVE: 'corta' }));
    expect(resultado).toBe(RESULTADOS.INVALIDO);
    expect(texto).toContain(MENSAJES.CLAVE_CORTA);

    ({ resultado, texto } = await preparar(entorno({ ADMIN_USUARIO: 'con espacios' })));
    expect(resultado).toBe(RESULTADOS.INVALIDO);
    expect(texto).toContain(MENSAJES.USUARIO_INVALIDO);
    expect(await Administrador.countDocuments()).toBe(0);
  });

  test('si falla la base no detiene el arranque', async () => {
    const espia = jest.spyOn(administradores, 'contar').mockRejectedValue(new Error(`falla con ${CLAVE}`));
    try {
      const { resultado, texto } = await preparar(entorno());
      expect(resultado).toBe(RESULTADOS.ERROR);
      expect(texto).toContain('no se pudo preparar el administrador inicial (Error)');
    } finally {
      espia.mockRestore();
    }
  });

  test('si otro arranque lo creo al mismo tiempo, lo da por existente', async () => {
    const espia = jest.spyOn(administradores, 'crear').mockRejectedValue(Object.assign(new Error('E11000'), { code: 11000 }));
    try {
      expect((await preparar(entorno())).resultado).toBe(RESULTADOS.EXISTENTE);
    } finally {
      espia.mockRestore();
    }
  });

  test('el registro nunca muestra la clave, en ningun caso', async () => {
    const claves = [CLAVE, 'corta', 'x'.repeat(80)];
    const casos = [
      () => preparar(entorno({ ADMIN_CLAVE: claves[1] })),
      () => preparar(entorno({ ADMIN_CLAVE: claves[2] })),
      () => preparar(entorno()),
      () => preparar(entorno())
    ];
    for (const caso of casos) {
      const { texto } = await caso();
      for (const clave of claves) expect(texto).not.toContain(clave);
    }
  });
});
