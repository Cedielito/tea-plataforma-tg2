/**
 * Registro conductual estructurado (M-09): rutas bajo /registro, con su
 * layout y sus estilos. Por ahora solo /registro/prueba (T13); el flujo del
 * profesional llega con T15. Se descarga aparte (React.lazy en rutas.jsx), no
 * tiene enlaces desde la zona pública y no se indexa.
 *
 * Layout propio, sin la navegación del sitio: «Saltar al contenido», la barra
 * de accesibilidad (RA-07) y el contenido. Ni el título del documento ni la
 * página nombran la plataforma: la interfaz de M-09 no usa etiquetas
 * diagnósticas (vocabularioProhibido, en api/).
 */
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import '../estilos/registro.css';
import BarraAccesibilidad from '../accesibilidad/BarraAccesibilidad.jsx';
import useNoIndexar from '../componentes/useNoIndexar.js';
import PaginaPrueba from './PaginaPrueba.jsx';
import { MODULO, PAGINA_PRUEBA } from './textos.js';

/** Título y descripción del documento solo con el nombre del módulo. */
function useCabecera(titulo) {
  useEffect(() => {
    const tituloAnterior = document.title;
    const descripcion = document.querySelector('meta[name="description"]');
    const descripcionAnterior = descripcion?.content;
    document.title = `${titulo} – ${MODULO.nombre}`;
    if (descripcion) descripcion.content = MODULO.descripcion;
    return () => {
      document.title = tituloAnterior;
      if (descripcion) descripcion.content = descripcionAnterior;
    };
  }, [titulo]);
}

function NoEncontradaRegistro() {
  return (
    <div className="contenedor pagina">
      <h1>{MODULO.noEncontrada}</h1>
      <p>{MODULO.noExiste}</p>
    </div>
  );
}

export default function AppRegistro() {
  useNoIndexar();
  useCabecera(PAGINA_PRUEBA.tituloPagina);

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <header className="encabezado">
        <BarraAccesibilidad />
        <div className="contenedor encabezado-registro">
          <p className="encabezado-registro__nombre">{MODULO.nombre}</p>
        </div>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Routes>
          <Route path="prueba" element={<PaginaPrueba />} />
          <Route path="*" element={<NoEncontradaRegistro />} />
        </Routes>
      </main>
    </>
  );
}
