/**
 * /registro/prueba: la tarea de cambio de regla en local (M-09, T13). Pide
 * el plan a la API (GET /api/registro/plan), genera los ensayos con una
 * semilla y, al terminar, muestra los ensayos en una tabla con «Descargar
 * JSON». No envía ni guarda la sesión (el guardado y el flujo del
 * profesional llegan con T15). No está enlazada y no se indexa.
 *
 * Para revisar y para T16: ?semilla=123 repite exactamente los mismos
 * ensayos y ?reloj=referencia cambia el reloj (por defecto, el de
 * VITE_RELOJ_REGISTRO o 'animacion').
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, RefreshCw } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import TareaCambioRegla from './TareaCambioRegla.jsx';
import TablaEnsayos from './TablaEnsayos.jsx';
import { leerSemilla, semillaNueva } from './azar.js';
import { crearReloj, elegirVariante } from './reloj.js';
import { animo, AVISO_REGISTRO, FIN, PAGINA_PRUEBA, TITULO_TAREA } from './textos.js';

export const RUTA_PLAN = '/api/registro/plan';

export default function PaginaPrueba() {
  const [parametros] = useSearchParams();
  const { estado, datos: plan, reintentar } = useDatos(RUTA_PLAN);
  const [semilla, setSemilla] = useState(() => leerSemilla(parametros.get('semilla')) ?? semillaNueva());
  const [sesion, setSesion] = useState(null);
  const variante = elegirVariante(parametros.get('reloj'), import.meta.env.VITE_RELOJ_REGISTRO);
  const reloj = useMemo(() => crearReloj(variante), [variante]);
  const secuencia = plan?.secuencias.find((s) => s.tarea === 'cambio-regla');
  const tituloFin = useRef(null);

  // Al terminar, el foco pasa al título final para que se anuncie.
  useEffect(() => {
    if (sesion) tituloFin.current?.focus();
  }, [sesion]);

  function otraVez() {
    setSesion(null);
    setSemilla(semillaNueva());
  }

  const nota = (
    <div role="note" className="aviso registro__nota">
      <Info aria-hidden="true" />
      <div>
        <p>{PAGINA_PRUEBA.nota}</p>
        <p>
          {PAGINA_PRUEBA.semilla}: <strong>{semilla}</strong> · {PAGINA_PRUEBA.reloj}: <strong>{variante}</strong>
        </p>
      </div>
    </div>
  );

  return (
    <div className="contenedor pagina registro">
      <h1>{TITULO_TAREA}</h1>
      {estado !== ESTADOS.LISTO && <EstadoDatos estado={estado} reintentar={reintentar} queCarga={PAGINA_PRUEBA.queCarga} />}

      {secuencia && !sesion && (
        <TareaCambioRegla
          key={semilla}
          secuencia={secuencia}
          versionCatalogo={plan.versionCatalogo}
          semilla={semilla}
          reloj={reloj}
          encabezado={nota}
          alTerminar={setSesion}
        />
      )}

      {sesion && (
        <>
          <section className="tarea__pantalla">
            <h2 ref={tituloFin} tabIndex={-1}>{FIN.titulo}</h2>
            <p>{animo(secuencia.bloques.length, secuencia.bloques.length)}</p>
          </section>
          {nota}
          <div role="note" className="aviso">
            <Info aria-hidden="true" />
            <p>{AVISO_REGISTRO}</p>
          </div>
          <TablaEnsayos sesion={sesion} />
          <p>
            <button type="button" className="boton boton-secundario" onClick={otraVez}>
              <RefreshCw aria-hidden="true" />
              {PAGINA_PRUEBA.otraVez}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
