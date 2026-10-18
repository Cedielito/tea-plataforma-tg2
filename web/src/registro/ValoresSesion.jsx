/**
 * Valores observados de una sesión completa, por tarea (M-09, HU-18, CC-08,
 * CC-09, CC-10, CC-12, RF-15, CT-13, RCN-03).
 *
 * - Arriba, el aviso de M-09 tal como lo entrega la API, y la versión del
 *   algoritmo con que se calcularon los valores.
 * - Por tarea, una tabla con el código, el constructo, la métrica y el valor
 *   observado con su unidad. Nada más: sin etiquetas ni comparaciones con una
 *   norma, y sin sumar valores entre tareas (regla 10 de CLAUDE.md).
 * - Las variables de contexto van aparte y dicen que no son indicadores.
 * - Una sesión incompleta no muestra valores: lo dice y nada más.
 */
import { Info } from 'lucide-react';
import { AVISO_REGISTRO } from './textos.js';
import { DETALLE, VARIABLES_SESION, VARIABLES_TAREA } from './textosProfesional.js';
import { valorDeContextoSesion, valorDeContextoTarea, valorObservado } from './formatoValores.js';

function Aviso({ texto }) {
  return (
    <div role="note" className="aviso">
      <Info aria-hidden="true" />
      <p>{texto}</p>
    </div>
  );
}

function TablaVariables({ id, titulo, filas }) {
  return (
    <div className="tabla-registro" role="region" aria-labelledby={id} tabIndex={0}>
      <table>
        <caption id={id}>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{DETALLE.variable}</th>
            <th scope="col">{DETALLE.valor}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, valor]) => (
            <tr key={nombre}>
              <th scope="row">{nombre}</th>
              <td>{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValoresTarea({ tarea, datos }) {
  const { columnas } = DETALLE;
  const idTabla = `valores-${tarea}`;
  return (
    <section className="valores-tarea" aria-labelledby={`titulo-${idTabla}`}>
      <h3 id={`titulo-${idTabla}`}>{datos.titulo}</h3>
      <div className="tabla-registro" role="region" aria-labelledby={`titulo-${idTabla}`} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">{columnas.codigo}</th>
              <th scope="col">{columnas.constructo}</th>
              <th scope="col">{columnas.metrica}</th>
              <th scope="col">{columnas.valor}</th>
            </tr>
          </thead>
          <tbody>
            {datos.indicadores.map((indicador) => (
              <tr key={indicador.codigo}>
                <th scope="row">{indicador.codigo}</th>
                <td>{indicador.constructo}</td>
                <td className="tabla-registro__texto">{indicador.metrica}</td>
                <td>{valorObservado(indicador)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablaVariables
        id={`contexto-${tarea}`}
        titulo={DETALLE.contextoTarea}
        filas={Object.entries(VARIABLES_TAREA).map(([clave, nombre]) => [nombre, valorDeContextoTarea(clave, datos.contexto[clave])])}
      />
    </section>
  );
}

/** @param {{valores: object}} props `valores` como lo entrega la API (procesarSesion) */
export default function ValoresSesion({ valores }) {
  const aviso = valores.avisos?.texto ?? AVISO_REGISTRO;
  return (
    <section className="valores-sesion" aria-labelledby="valores-sesion">
      <h2 id="valores-sesion">{DETALLE.valores}</h2>
      <Aviso texto={aviso} />
      {!valores.procesada ? (
        <p>{DETALLE.sinProcesar}</p>
      ) : (
        <>
          <p>
            {DETALLE.versionAlgoritmo}: <strong>{valores.versionAlgoritmo}</strong>
          </p>
          {Object.entries(valores.tareas).map(([tarea, datos]) => (
            <ValoresTarea key={tarea} tarea={tarea} datos={datos} />
          ))}
          <TablaVariables
            id="contexto-sesion"
            titulo={DETALLE.contextoSesion}
            filas={Object.entries(VARIABLES_SESION).map(([clave, nombre]) => [
              nombre,
              valorDeContextoSesion(clave, valores.contexto[clave])
            ])}
          />
        </>
      )}
    </section>
  );
}
