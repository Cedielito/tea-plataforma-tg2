'use strict';
const mongoose = require('mongoose');

/** Capa de datos: apertura de la conexion unica a MongoDB. CT-11 */

const MENSAJE_SIN_URI = [
  'MONGODB_URI no esta configurado.',
  'Copia api/.env.example como api/.env y completa la cadena de conexion.',
  'api/.env nunca se sube al repositorio.'
].join(' ');

async function conectar(uri) {
  const destino = uri || process.env.MONGODB_URI;
  if (!destino) throw new Error(MENSAJE_SIN_URI);
  await mongoose.connect(destino);
  return mongoose.connection;
}

module.exports = { conectar, MENSAJE_SIN_URI };
