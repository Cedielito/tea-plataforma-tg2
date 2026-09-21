/** CT-06. Ajustes sensoriales aplicados antes de iniciar y persistidos en la sesion. */
export const AJUSTES_POR_DEFECTO = {
  volumen: 60,
  reduccionMovimiento: false,
  altoContraste: false,
  tamanoTipografico: 100
};

export function aplicarAjustes(ajustes, raiz = document.documentElement) {
  raiz.style.setProperty('--tipo-base', `${(16 * ajustes.tamanoTipografico) / 100}px`);
  raiz.classList.toggle('sin-movimiento', ajustes.reduccionMovimiento);
  raiz.classList.toggle('alto-contraste', ajustes.altoContraste);
  return ajustes;
}
