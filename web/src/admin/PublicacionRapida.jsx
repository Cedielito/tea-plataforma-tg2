/**
 * «Publicar» y «Despublicar» desde las tarjetas de las listas del panel:
 * contenidos y pasos de la ruta (M-08, RF-10, HU-13; RCN-01, RCN-02; RA-11).
 *
 * Si el servidor no deja publicar (falta la fuente o la fecha), sus mensajes
 * aparecen en la tarjeta con un enlace al editor. El resultado se anuncia en
 * una región role="status" que está siempre presente.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAdmin, mensajeDeError, pedirAdmin } from './clienteAdmin.js';
import { BORRADOR, PUBLICADO } from './edicion.js';

/**
 * @param {{ruta: string, estado: string, alCambiar: (actualizado: object) => void,
 *   textos: {publicado: string, despublicado: string}}} opciones `ruta` es la
 *   del registro en la API (/api/admin/contenidos/:id)
 */
export function usePublicacionRapida({ ruta, estado, alCambiar, textos }) {
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const publicado = estado === PUBLICADO;

  async function alternar() {
    if (enviando) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const nuevo = publicado ? BORRADOR : PUBLICADO;
      const actualizado = await pedirAdmin(ruta, { metodo: 'PATCH', datos: { estado: nuevo } });
      alCambiar(actualizado);
      setMensaje({ tipo: 'exito', texto: nuevo === PUBLICADO ? textos.publicado : textos.despublicado });
    } catch (error) {
      if (error instanceof ErrorAdmin && error.estado === 401) return;
      const campos = Object.values(error.campos ?? {});
      setMensaje({ tipo: 'error', texto: campos.length > 0 ? campos.join(' ') : mensajeDeError(error), editar: campos.length > 0 });
    } finally {
      setEnviando(false);
    }
  }

  return { publicado, mensaje, alternar };
}

/** Región siempre presente para que el lector de pantalla anuncie el resultado. */
export function ResultadoPublicacion({ mensaje, rutaEditor }) {
  return (
    <div role="status" className="tarjeta-admin__resultado">
      {mensaje && (
        <p className={`mensaje mensaje--${mensaje.tipo}`}>
          {mensaje.tipo === 'error' && 'No se pudo publicar. '}
          {mensaje.texto}
          {mensaje.editar && (
            <>
              {' '}
              <Link to={rutaEditor}>Completar en el editor</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
