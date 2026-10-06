/**
 * Rutas de la zona pública (M-01 a M-06).
 */
import { createBrowserRouter } from 'react-router-dom';
import Layout from './componentes/Layout.jsx';
import Inicio from './paginas/Inicio.jsx';
import PaginaSeccion from './paginas/PaginaSeccion.jsx';
import NoEncontrada from './paginas/NoEncontrada.jsx';
import { PAGINAS_PIE, SECCIONES } from './secciones.js';

export const enrutador = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      ...[...SECCIONES, ...PAGINAS_PIE].map(({ ruta, titulo, descripcion, avisoNoDiagnostico }) => ({
        path: ruta,
        element: (
          <PaginaSeccion
            key={ruta}
            titulo={titulo}
            descripcion={descripcion}
            avisoNoDiagnostico={avisoNoDiagnostico}
          />
        )
      })),
      { path: '*', element: <NoEncontrada /> }
    ]
  }
]);
