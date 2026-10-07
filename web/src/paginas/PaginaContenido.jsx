/**
 * Plantilla de página de contenido (M-02; RCN-01, RCN-02, RCN-03; Cuadro 14,
 * «Patrón de página»): migas de pan, título, aviso de no diagnóstico donde
 * corresponde, cuerpo en Markdown y, al final, fuentes y fecha de revisión.
 * La usan S1 (Qué es el TEA), S3 (Mitos), S4 (Ruta de atención) y S5
 * (Derechos), y las páginas fijas de M-06 (política de privacidad y «Acerca
 * de», RF-12, RS-03), que llegan de /api/paginas/:slug (`seccion.api`).
 *
 * `complemento` va después del aviso y antes del cuerpo, sin esperar a que
 * llegue el contenido: en S4 es la guía de la ruta (M-03, RF-04). Con
 * `tituloCuerpo`, el cuerpo va en su propia sección con un h2 y sus subtítulos
 * bajan a h3, para que el orden de los títulos siga siendo correcto.
 *
 * El h1 se muestra desde el primer momento con el nombre de la sección y
 * cambia al título del contenido cuando llega: es el mismo elemento, así que
 * el foco que el Layout pone en él al navegar no se pierde.
 */
import { useEffect, useId } from 'react';
import AvisoNoDiagnostico from '../componentes/AvisoNoDiagnostico.jsx';
import EstadoDatos from '../componentes/EstadoDatos.jsx';
import FuentesRevision from '../componentes/FuentesRevision.jsx';
import Markdown, { precargarMarkdown } from '../componentes/Markdown.jsx';
import MigasDePan from '../componentes/MigasDePan.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import useDatos, { ESTADOS } from '../api/useDatos.js';

export default function PaginaContenido({ seccion, complemento = null, tituloCuerpo = null }) {
  const { titulo, slug, avisoNoDiagnostico, api } = seccion;
  const idCuerpo = useId();
  useTituloPagina(titulo);
  useEffect(precargarMarkdown, []);
  const { estado, datos: contenido, reintentar } = useDatos(api ?? `/api/contenidos/${slug}`);
  const listo = estado === ESTADOS.LISTO;

  return (
    <div className="contenedor pagina">
      <MigasDePan actual={titulo} />
      <h1>{listo ? contenido.titulo : titulo}</h1>
      {avisoNoDiagnostico && <AvisoNoDiagnostico className="pagina__aviso" />}
      {complemento}

      {listo ? (
        <>
          {tituloCuerpo ? (
            <section className="pagina__cuerpo" aria-labelledby={idCuerpo}>
              <h2 id={idCuerpo}>{tituloCuerpo}</h2>
              <Markdown texto={contenido.cuerpo} nivelTitulos={3} />
            </section>
          ) : (
            <Markdown texto={contenido.cuerpo} />
          )}
          <FuentesRevision grupos={[contenido]} />
        </>
      ) : (
        <EstadoDatos estado={estado} reintentar={reintentar} />
      )}
    </div>
  );
}
