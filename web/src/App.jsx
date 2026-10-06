import './tokens.css';

/**
 * Pantalla provisional de la Fase I. Se reemplaza en T1 (feat/base-visual)
 * por el layout con navegación, barra de accesibilidad (M-07) e inicio (M-01).
 */
export default function App() {
  return (
    <main id="contenido" className="provisional">
      <h1>Plataforma TEA</h1>
      <p>
        Información y orientación sobre el trastorno del espectro autista para familias y
        docentes de niños, niñas y adolescentes de 4 a 17 años en Colombia.
      </p>
      <p role="note" className="aviso">
        Esta información no constituye diagnóstico ni sustituye la valoración profesional.
      </p>
      <p className="secundario">Sitio en construcción.</p>
    </main>
  );
}
