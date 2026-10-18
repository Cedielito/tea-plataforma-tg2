'use strict';
const express = require('express');
const mongoose = require('mongoose');
const { envolver } = require('../envolver');
const sesiones = require('../../datos/repositorios/sesionesRegistro');
const { esTokenConFormato, hashToken } = require('../../dominio/autenticacion');
const { ORDEN_TAREAS } = require('../../dominio/registro/catalogo');
const { planificarSesion } = require('../../dominio/registro/secuenciador');
const { leerEnvioTarea } = require('../../dominio/registro/envioTarea');
const { leerRespuestasSus, calcularValorSUS } = require('../../dominio/registro/sus');
const { ESTADOS_SESION, sesionVencida, tareasPendientes } = require('../../dominio/registro/sesionRegistro');

/**
 * Rutas de la aplicacion de una sesion del registro conductual, bajo
 * /api/registro/aplicacion: las usa el participante en el dispositivo que le
 * entrego el profesional. M-09, HU-17, CT-07, CT-11, RF-15
 *
 * - GET  /               plan, semilla, reloj, lo que ya se recibio y el SUS
 * - PUT  /tareas/:tarea  ensayos de una tarea, al terminarla
 * - PUT  /sus            respuestas del cuestionario SUS
 * - POST /interrupcion   la pagina se recargo a mitad de una tarea
 *
 * Solo con la cookie `aplicacion_registro`, que entrega
 * POST /api/admin/registro/sesiones/:seudonimo/entrega (adminRegistro.js):
 * - HttpOnly, SameSite=Strict, Secure en produccion y
 *   Path=/api/registro/aplicacion: no viaja al panel ni a ninguna otra ruta.
 * - Un token aleatorio por sesion; la base guarda solo su hash SHA-256.
 * - Sirve solo para la sesion que se entrego, y solo para leer el plan y
 *   enviar sus ensayos y su SUS: ninguna respuesta trae valores, el
 *   seudonimo ni otras sesiones.
 * - Deja de servir a las 2 horas de creada la sesion, al recibir las dos
 *   tareas y el SUS o al interrumpirse.
 *
 * Los envios son idempotentes: si la web reintenta una tarea o el SUS que ya
 * llegaron, la respuesta es 200 sin guardar dos veces.
 */

const NOMBRE_COOKIE_APLICACION = 'aplicacion_registro';
const RUTA_COOKIE_APLICACION = '/api/registro/aplicacion';

const MENSAJES = Object.freeze({
  SIN_APLICACION: 'No hay una aplicación en curso en este dispositivo.',
  TAREA_DESCONOCIDA: 'Esa tarea no está en el plan.',
  SIN_CUESTIONARIO: 'El cuestionario no está disponible en este momento.',
  NO_GUARDADO: 'Los datos enviados no tienen el formato del registro y no se guardaron.',
  ENVIO_EN_CURSO: 'Ya se está guardando esta tarea. Intenta de nuevo en unos segundos.'
});

function opcionesCookieAplicacion({ produccion }) {
  return { httpOnly: true, sameSite: 'strict', secure: produccion, path: RUTA_COOKIE_APLICACION };
}

const ESTADOS_CON_APLICACION = [ESTADOS_SESION.EN_CURSO, ESTADOS_SESION.COMPLETADA];

/** Lo que la web necesita para seguir: nunca valores ni el seudonimo. */
function estadoDeAplicacion(sesion) {
  return {
    estado: sesion.estado,
    tareasRecibidas: [...sesion.tareasRecibidas],
    susRespondido: Boolean(sesion.sus)
  };
}

const aplicacionTerminada = (sesion) => tareasPendientes(sesion).length === 0 && Boolean(sesion.sus);

