'use strict';
const { MensajeContacto } = require('./modelos');
const { DIAS_CONSERVACION, SEGUNDOS_CONSERVACION } = require('../dominio/contacto');

/**
 * Supresion automatica de los mensajes de contacto a los 180 dias. M-06,
 * RF-11, RS-04
 *
 * La hace MongoDB con el indice TTL de `mensaje_contacto` (cada minuto
 * revisa y borra los vencidos), no una tarea programada en Express: la API
 * gratuita de Render se duerme y una tarea asi no correria. Al arrancar se
 * asegura que el indice exista y se comprueba su plazo; el resultado queda en
 * el registro. Nunca lanza: un problema con el indice no detiene la API.
 *
 * @returns {Promise<boolean>} true si el indice existe con el plazo esperado
 */
async function prepararSupresionAutomatica({ registro = console } = {}) {
  try {
    await MensajeContacto.init();
    const indices = await MensajeContacto.collection.indexes();
    const ttl = indices.find((indice) => indice.key && indice.key.fecha === 1 && 'expireAfterSeconds' in indice);
    if (!ttl || ttl.expireAfterSeconds !== SEGUNDOS_CONSERVACION) {
      registro.error(
        `Mensajes de contacto: el índice de supresión automática no tiene el plazo de ${DIAS_CONSERVACION} días. ` +
          'Revisa docs/despliegue.md («Supresión automática de mensajes»).'
      );
      return false;
    }
    registro.log(`Mensajes de contacto: se suprimen automáticamente a los ${DIAS_CONSERVACION} días.`);
    return true;
  } catch (error) {
    registro.error(`Mensajes de contacto: no se pudo preparar la supresión automática: ${error.message}`);
    return false;
  }
}

module.exports = { prepararSupresionAutomatica };
