/**
 * Aviso de no diagnóstico (RCN-03), visible en inicio, señales de alerta y ruta
 * de atención. El texto es literal y no se cambia.
 */
import { Info } from 'lucide-react';

export const TEXTO_NO_DIAGNOSTICO =
  'Esta información no constituye diagnóstico ni sustituye la valoración profesional.';

export default function AvisoNoDiagnostico({ className = '' }) {
  return (
    <div role="note" className={`aviso ${className}`.trim()}>
      <Info aria-hidden="true" />
      <p>{TEXTO_NO_DIAGNOSTICO}</p>
    </div>
  );
}
