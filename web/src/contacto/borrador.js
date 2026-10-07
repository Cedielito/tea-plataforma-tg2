/**
 * Borrador del formulario de contacto, solo en la memoria de la página (M-06;
 * RS-01, RS-02).
 *
 * El enlace a la política abre en la misma pestaña: al volver con «Atrás», lo
 * escrito sigue ahí. No se guarda en sessionStorage ni en ningún otro lado:
 * se pierde al recargar o cerrar la página y se borra al enviar. La casilla
 * de autorización nunca se recuerda: se marca cada vez.
 */

const VACIO = Object.freeze({ correo: '', mensaje: '' });
let borrador = VACIO;

export const leerBorrador = () => borrador;

export function guardarBorrador({ correo, mensaje }) {
  borrador = { correo, mensaje };
}

export function borrarBorrador() {
  borrador = VACIO;
}
