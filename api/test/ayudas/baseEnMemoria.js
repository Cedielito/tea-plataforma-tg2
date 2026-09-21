'use strict';
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { COLECCIONES } = require('../../src/datos/modelos');
const { conectar } = require('../../src/datos/conexion');

/**
 * Base de datos en memoria para las pruebas de la capa de datos. CT-11
 *
 * Una sola instancia por archivo de pruebas: Jest aisla los modulos por
 * archivo, asi que levantar mongod mas de una vez por suite solo haria lento
 * el CI. Si en el futuro hace falta una segunda suite con base real, conviene
 * mover `levantar` a un globalSetup y pasar el URI por process.env.
 */

let servidor = null;

async function levantar() {
  if (!servidor) {
    servidor = await MongoMemoryServer.create();
    await conectar(servidor.getUri('tea_pruebas'));
  }
  return mongoose.connection;
}

/**
 * Deja las colecciones vacias entre pruebas. Se borran los documentos y no la
 * base completa: `dropDatabase` se llevaria los indices, y hay pruebas que
 * dependen del indice unico de participante.uuid.
 */
async function limpiar() {
  const db = mongoose.connection.db;
  if (!db) return;
  await Promise.all(COLECCIONES.map((c) => db.collection(c).deleteMany({})));
}

async function bajar() {
  await mongoose.disconnect();
  if (servidor) await servidor.stop();
  servidor = null;
}

module.exports = { levantar, limpiar, bajar };
