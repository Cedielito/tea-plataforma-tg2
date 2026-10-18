/**
 * Preguntas frecuentes en /preguntas-frecuentes (M-05; RF-07, RF-02, HU-10;
 * RCN-01, RCN-02; RA-03, RA-11).
 *
 * - Acordeón según el patrón de WAI-ARIA: cada pregunta es un botón dentro de
 *   un h2, con aria-expanded y aria-controls; su panel tiene la respuesta, las
 *   fuentes y «Revisado el dd/mm/aaaa». Se abre y se cierra con Enter o
 *   Espacio, y se pueden tener varias abiertas a la vez. Los paneles no llevan
 *   role="region": con 12 serían demasiadas regiones.
 * - Ancla: /preguntas-frecuentes#slug abre esa pregunta cuando llegan los
 *   datos, la sube a la vista y pone el foco en su botón (así llegan los
 *   resultados del buscador). Ocurre después del foco en el h1 que pone el
 *   Layout al navegar, porque los datos llegan después. Un ancla que no
 *   corresponde a ninguna pregunta se ignora.
 * - Sin animaciones ni temporizadores.
 * - Al final, «¿No encontraste tu respuesta? Escríbenos» lleva al formulario
 *   de contacto (M-06, RF-08; tarea T8 de la prueba de usabilidad).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import { precargarMarkdown, useMarkdownListo } from '../componentes/Markdown.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import { RUTA_CONTACTO_WEB } from '../secciones.js';
import PreguntaDesplegable from './PreguntaDesplegable.jsx';
import { RUTA_PREGUNTAS, preguntaDelAncla } from './anclaPregunta.js';

export default function PreguntasFrecuentes({ seccion }) {
  const { titulo, descripcion } = seccion;
  useTituloPagina(titulo);
  useEffect(precargarMarkdown, []);
  const { hash } = useLocation();
  const [abiertas, setAbiertas] = useState(() => new Set());
  const elementos = useRef(new Map());

  const { estado, datos, reintentar } = useDatos(RUTA_PREGUNTAS);
  // Con react-markdown ya descargado, la pregunta que abre el ancla muestra su respuesta de una vez (CLS, T10).
  const markdownListo = useMarkdownListo();
  const listo = estado === ESTADOS.LISTO && markdownListo && datos.length > 0;
  const preguntas = listo ? datos : [];

  // El ancla abre su pregunta cuando llegan los datos o cuando cambia la dirección.
  useEffect(() => {
    const pedida = listo ? preguntaDelAncla(hash, datos) : null;
    if (!pedida) return;
    setAbiertas((anteriores) => new Set(anteriores).add(pedida.slug));
    const elemento = elementos.current.get(pedida.slug);
    if (!elemento) return;
    elemento.scrollIntoView({ block: 'start' });
    elemento.querySelector('button')?.focus({ preventScroll: true });
  }, [listo, datos, hash]);

  function alternar(slug) {
    setAbiertas((anteriores) => {
      const siguientes = new Set(anteriores);
      if (siguientes.has(slug)) siguientes.delete(slug);
      else siguientes.add(slug);
      return siguientes;
    });
  }

  return (
    <div className="contenedor pagina preguntas-frecuentes">
      <MigasDePan actual={titulo} />
      <h1>{titulo}</h1>
      <p className="pagina__descripcion">{descripcion} Elige una pregunta para ver su respuesta y sus fuentes.</p>

      {listo ? (
        // role="list": algunos lectores de pantalla quitan la lista si no tiene viñetas visibles
        <ul className="acordeon" role="list">
          {preguntas.map((pregunta) => (
            <PreguntaDesplegable
              key={pregunta.slug}
              ref={(elemento) =>
                elemento ? elementos.current.set(pregunta.slug, elemento) : elementos.current.delete(pregunta.slug)
              }
              pregunta={pregunta}
              abierta={abiertas.has(pregunta.slug)}
              alAlternar={() => alternar(pregunta.slug)}
            />
          ))}
        </ul>
      ) : (
        <EstadoDatos
          estado={estado === ESTADOS.LISTO ? (markdownListo ? ESTADOS.NO_ENCONTRADO : ESTADOS.CARGANDO) : estado}
          reintentar={reintentar}
          queCarga="las preguntas frecuentes"
          sinContenido="Todavía no hay preguntas frecuentes publicadas."
          reservarAlto
        />
      )}

      <p className="enlace-contacto">
        <Mail aria-hidden="true" />
        <Link to={RUTA_CONTACTO_WEB}>¿No encontraste tu respuesta? Escríbenos</Link>
      </p>
    </div>
  );
}
