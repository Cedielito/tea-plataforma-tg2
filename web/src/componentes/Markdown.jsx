/**
 * Cuerpo de los contenidos en Markdown, convertido de forma segura (M-02,
 * RA-11, RS-01):
 * - react-markdown crea elementos de React; no se usa dangerouslySetInnerHTML.
 * - El HTML escrito dentro del Markdown se descarta (skipHtml).
 * - Solo se permiten párrafos, títulos, listas, énfasis, citas y enlaces.
 *   Las imágenes no: cargarían recursos de otros sitios (RS-01) y podrían
 *   llegar sin texto alternativo (RA-04).
 * - Los enlaces con esquemas peligrosos (javascript:) se vacían; los del mismo
 *   sitio navegan con react-router y todos abren en la misma pestaña.
 * - Los títulos empiezan en `nivelTitulos` (## es h2 en una página y h3 dentro
 *   de una pestaña) y nunca pasan de h3.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { esRutaInterna } from '../utilidades/formato.js';

/**
 * react-markdown se descarga aparte, solo en las páginas que lo usan, para que
 * el inicio cargue más rápido en celulares. Las páginas llaman a
 * precargarMarkdown() al montarse, así la descarga ocurre mientras llega el
 * contenido de la API.
 *
 * Las páginas de contenido esperan además a useMarkdownListo() para mostrar
 * todo de una vez (T10): si el cuerpo apareciera después que las fuentes y el
 * pie, los empujaría hacia abajo (CLS, «desplazamiento acumulado del diseño»
 * de Lighthouse). Si la descarga falla, el texto se muestra sin formato y la
 * próxima página lo intenta de nuevo.
 */
let ReactMarkdownCargado = null;
let descarga = null;
/** El último intento falló: lo que se monte después muestra el texto sin formato de inmediato. */
let falloDescarga = false;
function cargarMarkdown() {
  if (!descarga) {
    descarga = import('react-markdown').then(
      (modulo) => {
        ReactMarkdownCargado = modulo.default;
        falloDescarga = false;
        return modulo.default;
      },
      (error) => {
        descarga = null;
        falloDescarga = true;
        throw error;
      }
    );
  }
  return descarga;
}
export function precargarMarkdown() {
  cargarMarkdown().catch(() => {});
}

/** @returns {{Componente: Function|null, fallo: boolean}} */
function useReactMarkdown() {
  const [carga, setCarga] = useState(() => ({ Componente: ReactMarkdownCargado, fallo: falloDescarga }));
  useEffect(() => {
    if (carga.Componente) return undefined;
    let vigente = true;
    cargarMarkdown().then(
      (Componente) => vigente && setCarga({ Componente, fallo: false }),
      () => vigente && setCarga({ Componente: null, fallo: true })
    );
    return () => {
      vigente = false;
    };
  }, [carga.Componente]);
  return carga;
}

/** true cuando react-markdown ya se descargó (o falló: entonces el texto va sin formato). */
export function useMarkdownListo() {
  const { Componente, fallo } = useReactMarkdown();
  return Boolean(Componente) || fallo;
}

const PERMITIDOS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'strong', 'em', 'a', 'blockquote', 'br', 'hr', 'code'
];

const NIVEL_MAXIMO = 3;

function crearTitulo(nivelMarkdown, nivelTitulos) {
  const nivel = Math.min(NIVEL_MAXIMO, nivelTitulos + Math.max(0, nivelMarkdown - 2));
  const Titulo = `h${nivel}`;
  return function TituloMarkdown({ node: _node, ...props }) {
    return <Titulo {...props} />;
  };
}

function Enlace({ node: _node, href = '', children, ...props }) {
  if (esRutaInterna(href)) return <Link to={href} {...props}>{children}</Link>;
  // Un enlace bloqueado (javascript:) llega sin dirección: se muestra como texto.
  if (!href) return <span>{children}</span>;
  return <a href={href} {...props}>{children}</a>;
}

/**
 * Un juego de componentes por nivel, creado una sola vez: si cambiaran en cada
 * render, React volvería a montar los títulos.
 */
const componentesPorNivel = new Map();
function componentesPara(nivelTitulos) {
  if (!componentesPorNivel.has(nivelTitulos)) {
    const componentes = { a: Enlace };
    for (let n = 1; n <= 6; n += 1) componentes[`h${n}`] = crearTitulo(n, nivelTitulos);
    componentesPorNivel.set(nivelTitulos, componentes);
  }
  return componentesPorNivel.get(nivelTitulos);
}

export default function Markdown({ texto, nivelTitulos = 2, className = 'prosa' }) {
  const { Componente: ReactMarkdown, fallo } = useReactMarkdown();
  const componentes = componentesPara(nivelTitulos);

  return (
    <div className={className}>
      {ReactMarkdown && (
        <ReactMarkdown skipHtml allowedElements={PERMITIDOS} unwrapDisallowed components={componentes}>
          {texto}
        </ReactMarkdown>
      )}
      {!ReactMarkdown && fallo && <p className="prosa__sin-formato">{texto}</p>}
    </div>
  );
}
