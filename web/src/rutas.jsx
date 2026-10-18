/**
 * Rutas de la zona pública (M-01 a M-06) y del panel (M-08). Las secciones con
 * contenido de la API (S1 a S5) usan la plantilla de contenido; Señales de
 * alerta tiene sus pestañas por edad; Ruta de atención (S4) lleva arriba la
 * guía de tres preguntas (M-03); Directorio tiene sus filtros (M-04);
 * Recursos y Preguntas frecuentes (M-05) tienen sus tarjetas y su acordeón;
 * Contacto (M-06) tiene su formulario, y la política de privacidad y «Acerca
 * de» usan la plantilla de contenido con los textos de api/contenidos/paginas.
 *
 * El panel (/admin) va fuera del layout público y se descarga aparte, solo al
 * entrar a esa dirección. Lo mismo el registro conductual (/registro, M-09),
 * que no se enlaza desde la zona pública.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './componentes/Layout.jsx';
import Inicio from './paginas/Inicio.jsx';
import PaginaContenido from './paginas/PaginaContenido.jsx';
import SenalesDeAlerta from './paginas/SenalesDeAlerta.jsx';
import GuiaRuta from './ruta/GuiaRuta.jsx';
import Directorio from './directorio/Directorio.jsx';
import Recursos from './recursos/Recursos.jsx';
import PreguntasFrecuentes from './preguntas/PreguntasFrecuentes.jsx';
import Contacto from './contacto/Contacto.jsx';
import Busqueda from './paginas/Busqueda.jsx';
import NoEncontrada from './paginas/NoEncontrada.jsx';
import {
  PAGINAS_PIE,
  RUTA_CONTACTO_WEB,
  RUTA_DIRECTORIO_WEB,
  RUTA_PREGUNTAS_WEB,
  RUTA_RECURSOS_WEB,
  SECCIONES
} from './secciones.js';

const AppAdmin = lazy(() => import('./admin/AppAdmin.jsx'));
const AppRegistro = lazy(() => import('./registro/AppRegistro.jsx'));

/** Mientras se descarga el panel o el registro. Sin animación ni temporizadores. */
function CargandoAparte({ queCarga }) {
  return (
    <main id="contenido">
      <div className="contenedor pagina">
        <p role="status">Estamos cargando {queCarga}.</p>
      </div>
    </main>
  );
}

function paginaDe(seccion) {
  const { ruta } = seccion;
  if (seccion.seccion === 'S2') return <SenalesDeAlerta key={ruta} seccion={seccion} />;
  if (seccion.seccion === 'S4') {
    return <PaginaContenido key={ruta} seccion={seccion} complemento={<GuiaRuta />} tituloCuerpo="La ruta completa" />;
  }
  if (seccion.slug || seccion.api) return <PaginaContenido key={ruta} seccion={seccion} />;
  if (ruta === RUTA_DIRECTORIO_WEB) return <Directorio key={ruta} seccion={seccion} />;
  if (ruta === RUTA_RECURSOS_WEB) return <Recursos key={ruta} seccion={seccion} />;
  if (ruta === RUTA_PREGUNTAS_WEB) return <PreguntasFrecuentes key={ruta} seccion={seccion} />;
  if (ruta === RUTA_CONTACTO_WEB) return <Contacto key={ruta} seccion={seccion} />;
  return <NoEncontrada key={ruta} />;
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
      <Suspense fallback={<CargandoAparte queCarga="el panel de administración" />}>
        <AppAdmin />
      </Suspense>
    )
  },
  {
    path: '/registro/*',
    element: (
      <Suspense fallback={<CargandoAparte queCarga="la tarea" />}>
        <AppRegistro />
      </Suspense>
    )
  }
]);
