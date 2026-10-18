'use strict';
const mongoose = require('mongoose');
const { TAREAS } = require('../../dominio/registro/catalogo');
const { ESTADOS_SESION, PATRON_VERSION, RELOJ_APLICACION } = require('../../dominio/registro/sesionRegistro');
const { PATRON_NAVEGADOR } = require('../../dominio/registro/navegador');
const { NUMERO_ITEMS, MINIMO, MAXIMO } = require('../../dominio/registro/sus');
const { esSeudonimoValido } = require('../../dominio/registro/seudonimo');
const { sinDatosIdentificables } = require('./sinDatosIdentificables');

/**
 * Coleccion `sesion_registro`: una sesion del registro conductual. M-09,
 * HU-16, HU-18, HU-19, CT-11, CT-13, RF-15
 *
 * - `seudonimo` (XXXX-XXXX, seudonimo.js) con indice unico: es lo unico que
 *   une la sesion con la copia del consentimiento que se lleva la persona.
 * - `constancia`: el profesional marco que la persona firmo el consentimiento
 *   en papel (con la version del formato) y que es mayor de edad (HU-16). Del
 *   consentimiento no se guarda nada mas.
 * - `profesional`: la cuenta que creo la sesion; solo ella la ve, la exporta
 *   y la elimina.
 * - `reloj` es siempre 'animacion'; `navegador`, solo la familia y la version
 *   mayor (navegador.js); `semilla`, la de los ensayos.
 * - `contextosTareas`: pausas y repeticiones de instrucciones de cada tarea;
 *   `contexto`: el de la sesion, al completarse.
 * - `resultado`: la salida de procesarSesion, guardada al completarse con su
 *   versionAlgoritmo (CT-13). Las incompletas no tienen (RF-15).
 * - `sus`: las 10 respuestas, el valorSUS y la version del cuestionario.
 * - `tokenAplicacionHash`: hash SHA-256 del token de la cookie de aplicacion
 *   (rutas/aplicacionRegistro.js); nunca sale en una respuesta.
 *
 * Ningun dato de la persona (CT-11): `strict: 'throw'` en el esquema y en
 * cada subesquema, y el plugin sinDatosIdentificables antes de validar. Sin
 * `__v`; las fechas son las del registro (creada, entregada, completada).
 */

const opciones = { _id: false, strict: 'throw', versionKey: false };
const esVerdadero = { validator: (valor) => valor === true, message: 'La constancia debe estar marcada.' };
const numeroONulo = { type: Number, default: null };

const esquemaConstancia = new mongoose.Schema(
  {
    consentimientoFirmado: { type: Boolean, required: true, validate: esVerdadero },
    versionConsentimiento: { type: String, required: true, match: PATRON_VERSION },
    mayorDeEdad: { type: Boolean, required: true, validate: esVerdadero }
  },
  opciones
);

const conteo = { type: Number, required: true, min: 0 };

const esquemaContextoTarea = new mongoose.Schema(
  {
    tarea: { type: String, required: true, enum: Object.values(TAREAS) },
    pausas: conteo,
    repeticionesInstruccion: conteo
  },
  opciones
);

const esquemaContextoSesion = new mongoose.Schema(
  {
    tipoEntrada: { type: String, enum: ['teclado', 'tactil', 'raton', null], default: null },
    pausas: numeroONulo,
    repeticionesInstruccion: numeroONulo
  },
  opciones
);

const esquemaIndicador = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    constructo: { type: String, required: true },
    metrica: { type: String, required: true },
    unidad: { type: String, required: true },
    observado: numeroONulo,
    criterioAlcanzado: { type: Boolean }
  },
  opciones
);

const esquemaVariablesTarea = new mongoose.Schema(
  {
    tasaOmision: numeroONulo,
    tasaAnticipacion: numeroONulo,
    variabilidadTiempoReaccion: numeroONulo,
    coeficienteVariacion: numeroONulo,
    rectificacionesPromedio: numeroONulo
  },
  opciones
);

const esquemaResultadoTarea = new mongoose.Schema(
  {
    tarea: { type: String, required: true, enum: Object.values(TAREAS) },
    titulo: { type: String, required: true },
    indicadores: { type: [esquemaIndicador], default: undefined },
    contexto: { type: esquemaVariablesTarea, required: true }
  },
  opciones
);

const esquemaResultado = new mongoose.Schema(
  {
    versionAlgoritmo: { type: String, required: true },
    versionCatalogo: { type: String, default: null },
    tareas: { type: [esquemaResultadoTarea], default: undefined },
    contexto: { type: esquemaContextoSesion, required: true }
  },
  opciones
);

const esRespuestasSus = {
  validator: (valores) =>
    Array.isArray(valores) &&
    valores.length === NUMERO_ITEMS &&
    valores.every((v) => Number.isInteger(v) && v >= MINIMO && v <= MAXIMO),
  message: `El SUS tiene ${NUMERO_ITEMS} respuestas de ${MINIMO} a ${MAXIMO}.`
};

const esquemaSus = new mongoose.Schema(
  {
    respuestas: { type: [Number], validate: esRespuestasSus, default: undefined },
    valorSUS: { type: Number, required: true, min: 0, max: 100 },
    version: { type: String, required: true },
    respondidoEn: { type: Date, required: true }
  },
  opciones
);

const esquema = new mongoose.Schema(
  {
    seudonimo: {
      type: String,
      required: true,
      unique: true,
      validate: { validator: esSeudonimoValido, message: 'El seudónimo no tiene el formato XXXX-XXXX.' }
    },
    profesional: { type: mongoose.Schema.Types.ObjectId, required: true },
    estado: { type: String, required: true, enum: Object.values(ESTADOS_SESION) },
    constancia: { type: esquemaConstancia, required: true },
    versionCatalogo: { type: String, required: true },
    semilla: { type: Number, required: true, min: 0, max: 2 ** 32 - 1 },
    reloj: { type: String, required: true, enum: [RELOJ_APLICACION] },
    navegador: { type: String, match: PATRON_NAVEGADOR },
    creadaEn: { type: Date, required: true },
    entregadaEn: { type: Date },
    completadaEn: { type: Date },
    tareasRecibidas: { type: [{ type: String, enum: Object.values(TAREAS) }], default: [] },
    contextosTareas: { type: [esquemaContextoTarea], default: [] },
    contexto: { type: esquemaContextoSesion },
    resultado: { type: esquemaResultado },
    sus: { type: esquemaSus },
    tokenAplicacionHash: { type: String, select: false }
  },
  {
    collection: 'sesion_registro',
    strict: 'throw',
    versionKey: false,
    timestamps: false,
    toJSON: {
      // Nunca sale en una respuesta, ni por descuido.
      transform(_doc, valor) {
        delete valor.tokenAplicacionHash;
        return valor;
      }
    }
  }
);

esquema.plugin(sinDatosIdentificables);
esquema.index({ profesional: 1, creadaEn: -1 });
esquema.index({ tokenAplicacionHash: 1 }, { sparse: true });

module.exports = mongoose.model('SesionRegistro', esquema);
