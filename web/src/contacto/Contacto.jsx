/**
 * Página de contacto en /contacto (M-06; RF-08, RS-02, RS-03, HU-08).
 *
 * Primero pide la política de privacidad a la API: de ella salen el texto de
 * la casilla de autorización y la versión que se envía con el mensaje. Esa
 * petición también despierta la API gratuita antes de que la persona envíe.
 * Mientras llega, se muestra el estado de carga sin temporizadores.
 *
 * Si la política cambió mientras la persona escribía (la API responde 409),
 * el formulario la vuelve a pedir y muestra la casilla con el texto nuevo.
 */
import { useState } from 'react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import { obtenerJson } from '../api/cliente.js';
import { RUTA_API_POLITICA } from '../secciones.js';
import FormularioContacto from './FormularioContacto.jsx';

export default function Contacto({ seccion }) {
  const { titulo } = seccion;
  useTituloPagina(titulo);
  const { estado, datos, reintentar } = useDatos(RUTA_API_POLITICA);
  const [politicaNueva, setPoliticaNueva] = useState(null);
  const politica = politicaNueva ?? datos;

  /** @returns {Promise<boolean>} true si llegó la política vigente */
  async function actualizarPolitica() {
    try {
      setPoliticaNueva(await obtenerJson(RUTA_API_POLITICA));
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="contenedor pagina contacto">
      <MigasDePan actual={titulo} />
      <h1>{titulo}</h1>
      <p className="pagina__descripcion">
        ¿Tienes una pregunta o una sugerencia sobre la plataforma? Escríbenos y te responderemos a tu correo.
      </p>

      {estado === ESTADOS.LISTO ? (
        <FormularioContacto politica={politica} actualizarPolitica={actualizarPolitica} />
      ) : (
        <EstadoDatos
          estado={estado === ESTADOS.NO_ENCONTRADO ? ESTADOS.ERROR : estado}
          reintentar={reintentar}
          queCarga="el formulario de contacto"
        />
      )}
    </div>
  );
}
