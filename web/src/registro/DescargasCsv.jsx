/**
 * Descarga de los dos CSV del registro conductual (M-09, HU-19, CT-11,
 * CT-13): los ensayos y los valores con el SUS, solo de las sesiones del
 * profesional. Se piden con la cookie de sesión (descargarAdmin) y se guardan
 * con un enlace temporal; si la sesión venció, la página muestra el
 * formulario para volver a entrar.
 */
import { useState } from 'react';
import { Download } from 'lucide-react';
import { ErrorAdmin, descargarAdmin, mensajeDeError } from '../admin/clienteAdmin.js';
import { RUTA_API_EXPORTACION } from './rutasProfesional.js';
import { LISTA } from './textosProfesional.js';

const ARCHIVOS = Object.freeze([
  { ruta: `${RUTA_API_EXPORTACION}/ensayos.csv`, nombre: 'registro-ensayos.csv', texto: LISTA.descargarEnsayos },
  { ruta: `${RUTA_API_EXPORTACION}/valores.csv`, nombre: 'registro-valores-sus.csv', texto: LISTA.descargarValores }
]);

function guardar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // El navegador ya tomó el archivo: el enlace se libera en la siguiente vuelta.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export default function DescargasCsv() {
  const [descargando, setDescargando] = useState(null);
  const [error, setError] = useState(null);

  async function descargar({ ruta, nombre }) {
    if (descargando) return;
    setDescargando(ruta);
    setError(null);
    try {
      guardar(await descargarAdmin(ruta), nombre);
    } catch (problema) {
      if (!(problema instanceof ErrorAdmin && problema.estado === 401)) {
        setError(`${LISTA.errorDescarga} ${mensajeDeError(problema)}`);
      }
    } finally {
      setDescargando(null);
    }
  }

  return (
    <section className="tarjeta-admin descargas" aria-labelledby="descargas-registro">
      <h2 id="descargas-registro" className="tarjeta-admin__titulo">{LISTA.exportar}</h2>
      <p>{LISTA.exportarDescripcion}</p>
      <div className="acciones">
        {ARCHIVOS.map((archivo) => (
          <button
            key={archivo.ruta}
            type="button"
            className="boton boton-secundario"
            onClick={() => descargar(archivo)}
            aria-disabled={descargando ? true : undefined}
          >
            <Download aria-hidden="true" />
            {descargando === archivo.ruta ? LISTA.descargando : archivo.texto}
          </button>
        ))}
      </div>
      <div role="status">{error && <p className="mensaje mensaje--error">{error}</p>}</div>
    </section>
  );
}
