/**
 * /registro/aplicacion: lo que hace el participante en el dispositivo que le
 * entregó el profesional (M-09, HU-17, CT-03, CT-07, CT-08, CT-11, RF-15).
 *
 *   tarea de cambio de regla → pausa → tarea de Navon → cuestionario SUS →
 *   «Gracias»
 *
 * - Sin enlaces ni navegación: la página solo tiene el encabezado del módulo
 *   y la barra de accesibilidad (AppRegistro.jsx). La sesión del profesional
 *   ya se cerró en este navegador al entregar el dispositivo, y la cookie de
 *   aplicación solo sirve para esta sesión (api/src/api/rutas/
 *   aplicacionRegistro.js): no hay forma de ver otras sesiones desde aquí.
 * - El plan, la semilla y el SUS llegan de GET /api/registro/aplicacion. El
 *   reloj es siempre la variante 'animacion': no se lee ?reloj= ni
 *   VITE_RELOJ_REGISTRO.
 * - Al terminar cada tarea, sus ensayos van a la cola de envíos
 *   (colaEnvios.js), que los conserva en memoria y los reintenta hasta que la
 *   API los confirma: con el siguiente envío, al volver la conexión o con
 *   «Intentar de nuevo». Sin temporizadores.
 * - Al final el participante solo ve «Gracias» y si todo quedó guardado:
 *   ningún valor (no hay resultados individuales).
 * - Si la página se abre de nuevo con una tarea pendiente (se recargó, o se
 *   fue atrás y adelante), la sesión queda interrumpida (aplicacion.js).
 *   `recienEntregada` dice si se llegó aquí desde la entrega, en esta misma
 *   carga de la página.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Hourglass, RefreshCw } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import { ESTADOS } from '../api/useDatos.js';
import TareaCambioRegla from './TareaCambioRegla.jsx';
import TareaNavon from './TareaNavon.jsx';
import CuestionarioSus from './CuestionarioSus.jsx';
import { Pantalla } from './PantallasTarea.jsx';
import { crearReloj } from './reloj.js';
import { crearColaEnvios, SITUACIONES } from './colaEnvios.js';
import { RUTA_API_APLICACION, enviarAplicacion, obtenerAplicacion } from './clienteAplicacion.js';
import { PASOS, RELOJ_APLICACION, envioDeSus, envioDeTarea, pasoInicial, tareasDelPlan } from './aplicacion.js';
import { ENTRE_TAREAS, TITULO_NAVON, TITULO_TAREA } from './textos.js';
import { APLICACION, SUS } from './textosProfesional.js';

/** Pantalla y título de cada tarea del plan. */
const TAREAS = Object.freeze({
  'cambio-regla': { Tarea: TareaCambioRegla, titulo: TITULO_TAREA },
  navon: { Tarea: TareaNavon, titulo: TITULO_NAVON }
});

const ICONOS_GUARDADO = Object.freeze({
  [SITUACIONES.AL_DIA]: CircleCheck,
  [SITUACIONES.ENVIANDO]: Hourglass,
  [SITUACIONES.PENDIENTE]: CircleAlert,
  [SITUACIONES.RECHAZADO]: CircleAlert
});

const TEXTOS_GUARDADO = Object.freeze({
  [SITUACIONES.AL_DIA]: APLICACION.guardado,
  [SITUACIONES.ENVIANDO]: APLICACION.guardando,
  [SITUACIONES.PENDIENTE]: APLICACION.pendiente,
  [SITUACIONES.RECHAZADO]: APLICACION.rechazado
});

/** Si todo quedó guardado; con algo pendiente, el botón para intentar de nuevo. */
function EstadoGuardado({ envios, alReintentar }) {
  const Icono = ICONOS_GUARDADO[envios.situacion];
  const pendiente = envios.situacion === SITUACIONES.PENDIENTE;
  return (
    <>
      <p role="status" className={`mensaje ${envios.situacion === SITUACIONES.AL_DIA ? 'mensaje--exito' : 'mensaje--error'} aplicacion__guardado`}>
        <Icono aria-hidden="true" />
        <span>{TEXTOS_GUARDADO[envios.situacion]}</span>
      </p>
      {pendiente && (
        <button type="button" className="boton boton-secundario" onClick={alReintentar}>
          <RefreshCw aria-hidden="true" />
          {APLICACION.reintentar}
        </button>
      )}
    </>
  );
}

