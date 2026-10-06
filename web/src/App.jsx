/**
 * Raíz de la aplicación (M-01, M-07): proveedor de ajustes de accesibilidad y rutas.
 */
import { RouterProvider } from 'react-router-dom';
import { ProveedorAjustes } from './accesibilidad/ContextoAjustes.jsx';
import { enrutador } from './rutas.jsx';

export default function App() {
  return (
    <ProveedorAjustes>
      <RouterProvider router={enrutador} />
    </ProveedorAjustes>
  );
}
