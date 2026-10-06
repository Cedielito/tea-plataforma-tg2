'use strict';
const mongoose = require('mongoose');
const { conectar, MENSAJE_SIN_URI } = require('../src/datos/conexion');
const { levantar, limpiar, bajar } = require('./ayudas/baseEnMemoria');

describe('Conexion a MongoDB', () => {
  test('sin MONGODB_URI falla con un mensaje que explica que hacer', async () => {
    const anterior = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      await expect(conectar()).rejects.toThrow(MENSAJE_SIN_URI);
    } finally {
      if (anterior !== undefined) process.env.MONGODB_URI = anterior;
    }
  });

  describe('con una base en memoria', () => {
    beforeAll(levantar);
    afterEach(limpiar);
    afterAll(bajar);

    test('conecta y la base responde', async () => {
      expect(mongoose.connection.readyState).toBe(1);
      const ping = await mongoose.connection.db.admin().ping();
      expect(ping.ok).toBe(1);
    });
  });
});
