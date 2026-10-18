/**
 * Tarea de cambio de regla, «El taller que cambia» (M-09, HU-17, CP-01,
 * CP-04, CT-03, CT-08). Recorre los ensayos que genera generador.js a partir
 * del plan de la API:
 *
 *   bienvenida → instrucciones → práctica (con retroalimentación) → pausa →
 *   por cada bloque: instrucciones del bloque → ensayos → ánimo y pausa;
 *   al terminar el último bloque, la sesión pasa a quien usa la tarea
 *
 * - Cada cambio de regla tiene su pantalla de instrucciones (no es práctica):
 *   antes del bloque de forma y antes del primer bloque mixto
 *   (textosAntesDeBloque).
 * - Pausa después de la práctica y de cada bloque (CT-08), sin límite de
 *   tiempo; desde ahí se pueden ver de nuevo las instrucciones.
 * - Tras cada ensayo solo se muestra lo que permite vistaDeEnsayo (CT-03):
 *   retroalimentación en la práctica y nada en la medición.
 * - La sesión es local: al terminar se entrega a quien la usa (alTerminar),
 *   sin enviarla a la API.
 *
 * Las dinámicas gamificadas (narrativa, barra de progreso, ánimo y
 * retroalimentación en la práctica) declaran su principio neuroeducativo en
 * textos.js y BarraProgreso.jsx.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleHelp } from 'lucide-react';
import BarraProgreso from './BarraProgreso.jsx';
import EnsayoCambioRegla from './EnsayoCambioRegla.jsx';
import { Pantalla, Pausa } from './PantallasTarea.jsx';
import { generarEnsayos } from './generador.js';
import { armarSesion, registrarEnsayo } from './sesionLocal.js';
import { retroalimentacion, vistaDeEnsayo } from './vista.js';
import {
  animo,
  BIENVENIDA,
  BOTON_EMPEZAR_BLOQUE,
  FIN_PRACTICA,
  INSTRUCCIONES,
  PAUSA,
  PRACTICA,
  RETROALIMENTACION,
  textosAntesDeBloque
} from './textos.js';

/**
 * @param {{secuencia: object, versionCatalogo: string, semilla: number, reloj: object,
 *   encabezado?: React.ReactNode, alTerminar: (sesion: object) => void}} props
 */
