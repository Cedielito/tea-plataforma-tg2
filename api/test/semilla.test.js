'use strict';
const mongoose = require('mongoose');
const request = require('supertest');
const { levantar, limpiar, bajar, uri } = require('./ayudas/baseEnMemoria');
const { crearServidor } = require('../src/api/servidor');
const { Contenido } = require('../src/datos/modelos');
const { CONTENIDOS_DE_EJEMPLO, sembrar, principal } = require('../src/datos/semilla');

beforeAll(levantar);
afterAll(bajar);

describe('RCN-01 y RCN-02 semilla de contenidos de ejemplo en borrador', () => {
  afterEach(limpiar);

  test('crea los 2 contenidos de ejemplo, ambos en borrador', async () => {
    const resultado = await sembrar();
    expect(resultado).toEqual({ creados: ['que-es-el-tea', 'senales-de-alerta-4-a-7-anos'], omitidos: [] });
    const guardados = await Contenido.find().lean();
    expect(guardados).toHaveLength(2);
    expect(guardados.every((c) => c.estado === 'borrador')).toBe(true);
  });

  test('un ejemplo trae fuente y el otro no, porque un borrador puede guardarse sin ella', async () => {
    await sembrar();
    const [s1, s2] = await Promise.all(CONTENIDOS_DE_EJEMPLO.map(({ slug }) => Contenido.findOne({ slug })));
    expect(s1.fuentes).toHaveLength(1);
    expect(s2.fuentes).toHaveLength(0);
    expect(s2.fechaRevision).toBeNull();
  });

  test('nada de la semilla queda visible en la API publica', async () => {
    await sembrar();
    const res = await request(crearServidor()).get('/api/contenidos');
    expect(res.body).toEqual([]);
  });

  test('si se corre dos veces no duplica ni sobrescribe lo que ya existe', async () => {
    await sembrar();
    const editado = await Contenido.findOne({ slug: 'que-es-el-tea' });
    editado.cuerpo = 'Texto revisado por el equipo.';
    await editado.save();

    expect(await sembrar()).toEqual({ creados: [], omitidos: ['que-es-el-tea', 'senales-de-alerta-4-a-7-anos'] });
    expect(await Contenido.countDocuments()).toBe(2);
    expect((await Contenido.findOne({ slug: 'que-es-el-tea' })).cuerpo).toBe('Texto revisado por el equipo.');
  });
});

describe('Script de semilla (npm run seed:api)', () => {
  test('conecta, siembra, informa y cierra la conexion', async () => {
    const destino = uri();
    await mongoose.disconnect();
    const registro = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await principal(destino);
      expect(registro).toHaveBeenCalledWith('Contenidos de ejemplo creados en borrador: 2. Ya existían: 0.');
      expect(mongoose.connection.readyState).toBe(0);
    } finally {
      registro.mockRestore();
    }
  });
});
