'use strict';

/** Finalidades que el representante legal autoriza por separado (CT-12). */
const FINALIDADES = ['registro_conductual', 'devolucion_resultados', 'uso_academico_anonimizado'];

/** CT-12. No se admite autorizacion global implicita: cada finalidad es explicita. */
function validarConsentimiento(entrada) {
  const errores = [];
  if (!entrada || typeof entrada !== 'object') {
    return { valido: false, errores: ['consentimiento ausente'] };
  }
  const finalidades = entrada.finalidades;
  if (!finalidades || typeof finalidades !== 'object' || Array.isArray(finalidades)) {
    errores.push('finalidades ausentes');
  } else {
    for (const f of FINALIDADES) {
      if (typeof finalidades[f] !== 'boolean') errores.push('finalidad no declarada: ' + f);
    }
    if (finalidades.registro_conductual !== true) {
      errores.push('sin autorizacion de registro conductual no puede iniciarse la sesion');
    }
  }
  if (!entrada.versionFormato) errores.push('version del formato de consentimiento ausente');
  if (!entrada.fecha) errores.push('fecha de otorgamiento ausente');
  return { valido: errores.length === 0, errores };
}

/**
 * CT-14. El asentimiento del menor es un acto independiente y posterior.
 * Su negativa bloquea la sesion aunque exista autorizacion del representante.
 */
function puedeIniciarSesion({ consentimiento, asentimiento }) {
  // La revocacion se comprueba primero: revocar() apaga registro_conductual, de modo
  // que validarConsentimiento() reportaria 'consentimiento_invalido' y ocultaria el
  // motivo real. Un consentimiento ausente no llega aqui: no es un objeto.
  if (consentimiento && typeof consentimiento === 'object' && consentimiento.revocado === true) {
    return { permitido: false, motivo: 'consentimiento_revocado' };
  }
  const val = validarConsentimiento(consentimiento);
  if (!val.valido) return { permitido: false, motivo: 'consentimiento_invalido', detalle: val.errores };
  if (!asentimiento || asentimiento.aceptado !== true) {
    return { permitido: false, motivo: 'asentimiento_negado' };
  }
  return { permitido: true };
}

/** CT-14. La modalidad del asentimiento depende del tramo de edad. */
function modalidadAsentimiento(edad) {
  if (typeof edad !== 'number' || Number.isNaN(edad)) throw new TypeError('edad invalida');
  if (edad < 4 || edad > 17) throw new RangeError('edad fuera del rango 4-17');
  return edad <= 11 ? 'pictografico' : 'escrito';
}

/**
 * CT-12. La revocacion inhabilita el registro conductual y deja constancia.
 * Es idempotente: si ya estaba revocado conserva la fechaRevocacion original,
 * porque esa primera fecha es la constancia que la norma exige preservar.
 */
function revocar(consentimiento, fecha) {
  const yaRevocado = consentimiento.revocado === true;
  return {
    ...consentimiento,
    revocado: true,
    fechaRevocacion: yaRevocado && consentimiento.fechaRevocacion ? consentimiento.fechaRevocacion : fecha,
    finalidades: { ...consentimiento.finalidades, registro_conductual: false }
  };
}

/**
 * CT-12. Colecciones del Cuadro 19 cuyo contenido se suprime al revocar.
 * Se declara aqui como constante y no se deriva de datos/modelos porque el
 * dominio es puro: no importa mongoose ni la capa de persistencia. La prueba
 * `CT-12 supresion tras la revocacion` la contrasta con COLECCIONES para que
 * una coleccion conductual nueva no quede sin suprimir.
 */
const COLECCIONES_SUPRIMIBLES = [
  'participante', 'sesion', 'evento_conductual', 'respuesta_cuidador', 'puntuacion'
];

/** CT-12. Colecciones que sobreviven a la revocacion. */
const COLECCIONES_CONSERVADAS = ['consentimiento'];

/**
 * CT-12 y HU-10. Declara que se suprime y que se conserva al revocar. Es pura:
 * no toca la base de datos. La ruta ejecuta el plan que esta funcion describe.
 */
function planificarSupresion(consentimiento, fecha) {
  if (!consentimiento || typeof consentimiento !== 'object') {
    throw new TypeError('consentimiento ausente');
  }
  return {
    consentimiento: revocar(consentimiento, fecha),
    suprimir: [...COLECCIONES_SUPRIMIBLES],
    conservar: [...COLECCIONES_CONSERVADAS],
    yaEstabaRevocado: consentimiento.revocado === true
  };
}

module.exports = {
  FINALIDADES,
  COLECCIONES_SUPRIMIBLES,
  COLECCIONES_CONSERVADAS,
  validarConsentimiento,
  puedeIniciarSesion,
  modalidadAsentimiento,
  revocar,
  planificarSupresion
};
