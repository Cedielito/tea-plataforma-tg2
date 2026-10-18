/**
 * Tarea de figuras jerárquicas de Navon, «Los carteles de letras» (M-09,
 * HU-17, CC-10, CP-01, CP-04, CT-03, CT-08). Recorre los ensayos que genera
 * generadorNavon.js a partir del plan de la API:
 *
 *   bienvenida → instrucciones → práctica: por cada ensayo, instrucciones de
 *   su nivel → ensayo → retroalimentación; pausa → por cada bloque:
 *   instrucciones de su nivel → ensayos → ánimo y pausa; al terminar el
 *   último bloque, la sesión pasa a quien usa la tarea
 *
 * - Antes de cada bloque y de cada ensayo de la práctica, una pantalla
 *   «Mira la letra grande» o «Mira las letras pequeñas» con un ejemplo
 *   dibujado. También antes del tercer bloque, aunque repita el nivel.
 * - La práctica tiene un ensayo de cada nivel, con retroalimentación (CP-04).
 * - Pausa después de la práctica y de cada bloque (CT-08), sin límite de
 *   tiempo; desde ahí se pueden ver de nuevo las instrucciones.
 * - Tras cada ensayo solo se muestra lo que permite vistaDeEnsayo (CT-03).
 * - La sesión es local: al terminar se entrega a quien la usa (alTerminar).
 *
 * Las dinámicas gamificadas declaran su principio neuroeducativo en textos.js
 * (NAVON) y BarraProgreso.jsx.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleHelp } from 'lucide-react';
import BarraProgreso from './BarraProgreso.jsx';
import EnsayoNavon from './EnsayoNavon.jsx';
import FiguraNavon from './FiguraNavon.jsx';
import { Pantalla, Pausa } from './PantallasTarea.jsx';
import { generarEnsayosNavon } from './generadorNavon.js';
import { armarSesion, registrarEnsayoNavon } from './sesionLocal.js';
import { retroalimentacion, vistaDeEnsayo } from './vista.js';
import { animoNavon, BOTON_EMPEZAR_BLOQUE, EJEMPLO_NAVON, INSTRUCCIONES_NIVEL, NAVON, PAUSA } from './textos.js';

/** Instrucciones de un nivel, con el ejemplo dibujado. */
function InstruccionNivel({ condicion, boton, alContinuar }) {
  const { titulo, parrafos, ejemplo } = INSTRUCCIONES_NIVEL[condicion];
  return (
    <Pantalla titulo={titulo} parrafos={parrafos} boton={boton} alContinuar={alContinuar}>
      <figure className="tarea__ejemplo">
        <FiguraNavon estimulo={EJEMPLO_NAVON} className="tarea__ejemplo-figura" />
        <figcaption>{ejemplo}</figcaption>
      </figure>
    </Pantalla>
  );
}

/**
 * @param {{secuencia: object, versionCatalogo: string, semilla: number, reloj: object,
 *   encabezado?: React.ReactNode, alTerminar: (sesion: object) => void}} props
 */
export default function TareaNavon({ secuencia, versionCatalogo, semilla, reloj, encabezado, alTerminar }) {
  const planificados = useMemo(() => generarEnsayosNavon(secuencia, semilla), [secuencia, semilla]);
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

  function alTerminarEnsayo(medicion) {
    const registro = registrarEnsayoNavon(planificados, indice, medicion);
    const ensayos = [...registrados, registro];
    setRegistrados(ensayos);
    const siguiente = planificados[indice + 1];
    if (!siguiente) {
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
    } else if (registro.practica) setPaso({ tipo: 'retroalimentacion', registro });
    else if (siguiente.bloque === registro.bloque) setPaso({ tipo: 'ensayo' });
    else setPaso({ tipo: 'fin-bloque', bloque: bloqueDe(registro) });
  }

  if (paso.tipo === 'bienvenida') {
    return (
      <>
        {encabezado}
        <Pantalla key="bienvenida" {...NAVON.bienvenida} alContinuar={() => setPaso({ tipo: 'instrucciones' })} />
      </>
    );
  }
  if (paso.tipo === 'instrucciones') {
    return <Pantalla key="instrucciones" {...NAVON.instrucciones} alContinuar={() => setPaso({ tipo: 'antes-practica' })} />;
  }
  if (paso.tipo === 'antes-practica') {
    return <Pantalla key="antes-practica" {...NAVON.practica} alContinuar={() => setPaso({ tipo: 'antes-ensayo-practica' })} />;
  }

  if (paso.tipo === 'antes-ensayo-practica') {
    return (
      <>
        <BarraProgreso parte={null} total={total} completadas={0} textos={NAVON.progreso} />
        <InstruccionNivel
          key={`antes-practica-${actual.numero}`}
          condicion={actual.condicion}
          boton={NAVON.botonVerCartel}
          alContinuar={() => setPaso({ tipo: 'ensayo' })}
        />
      </>
    );
  }

  if (paso.tipo === 'retroalimentacion') {
    const mensaje = retroalimentacion(paso.registro, NAVON.retroalimentacion);
    const Icono = mensaje.correcta ? CircleCheck : CircleHelp;
    const sigue = actual && actual.practica ? { tipo: 'antes-ensayo-practica' } : { tipo: 'fin-practica' };
    return (
      <>
        <BarraProgreso parte={null} total={total} completadas={0} textos={NAVON.progreso} />
        <Pantalla
          key={`retroalimentacion-${paso.registro.numero}`}
          titulo={NAVON.practica.titulo}
          boton={NAVON.retroalimentacion.boton}
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
        {...NAVON.finPractica}
        instrucciones={NAVON.instrucciones.parrafos}
        alVerInstrucciones={verInstruccionesDeNuevo}
        alContinuar={() => setPaso({ tipo: 'antes-bloque' })}
      />
    );
  }

  if (paso.tipo === 'antes-bloque') {
    const bloque = bloqueDe(actual);
    return (
      <>
        <BarraProgreso parte={bloque.orden} total={total} completadas={bloque.orden - 1} textos={NAVON.progreso} />
        <InstruccionNivel
          key={`antes-${bloque.id}`}
          condicion={bloque.condicion}
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
        <BarraProgreso parte={orden} total={total} completadas={orden} textos={NAVON.progreso} />
        <Pausa
          key={`pausa-${orden}`}
          titulo={PAUSA.titulo}
          parrafos={[animoNavon(orden, total)]}
          instrucciones={NAVON.instrucciones.parrafos}
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
      <BarraProgreso
        parte={bloque ? bloque.orden : null}
        total={total}
        completadas={bloque ? bloque.orden - 1 : 0}
        textos={NAVON.progreso}
      />
      <EnsayoNavon
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