export default function TareaCambioRegla({ secuencia, versionCatalogo, semilla, reloj, encabezado, alTerminar }) {
  const planificados = useMemo(() => generarEnsayos(secuencia, semilla), [secuencia, semilla]);
  const [paso, setPaso] = useState({ tipo: 'bienvenida' });
  const [registrados, setRegistrados] = useState([]);
  const pausas = useRef(0);
  const repeticionesInstruccion = useRef(0);

  // Veces que la pestaña se ocultó durante la tarea (contexto de la sesión).
  useEffect(() => {
    const alCambiar = () => {
      if (document.hidden) pausas.current += 1;
    };
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, []);

  const total = secuencia.bloques.length;
  const indice = registrados.length;
  const actual = planificados[indice];
  const bloqueDe = (ensayo) => secuencia.bloques.find((b) => b.id === ensayo.bloque) || null;
  const verInstruccionesDeNuevo = () => {
    repeticionesInstruccion.current += 1;
  };

  function terminarTarea(ensayos) {
    alTerminar(
      armarSesion({
        ensayos,
        semilla,
        reloj: reloj.variante,
        versionCatalogo,
        pausas: pausas.current,
        repeticionesInstruccion: repeticionesInstruccion.current
      })
    );
  }

  function alTerminarEnsayo(medicion) {
    const registro = registrarEnsayo(planificados, indice, medicion, secuencia);
    const ensayos = [...registrados, registro];
    setRegistrados(ensayos);
    const siguiente = planificados[indice + 1];
    if (!siguiente) terminarTarea(ensayos);
    else if (registro.practica) setPaso({ tipo: 'retroalimentacion', registro });
    else if (siguiente && siguiente.bloque === registro.bloque) setPaso({ tipo: 'ensayo' });
    else setPaso({ tipo: 'fin-bloque', bloque: bloqueDe(registro) });
  }

  if (paso.tipo === 'bienvenida') {
    return (
      <>
        {encabezado}
        <Pantalla key="bienvenida" {...BIENVENIDA} alContinuar={() => setPaso({ tipo: 'instrucciones' })} />
      </>
    );
  }
  if (paso.tipo === 'instrucciones') {
    return <Pantalla key="instrucciones" {...INSTRUCCIONES} alContinuar={() => setPaso({ tipo: 'antes-practica' })} />;
  }
  if (paso.tipo === 'antes-practica') {
    return <Pantalla key="antes-practica" {...PRACTICA} alContinuar={() => setPaso({ tipo: 'ensayo' })} />;
  }

  if (paso.tipo === 'retroalimentacion') {
    const mensaje = retroalimentacion(paso.registro, RETROALIMENTACION);
    const Icono = mensaje.correcta ? CircleCheck : CircleHelp;
    const sigue = actual && actual.practica ? { tipo: 'ensayo' } : { tipo: 'fin-practica' };
    return (
      <>
        <BarraProgreso parte={null} total={total} completadas={0} />
        <Pantalla
          key={`retroalimentacion-${paso.registro.numero}`}
          titulo={PRACTICA.titulo}
          boton={RETROALIMENTACION.boton}
          alContinuar={() => setPaso(sigue)}
        >
          <p className={`tarea__retroalimentacion tarea__retroalimentacion--${mensaje.correcta ? 'correcta' : 'revisar'}`}>
            <Icono aria-hidden="true" />
            <span>{mensaje.texto}</span>
          </p>
        </Pantalla>
      </>
    );
  }

  if (paso.tipo === 'fin-practica') {
    return (
      <Pausa
        key="fin-practica"
        {...FIN_PRACTICA}
        instrucciones={INSTRUCCIONES.parrafos}
        alVerInstrucciones={verInstruccionesDeNuevo}
        alContinuar={() => setPaso({ tipo: 'antes-bloque' })}
      />
    );
  }

  if (paso.tipo === 'antes-bloque') {
    const bloque = bloqueDe(actual);
    const esPrimerMixto = bloque.fase === 'mixto' && bloque === secuencia.bloques.find((b) => b.fase === 'mixto');
    return (
      <>
        <BarraProgreso parte={bloque.orden} total={total} completadas={bloque.orden - 1} />
        <Pantalla
          key={`antes-${bloque.id}`}
          {...textosAntesDeBloque(bloque, esPrimerMixto)}
          boton={BOTON_EMPEZAR_BLOQUE}
          alContinuar={() => setPaso({ tipo: 'ensayo' })}
        />
      </>
    );
  }

  if (paso.tipo === 'fin-bloque') {
    const { orden } = paso.bloque;
    return (
      <>
        <BarraProgreso parte={orden} total={total} completadas={orden} />
        <Pausa
          key={`pausa-${orden}`}
          titulo={PAUSA.titulo}
          parrafos={[animo(orden, total)]}
          instrucciones={INSTRUCCIONES.parrafos}
          alVerInstrucciones={verInstruccionesDeNuevo}
          alContinuar={() => setPaso({ tipo: 'antes-bloque' })}
        />
      </>
    );
  }

  // Ensayo: la pantalla solo recibe lo visible (CT-03).
  const bloque = bloqueDe(actual);
  return (
    <>
      <BarraProgreso parte={bloque ? bloque.orden : null} total={total} completadas={bloque ? bloque.orden - 1 : 0} />
      <EnsayoCambioRegla
        key={actual.numero}
        vista={vistaDeEnsayo(actual)}
        reloj={reloj}
        limiteRespuestaMs={secuencia.limiteRespuestaMs}
        intervaloEntreEnsayosMs={secuencia.intervaloEntreEnsayosMs}
        alTerminar={alTerminarEnsayo}
      />
    </>
  );
}
