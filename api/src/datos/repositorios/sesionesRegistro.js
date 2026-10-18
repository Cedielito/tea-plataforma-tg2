'use strict';
const { SesionRegistro, EnsayoRegistro } = require('../modelos');
const { ORDEN_TAREAS } = require('../../dominio/registro/catalogo');
const { VERSION_CATALOGO } = require('../../dominio/registro/version');
const seudonimos = require('../../dominio/registro/seudonimo');
const {
  ESTADOS_SESION,
  RELOJ_APLICACION,
  generarSemilla,
  limiteDeAbandono,
  tareasPendientes,
  unirContextos
} = require('../../dominio/registro/sesionRegistro');
const { procesarSesionGuardada, aGuardar } = require('../../dominio/registro/resultado');

/**
 * Repositorio de `sesion_registro` y `ensayo_registro`. M-09, HU-16 a HU-19,
 * CT-11, CT-13, RF-15
 *
 * - Toda lectura y eliminacion del profesional filtra por su cuenta: nadie ve
 *   ni borra las sesiones de otro.
 * - Las escrituras de la sesion pasan por save(), para que corran el esquema
 *   (strict: 'throw') y el plugin sinDatosIdentificables.
 * - guardarTarea es idempotente: borra los ensayos de un intento anterior a
 *   medias antes de insertar, y una tarea ya recibida no se vuelve a guardar.
 * - Al llegar la ultima tarea, la sesion pasa a `completada` y guarda el
 *   resultado de procesarSesion con su version (CT-13).
 * - eliminarDelProfesional borra la sesion y todos sus ensayos (HU-19). Primero
 *   los ensayos: si algo falla a mitad, la sesion sigue en la lista y se puede
 *   volver a eliminar.
 */

const INTENTOS_SEUDONIMO = 5;
/** Las sesiones de un profesional en esta fase son decenas; el limite protege la lista. */
const LIMITE_LISTA = 1000;

const posicion = (ensayo) => ORDEN_TAREAS.indexOf(ensayo.tarea) * 10000 + ensayo.numero;
const enOrden = (ensayos) => [...ensayos].sort((a, b) => posicion(a) - posicion(b));

/**
 * Crea una sesion en curso con un seudonimo nuevo. Si el seudonimo ya existe
 * (indice unico), prueba con otro.
 */
async function crear({ profesional, constancia, ahora }) {
  for (let intento = 1; ; intento += 1) {
    try {
      return await new SesionRegistro({
        seudonimo: seudonimos.generarSeudonimo(),
        profesional,
        estado: ESTADOS_SESION.EN_CURSO,
        constancia,
        versionCatalogo: VERSION_CATALOGO,
        semilla: generarSemilla(),
        reloj: RELOJ_APLICACION,
        creadaEn: ahora
      }).save();
    } catch (error) {
      const repetido = error && error.code === 11000 && error.keyPattern && error.keyPattern.seudonimo;
      if (!repetido || intento >= INTENTOS_SEUDONIMO) throw error;
    }
  }
}

/** Las sesiones en curso creadas hace mas de HORAS_VIGENCIA pasan a abandonadas. */
function marcarAbandonadas(ahora) {
  return SesionRegistro.updateMany(
    { estado: ESTADOS_SESION.EN_CURSO, creadaEn: { $lte: limiteDeAbandono(ahora) } },
    { $set: { estado: ESTADOS_SESION.ABANDONADA }, $unset: { tokenAplicacionHash: 1 } }
  );
}

function listarDelProfesional(profesional) {
  return SesionRegistro.find({ profesional }).sort({ creadaEn: -1, _id: -1 }).limit(LIMITE_LISTA).lean();
}

function obtenerDelProfesional(profesional, seudonimo) {
  return SesionRegistro.findOne({ profesional, seudonimo });
}

