'use strict';
const mongoose = require('mongoose');

async function conectar(uri) {
  const destino = uri || process.env.MONGODB_URI;
  if (!destino) throw new Error('MONGODB_URI no configurado');
  await mongoose.connect(destino);
  return mongoose.connection;
}

module.exports = { conectar };
