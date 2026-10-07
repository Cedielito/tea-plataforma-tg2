import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fuentes autoalojadas (RS-01: sin CDN externo). Solo el subconjunto latino,
// que incluye tildes, ñ, ¿, ¡ y comillas angulares.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-400-italic.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/lexend/latin-500.css';
import '@fontsource/lexend/latin-600.css';

import './tokens.css';
import './estilos/base.css';
import './estilos/layout.css';
import './estilos/inicio.css';
import './estilos/contenido.css';
import './estilos/ruta.css';
import './estilos/directorio.css';

import App from './App.jsx';

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