function crearRutasAplicacionRegistro({ ahora, produccion, cuestionarioSus }) {
  const rutas = express.Router();
  const cookie = opcionesCookieAplicacion({ produccion });

  function rechazar(req, res) {
    if (req.cookies && req.cookies[NOMBRE_COOKIE_APLICACION] !== undefined) {
      res.clearCookie(NOMBRE_COOKIE_APLICACION, cookie);
    }
    return res.status(401).json({ error: MENSAJES.SIN_APLICACION });
  }

  /** Deja en req.sesionRegistro el documento de la sesion de la cookie, o responde 401. */
  const exigirAplicacion = envolver(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const token = req.cookies && req.cookies[NOMBRE_COOKIE_APLICACION];
    if (!esTokenConFormato(token)) return rechazar(req, res);
    const sesion = await sesiones.buscarPorTokenAplicacion(hashToken(token));
    if (!sesion || !ESTADOS_CON_APLICACION.includes(sesion.estado)) return rechazar(req, res);
    if (sesionVencida(sesion, ahora())) {
      await sesiones.marcarAbandonadas(ahora());
      if (sesion.estado === ESTADOS_SESION.COMPLETADA) await sesiones.revocarAplicacion(sesion);
      return rechazar(req, res);
    }
    req.sesionRegistro = sesion;
    return next();
  });

  /** Responde con el estado y, si ya llego todo, retira la cookie. */
  async function responderEstado(res, sesion) {
    if (aplicacionTerminada(sesion)) {
      await sesiones.revocarAplicacion(sesion);
      res.clearCookie(NOMBRE_COOKIE_APLICACION, cookie);
    }
    return res.json(estadoDeAplicacion(sesion));
  }

  rutas.use(exigirAplicacion);

  rutas.get(
    '/',
    envolver(async (req, res) => {
      const sesion = req.sesionRegistro;
      const cuestionario = await cuestionarioSus.obtener().catch(() => null);
      res.json({
        ...estadoDeAplicacion(sesion),
        plan: planificarSesion(),
        versionCatalogo: sesion.versionCatalogo,
        semilla: sesion.semilla,
        reloj: sesion.reloj,
        cuestionarioSus: cuestionario
          ? { version: cuestionario.version, escala: cuestionario.escala, items: cuestionario.items }
          : null
      });
    })
  );

  rutas.put(
    '/tareas/:tarea',
    envolver(async (req, res) => {
      const sesion = req.sesionRegistro;
      const { tarea } = req.params;
      if (!ORDEN_TAREAS.includes(tarea)) return res.status(404).json({ error: MENSAJES.TAREA_DESCONOCIDA });
      if (sesion.tareasRecibidas.includes(tarea)) return responderEstado(res, sesion);

      const secuencia = planificarSesion().secuencias.find((s) => s.tarea === tarea);
      const envio = leerEnvioTarea(req.body, { tarea, secuencia, sesion });
      if (envio.error) return res.status(envio.estado).json({ error: envio.error });

      try {
        await sesiones.guardarTarea(sesion, { tarea, ensayos: envio.ensayos, contexto: envio.contexto, ahora: ahora() });
      } catch (error) {
        // Sin el detalle de Mongoose: repetiria los valores enviados.
        if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.StrictModeError) {
          return res.status(422).json({ error: MENSAJES.NO_GUARDADO });
        }
        if (error && error.code === 11000) return res.status(409).json({ error: MENSAJES.ENVIO_EN_CURSO });
        throw error;
      }
      return responderEstado(res, sesion);
    })
  );

  rutas.put(
    '/sus',
    envolver(async (req, res) => {
      const sesion = req.sesionRegistro;
      if (sesion.sus) return responderEstado(res, sesion);
      const cuestionario = await cuestionarioSus.obtener().catch(() => null);
      if (!cuestionario) return res.status(503).json({ error: MENSAJES.SIN_CUESTIONARIO });

      const lectura = leerRespuestasSus(req.body, cuestionario);
      if (lectura.error) return res.status(lectura.estado).json({ error: lectura.error });
      await sesiones.guardarSus(sesion, {
        respuestas: lectura.respuestas,
        version: lectura.version,
        valorSUS: calcularValorSUS(lectura.respuestas),
        ahora: ahora()
      });
      return responderEstado(res, sesion);
    })
  );

  rutas.post(
    '/interrupcion',
    envolver(async (req, res) => {
      const sesion = req.sesionRegistro;
      if (sesion.estado === ESTADOS_SESION.EN_CURSO && tareasPendientes(sesion).length > 0) {
        await sesiones.interrumpir(sesion);
        res.clearCookie(NOMBRE_COOKIE_APLICACION, cookie);
      }
      return res.json(estadoDeAplicacion(sesion));
    })
  );

  return rutas;
}

module.exports = {
  NOMBRE_COOKIE_APLICACION,
  RUTA_COOKIE_APLICACION,
  MENSAJES,
  opcionesCookieAplicacion,
  crearRutasAplicacionRegistro
};
