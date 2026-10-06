'use strict';
const { crearServidor } = require('./api/servidor');
const { conectar, MENSAJE_SIN_URI } = require('./datos/conexion');
const { cargarContenidos } = require('./datos/sincronizacionContenidos');
const { prepararAdministradorInicial } = require('./datos/administradorInicial');

/**
 * Arranque: conecta, crea el primer administrador si hace falta (M-08), carga
 * los textos de api/contenidos (M-02) y luego escucha, para que una version
 * nueva reciba trafico con los textos ya cargados. Ni el administrador ni la
 * carga detienen el arranque; su resultado queda en el registro.
 */
async function principal() {
  await conectar();
  await prepararAdministradorInicial();
  await cargarContenidos();
  const app = crearServidor();
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
