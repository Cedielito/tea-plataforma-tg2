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
  const val = validarConsentimiento(consentimiento);
  if (!val.valido) return { permitido: false, motivo: 'consentimiento_invalido', detalle: val.errores };
  if (consentimiento.revocado === true) return { permitido: false, motivo: 'consentimiento_revocado' };
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

/** CT-12. La revocacion inhabilita el registro conductual y deja constancia. */
function revocar(consentimiento, fecha) {
  return {
    ...consentimiento,
    revocado: true,
    fechaRevocacion: fecha,
    finalidades: { ...consentimiento.finalidades, registro_conductual: false }
  };
}

module.exports = { FINALIDADES, validarConsentimiento, puedeIniciarSesion, modalidadAsentimiento, revocar };
