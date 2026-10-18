/**
 * Resultados del buscador (M-01, RF-02; RA-11). La consulta llega en la
 * dirección (/buscar?q=...) desde la caja del encabezado o desde la de esta
 * página.
 *
 * Cada pregunta frecuente encontrada muestra su respuesta y enlaza a la
 * misma pregunta en /preguntas-frecuentes#slug, que la abre (RF-07, HU-10).
 *
 * Solo el resumen («Encontramos 3 páginas…») está en la región aria-live
 * (role="status"): el lector de pantalla lo anuncia en cada búsqueda y la
 * persona recorre después la lista, que va justo debajo. Si la lista entera
 * estuviera en la región, se leería completa cada vez.
 */
import { useEffect, useId, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Buscador from '../componentes/Buscador.jsx';
import Markdown, { precargarMarkdown, useMarkdownListo } from '../componentes/Markdown.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import { TEXTO_ESPERA } from '../componentes/EstadoDatos.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';
import { RUTA_PREGUNTAS_WEB, nombreDeContenido, rutaDeContenido, rutaDePregunta } from '../secciones.js';
import { caracteresBuscables, contar } from '../utilidades/formato.js';

/** Los mismos límites que valida la API (api/src/dominio/busqueda.js). */
const LARGO_MINIMO = 2;
const LARGO_MAXIMO = 100;

function validar(consulta) {
  if (!consulta) return 'Escribe una o más palabras y presiona el botón Buscar.';
  if (consulta.length > LARGO_MAXIMO) return 'La búsqueda puede tener como máximo 100 caracteres.';
  if (caracteresBuscables(consulta) < LARGO_MINIMO) return 'Escribe al menos 2 letras para buscar.';
  return null;
}

function resumir(consulta, { contenidos, preguntas }) {
  const partes = [];
  if (contenidos.length > 0) partes.push(contar(contenidos.length, 'página', 'páginas'));
  if (preguntas.length > 0) partes.push(contar(preguntas.length, 'pregunta frecuente', 'preguntas frecuentes'));
  if (partes.length === 0) {
    return `No encontramos resultados para «${consulta}». Prueba con otra palabra, por ejemplo «señales» o «EPS».`;
  }
  return `Encontramos ${partes.join(' y ')} para «${consulta}».`;
}

export default function Busqueda() {
  useTituloPagina('Buscar');
  useEffect(precargarMarkdown, []);
  const idPaginas = useId();
  const idPreguntas = useId();
  const regionResumen = useRef(null);
  const [parametros] = useSearchParams();
  const consulta = (parametros.get('q') ?? '').trim();
  const aviso = validar(consulta);

  const { estado, datos, reintentar } = useDatos(aviso ? null : `/api/buscar?q=${encodeURIComponent(consulta)}`);
  // Los resultados aparecen de una vez, con react-markdown ya descargado (CLS, T10).
  const markdownListo = useMarkdownListo();
  const listo = estado === ESTADOS.LISTO && markdownListo;
  const resultados = listo ? datos : { contenidos: [], preguntas: [] };

  // Al buscar otra vez estando aquí, la caja que tenía el foco se reemplaza (key) o queda
  // oculta (el menú del encabezado se cierra en pantallas angostas): el foco pasa al resumen,
  // que anuncia los resultados (RA-03). Al llegar desde otra página, el foco va al h1 (Layout).
  const consultaAnterior = useRef(consulta);
  useEffect(() => {
    if (consultaAnterior.current === consulta) return;
    consultaAnterior.current = consulta;
    const activo = document.activeElement;
    const perdido =
      !activo || activo === document.body || (typeof activo.checkVisibility === 'function' && !activo.checkVisibility());
    if (perdido) regionResumen.current?.focus();
  }, [consulta]);

  let resumen = aviso;
  if (estado === ESTADOS.CARGANDO || (estado === ESTADOS.LISTO && !markdownListo)) {
    resumen = `Buscando «${consulta}». ${TEXTO_ESPERA}`;
  }
  if (estado === ESTADOS.ERROR) {
    resumen = 'No pudimos hacer la búsqueda. El servidor puede estar despertando. Intenta de nuevo en unos segundos.';
  }
  if (listo) resumen = resumir(consulta, resultados);

  return (
    <div className="contenedor pagina">
      <MigasDePan actual="Buscar" />
      <h1>Buscar en el sitio</h1>

      <Buscador
        key={consulta}
        nombre="Nueva búsqueda en el sitio"
        etiqueta="¿Qué quieres buscar?"
        etiquetaVisible
        valorInicial={consulta}
        className="busqueda__caja"
      />

      <p ref={regionResumen} role="status" tabIndex={-1} className="busqueda__resumen">{resumen}</p>

      {estado === ESTADOS.ERROR && (
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => {
            // El botón desaparece al reintentar: el foco pasa al resumen.
            regionResumen.current?.focus();
            reintentar();
          }}
        >
          <RefreshCw aria-hidden="true" />
          Intentar de nuevo
        </button>
      )}

      {resultados.contenidos.length > 0 && (
        <section className="resultados" aria-labelledby={idPaginas}>
          <h2 id={idPaginas}>Páginas</h2>
          <ul className="resultados__lista">
            {resultados.contenidos.map((contenido) => (
              <li key={contenido.slug} className="resultado">
                <Link to={rutaDeContenido(contenido)} className="resultado__enlace">
                  {contenido.titulo}
                </Link>
                <p className="resultado__seccion">{nombreDeContenido(contenido)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resultados.preguntas.length > 0 && (
        <section className="resultados" aria-labelledby={idPreguntas}>
          <h2 id={idPreguntas}>Preguntas frecuentes</h2>
          <ul className="resultados__lista">
            {resultados.preguntas.map(({ slug, pregunta, respuesta }) => (
              <li key={slug} className="resultado">
                <h3 className="resultado__pregunta">
                  <Link to={rutaDePregunta(slug)} className="resultado__enlace">
                    {pregunta}
                  </Link>
                </h3>
                <Markdown texto={respuesta} nivelTitulos={3} className="prosa resultado__respuesta" />
              </li>
            ))}
          </ul>
          <p>
            <Link to={RUTA_PREGUNTAS_WEB} className="enlace-suelto">Ver todas las preguntas frecuentes</Link>
          </p>
        </section>
      )}
    </div>
  );
}
