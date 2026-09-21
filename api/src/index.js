'use strict';
const { crearServidor } = require('./api/servidor');
const { conectar } = require('./datos/conexion');

async function principal() {
  await conectar();
  const repositorio = require('./datos/repositorio');
  const app = crearServidor(repositorio);
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, () => console.log('API en el puerto ' + puerto));
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
module.exports = { principal };
