/**
 * Panel de administración (M-08): rutas bajo /admin, con su sesión y sus
 * estilos. Contenidos de S1 a S5 (/admin y /admin/contenidos) y pasos de la
 * ruta de atención (/admin/ruta, M-03). Se descarga aparte (React.lazy en rutas.jsx): quien visita la zona
 * pública no lo baja. No hay enlaces a /admin desde la navegación pública.
 */
import { Link, Route, Routes } from 'react-router-dom';
import '../estilos/admin.css';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { ProveedorSesion } from './ContextoSesion.jsx';
import LayoutAdmin from './LayoutAdmin.jsx';
import ListaContenidos from './ListaContenidos.jsx';
import EditorContenido from './EditorContenido.jsx';
import ListaPasosRuta from './ListaPasosRuta.jsx';
import EditorPasoRuta from './EditorPasoRuta.jsx';

function NoEncontradaAdmin() {
  useTituloPagina('Página no encontrada · Panel');
  return (
    <div className="contenedor pagina pagina-admin">
      <h1>Página no encontrada</h1>
      <p className="pagina__descripcion">Esta dirección no existe en el panel.</p>
      <p><Link to="/admin">Ir a la lista de contenidos</Link></p>
    </div>
  );
}

export default function AppAdmin() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route element={<LayoutAdmin />}>
          <Route index element={<ListaContenidos />} />
          {/* Claves distintas: al pasar de «nuevo» al contenido recién creado, el editor se monta de nuevo */}
          <Route path="contenidos/nuevo" element={<EditorContenido key="nuevo" />} />
          <Route path="contenidos/:id" element={<EditorContenido key="existente" />} />
          <Route path="ruta" element={<ListaPasosRuta />} />
          <Route path="ruta/nuevo" element={<EditorPasoRuta key="nuevo" />} />
          <Route path="ruta/:id" element={<EditorPasoRuta key="existente" />} />
          <Route path="*" element={<NoEncontradaAdmin />} />
        </Route>
      </Routes>
    </ProveedorSesion>
  );
}
