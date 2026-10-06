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
 * @returns {{estado: string, datos: any, reintentar: () => void}}
 */
export default function useDatos(ruta) {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState({ ruta: null, estado: ESTADOS.CARGANDO, datos: null });

  useEffect(() => {
    if (!ruta) return undefined;
    const control = new AbortController();
    setResultado({ ruta, estado: ESTADOS.CARGANDO, datos: null });
    obtenerJson(ruta, { signal: control.signal }).then(
      (datos) => setResultado({ ruta, estado: ESTADOS.LISTO, datos }),
      (error) => {
        if (control.signal.aborted) return;
        const estado = error.estado === 404 ? ESTADOS.NO_ENCONTRADO : ESTADOS.ERROR;
        setResultado({ ruta, estado, datos: null });
      }
    );
    return () => control.abort();
  }, [ruta, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  if (!ruta) return { estado: ESTADOS.INACTIVO, datos: null, reintentar };
  // Mientras el efecto no ha corrido para una ruta nueva, se muestra «cargando».
  if (resultado.ruta !== ruta) return { estado: ESTADOS.CARGANDO, datos: null, reintentar };
  return { estado: resultado.estado, datos: resultado.datos, reintentar };
}
