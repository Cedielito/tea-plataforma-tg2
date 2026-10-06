'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { NOMBRE_COOKIE, opcionesCookie, sinCache } = require('../autenticacion');
const administradores = require('../../datos/repositorios/administradores');
const {
  COSTO_BCRYPT,
  MENSAJES,
  leerCredenciales,
  compararClave,
  generarToken,
  hashToken
} = require('../../dominio/autenticacion');
const {
  MENSAJES: MENSAJES_LIMITE,
  crearBloqueoPorUsuario,
  crearLimiteGlobal
} = require('../../dominio/limiteIntentos');

/**
 * POST /api/sesion: inicio de sesion del administrador. M-08, RF-09, RS-05
 *
 * Esta fuera de /api/admin para que todo /api/admin/* exija sesion sin
 * excepciones. Orden de las comprobaciones:
 * 1. Limite global (20 intentos por minuto en total): 429.
 * 2. Usuario y contrasena deben ser textos no vacios: 400.
 * 3. Usuario bloqueado por intentos fallidos, o con otro intento en curso:
 *    429, aunque la clave sea correcta.
 * 4. Comparacion bcrypt. Si el usuario no existe se compara igual contra un
 *    hash ficticio, y la respuesta es la misma que con una clave incorrecta.
 * 5. Si es correcta: cookie de sesion y { usuario }.
 *
 * La primera comparacion de cada arranque deja su duracion en el registro,
 * para ver cuanto tarda bcrypt en Render. Nunca se registra la clave, el token
 * ni la cookie.
 */

const milisegundosDesde = (inicio) => Math.round(performance.now() - inicio);

function crearRutasSesion({ ahora, produccion, registro }) {
  const rutas = express.Router();
  const bloqueo = crearBloqueoPorUsuario();
  const limiteGlobal = crearLimiteGlobal();
  const cookie = opcionesCookie({ produccion });
  let comparacionMedida = false;

  async function verificarClave(clave, hashGuardado) {
    if (comparacionMedida) return compararClave(clave, hashGuardado);
    comparacionMedida = true;
    const inicio = performance.now();
    const coincide = await compararClave(clave, hashGuardado);
    registro.log(
      `Inicio de sesión: la primera comparación de contraseña tardó ${milisegundosDesde(inicio)} ms ` +
        `(bcrypt, costo ${COSTO_BCRYPT}).`
    );
    return coincide;
  }

  const demasiados = (res, segundos, mensaje) => {
    res.set('Retry-After', String(segundos));
    return res.status(429).json({ error: mensaje });
  };

  rutas.post(
    '/',
    sinCache,
    envolver(async (req, res) => {
      const momento = ahora();
      const global = limiteGlobal.registrar(momento);
      if (!global.permitido) return demasiados(res, global.segundos, MENSAJES_LIMITE.DEMASIADOS_INTENTOS);

      const { usuario, clave, error } = leerCredenciales(req.body);
      if (error) return res.status(400).json({ error });

      const estado = bloqueo.consultar(usuario, momento);
      if (estado.bloqueado) return demasiados(res, estado.segundos, MENSAJES_LIMITE.USUARIO_BLOQUEADO);
      if (!bloqueo.ocupar(usuario)) return demasiados(res, 1, MENSAJES_LIMITE.INTENTO_EN_CURSO);

      try {
        const administrador = await administradores.buscarParaAcceso(usuario);
        const correcta = await verificarClave(clave, administrador ? administrador.claveCifrada : null);
        if (!administrador || !correcta) {
          const fallo = bloqueo.registrarFallo(usuario, momento);
          if (fallo.bloqueado) return demasiados(res, fallo.segundos, MENSAJES_LIMITE.USUARIO_BLOQUEADO);
          return res.status(401).json({ error: MENSAJES.CREDENCIALES_INCORRECTAS });
        }

        bloqueo.reiniciar(usuario);
        const token = generarToken();
        await administradores.abrirSesion(administrador, { tokenHash: hashToken(token), ahora: momento });
        res.cookie(NOMBRE_COOKIE, token, cookie);
        return res.json({ usuario: administrador.usuario });
      } finally {
        bloqueo.liberar(usuario);
      }
    })
  );

  return rutas;
}

module.exports = { crearRutasSesion };