/** Pantalla final con su título como h1, que recibe el foco al aparecer. */
function PantallaFinal({ titulo, parrafos, children }) {
  const encabezado = useRef(null);
  useEffect(() => {
    encabezado.current?.focus();
  }, []);
  return (
    <div className="contenedor pagina registro">
      <h1 ref={encabezado} tabIndex={-1}>{titulo}</h1>
      <section className="tarea__pantalla">
        {parrafos.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {children}
      </section>
    </div>
  );
}

export default function PaginaAplicacion({ recienEntregada = false, alUsarEntrega }) {
  // Se lee una sola vez: una recarga o una vuelta a la página ya no cuenta como entrega.
  const entregadaAlAbrir = useRef(recienEntregada);
  const [carga, setCarga] = useState({ estado: ESTADOS.CARGANDO, aplicacion: null });
  const [intento, setIntento] = useState(0);
  const [paso, setPaso] = useState(null);
  const [indiceTarea, setIndiceTarea] = useState(0);
  const [entreTareas, setEntreTareas] = useState(false);
  const [envios, setEnvios] = useState({ situacion: SITUACIONES.AL_DIA });
  const reloj = useMemo(() => crearReloj(RELOJ_APLICACION), []);
  const cola = useMemo(() => crearColaEnvios({ enviar: enviarAplicacion, alCambiar: setEnvios }), []);
  const disponibles = Object.keys(TAREAS);

  useEffect(() => {
    alUsarEntrega?.();
    // Solo al abrir la página.
  }, []);

  useEffect(() => {
    const control = new AbortController();
    setCarga({ estado: ESTADOS.CARGANDO, aplicacion: null });
    obtenerAplicacion({ signal: control.signal }).then(
      (aplicacion) => {
        setCarga({ estado: ESTADOS.LISTO, aplicacion });
        setPaso(
          (actual) => actual ?? pasoInicial({ aplicacion, recienEntregada: entregadaAlAbrir.current, disponibles })
        );
      },
      (error) => {
        if (control.signal.aborted) return;
        setCarga({ estado: error.estado === 401 ? ESTADOS.NO_ENCONTRADO : ESTADOS.ERROR, aplicacion: null });
      }
    );
    return () => control.abort();
  }, [intento]);

  // La sesión no se puede continuar: se avisa a la API, que la marca interrumpida (RF-15).
  useEffect(() => {
    if (paso !== PASOS.INTERRUMPIDA) return;
    enviarAplicacion({ ruta: `${RUTA_API_APLICACION}/interrupcion`, metodo: 'POST' }).catch(() => {
      // Si no llega, la sesión vence sola a las 2 horas y queda sin completar.
    });
  }, [paso]);

  // Al volver la conexión, sale lo que quedó pendiente.
  useEffect(() => {
    const alVolver = () => cola.procesar();
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [cola]);

  if (carga.estado === ESTADOS.NO_ENCONTRADO) {
    return <PantallaFinal titulo={APLICACION.sinAplicacionTitulo} parrafos={[APLICACION.sinAplicacion]} />;
  }
  if (carga.estado !== ESTADOS.LISTO || !paso) {
    return (
      <div className="contenedor pagina registro">
        <h1>{APLICACION.titulo}</h1>
        <EstadoDatos estado={carga.estado} reintentar={() => setIntento((n) => n + 1)} queCarga={APLICACION.queCarga} />
      </div>
    );
  }

  const { aplicacion } = carga;
  const reintentar = () => cola.procesar();

  if (paso === PASOS.INTERRUMPIDA) {
    return <PantallaFinal titulo={APLICACION.interrumpidaTitulo} parrafos={APLICACION.interrumpida} />;
  }

  if (paso === PASOS.GRACIAS) {
    return (
      <PantallaFinal titulo={APLICACION.graciasTitulo} parrafos={APLICACION.gracias}>
        <EstadoGuardado envios={envios} alReintentar={reintentar} />
      </PantallaFinal>
    );
  }

  if (paso === PASOS.SUS) {
    return (
      <PantallaFinal titulo={SUS.titulo} parrafos={[]}>
        <CuestionarioSus
          cuestionario={aplicacion.cuestionarioSus}
          alTerminar={(respuestas) => {
            cola.agregar(envioDeSus(aplicacion.cuestionarioSus.version, respuestas));
            setPaso(PASOS.GRACIAS);
          }}
        />
      </PantallaFinal>
    );
  }

  const secuencias = tareasDelPlan(aplicacion.plan, disponibles);
  const secuencia = secuencias[indiceTarea];
  const { Tarea, titulo } = TAREAS[(entreTareas ? secuencias[indiceTarea - 1] : secuencia).tarea];

  function alTerminarTarea(sesionTarea) {
    cola.agregar(envioDeTarea(sesionTarea));
    if (indiceTarea + 1 < secuencias.length) {
      setIndiceTarea(indiceTarea + 1);
      setEntreTareas(true);
    } else {
      setPaso(aplicacion.cuestionarioSus ? PASOS.SUS : PASOS.GRACIAS);
    }
  }

  return (
    <div className="contenedor pagina registro">
      <h1>{titulo}</h1>
      {entreTareas ? (
        <Pantalla key="entre-tareas" {...ENTRE_TAREAS} alContinuar={() => setEntreTareas(false)} />
      ) : (
        <Tarea
          key={secuencia.tarea}
          secuencia={secuencia}
          versionCatalogo={aplicacion.versionCatalogo}
          semilla={aplicacion.semilla}
          reloj={reloj}
          alTerminar={alTerminarTarea}
        />
      )}
    </div>
  );
}
