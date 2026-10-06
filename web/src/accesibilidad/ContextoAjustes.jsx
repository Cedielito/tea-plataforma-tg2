/**
 * Contexto de los ajustes de accesibilidad (M-07). Se aplican al instante y se
 * conservan durante la visita en sessionStorage (RS-01: sin cookies).
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { aplicarAjustes, guardarAjustes, leerAjustes } from './ajustes.js';

const ContextoAjustes = createContext(null);

export function ProveedorAjustes({ children }) {
  const [ajustes, setAjustes] = useState(leerAjustes);

  useEffect(() => {
    aplicarAjustes(ajustes);
    guardarAjustes(ajustes);
  }, [ajustes]);

  const valor = useMemo(
    () => ({
      ajustes,
      cambiarTamano: (tamano) => setAjustes((previos) => ({ ...previos, tamano })),
      alternar: (clave) => setAjustes((previos) => ({ ...previos, [clave]: !previos[clave] }))
    }),
    [ajustes]
  );

  return <ContextoAjustes.Provider value={valor}>{children}</ContextoAjustes.Provider>;
}

export function useAjustes() {
  const contexto = useContext(ContextoAjustes);
  if (!contexto) throw new Error('useAjustes debe usarse dentro de ProveedorAjustes');
  return contexto;
}
