'use strict';
const express = require('express');
const { envolver } = require('../envolver');
const { NOMBRE_COOKIE, opcionesCookie } = require('../autenticacion');
const { NOMBRE_COOKIE_APLICACION, opcionesCookieAplicacion } = require('./aplicacionRegistro');
const administradores = require('../../datos/repositorios/administradores');
const sesiones = require('../../datos/repositorios/sesionesRegistro');
const { generarToken, hashToken } = require('../../dominio/autenticacion');
const { normalizarSeudonimo } = require('../../dominio/registro/seudonimo');
const { describirNavegador } = require('../../dominio/registro/navegador');
const { csvEnsayos, csvValores } = require('../../dominio/registro/exportacion');
const { deGuardado } = require('../../dominio/registro/resultado');
const {
  ESTADOS_SESION,
  MENSAJES,
  leerNuevaSesion,
  resumenSesion,
  sesionVencida
} = require('../../dominio/registro/sesionRegistro');

/**
 * Rutas del profesional en el registro conductual, bajo /api/admin/registro:
 * detras de exigirSesion y de exigirRol('profesional') (ver admin.js). M-09,
 * HU-16, HU-18, HU-19, CT-11, CT-13, RF-15, RS-05
 *
 * - POST   /sesiones                       crear (HU-16): solo con la constancia
 *                                          del consentimiento y la mayoria de edad
 * - GET    /sesiones                       las del profesional, por seudonimo
 * - GET    /sesiones/:seudonimo            una, con sus valores si esta completa
 * - POST   /sesiones/:seudonimo/entrega    entregar el dispositivo al participante
 * - DELETE /sesiones/:seudonimo            eliminar con todos sus ensayos (HU-19)
 * - GET    /exportacion/ensayos.csv        un ensayo por fila
 * - GET    /exportacion/valores.csv        una sesion por fila, con el SUS
 *
 * Cada consulta filtra por la cuenta de la sesion: otro profesional recibe
 * 404. El seudonimo de la direccion pasa por normalizarSeudonimo, asi que
 * «abcd 2345» encuentra ABCD-2345.
 *
 * Entrega (como evitar que el participante vea otras sesiones): en una sola
 * respuesta se cierra la sesion del profesional en ese navegador (su cookie y
 * su hash en la base) y se entrega la cookie de aplicacion, que solo sirve
 * para esa sesion y solo bajo /api/registro/aplicacion
 * (aplicacionRegistro.js). Ahi tambien se guarda el navegador, reducido a su
 * familia y su version mayor (CT-11). Se puede volver a entregar mientras no
 * haya llegado ninguna tarea: el token anterior deja de servir.
 *
 * Antes de responder, las sesiones en curso que vencieron pasan a
 * abandonadas.
 */

const MENSAJES_RUTA = Object.freeze({
  YA_APLICADA: 'Esta sesión ya no se puede entregar: ya tiene tareas registradas o terminó.',
  VENCIDA: 'Esta sesión venció sin completarse. Crea una nueva.',
  NO_EXISTE: 'Recurso no encontrado'
});

/** Seudonimo de la direccion en su forma canonica, o responde 400. */
function conSeudonimo(manejador) {
  return envolver(async (req, res) => {
    const seudonimo = normalizarSeudonimo(req.params.seudonimo);
    if (!seudonimo) return res.status(400).json({ error: MENSAJES.SEUDONIMO_INVALIDO });
    return manejador(req, res, seudonimo);
  });
}

function detalleSesion(sesion) {
  const { constancia, versionCatalogo, reloj, navegador, sus } = sesion;
  return {
    ...resumenSesion(sesion),
    versionConsentimiento: constancia.versionConsentimiento,
    versionCatalogo,
    reloj,
    navegador: navegador || null,
    valorSUS: sus ? sus.valorSUS : null,
    versionSUS: sus ? sus.version : null,
    valores: deGuardado(sesion)
  };
}

function enviarCsv(res, nombre, texto) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(texto);
}

