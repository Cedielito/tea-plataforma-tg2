/**
 * Rutas de la zona pública (M-01 a M-06) y del panel (M-08). Las secciones con
 * contenido de la API (S1 a S5) usan la plantilla de contenido; Señales de
 * alerta tiene sus pestañas por edad; las demás siguen siendo páginas
 * provisionales hasta su tarea del backlog.
 *
 * El panel (/admin) va fuera del layout público y se descarga aparte, solo al
 * entrar a esa dirección.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './componentes/Layout.jsx';
import Inicio from './paginas/Inicio.jsx';
import PaginaContenido from './paginas/PaginaContenido.jsx';
import PaginaSeccion from './paginas/PaginaSeccion.jsx';
import SenalesDeAlerta from './paginas/SenalesDeAlerta.jsx';
import Busqueda from './paginas/Busqueda.jsx';
import NoEncontrada from './paginas/NoEncontrada.jsx';
import { PAGINAS_PIE, SECCIONES } from './secciones.js';

const AppAdmin = lazy(() => import('./admin/AppAdmin.jsx'));

/** Mientras se descarga el panel. Sin animación ni temporizadores. */
function CargandoPanel() {
  return (
    <main id="contenido">
      <div className="contenedor pagina">
        <p role="status">Estamos cargando el panel de administración.</p>
      </div>
    </main>
  );
}

function paginaDe(seccion) {
  const { ruta, titulo, descripcion, avisoNoDiagnostico } = seccion;
  if (seccion.seccion === 'S2') return <SenalesDeAlerta key={ruta} seccion={seccion} />;
  if (seccion.slug) return <PaginaContenido key={ruta} seccion={seccion} />;
  return (
    <PaginaSeccion key={ruta} titulo={titulo} descripcion={descripcion} avisoNoDiagnostico={avisoNoDiagnostico} />
  );
}

export const enrutador = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      ...[...SECCIONES, ...PAGINAS_PIE].map((seccion) => ({ path: seccion.ruta, element: paginaDe(seccion) })),
      { path: '/buscar', element: <Busqueda /> },
      { path: '*', element: <NoEncontrada /> }
    ]
  },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<CargandoPanel />}>
        <AppAdmin />
      </Suspense>
    )
  }
]);
