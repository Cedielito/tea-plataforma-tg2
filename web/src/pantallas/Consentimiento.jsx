import { useState } from 'react';

/** M-01. CT-12: cada finalidad se autoriza por separado, sin aceptacion global. */
const FINALIDADES = [
  ['registro_conductual', 'Registro de las respuestas del menor durante la actividad'],
  ['devolucion_resultados', 'Contacto para la devolución de resultados'],
  ['uso_academico_anonimizado', 'Uso anonimizado de los datos con fines académicos']
];

export default function Consentimiento({ onAutorizar, onCancelar }) {
  const [marcadas, setMarcadas] = useState({});
  const puedeContinuar = marcadas.registro_conductual === true;

  return (
    <main>
      <h1>Autorización de tratamiento de datos</h1>
      <p>
        Esta plataforma no emite diagnósticos. Registra respuestas a actividades de juego
        para orientar la prioridad de una valoración profesional.
      </p>
      <fieldset>
        <legend>Marque las finalidades que autoriza</legend>
        {FINALIDADES.map(([clave, texto]) => (
          <label key={clave} style={{ display: 'block', margin: '12px 0' }}>
            <input
              type="checkbox"
              checked={marcadas[clave] === true}
              onChange={(e) => setMarcadas({ ...marcadas, [clave]: e.target.checked })}
            />{' '}
            {texto}
          </label>
        ))}
      </fieldset>
      {!puedeContinuar && (
        <p role="status">Sin la primera autorización no es posible iniciar la actividad.</p>
      )}
      <button onClick={onCancelar}>Cancelar</button>
      <button
        disabled={!puedeContinuar}
        onClick={() => onAutorizar({
          finalidades: FINALIDADES.reduce((a, [k]) => ({ ...a, [k]: marcadas[k] === true }), {}),
          versionFormato: 'v1',
          fecha: new Date().toISOString()
        })}
      >
        Autorizar
      </button>
    </main>
  );
}
