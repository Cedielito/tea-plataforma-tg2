'use strict';
const administradores = require('./repositorios/administradores');
const { ROLES, normalizarUsuario, validarCredencialesNuevas, cifrarClave } = require('../dominio/autenticacion');

/**
 * Cuenta del profesional del registro conductual, sin consola ni registro
 * publico. M-09, HU-16, RS-05
 *
 * Igual que el primer administrador (administradorInicial.js), al arrancar la
 * API:
 * - si estan PROFESIONAL_USUARIO y PROFESIONAL_CLAVE y no hay ninguna cuenta
 *   con ese usuario, la crea con rol `profesional` y la clave cifrada
 *   (bcrypt);
 * - si ya existe la cuenta de profesional y PROFESIONAL_CLAVE sigue
 *   configurada, avisa que hay que borrarla de Render;
 * - si el usuario ya es de un administrador, no hace nada y lo dice: los roles
 *   no se mezclan.
 * Para otro profesional se cambian las dos variables y se reinicia.
 *
 * Nunca detiene el arranque y nunca escribe la clave en el registro.
 * Pasos en docs/despliegue.md.
 */

const RESULTADOS = Object.freeze({
  CREADO: 'creado',
  EXISTENTE: 'existente',
  SIN_VARIABLES: 'sin-variables',
  INVALIDO: 'invalido',
  ERROR: 'error'
});

const PREFIJO = 'Profesional:';

/**
 * @param {{entorno?: object, registro?: Console}} opciones
 * @returns {Promise<string>} uno de RESULTADOS
 */
async function prepararProfesionalInicial({ entorno = process.env, registro = console } = {}) {
  const { PROFESIONAL_USUARIO: usuario, PROFESIONAL_CLAVE: clave } = entorno;
  try {
    if (!usuario || !clave) {
      if (usuario || clave) {
        registro.warn(`${PREFIJO} faltan PROFESIONAL_USUARIO o PROFESIONAL_CLAVE; no se creó la cuenta.`);
      } else if ((await administradores.contarProfesionales()) === 0) {
        registro.warn(
          `${PREFIJO} no hay ninguno. Para crear uno, configura PROFESIONAL_USUARIO y PROFESIONAL_CLAVE (docs/despliegue.md).`
        );
      }
      return RESULTADOS.SIN_VARIABLES;
    }
    const errores = validarCredencialesNuevas(usuario, clave);
    if (errores.length > 0) {
      registro.error(`${PREFIJO} no se creó. ${errores.join(' ')}`);
      return RESULTADOS.INVALIDO;
    }
    const normalizado = normalizarUsuario(usuario);
    const existente = await administradores.buscarPorUsuario(normalizado);
    if (existente && existente.rol !== ROLES.PROFESIONAL) {
      registro.error(`${PREFIJO} no se creó: ${normalizado} ya es una cuenta de administrador. Elige otro usuario.`);
      return RESULTADOS.INVALIDO;
    }
    if (existente) {
      registro.warn(
        `${PREFIJO} ${normalizado} ya existe y PROFESIONAL_CLAVE no se usa. Bórrala de las variables de entorno de Render.`
      );
      return RESULTADOS.EXISTENTE;
    }
    await administradores.crear({
      usuario: normalizado,
      claveCifrada: await cifrarClave(clave),
      rol: ROLES.PROFESIONAL
    });
    registro.log(
      `${PREFIJO} cuenta creada: ${normalizado}. Ya puedes borrar PROFESIONAL_USUARIO y PROFESIONAL_CLAVE de Render.`
    );
    return RESULTADOS.CREADO;
  } catch (error) {
    // Dos arranques a la vez: el otro ya la creo (indice unico de usuario).
    if (error && error.code === 11000) return RESULTADOS.EXISTENTE;
    // Solo el tipo de error: el mensaje podria traer los datos que se intentaron guardar.
    registro.error(`${PREFIJO} no se pudo preparar la cuenta (${(error && error.name) || 'Error'}).`);
    return RESULTADOS.ERROR;
  }
}

module.exports = { RESULTADOS, prepararProfesionalInicial };
