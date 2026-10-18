'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const { crearExigirSesion } = require('./autenticacion');
const { crearRutasPublicas } = require('./rutas/publicas');
const { crearRutasSesion } = require('./rutas/sesion');
const { crearRutasAdmin } = require('./rutas/admin');
const { crearRutasContacto } = require('./rutas/contacto');
const { crearRutasRegistro } = require('./rutas/registro');
const { paginasFijas } = require('../datos/paginasFijas');

/**
 * Servidor HTTP de la Fase I: estado del servicio, rutas publicas de
 * contenidos, preguntas frecuentes, recursos y buscador (T2), pasos de la
 * ruta (T5), directorio (T6), inicio de sesion y panel de administracion
 * (T4), con las preguntas frecuentes y los recursos (T7), y el formulario de
 * contacto, las paginas fijas y la bandeja de mensajes (T8), y el plan de la
 * sesion del registro conductual (T13, M-09).
 *
 * RS-05: todo /api/admin/* pasa primero por exigirSesion, sin excepciones
 * (tambien las rutas que no existen responden 401 sin sesion). El inicio de
 * sesion vive aparte, en POST /api/sesion.
 *
 * RS-02: la IP de quien envia el formulario de contacto llega en
 * X-Forwarded-For, a traves del reenvio de Vercel y del balanceador de Render
 * (docs/despliegue.md). `trust proxy` con un numero cuenta los saltos desde
 * la derecha: con 2 (Render y Vercel), req.ip es la direccion que escribio
 * Vercel, y lo que el visitante agregue a la izquierda no cuenta. Se puede
 * cambiar con la variable SALTOS_PROXY sin tocar el codigo.
 *
 * @param {{ahora?: () => Date, produccion?: boolean, registro?: Console,
 *   saltosProxy?: number, paginas?: object}} opciones el reloj, el registro y
 *   las paginas fijas se pueden cambiar en las pruebas; `produccion` decide si
 *   la cookie de sesion lleva Secure (por defecto, NODE_ENV=production)
 */
function crearServidor({
  ahora = () => new Date(),
  produccion = process.env.NODE_ENV === 'production',
  registro = console,
  saltosProxy = leerSaltosProxy(process.env.SALTOS_PROXY),
  paginas = paginasFijas
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', saltosProxy);
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  const salud = (_req, res) => res.json({ estado: 'ok' });
  app.get('/salud', salud);
  app.get('/api/salud', salud);

  app.use('/api/sesion', crearRutasSesion({ ahora, produccion, registro }));
  app.use('/api/admin', crearExigirSesion({ ahora, produccion }), crearRutasAdmin({ produccion }));
  app.use('/api/contacto', crearRutasContacto({ ahora, paginas }));
  app.use('/api/registro', crearRutasRegistro());
  app.use('/api', crearRutasPublicas({ paginas }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

  app.use(manejarError);
  return app;
}

const SALTOS_PROXY_POR_DEFECTO = 2;

/** SALTOS_PROXY: entero de 0 a 10; cualquier otro valor usa el de por defecto. */
function leerSaltosProxy(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 && numero <= 10 && String(valor).trim() !== ''
    ? numero
    : SALTOS_PROXY_POR_DEFECTO;
}

const JSON_INVALIDO = 'Los datos enviados no son un JSON válido.';

/**
 * Errores del cliente (4xx: validacion, JSON mal formado, cuerpo muy grande)
 * se devuelven con su mensaje; cualquier otro se responde como error interno
 * sin exponer detalles. El JSON mal formado responde con un texto fijo: el
 * mensaje del analizador repite parte de lo enviado, que en el inicio de
 * sesion podria ser la contrasena.
 */
function manejarError(err, _req, res, _next) {
  const esDelCliente = Number.isInteger(err.status) && err.status >= 400 && err.status < 500;
  const codigo = esDelCliente ? err.status : 500;
  let mensaje = esDelCliente ? err.message : 'Error interno del servidor';
  if (err.type === 'entity.parse.failed') mensaje = JSON_INVALIDO;
  res.status(codigo).json({ error: mensaje });
}

module.exports = { crearServidor, manejarError, leerSaltosProxy, SALTOS_PROXY_POR_DEFECTO, JSON_INVALIDO };
