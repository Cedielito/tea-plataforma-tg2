/**
 * Cartel de la tarea de Navon (M-09, CC-10): una letra grande, H o S, hecha
 * con letras pequeñas, H o S, sobre una cuadrícula de 5 × 7
 * (estimulosNavon.js). Dibujado por código en SVG, plano y sin animación.
 *
 * Las letras pequeñas son trazos, no texto: se ven igual en todo navegador y
 * no dependen de la fuente. El tamaño es fijo en píxeles
 * (--figura-navon-* en tokens.css): no cambia con el tamaño de letra de la
 * barra de accesibilidad, porque el tamaño relativo de los dos niveles es
 * parte del estímulo. El color (--estimulo-contorno) no cambia con el alto
 * contraste.
 */
import { posicionesDe } from './estimulosNavon.js';
import { nombreFiguraNavon } from './textos.js';

/** Lado de cada celda de la cuadrícula, en unidades del viewBox. */
const CELDA = 40;
const COLUMNAS = 5;
const FILAS = 7;
const COLOR = 'var(--estimulo-contorno)';

/** Letras pequeñas dibujadas en una caja de 24 × 32, centrada en su celda. */
function LetraH() {
  return (
    <g fill={COLOR}>
      <rect x="1" y="0" width="5" height="32" />
      <rect x="18" y="0" width="5" height="32" />
      <rect x="1" y="13.5" width="22" height="5" />
    </g>
  );
}

function LetraS() {
  return (
    <path
      d="M21 6.5 C19 2.5 15.5 2.5 12 2.5 C7 2.5 3.5 5 3.5 9 C3.5 13.5 8 15 12 16 C16 17 20.5 18.5 20.5 23 C20.5 27 17 29.5 12 29.5 C8.5 29.5 5 29.5 3 25.5"
      fill="none"
      stroke={COLOR}
      strokeWidth="5"
      strokeLinecap="round"
    />
  );
}

const LETRAS = { H: LetraH, S: LetraS };

/**
 * @param {{estimulo: {global: string, local: string}, className?: string}} props
 */
export default function FiguraNavon({ estimulo, className = '' }) {
  const Pequena = LETRAS[estimulo.local];
  return (
    <svg
      viewBox={`0 0 ${COLUMNAS * CELDA} ${FILAS * CELDA}`}
      className={`figura-navon ${className}`.trim()}
      focusable="false"
      role="img"
      aria-label={nombreFiguraNavon(estimulo)}
    >
      {posicionesDe(estimulo.global).map(({ x, y }) => (
        <g key={`${x}-${y}`} transform={`translate(${x * CELDA + 8} ${y * CELDA + 4})`}>
          <Pequena />
        </g>
      ))}
    </svg>
  );
}
