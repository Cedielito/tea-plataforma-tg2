/**
 * Señales de alerta por edad (M-02, S2; RF-03, RCN-03, RCN-04).
 *
 * - Arriba, en todas las pestañas: el aviso de no diagnóstico y la
 *   introducción (el contenido de S2 sin tramo), que explica que las señales
 *   son motivos de consulta y no sirven para diagnosticar.
 * - Pestañas 4 a 7, 8 a 12 y 13 a 17 años. Cada tramo se muestra como texto
 *   corrido y viñetas: sin casillas, sin numeración, sin contadores ni
 *   resultados (RCN-04).
 * - Un recuadro final enlaza a la ruta de atención.
 * - Al final, las fuentes y la fecha de revisión de la introducción y del
 *   tramo elegido, cada una por separado.
 *
 * El tramo elegido va en la dirección (?edad=8-12) para poder compartir el
 * enlace y para que el buscador abra la pestaña correcta. No se guarda nada.
 */
import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Route } from 'lucide-react';
import AvisoNoDiagnostico from '../componentes/AvisoNoDiagnostico.jsx';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import FuentesRevision from '../componentes/FuentesRevision.jsx';
import Markdown, { precargarMarkdown } from '../componentes/Markdown.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import Pestanas from '../componentes/Pestanas.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import { TRAMOS_EDAD } from '../secciones.js';

export default function SenalesDeAlerta({ seccion }) {
  const { titulo } = seccion;
  useTituloPagina(titulo);
  useEffect(precargarMarkdown, []);
  const idEdades = useId();
  const idRecuadro = useId();
  const [parametros, setParametros] = useSearchParams();
  const pedida = parametros.get('edad');
  const edadDeLaDireccion = TRAMOS_EDAD.some(({ valor }) => valor === pedida) ? pedida : TRAMOS_EDAD[0].valor;

  // La pestaña cambia al instante con el estado local; la dirección se
  // actualiza después. Si la dirección cambia por fuera (un resultado del
  // buscador), manda la dirección.
  const [edad, setEdad] = useState(edadDeLaDireccion);
  useEffect(() => setEdad(edadDeLaDireccion), [edadDeLaDireccion]);

  const { estado, datos, reintentar } = useDatos(`/api/contenidos?seccion=${seccion.seccion}`);
  const contenidos = estado === ESTADOS.LISTO ? datos : [];
  const introduccion = contenidos.find((c) => !c.tramoEdad);
  const tramo = contenidos.find((c) => c.tramoEdad === edad);
  const hayContenido = contenidos.length > 0;

  function cambiarEdad(valor) {
    setEdad(valor);
    setParametros({ edad: valor }, { replace: true, preventScrollReset: true });
  }

  return (
    <div className="contenedor pagina">
      <MigasDePan actual={titulo} />
      <h1>{introduccion ? introduccion.titulo : titulo}</h1>
      <AvisoNoDiagnostico className="pagina__aviso" />

      {!hayContenido ? (
        <EstadoDatos
          estado={estado === ESTADOS.LISTO ? ESTADOS.NO_ENCONTRADO : estado}
          reintentar={reintentar}
          queCarga="las señales de alerta"
        />
      ) : (
        <>
          {introduccion && <Markdown texto={introduccion.cuerpo} />}

          <section className="senales" aria-labelledby={idEdades}>
            <h2 id={idEdades}>Señales según la edad</h2>
            <p className="senales__indicacion">Elige la edad del niño, la niña o el adolescente.</p>
            <Pestanas etiquetadoPor={idEdades} pestanas={TRAMOS_EDAD} seleccionada={edad} alCambiar={cambiarEdad}>
              {tramo ? (
                <Markdown texto={tramo.cuerpo} nivelTitulos={3} />
              ) : (
                <p className="secundario">Las señales de esta edad todavía no están publicadas.</p>
              )}
            </Pestanas>
          </section>

          <section className="recuadro-ruta" aria-labelledby={idRecuadro}>
            <span className="recuadro-ruta__icono" aria-hidden="true">
              <Route />
            </span>
            <div>
              <h2 id={idRecuadro} className="recuadro-ruta__titulo">¿Notaste alguna de estas situaciones?</h2>
              <p>
                Consulta con un profesional de la salud. La ruta de atención explica a dónde
                acudir y qué pasos seguir en Colombia.
              </p>
              <Link to="/ruta-de-atencion" className="boton boton-primario">
                Ver la ruta de atención
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>

          <FuentesRevision
            grupos={[
              introduccion && { ...introduccion, titulo: 'Introducción' },
              tramo
            ].filter(Boolean)}
          />
        </>
      )}
    </div>
  );
}
