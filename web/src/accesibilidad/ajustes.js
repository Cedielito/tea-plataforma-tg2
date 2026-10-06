/**
 * Ajustes de accesibilidad (M-07): valores, lectura y escritura en sessionStorage
 * (solo durante la visita, sin cookies, RS-01) y aplicación de clases en <html>.
 * El script en línea de index.html repite la aplicación antes del primer pintado;
 * si cambias la clave o las clases, cámbialas también allí.
 */
export const CLAVE_AJUSTES = 'tea-ajustes';

export const TAMANOS = [
  { valor: 'normal', etiqueta: 'Normal', clase: null },
  { valor: 'grande', etiqueta: 'Grande', clase: 'letra-grande' },
  { valor: 'muy-grande', etiqueta: 'Muy grande', clase: 'letra-muy-grande' }
];

export const AJUSTES_INICIALES = {
  tamano: 'normal',
  altoContraste: false,
  reducirMovimiento: false
};

export function leerAjustes() {
  try {
    const guardados = JSON.parse(sessionStorage.getItem(CLAVE_AJUSTES) || '{}');
    return {
      tamano: TAMANOS.some((t) => t.valor === guardados.tamano) ? guardados.tamano : 'normal',
      altoContraste: guardados.altoContraste === true,
      reducirMovimiento: guardados.reducirMovimiento === true
    };
  } catch {
    return { ...AJUSTES_INICIALES };
  }
}

export function guardarAjustes(ajustes) {
  try {
    sessionStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): el ajuste vale hasta recargar.
  }
}

export function aplicarAjustes(ajustes, raiz = document.documentElement) {
  for (const { valor, clase } of TAMANOS) {
    if (clase) raiz.classList.toggle(clase, ajustes.tamano === valor);
  }
  raiz.classList.toggle('alto-contraste', ajustes.altoContraste);
  raiz.classList.toggle('sin-movimiento', ajustes.reducirMovimiento);
}
