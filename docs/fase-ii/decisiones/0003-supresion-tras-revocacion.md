# 0003 — La revocación suprime los datos, no solo los marca

**Estado:** aceptada

**Contexto.** `revocar()` dejaba constancia de la revocación y apagaba la finalidad
`registro_conductual`, con lo que la puerta `exigirConsentimiento` bloqueaba toda
recolección posterior. Pero los datos ya recogidos seguían en las colecciones. HU-10 y
RF-09 exigen supresión, no solo suspensión.

**Decisión.** Revocar es una operación en dos pasos, en este orden: primero se deja la
constancia en `consentimiento`, después se suprime el contenido conductual del seudónimo
en `participante`, `sesion`, `evento_conductual`, `respuesta_cuidador` y `puntuacion`.
Sobrevive únicamente `consentimiento`, con `revocado`, `fechaRevocacion` y
`registro_conductual: false`.

**Razones.**

- El orden importa. Marcar primero cierra la puerta: un lote de eventos en vuelo se
  rechaza con 403 y no queda escritura posterior al borrado.
- `sesion` entra en la lista. Guarda pausas, contexto de dispositivo y minijuegos
  completados bajo el mismo seudónimo: es dato conductual de la sesión suprimida.
- La revocación es idempotente. La segunda llamada conserva la `fechaRevocacion`
  original —esa primera fecha es la constancia— y vuelve a ejecutar la supresión, de modo
  que un borrado interrumpido a la mitad se completa al reintentar.
- `POST /api/sesiones/:uuid/revocacion` no pasa por `exigirConsentimiento`: esa puerta
  rechaza un consentimiento ya revocado y revocar dos veces debe responder 200, no 403.

**Consecuencias.**

- `COLECCIONES_SUPRIMIBLES` vive en `dominio/privacidad/consentimiento.js` como constante
  literal, no derivada de `datos/modelos`: el dominio es puro y no importa mongoose. La
  prueba `la lista suprimible es el Cuadro 19 menos consentimiento y profesional` compara
  ambas listas, de modo que una colección conductual nueva no puede quedar sin suprimir.
- `puedeIniciarSesion()` comprueba `revocado` antes de validar. Antes devolvía
  `consentimiento_invalido` —porque `revocar()` apaga `registro_conductual`— y ocultaba el
  motivo real. Un consentimiento ausente sigue devolviendo `consentimiento_invalido`.

**Pendiente: autenticación.** La ruta **aún no exige autenticación del acudiente**, porque
las cuentas de acudiente y profesional son otra tarea del Sprint 1 (HU-09, HU-13). Hoy
cualquiera que conozca el seudónimo puede suprimir la sesión. **Cuando exista la
autenticación, esta ruta debe exigirla**: es la única del sistema que borra datos y no
puede quedar abierta en el despliegue del Sprint 4.

**Fuera de alcance.** La bitácora de auditoría de RF-38 no se implementa aquí: el
Cuadro 19 no contempla esa colección y crearla es un cambio de esquema. Por ahora la
constancia de la revocación vive en `consentimiento`.
