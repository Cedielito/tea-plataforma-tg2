/**
 * Registro conductual estructurado (M-09): rutas bajo /registro, con su
 * layout y sus estilos. Se descarga aparte (React.lazy en rutas.jsx), no
 * tiene enlaces desde la zona pública y no se indexa.
 *
 * - /registro, /registro/nueva y /registro/sesiones/:seudonimo: la zona del
 *   profesional (T15, HU-16, HU-18, HU-19), con la sesión del panel y una
 *   cuenta de rol «profesional» (ZonaProfesional.jsx).
 * - /registro/aplicacion: lo que hace el participante después de la entrega
 *   del dispositivo (T15, HU-17), sin navegación ni enlaces
 *   (PaginaAplicacion.jsx).
 * - /registro/prueba: las dos tareas en local, para revisar y para T16
 *   (T13 y T14). No cambia.
 *
 * La entrega se recuerda aquí, en el estado de React: si la página se recarga
 * se olvida, y la aplicación sabe que no viene de la entrega (aplicacion.js).
 *
 * Layout propio, sin la navegación del sitio: «Saltar al contenido», la barra
 * de accesibilidad (RA-07) y el contenido. Ni el título del documento ni la
 * página nombran la plataforma: la interfaz de M-09 no usa etiquetas
 * diagnósticas (vocabularioProhibido, en api/).
 */
import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import '../estilos/registro.css';
import BarraAccesibilidad from '../accesibilidad/BarraAccesibilidad.jsx';
import useNoIndexar from '../componentes/useNoIndexar.js';
import PaginaPrueba from './PaginaPrueba.jsx';
import PaginaAplicacion from './PaginaAplicacion.jsx';
import ZonaProfesional from './ZonaProfesional.jsx';
import ListaSesiones from './ListaSesiones.jsx';
import NuevaSesion from './NuevaSesion.jsx';
import DetalleSesion from './DetalleSesion.jsx';
import { MODULO, PAGINA_PRUEBA } from './textos.js';
import { APLICACION, ZONA } from './textosProfesional.js';

/** Título del documento según la parte del registro. */
function tituloDe(pathname) {
  if (pathname.startsWith('/registro/prueba')) return PAGINA_PRUEBA.tituloPagina;
  if (pathname.startsWith('/registro/aplicacion')) return APLICACION.tituloPagina;
  return ZONA.tituloPagina;
}

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
  const { pathname } = useLocation();
  const [recienEntregada, setRecienEntregada] = useState(false);
  const alEntregar = useCallback(() => setRecienEntregada(true), []);
  const alUsarEntrega = useCallback(() => setRecienEntregada(false), []);
  useNoIndexar();
  useCabecera(tituloDe(pathname));

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
          <Route
            path="aplicacion"
            element={<PaginaAplicacion recienEntregada={recienEntregada} alUsarEntrega={alUsarEntrega} />}
          />
          <Route element={<ZonaProfesional alEntregar={alEntregar} />}>
            <Route index element={<ListaSesiones />} />
            <Route path="nueva" element={<NuevaSesion />} />
            <Route path="sesiones/:seudonimo" element={<DetalleSesion />} />
          </Route>
          <Route path="*" element={<NoEncontradaRegistro />} />
        </Routes>
      </main>
    </>
  );
}
