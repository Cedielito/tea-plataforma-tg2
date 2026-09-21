import { useState } from 'react';
import { AJUSTES_POR_DEFECTO, aplicarAjustes } from '../ajustes';

/** M-02. CT-06 y CC-13: los ajustes se aplican y se registran como indicador. */
export default function PanelSensorial({ onListo }) {
  const [ajustes, setAjustes] = useState(AJUSTES_POR_DEFECTO);
  const [cambios, setCambios] = useState(0);

  function cambiar(clave, valor) {
    const nuevos = { ...ajustes, [clave]: valor };
    setAjustes(aplicarAjustes(nuevos));
    setCambios((c) => c + 1);
  }

  return (
    <main>
      <h1>Antes de empezar</h1>
      <label>Volumen
        <input type="range" min="0" max="100" value={ajustes.volumen}
          onChange={(e) => cambiar('volumen', Number(e.target.value))} />
      </label>
      <label>Tamaño de letra
        <input type="range" min="100" max="200" step="25" value={ajustes.tamanoTipografico}
          onChange={(e) => cambiar('tamanoTipografico', Number(e.target.value))} />
      </label>
      <label>
        <input type="checkbox" checked={ajustes.reduccionMovimiento}
          onChange={(e) => cambiar('reduccionMovimiento', e.target.checked)} /> Menos movimiento
      </label>
      <label>
        <input type="checkbox" checked={ajustes.altoContraste}
          onChange={(e) => cambiar('altoContraste', e.target.checked)} /> Más contraste
      </label>
      <button onClick={() => onListo(ajustes, cambios)}>Estoy listo</button>
    </main>
  );
}
