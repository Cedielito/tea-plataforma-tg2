import { useState } from 'react';
import './tokens.css';
import Consentimiento from './pantallas/Consentimiento';
import Asentimiento from './pantallas/Asentimiento';
import PanelSensorial from './pantallas/PanelSensorial';
import MapaSeleccion from './pantallas/MapaSeleccion';
import * as api from './api';

/** Maquina de estados del flujo de la Figura 5 del documento. */
const PASOS = ['consentimiento', 'asentimiento', 'panel', 'seleccion', 'juego', 'cierre', 'bloqueada'];

export default function App() {
  const [paso, setPaso] = useState('consentimiento');
  const [sesion, setSesion] = useState(null);
  const [completados, setCompletados] = useState([]);

  async function autorizar(consentimiento) {
    const creada = await api.crearSesion({ edad: 9 });
    setSesion({ ...creada, consentimiento });
    setPaso('asentimiento');
  }

  function responderAsentimiento(acepta) {
    setPaso(acepta ? 'panel' : 'bloqueada');
  }

  if (paso === 'bloqueada') {
    return <main><h1>Gracias</h1><p>La actividad no continúa. Nadie va a insistir.</p></main>;
  }
  if (paso === 'consentimiento') {
    return <Consentimiento onAutorizar={autorizar} onCancelar={() => setPaso('bloqueada')} />;
  }
  if (paso === 'asentimiento') {
    return <Asentimiento modalidad={sesion?.modalidadAsentimiento} onResponder={responderAsentimiento} />;
  }
  if (paso === 'panel') {
    return <PanelSensorial onListo={() => setPaso('seleccion')} />;
  }
  return (
    <MapaSeleccion
      minijuegos={[
        { codigo: 'MJ-1', nombre: 'El detective de miradas' },
        { codigo: 'MJ-2', nombre: 'La fiesta de sorpresas' },
        { codigo: 'MJ-3', nombre: 'El taller que cambia' }
      ]}
      completados={completados}
      onElegir={(c) => setCompletados([...completados, c])}
    />
  );
}
export { PASOS };
