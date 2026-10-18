'use strict';
const mongoose = require('mongoose');
const { TAREAS, FASES, REGLAS, CONDICIONES } = require('../../dominio/registro/catalogo');
const { sinDatosIdentificables } = require('./sinDatosIdentificables');

/**
 * Coleccion `ensayo_registro`: un documento por ensayo de una sesion del
 * registro conductual. M-09, HU-17, HU-19, CT-07, CT-11, RF-13, RF-14
 *
 * Guarda el ensayo con la forma de la web (web/src/registro/sesionLocal.js):
 * lo que lee el motor (tarea, bloque, fase, regla, condicion, congruencia,
 * practica, estadoItem, acierto, claseError, tiempoReaccionMs,
 * pausasDuranteItemMs, rectificaciones) y lo que permite revisar la medicion
 * (numero, estimulo, respuesta, aparicion, momento de la respuesta, semilla y
 * tipo de entrada). Ningun dato de la persona (CT-11):
 * - `strict: 'throw'`, tambien en el estimulo: un campo de mas hace fallar el
 *   guardado en lugar de descartarse en silencio;
 * - el plugin sinDatosIdentificables revisa el documento antes de validar;
 * - `sesion` es el _id de la sesion (sesion_registro): al eliminar una sesion
 *   por su seudonimo se borran todos sus ensayos (HU-19).
 * Sin `__v` ni fechas: el orden es el de la tarea (`numero`).
 */

const PATRON_CODIGO = /^[A-Za-z0-9-]{1,24}$/;
const conNulo = (valores) => [...Object.values(valores), null];
const opciones = { _id: false, strict: 'throw', versionKey: false };

const esquemaEstimulo = new mongoose.Schema(
  {
    forma: { type: String, match: PATRON_CODIGO },
    color: { type: String, match: PATRON_CODIGO },
    global: { type: String, match: PATRON_CODIGO },
    local: { type: String, match: PATRON_CODIGO }
  },
  opciones
);

const milisegundos = (maximo) => ({ type: Number, min: 0, max: maximo, default: null });
const entero = { validator: (valor) => valor === null || Number.isInteger(valor), message: 'Debe ser un número entero.' };

const esquema = new mongoose.Schema(
  {
    sesion: { type: mongoose.Schema.Types.ObjectId, required: true },
    tarea: { type: String, required: true, enum: Object.values(TAREAS) },
    bloque: { type: String, required: true, match: PATRON_CODIGO },
    fase: { type: String, enum: conNulo(FASES), default: null },
    regla: { type: String, enum: conNulo(REGLAS), default: null },
    condicion: { type: String, enum: conNulo(CONDICIONES), default: null },
    congruencia: { type: String, enum: ['congruente', 'incongruente'] },
    practica: { type: Boolean, required: true },
    estadoItem: { type: String, required: true, enum: ['respondido', 'omitido'] },
    acierto: { type: Boolean, required: true },
    claseError: { type: String, enum: ['correcta', 'perseverativa', 'aleatoria', null], default: null },
    tiempoReaccionMs: milisegundos(600000),
    pausasDuranteItemMs: { ...milisegundos(86400000), required: true },
    rectificaciones: { type: Number, required: true, min: 0, max: 1000, validate: entero },
    numero: { type: Number, required: true, min: 1, max: 1000, validate: entero },
    estimulo: { type: esquemaEstimulo, required: true },
    respuesta: { type: String, match: PATRON_CODIGO, default: null },
    aparicionMs: { type: Number, min: 0, default: null },
    momentoRespuestaMs: { type: Number, min: 0, default: null },
    semilla: { type: Number, required: true, min: 0, max: 2 ** 32 - 1, validate: entero },
    tipoEntrada: { type: String, enum: ['teclado', 'tactil', 'raton', null], default: null }
  },
  { collection: 'ensayo_registro', strict: 'throw', versionKey: false, timestamps: false }
);

esquema.plugin(sinDatosIdentificables);
// Un ensayo por numero en cada tarea de la sesion: un envio repetido no duplica.
esquema.index({ sesion: 1, tarea: 1, numero: 1 }, { unique: true });

module.exports = mongoose.model('EnsayoRegistro', esquema);
