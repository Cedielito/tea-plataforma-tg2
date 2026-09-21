/** M-02. CT-14: acto independiente del consentimiento parental. */
export default function Asentimiento({ modalidad, onResponder }) {
  const pictografico = modalidad === 'pictografico';
  return (
    <main>
      <h1>{pictografico ? '¿Quieres jugar hoy?' : '¿Aceptas participar en la actividad?'}</h1>
      {!pictografico && (
        <p>Puedes decir que no. Nadie va a molestarse y puedes parar cuando quieras.</p>
      )}
      <button aria-label="Sí, quiero participar" onClick={() => onResponder(true)}>
        {pictografico ? '🙂 Sí' : 'Sí, acepto'}
      </button>
      <button aria-label="No quiero participar" onClick={() => onResponder(false)}>
        {pictografico ? '🙁 No' : 'No, prefiero no participar'}
      </button>
    </main>
  );
}