function crearRutasAdminRegistro({ ahora, produccion }) {
  const rutas = express.Router();
  const cookiePanel = opcionesCookie({ produccion });
  const cookieAplicacion = opcionesCookieAplicacion({ produccion });

  rutas.use(
    envolver(async (_req, _res, next) => {
      await sesiones.marcarAbandonadas(ahora());
      next();
    })
  );

  rutas.post(
    '/sesiones',
    envolver(async (req, res) => {
      const { constancia, errores } = leerNuevaSesion(req.body);
      if (errores) {
        if (errores.general) return res.status(400).json({ error: errores.general, campos: errores });
        return res.status(422).json({ error: MENSAJES.REVISA_CAMPOS, campos: errores });
      }
      const sesion = await sesiones.crear({ profesional: req.administrador._id, constancia, ahora: ahora() });
      return res.status(201).json(detalleSesion(sesion.toJSON()));
    })
  );

  rutas.get(
    '/sesiones',
    envolver(async (req, res) => {
      const lista = await sesiones.listarDelProfesional(req.administrador._id);
      res.json(lista.map(resumenSesion));
    })
  );

  rutas.get(
    '/sesiones/:seudonimo',
    conSeudonimo(async (req, res, seudonimo) => {
      const sesion = await sesiones.obtenerDelProfesional(req.administrador._id, seudonimo);
      if (!sesion) return res.status(404).json({ error: MENSAJES.NO_ENCONTRADA });
      return res.json(detalleSesion(sesion.toJSON()));
    })
  );

  rutas.post(
    '/sesiones/:seudonimo/entrega',
    conSeudonimo(async (req, res, seudonimo) => {
      const momento = ahora();
      const sesion = await sesiones.obtenerDelProfesional(req.administrador._id, seudonimo);
      if (!sesion) return res.status(404).json({ error: MENSAJES.NO_ENCONTRADA });
      if (sesion.estado !== ESTADOS_SESION.EN_CURSO || sesion.tareasRecibidas.length > 0) {
        return res.status(409).json({ error: MENSAJES_RUTA.YA_APLICADA });
      }
      if (sesionVencida(sesion, momento)) return res.status(409).json({ error: MENSAJES_RUTA.VENCIDA });

      const token = generarToken();
      await sesiones.entregar(sesion, {
        tokenHash: hashToken(token),
        navegador: describirNavegador(req.get('User-Agent')),
        ahora: momento
      });
      await administradores.cerrarSesion(req.administrador.tokenHash);
      res.clearCookie(NOMBRE_COOKIE, cookiePanel);
      res.cookie(NOMBRE_COOKIE_APLICACION, token, cookieAplicacion);
      return res.status(204).end();
    })
  );

  rutas.delete(
    '/sesiones/:seudonimo',
    conSeudonimo(async (req, res, seudonimo) => {
      const eliminada = await sesiones.eliminarDelProfesional(req.administrador._id, seudonimo);
      if (!eliminada) return res.status(404).json({ error: MENSAJES.NO_ENCONTRADA });
      return res.status(204).end();
    })
  );

  rutas.get(
    '/exportacion/ensayos.csv',
    envolver(async (req, res) => {
      const lista = await sesiones.listarDelProfesional(req.administrador._id);
      const ensayos = await sesiones.ensayosDe(lista.map((s) => s._id));
      const porSesion = new Map(lista.map((s) => [String(s._id), []]));
      for (const ensayo of ensayos) porSesion.get(String(ensayo.sesion)).push(ensayo);
      // De la mas antigua a la mas reciente, como se aplicaron.
      const filas = [...lista].reverse().map((sesion) => ({ sesion, ensayos: porSesion.get(String(sesion._id)) }));
      enviarCsv(res, 'registro-ensayos.csv', csvEnsayos(filas));
    })
  );

  rutas.get(
    '/exportacion/valores.csv',
    envolver(async (req, res) => {
      const lista = await sesiones.listarDelProfesional(req.administrador._id);
      enviarCsv(res, 'registro-valores-sus.csv', csvValores([...lista].reverse()));
    })
  );

  // Una ruta del registro que no existe no sigue hacia las del administrador (que responderian 403).
  rutas.use((_req, res) => res.status(404).json({ error: MENSAJES_RUTA.NO_EXISTE }));

  return rutas;
}

module.exports = { MENSAJES_RUTA, crearRutasAdminRegistro };
