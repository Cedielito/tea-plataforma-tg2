'use strict';
const { contieneDatoIdentificable } = require('../../dominio/registro/seudonimo');

/**
 * Plugin de los esquemas del registro conductual (sesion_registro y
 * ensayo_registro). M-09, CT-11
 *
 * Antes de validar, revisa el documento completo con contieneDatoIdentificable
 * (seudonimo.js): si alguna clave, en cualquier nivel, es un dato que
 * identifica a una persona (nombre, documento, correo, telefono, ...), el
 * guardado falla con un error de validacion. Los esquemas ya rechazan los
 * campos que no declaran (strict: 'throw'); esto cubre lo que un cambio
 * futuro del esquema pudiera dejar pasar. Corre tambien en insertMany.
 */

const MENSAJE = 'El registro no guarda datos que identifiquen a una persona.';

function sinDatosIdentificables(schema) {
  schema.pre('validate', function revisarDatosIdentificables() {
    if (contieneDatoIdentificable(this.toObject({ depopulate: true, virtuals: false }))) {
      this.invalidate('datosIdentificables', MENSAJE);
    }
  });
}

module.exports = { MENSAJE, sinDatosIdentificables };
