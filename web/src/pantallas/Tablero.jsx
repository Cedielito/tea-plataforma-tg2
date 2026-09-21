/** M-07. Tablero del profesional. CP-08: sin comparacion entre usuarios. */
const ETIQUETA_BANDA = {
  sin_indicadores_destacados: 'Sin indicadores destacados',
  seguimiento_sugerido: 'Seguimiento sugerido',
  derivacion_sugerida: 'Derivación sugerida'
};

export default function Tablero({ resultado }) {
  if (!resultado?.puntuada) {
    return <p role="status">La sesión está incompleta y no se puntúa.</p>;
  }
  const dominios = Object.entries(resultado.perfil);
  return (
    <section>
      <h1>Sesión {resultado.uuid.slice(0, 8)}…</h1>
      <table>
        <caption>Perfil por dominio del DSM-5-TR</caption>
        <thead>
          <tr><th>Dominio</th><th>Indicadores</th><th>Cobertura</th></tr>
        </thead>
        <tbody>
          {dominios.map(([d, v]) => (
            <tr key={d}>
              <td>{d}</td>
              <td>{v.sinDatos ? 'sin datos' : v.indicadores.join(', ')}</td>
              <td>{v.coberturaParcial ? 'parcial' : 'completa'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><strong>{ETIQUETA_BANDA[resultado.banda] ?? 'Sin banda asignada'}</strong></p>
      <p style={{ color: 'var(--color-aviso)' }}>
        Este resultado no constituye un diagnóstico ni sustituye la valoración clínica.
        Los dominios {resultado.avisos.coberturaParcial.join(', ')} tienen cobertura parcial.
        {resultado.avisos.percentilesProvisionales && ' Los percentiles son provisionales: no hay muestra normativa.'}
      </p>
      <p><small>Versión del algoritmo: {resultado.versionAlgoritmo}</small></p>
    </section>
  );
}
