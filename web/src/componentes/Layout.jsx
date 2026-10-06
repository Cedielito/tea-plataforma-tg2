/**
 * Layout común (M-01; RA-01 a RA-11): enlace «Saltar al contenido»,
 * encabezado, <main> y pie. Al navegar entre rutas (no en la primera carga)
 * mueve el foco al <h1> de la nueva página para que el lector de pantalla la anuncie.
 */
import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Encabezado from './Encabezado.jsx';
import Pie from './Pie.jsx';
import useFocoAlNavegar from './useFocoAlNavegar.js';

export default function Layout() {
  const principal = useRef(null);
  useFocoAlNavegar(principal);

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <Encabezado />
      <main id="contenido" ref={principal} tabIndex={-1}>
        <Outlet />
      </main>
      <Pie />
    </>
  );
}
