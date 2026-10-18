/**
 * /registro/prueba: las dos tareas en local (M-09, T13 y T14). Pide el plan a
 * la API (GET /api/registro/plan), genera los ensayos con una semilla y hace
 * las tareas seguidas, en el orden del plan (cambio de regla, pausa, Navon).
 * Al terminar muestra todos los ensayos en una tabla con «Descargar JSON»,
 * un solo archivo con la sesión completa (unirSesiones). No envía ni guarda
 * la sesión (el guardado y el flujo del profesional llegan con T15). No está
 * enlazada y no se indexa.
 *
 * Para revisar y para T16: ?tarea=navon (o ?tarea=cambio-regla) abre solo
 * esa tarea, ?semilla=123 repite exactamente los mismos ensayos y
 * ?reloj=referencia cambia el reloj (por defecto, el de VITE_RELOJ_REGISTRO
 * o 'animacion').
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, RefreshCw } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import TareaCambioRegla from './TareaCambioRegla.jsx';
import TareaNavon from './TareaNavon.jsx';
import TablaEnsayos from './TablaEnsayos.jsx';
import { Pantalla } from './PantallasTarea.jsx';
import { leerSemilla, semillaNueva } from './azar.js';
import { crearReloj, elegirVariante } from './reloj.js';
import { elegirSecuencias, unirSesiones } from './sesionLocal.js';
import {
  animo,
  animoNavon,
  AVISO_REGISTRO,
  ENTRE_TAREAS,
  FIN,
  NAVON,
  PAGINA_PRUEBA,
  TITULO_NAVON,
  TITULO_TAREA
} from './textos.js';

export const RUTA_PLAN = '/api/registro/plan';

/** Pantallas y textos de cada tarea del plan. */
const TAREAS = Object.freeze({
  'cambio-regla': { Tarea: TareaCambioRegla, titulo: TITULO_TAREA, fin: FIN.titulo, animo },
  navon: { Tarea: TareaNavon, titulo: TITULO_NAVON, fin: NAVON.fin.titulo, animo: animoNavon }
});

export default function PaginaPrueba() {
  const [parametros] = useSearchParams();
  const { estado, datos: plan, reintentar } = useDatos(RUTA_PLAN);
  const [semilla, setSemilla] = useState(() => leerSemilla(parametros.get('semilla')) ?? semillaNueva());
  // Sesiones de las tareas terminadas y si se está en la pausa entre tareas.
  const [terminadas, setTerminadas] = useState([]);
  const [entreTareas, setEntreTareas] = useState(false);
  const variante = elegirVariante(parametros.get('reloj'), import.meta.env.VITE_RELOJ_REGISTRO);
  const reloj = useMemo(() => crearReloj(variante), [variante]);
  const tareaPedida = parametros.get('tarea');
  const secuencias = useMemo(
    () => (plan ? elegirSecuencias(plan, tareaPedida, Object.keys(TAREAS)) : []),
    [plan, tareaPedida]
  );
  const tituloFin = useRef(null);

  const terminada = secuencias.length > 0 && terminadas.length === secuencias.length;
  const sesion = useMemo(() => (terminada ? unirSesiones(terminadas) : null), [terminada, terminadas]);
  const secuencia = secuencias[Math.min(terminadas.length, secuencias.length - 1)];

  // Al terminar, el foco pasa al título final para que se anuncie.
  useEffect(() => {
    if (sesion) tituloFin.current?.focus();
  }, [sesion]);

  function alTerminarTarea(parcial) {
    const todas = [...terminadas, parcial];
    setTerminadas(todas);
    if (todas.length < secuencias.length) setEntreTareas(true);
  }

  function otraVez() {
    setTerminadas([]);
    setEntreTareas(false);
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

  const textos = secuencia ? TAREAS[secuencia.tarea] : null;
  const { Tarea } = textos || {};
  // En la pausa entre tareas, el título sigue siendo el de la tarea que terminó.
  const anterior = entreTareas ? TAREAS[secuencias[terminadas.length - 1].tarea] : null;
  const titulo = (anterior || textos || { titulo: TITULO_TAREA }).titulo;

  return (
    <div className="contenedor pagina registro">
      <h1>{titulo}</h1>
      {estado !== ESTADOS.LISTO && <EstadoDatos estado={estado} reintentar={reintentar} queCarga={PAGINA_PRUEBA.queCarga} />}

      {secuencia && !terminada && entreTareas && (
        <Pantalla key="entre-tareas" {...ENTRE_TAREAS} alContinuar={() => setEntreTareas(false)} />
      )}

      {secuencia && !terminada && !entreTareas && (
        <Tarea
          key={`${semilla}-${secuencia.tarea}`}
          secuencia={secuencia}
          versionCatalogo={plan.versionCatalogo}
          semilla={semilla}
          reloj={reloj}
          encabezado={terminadas.length === 0 ? nota : null}
          alTerminar={alTerminarTarea}
        />
      )}

      {sesion && (
        <>
          <section className="tarea__pantalla">
            <h2 ref={tituloFin} tabIndex={-1}>{secuencias.length > 1 ? PAGINA_PRUEBA.finSesion : textos.fin}</h2>
            <p>{textos.animo(secuencia.bloques.length, secuencia.bloques.length)}</p>
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
