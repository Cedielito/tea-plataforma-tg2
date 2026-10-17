/**
 * Figuras de la tarea de cambio de regla (M-09): conejo y barco, rojos o
 * azules, dibujados por código en SVG, planos y sin animación. El color es
 * el estímulo: sale de las variables --estimulo-* de tokens.css, que el modo
 * alto contraste no cambia (coloresEstimulo.test.js).
 */
import { nombreFigura } from './textos.js';

const RELLENO = { rojo: 'var(--estimulo-rojo)', azul: 'var(--estimulo-azul)' };
const CONTORNO = 'var(--estimulo-contorno)';

function Conejo({ relleno }) {
  return (
    <g fill={relleno} stroke={CONTORNO} strokeWidth="2" strokeLinejoin="round">
      <ellipse cx="29" cy="20" rx="5.5" ry="15" transform="rotate(-12 29 20)" />
      <ellipse cx="41" cy="19" rx="5.5" ry="15" transform="rotate(10 41 19)" />
      <ellipse cx="57" cy="66" rx="27" ry="21" />
      <circle cx="84" cy="62" r="6" />
      <circle cx="35" cy="45" r="15" />
      <ellipse cx="40" cy="86" rx="10" ry="4.5" />
      <circle cx="30" cy="42" r="2.2" fill={CONTORNO} stroke="none" />
    </g>
  );
}

function Barco({ relleno }) {
  return (
    <g fill={relleno} stroke={CONTORNO} strokeWidth="2" strokeLinejoin="round">
      <rect x="47.5" y="12" width="5" height="52" />
      <path d="M55 16 L55 56 L84 56 Z" />
      <path d="M45 24 L45 56 L22 56 Z" />
      <path d="M8 62 L92 62 L78 84 L22 84 Z" />
    </g>
  );
}

/**
 * @param {{estimulo: {forma: string, color: string}, decorativa?: boolean, className?: string}} props
 *   decorativa: dentro de un botón que ya dice qué caja es
 */
export default function Figura({ estimulo, decorativa = false, className = '' }) {
  const Forma = estimulo.forma === 'conejo' ? Conejo : Barco;
  const accesible = decorativa ? { 'aria-hidden': true } : { role: 'img', 'aria-label': nombreFigura(estimulo) };
  return (
    <svg viewBox="0 0 100 100" className={`figura ${className}`.trim()} focusable="false" {...accesible}>
      <Forma relleno={RELLENO[estimulo.color]} />
    </svg>
  );
}
