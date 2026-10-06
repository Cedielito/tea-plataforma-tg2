'use strict';
const administradores = require('./repositorios/administradores');
const { normalizarUsuario, validarCredencialesNuevas, cifrarClave } = require('../dominio/autenticacion');

/**
 * Primer administrador del panel, sin consola ni registro publico. M-08, RF-09, RS-05
 *
 * Render gratuito no da consola, asi que al arrancar la API:
 * - si no hay ningun administrador y estan ADMIN_USUARIO y ADMIN_CLAVE, lo
 *   crea con la clave cifrada (bcrypt);
 * - si ya hay uno, no hace nada; si ADMIN_CLAVE sigue configurada, avisa que
 *   hay que borrarla de Render.
 *
 * Nunca detiene el arranque y nunca escribe la clave en el registro, ni
 * siquiera en los mensajes de error: los mensajes son fijos.
 * Pasos en docs/despliegue.md.
 */

const RESULTADOS = Object.freeze({
  CREADO: 'creado',
  EXISTENTE: 'existente',
  SIN_VARIABLES: 'sin-variables',
  INVALIDO: 'invalido',
  ERROR: 'error'
});

const PREFIJO = 'Administrador:';

/**
 * @param {{entorno?: object, registro?: Console}} opciones
 * @returns {Promise<string>} uno de RESULTADOS
 */
async function prepararAdministradorInicial({ entorno = process.env, registro = console } = {}) {
  const { ADMIN_USUARIO: usuario, ADMIN_CLAVE: clave } = entorno;
  try {
    if ((await administradores.contar()) > 0) {
      if (clave) {
        registro.warn(
          `${PREFIJO} ya existe un administrador y ADMIN_CLAVE no se usa. Bórrala de las variables de entorno de Render.`
        );
      }
      return RESULTADOS.EXISTENTE;
    }
    if (!usuario || !clave) {
      registro.warn(
        `${PREFIJO} no hay ninguno. Para crear el primero, configura ADMIN_USUARIO y ADMIN_CLAVE (docs/despliegue.md).`
      );
      return RESULTADOS.SIN_VARIABLES;
    }
    const errores = validarCredencialesNuevas(usuario, clave);
    if (errores.length > 0) {
      registro.error(`${PREFIJO} no se creó. ${errores.join(' ')}`);
      return RESULTADOS.INVALIDO;
    }
    const normalizado = normalizarUsuario(usuario);
    await administradores.crear({ usuario: normalizado, claveCifrada: await cifrarClave(clave) });
    registro.log(
      `${PREFIJO} administrador inicial creado: ${normalizado}. Ya puedes borrar ADMIN_USUARIO y ADMIN_CLAVE de Render.`
    );
    return RESULTADOS.CREADO;
  } catch (error) {
    // Dos arranques a la vez: el otro ya lo creo (indice unico de usuario).
    if (error && error.code === 11000) return RESULTADOS.EXISTENTE;
    // Solo el tipo de error: el mensaje podria traer los datos que se intentaron guardar.
    registro.error(`${PREFIJO} no se pudo preparar el administrador inicial (${(error && error.name) || 'Error'}).`);
    return RESULTADOS.ERROR;
  }
}

module.exports = { RESULTADOS, prepararAdministradorInicial };
