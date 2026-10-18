'use strict';
const { crearServidor } = require('./api/servidor');
const { conectar, MENSAJE_SIN_URI } = require('./datos/conexion');
const { cargarContenidos } = require('./datos/sincronizacionContenidos');
const { cargaEntidades, cargaPasosRuta, cargaPreguntas, cargaRecursos } = require('./datos/sincronizacionListas');
const { prepararAdministradorInicial } = require('./datos/administradorInicial');
const { prepararProfesionalInicial } = require('./datos/profesionalInicial');
const { cuestionarioSus } = require('./datos/cuestionarioSus');
const { paginasFijas } = require('./datos/paginasFijas');
const { prepararSupresionAutomatica } = require('./datos/supresionAutomatica');

/**
 * Preparacion del arranque: conecta, crea el primer administrador y la cuenta
 * del profesional si hace falta (M-08, M-09), carga los textos (M-02), los
 * pasos de la ruta (M-03), el directorio (M-04) y las preguntas frecuentes y
 * los recursos (M-05) de api/contenidos, lee las paginas fijas (M-06) y el
 * cuestionario SUS (M-09) y asegura la supresion automatica de los mensajes
 * de contacto (RS-04). Ni las cuentas ni las cargas detienen el arranque; su
 * resultado queda en el registro.
 *
 * La usan principal() y el servidor de la auditoria de accesibilidad (T10,
 * web/evaluacion/accesibilidad/servidor.js), que la corre sobre una base en
 * memoria.
 *
 * @param {{uri?: string, entorno?: object, registro?: Console}} opciones
 *   uri: sin ella, MONGODB_URI; entorno: de donde salen las cuentas iniciales
 */
async function prepararArranque({ uri, entorno = process.env, registro = console } = {}) {
  await conectar(uri);
  await prepararAdministradorInicial({ entorno, registro });
  await prepararProfesionalInicial({ entorno, registro });
  await cargarContenidos({ registro });
  await cargaPasosRuta.cargar({ registro });
  await cargaEntidades.cargar({ registro });
  await cargaPreguntas.cargar({ registro });
  await cargaRecursos.cargar({ registro });
  await paginasFijas.cargar({ registro });
  await cuestionarioSus.cargar({ registro });
  await prepararSupresionAutomatica({ registro });
}

/**
 * Arranque: prepara los datos y luego escucha, para que una version nueva
 * reciba trafico con los datos ya cargados.
 */
async function principal() {
  await prepararArranque();
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
module.exports = { principal, prepararArranque };
