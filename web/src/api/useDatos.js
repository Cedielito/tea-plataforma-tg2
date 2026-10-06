/**
 * Lectura de la API para una página (M-02): estado de carga, datos y
 * reintento. La petición se cancela al salir de la página o al cambiar la ruta.
 */
import { useCallback, useEffect, useState } from 'react';
import { obtenerJson } from './cliente.js';

export const ESTADOS = Object.freeze({
  INACTIVO: 'inactivo',
  CARGANDO: 'cargando',
  LISTO: 'listo',
  NO_ENCONTRADO: 'no-encontrado',
  ERROR: 'error'
});

/**
 * @param {string|null} ruta ruta de la API; con null no se pide nada (INACTIVO)
 * @param {{obtener?: Function, version?: number}} opciones el panel (M-08) usa
 *   su propio cliente, que envía la cookie de sesión, y cambia `version` para
 *   volver a pedir los datos después de iniciar sesión de nuevo
 * @returns {{estado: string, datos: any, reintentar: () => void}}
 */
export default function useDatos(ruta, { obtener = obtenerJson, version = 0 } = {}) {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState({ ruta: null, estado: ESTADOS.CARGANDO, datos: null });

  useEffect(() => {
    if (!ruta) return undefined;
    const control = new AbortController();
    setResultado({ ruta, estado: ESTADOS.CARGANDO, datos: null });
    obtener(ruta, { signal: control.signal }).then(
      (datos) => setResultado({ ruta, estado: ESTADOS.LISTO, datos }),
      (error) => {
        if (control.signal.aborted) return;
        const estado = error.estado === 404 ? ESTADOS.NO_ENCONTRADO : ESTADOS.ERROR;
        setResultado({ ruta, estado, datos: null });
      }
    );
    return () => control.abort();
    // `obtener` es una función de módulo: no cambia entre renders.
  }, [ruta, intento, version]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  if (!ruta) return { estado: ESTADOS.INACTIVO, datos: null, reintentar };
  // Mientras el efecto no ha corrido para una ruta nueva, se muestra «cargando».
  if (resultado.ruta !== ruta) return { estado: ESTADOS.CARGANDO, datos: null, reintentar };
  return { estado: resultado.estado, datos: resultado.datos, reintentar };
}
