'use strict';
const mongoose = require('mongoose');
const { esquemas } = require('./modelos');
const { INDICADORES } = require('../dominio/indicadores/calculos');
const { VERSION_CATALOGO } = require('../dominio/puntuacion/version');

const Participante = mongoose.model('Participante', esquemas.participanteSchema);
const Consentimiento = mongoose.model('Consentimiento', esquemas.consentimientoSchema);
const Sesion = mongoose.model('Sesion', esquemas.sesionSchema);
const EventoConductual = mongoose.model('EventoConductual', esquemas.eventoConductualSchema);
const RespuestaCuidador = mongoose.model('RespuestaCuidador', esquemas.respuestaCuidadorSchema);
const Puntuacion = mongoose.model('Puntuacion', esquemas.puntuacionSchema);

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
  crearSesion: (datos) => Sesion.create({ versionCatalogo: VERSION_CATALOGO, ...datos }),
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
