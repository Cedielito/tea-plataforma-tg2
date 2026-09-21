/** M-03. CP-06: orden libre. CP-07: progreso por completitud, nunca por aciertos. */
export default function MapaSeleccion({ minijuegos, completados, onElegir }) {
  return (
    <main>
      <h1>¿Con cuál quieres empezar?</h1>
      {minijuegos.map((m) => (
        <button key={m.codigo} onClick={() => onElegir(m.codigo)}
          disabled={completados.includes(m.codigo)}>
          {m.nombre}{completados.includes(m.codigo) ? ' ✓' : ''}
        </button>
      ))}
      <p role="status">
        Progreso: {completados.length} de {minijuegos.length} completados
      </p>
    </main>
  );
}
