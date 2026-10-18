/**
 * Tabla de los ensayos registrados y descarga en JSON (M-09), al terminar las
 * tareas en la página de prueba (las de cambio de regla y las de Navon, en un
 * solo archivo). Es para el equipo, no para el participante:
 * se muestra solo después del último ensayo (CT-03 rige durante los ensayos).
 * La tabla se desplaza dentro de su recuadro en pantallas angostas, sin mover
 * la página (RA-01 a RA-11).
 */
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { nombreArchivo } from './sesionLocal.js';
import { COLUMNAS_TABLA, nombreCortoNavon, nombreFigura, PAGINA_PRUEBA } from './textos.js';

const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });

function celda(clave, valor) {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (clave === 'estimulo') return 'global' in valor ? nombreCortoNavon(valor) : nombreFigura(valor);
  if (typeof valor === 'number') return NUMERO.format(valor);
  return valor;
}

export default function TablaEnsayos({ sesion }) {
  // El enlace se crea y se libera en el mismo efecto (en StrictMode el efecto corre dos veces).
  const [enlace, setEnlace] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(sesion, null, 2)], { type: 'application/json' }));
    setEnlace(url);
    return () => URL.revokeObjectURL(url);
  }, [sesion]);

  return (
    <section className="tabla-ensayos" aria-labelledby="titulo-tabla-ensayos">
      <h2 id="titulo-tabla-ensayos">{PAGINA_PRUEBA.tituloTabla}</h2>
      {enlace && (
        <p>
          <a className="boton boton-primario" href={enlace} download={nombreArchivo(sesion)}>
            <Download aria-hidden="true" />
            {PAGINA_PRUEBA.descargar}
          </a>
        </p>
      )}
      <div className="tabla-ensayos__recuadro" role="region" aria-labelledby="titulo-tabla-ensayos" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {COLUMNAS_TABLA.map(([clave, titulo]) => (
                <th key={clave} scope="col">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sesion.ensayos.map((ensayo) => (
              <tr key={`${ensayo.tarea}-${ensayo.numero}`}>
                {COLUMNAS_TABLA.map(([clave]) => (
                  <td key={clave}>{celda(clave, ensayo[clave])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
