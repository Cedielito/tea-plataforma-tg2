'use strict';
const { crearServidor } = require('./api/servidor');
const { conectar, MENSAJE_SIN_URI } = require('./datos/conexion');

async function principal() {
  await conectar();
  const repositorio = require('./datos/repositorio');
  const app = crearServidor(repositorio);
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, () => console.log('API en el puerto ' + puerto));
}

/** Un error de configuracion se muestra como mensaje, no como traza. */
if (require.main === module) {
  principal().catch((e) => {
    console.error(e.message === MENSAJE_SIN_URI ? e.message : e);
    process.exit(1);
  });
}
module.exports = { principal };
