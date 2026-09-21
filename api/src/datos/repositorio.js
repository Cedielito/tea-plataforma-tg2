'use strict';
const mongoose = require('mongoose');
const { esquemas } = require('./modelos');
const { INDICADORES } = require('../dominio/indicadores/calculos');
const { revocar, COLECCIONES_SUPRIMIBLES } = require('../dominio/privacidad/consentimiento');

const Participante = mongoose.model('Participante', esquemas.participanteSchema);
const Consentimiento = mongoose.model('Consentimiento', esquemas.consentimientoSchema);
const Sesion = mongoose.model('Sesion', esquemas.sesionSchema);
const EventoConductual = mongoose.model('EventoConductual', esquemas.eventoConductualSchema);
const RespuestaCuidador = mongoose.model('RespuestaCuidador', esquemas.respuestaCuidadorSchema);
const Puntuacion = mongoose.model('Puntuacion', esquemas.puntuacionSchema);

/** CT-12. Modelo que respalda cada coleccion suprimible declarada por el dominio. */
const MODELOS_SUPRIMIBLES = {
  participante: Participante,
  sesion: Sesion,
  evento_conductual: EventoConductual,
  respuesta_cuidador: RespuestaCuidador,
  puntuacion: Puntuacion
};

/** Reparte los eventos entre los indicadores segun el minijuego que los origina. */
function armarEntrada(eventos) {
  const entrada = {};
  for (const [codigo, cfg] of Object.entries(INDICADORES)) {
    entrada[codigo] = eventos.filter((e) => e.minijuego === cfg.componente);
  }
  return entrada;
}

module.exports = {
  crearParticipante: (datos) => Participante.create(datos),
  obtenerParticipante: (uuid) => Participante.findOne({ uuid }).lean(),
  obtenerConsentimiento: (uuid) => Consentimiento.findOne({ uuid }).lean(),
  guardarEventos: async (uuid, lote) => {
    const docs = await EventoConductual.insertMany(lote.map((e) => ({ ...e, uuid })));
    return docs.length;
  },
  guardarReporteCuidador: async (uuid, lote) => {
    const docs = await RespuestaCuidador.insertMany(lote.map((r) => ({ ...r, uuid })));
    return docs.length;
  },
  armarSesionParaPuntuar: async (uuid) => {
    const sesion = await Sesion.findOne({ uuid }).lean();
    if (!sesion) return null;
    const eventos = await EventoConductual.find({ uuid }).lean();
    const reporteCuidador = await RespuestaCuidador.find({ uuid }).lean();
    return {
      uuid,
      estadoSesion: sesion.estadoSesion,
      versionCatalogo: sesion.versionCatalogo,
      contexto: { ...sesion.contexto, pausas: sesion.pausas, repeticionesInstruccion: sesion.repeticionesInstruccion },
      eventos,
      entrada: armarEntrada(eventos),
      reporteCuidador
    };
  },
  /** CT-12. Deja la constancia de revocacion sin pisar la fecha de una revocacion previa. */
  marcarConsentimientoRevocado: async (uuid, fecha) => {
    const actual = await Consentimiento.findOne({ uuid }).lean();
    if (!actual) return null;
    const revocado = revocar(actual, fecha);
    await Consentimiento.updateOne({ uuid }, {
      $set: {
        revocado: true,
        fechaRevocacion: revocado.fechaRevocacion,
        'finalidades.registro_conductual': false
      }
    });
    return { consentimiento: revocado, yaEstabaRevocado: actual.revocado === true };
  },
  /**
   * CT-12 y HU-10. Supresion efectiva: borra el contenido conductual del
   * seudonimo en las colecciones que declara el dominio. Idempotente: repetirla
   * devuelve ceros en vez de fallar, y termina un borrado interrumpido.
   */
  suprimirDatosSesion: async (uuid) => {
    const suprimido = {};
    for (const coleccion of COLECCIONES_SUPRIMIBLES) {
      const { deletedCount } = await MODELOS_SUPRIMIBLES[coleccion].deleteMany({ uuid });
      suprimido[coleccion] = deletedCount;
    }
    return suprimido;
  },
  guardarPuntuacion: (resultado) => {
    const filas = Object.entries(resultado.indicadores).map(([indicador, d]) => ({
      uuid: resultado.uuid, indicador, valorObservado: d.observado, percentil: d.percentil,
      provisional: d.provisional, dominio: d.dominio, origen: 'desempeno',
      versionAlgoritmo: resultado.versionAlgoritmo, versionCatalogo: resultado.versionCatalogo
    }));
    for (const [escala, d] of Object.entries(resultado.escalasReporte)) {
      filas.push({
        uuid: resultado.uuid, indicador: escala, valorObservado: d.valorObservado,
        provisional: true, dominio: d.dominio, origen: 'reporte_informante',
        versionAlgoritmo: resultado.versionAlgoritmo, versionCatalogo: resultado.versionCatalogo
      });
    }
    return Puntuacion.insertMany(filas);
  }
};
