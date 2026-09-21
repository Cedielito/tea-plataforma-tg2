'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Las siete colecciones del Cuadro 19. La separacion es deliberada: la unica
 * coleccion que admite datos del representante legal es `consentimiento`, y se
 * relaciona con el resto mediante el seudonimo de la sesion (CT-11).
 */

const participanteSchema = new Schema({
  uuid: { type: String, required: true, unique: true, index: true },
  edad: { type: Number, required: true, min: 4, max: 17 },
  tramo: { type: String, enum: ['4-7', '8-17'], required: true },
  sexo: { type: String, enum: ['f', 'm', 'otro', 'no_declara'] },
  region: { type: String },
  ajustesSensoriales: {
    volumen: { type: Number, default: 60 },
    reduccionMovimiento: { type: Boolean, default: false },
    altoContraste: { type: Boolean, default: false },
    tamanoTipografico: { type: Number, default: 100 }
  }
}, { timestamps: true, collection: 'participante' });

const consentimientoSchema = new Schema({
  uuid: { type: String, required: true, index: true },
  finalidades: {
    registro_conductual: { type: Boolean, required: true },
    devolucion_resultados: { type: Boolean, required: true },
    uso_academico_anonimizado: { type: Boolean, required: true }
  },
  versionFormato: { type: String, required: true },
  fecha: { type: Date, required: true },
  asentimiento: {
    modalidad: { type: String, enum: ['pictografico', 'escrito'] },
    aceptado: { type: Boolean },
    fecha: { type: Date }
  },
  revocado: { type: Boolean, default: false },
  fechaRevocacion: { type: Date }
}, { collection: 'consentimiento' });

const sesionSchema = new Schema({
  uuid: { type: String, required: true, index: true },
  // RF-24: los tres estados finales posibles de una sesion
  estadoSesion: { type: String, enum: ['en_curso', 'completada', 'interrumpida', 'abandonada'], default: 'en_curso' },
  minijuegosCompletados: [{ type: String }],
  pausas: [{ inicio: Date, fin: Date, duracionMs: Number }],
  repeticionesInstruccion: { type: Number, default: 0 },
  // Metadatos de contexto: se registran para interpretar, nunca como indicador
  contexto: {
    dispositivo: { type: String, enum: ['tablet', 'escritorio', 'movil'] },
    tipoEntrada: { type: String, enum: ['tactil', 'raton', 'teclado'] },
    audioDesactivado: { type: Boolean, default: false },
    nivelVolumen: { type: Number, default: 0.8 },
    modoEstimuloReducido: { type: Boolean, default: false }
  },
  // RF-33: permite excluir de la comparacion sesiones con contenidos distintos
  versionCatalogo: { type: String, required: true }
}, { timestamps: true, collection: 'sesion' });

const eventoConductualSchema = new Schema({
  uuid: { type: String, required: true, index: true },
  minijuego: { type: String, required: true },
  bloque: { type: String, required: true },
  numeroEnsayo: { type: Number, required: true },
  practica: { type: Boolean, default: false },
  constructo: { type: String },
  condicion: { type: String },
  // MJ-3: clasificacion explicita del error en el momento del registro
  posteriorACambio: { type: Boolean, default: false },
  claseError: { type: String, enum: ['correcta', 'perseverativa', 'aleatoria'] },
  presentado: { type: String },
  respuesta: { type: String },
  acierto: { type: Boolean },
  // RF-23: la omision nunca se almacena como respuesta incorrecta
  estadoItem: { type: String, enum: ['respondido', 'omitido'], default: 'respondido' },
  tiempoReaccionMs: { type: Number, min: 0 },
  tiempoHastaPrimeraSeleccionMs: { type: Number, min: 0 },
  // RF-20: intervalo pausado, que se descuenta del tiempo de reaccion
  pausasDuranteItemMs: { type: Number, default: 0 },
  rectificaciones: { type: Number, default: 0 }
}, { collection: 'evento_conductual' });

const respuestaCuidadorSchema = new Schema({
  uuid: { type: String, required: true, index: true },
  escala: { type: String, enum: ['RC-01', 'RC-02', 'RC-03', 'RC-04', 'RC-05'], required: true },
  item: { type: String, required: true },
  respuesta: { type: String, enum: ['nunca', 'a_veces', 'con_frecuencia', 'casi_siempre'], required: true },
  fecha: { type: Date, default: Date.now }
}, { collection: 'respuesta_cuidador' });

const puntuacionSchema = new Schema({
  uuid: { type: String, required: true, index: true },
  indicador: { type: String, required: true },
  valorObservado: { type: Schema.Types.Mixed },
  percentil: { type: Number },
  provisional: { type: Boolean, default: true },
  dominio: { type: String, enum: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4'] },
  // RF-42: el tablero debe distinguir desempeno observado de reporte de informante
  origen: { type: String, enum: ['desempeno', 'reporte_informante'], required: true },
  versionAlgoritmo: { type: String, required: true, immutable: true },
  versionCatalogo: { type: String, immutable: true }
}, { timestamps: true, collection: 'puntuacion' });

const profesionalSchema = new Schema({
  identificador: { type: String, required: true, unique: true },
  rol: { type: String, enum: ['psicologia', 'neuropediatria', 'educacion_especial'], required: true },
  sesionesAsignadas: [{ type: String }],
  observaciones: [{ uuid: String, texto: String, fecha: { type: Date, default: Date.now } }]
}, { collection: 'profesional' });

module.exports = {
  esquemas: {
    participanteSchema, consentimientoSchema, sesionSchema, eventoConductualSchema,
    respuestaCuidadorSchema, puntuacionSchema, profesionalSchema
  },
  COLECCIONES: ['participante', 'consentimiento', 'sesion', 'evento_conductual',
    'respuesta_cuidador', 'puntuacion', 'profesional']
};
