'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const mensajesContacto = require('../../datos/repositorios/mensajesContacto');
const { LIMITES, MENSAJES, leerMensajeContacto } = require('../../dominio/contacto');
const { crearLimiteGlobal, crearLimitePorClave } = require('../../dominio/limiteIntentos');

/**
 * POST /api/contacto: mensaje del formulario de contacto. M-06, RF-08, RS-02,
 * RS-03, RS-04
 *
 * Orden de las comprobaciones:
 * 1. Cuerpo: solo correo, mensaje, autorizacion (exactamente true) y
 *    versionPolitica; si no, 400 con un mensaje por campo. Los errores no
 *    cuentan para los limites.
 * 2. La politica de privacidad debe estar cargada (503) y la version enviada
 *    debe ser la vigente (409): la que se guarda es la que la persona leyo.
 * 3. Limites en memoria: 5 envios por IP cada 15 minutos y 40 por hora en
 *    total (429 con Retry-After). Se consultan y se registran sin esperas
 *    entre medio, asi que dos envios en paralelo no pasan los dos el limite.
 * 4. Guarda correo, mensaje, fecha y version (mensaje_contacto) y responde 201.
 *
 * La IP es la de req.ip, que Express toma de X-Forwarded-For segun
 * `trust proxy` (servidor.js). Solo sirve de clave del limite mientras dura
 * su ventana: no se guarda con el mensaje y nunca se escribe en el registro,
 * igual que el correo y el mensaje. Esta ruta no escribe nada en el registro.
 * No hay reintento automatico en la web: un envio repetido guardaria dos veces.
 */

function crearRutasContacto({ ahora, paginas }) {
  const rutas = express.Router();
  const porIp = crearLimitePorClave(LIMITES.porIp);
  const total = crearLimiteGlobal(LIMITES.total);

  const demasiados = (res, segundos, mensaje) => {
    res.set('Retry-After', String(segundos));
    return res.status(429).json({ error: mensaje });
  };

  rutas.post(
    '/',
    envolver(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const { datos, errores } = leerMensajeContacto(req.body);
      if (errores) return res.status(400).json({ error: errores.general || MENSAJES.REVISA_CAMPOS, campos: errores });

      const politica = await paginas.politica();
      if (!politica) return res.status(503).json({ error: MENSAJES.SIN_POLITICA });
      if (datos.versionPolitica !== politica.version) {
        return res.status(409).json({ error: MENSAJES.POLITICA_CAMBIO, version: politica.version });
      }

      const momento = ahora();
      const clave = req.ip || 'sin-ip';
      const estadoIp = porIp.consultar(clave, momento);
      if (!estadoIp.permitido) return demasiados(res, estadoIp.segundos, MENSAJES.DEMASIADOS_POR_IP);
      const estadoTotal = total.registrar(momento);
      if (!estadoTotal.permitido) return demasiados(res, estadoTotal.segundos, MENSAJES.DEMASIADOS_EN_TOTAL);
      porIp.registrar(clave, momento);

      await mensajesContacto.crear({ ...datos, fecha: momento });
      return res.status(201).json({ recibido: true });
    })
  );

  return rutas;
}

module.exports = { crearRutasContacto };
