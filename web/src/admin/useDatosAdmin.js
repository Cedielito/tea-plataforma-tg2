/**
 * Lectura de la API del panel (M-08): useDatos con el cliente del panel. Al
 * volver a iniciar sesión (cambia `generacion`) se piden de nuevo los datos.
 */
import useDatos from '../api/useDatos.js';
import { pedirAdmin } from './clienteAdmin.js';
import { useSesion } from './ContextoSesion.jsx';

export default function useDatosAdmin(ruta) {
  const { generacion } = useSesion();
  return useDatos(ruta, { obtener: pedirAdmin, version: generacion });
}