/** @returns {Promise<object[]>} ensayos de las sesiones, en el orden de aplicacion */
async function ensayosDe(idsDeSesion) {
  const ensayos = await EnsayoRegistro.find({ sesion: { $in: idsDeSesion } })
    .select({ _id: 0 })
    .lean();
  return enOrden(ensayos);
}

/**
 * Entrega del dispositivo: guarda el hash del token de aplicacion, el
 * navegador y la hora.
 * @param {import('mongoose').Document} sesion resultado de obtenerDelProfesional
 */
function entregar(sesion, { tokenHash, navegador, ahora }) {
  sesion.tokenAplicacionHash = tokenHash;
  sesion.navegador = navegador;
  sesion.entregadaEn = ahora;
  return sesion.save();
}

function buscarPorTokenAplicacion(tokenHash) {
  return SesionRegistro.findOne({ tokenAplicacionHash: tokenHash }).select('+tokenAplicacionHash');
}

/** Termina la aplicacion: la cookie deja de servir. */
function revocarAplicacion(sesion) {
  sesion.tokenAplicacionHash = undefined;
  return sesion.save();
}

/** La pagina de la aplicacion se recargo a mitad de una tarea (RF-15: no se procesa). */
function interrumpir(sesion) {
  sesion.estado = ESTADOS_SESION.INTERRUMPIDA;
  sesion.tokenAplicacionHash = undefined;
  return sesion.save();
}

/**
 * Guarda los ensayos de una tarea. Si con ella llegan todas, procesa la
 * sesion y guarda el resultado.
 * @param {import('mongoose').Document} sesion resultado de buscarPorTokenAplicacion
 */
async function guardarTarea(sesion, { tarea, ensayos, contexto, ahora }) {
  if (sesion.tareasRecibidas.includes(tarea)) return sesion;

  await EnsayoRegistro.deleteMany({ sesion: sesion._id, tarea });
  await EnsayoRegistro.insertMany(
    ensayos.map((ensayo) => ({ ...ensayo, sesion: sesion._id })),
    { ordered: true }
  );
  sesion.tareasRecibidas.push(tarea);
  sesion.contextosTareas.push({ tarea, ...contexto });

  if (tareasPendientes(sesion).length === 0) {
    const guardados = await ensayosDe([sesion._id]);
    const contextoSesion = unirContextos(sesion.contextosTareas, guardados);
    const salida = procesarSesionGuardada(
      {
        seudonimo: sesion.seudonimo,
        estado: ESTADOS_SESION.COMPLETADA,
        versionCatalogo: sesion.versionCatalogo,
        contexto: contextoSesion
      },
      guardados
    );
    sesion.contexto = contextoSesion;
    sesion.estado = ESTADOS_SESION.COMPLETADA;
    sesion.completadaEn = ahora;
    if (salida.procesada) sesion.resultado = aGuardar(salida);
  }
  return sesion.save();
}

function guardarSus(sesion, { respuestas, version, valorSUS, ahora }) {
  sesion.sus = { respuestas, version, valorSUS, respondidoEn: ahora };
  return sesion.save();
}

/** @returns {Promise<boolean>} true si la sesion existia y se borro con sus ensayos */
async function eliminarDelProfesional(profesional, seudonimo) {
  const sesion = await SesionRegistro.findOne({ profesional, seudonimo }).select({ _id: 1 }).lean();
  if (!sesion) return false;
  await EnsayoRegistro.deleteMany({ sesion: sesion._id });
  const { deletedCount } = await SesionRegistro.deleteOne({ _id: sesion._id });
  return deletedCount === 1;
}

module.exports = {
  LIMITE_LISTA,
  crear,
  marcarAbandonadas,
  listarDelProfesional,
  obtenerDelProfesional,
  ensayosDe,
  entregar,
  buscarPorTokenAplicacion,
  revocarAplicacion,
  interrumpir,
  guardarTarea,
  guardarSus,
  eliminarDelProfesional
};
