/**
 * Piezas comunes de los editores del panel: contenidos y pasos de la ruta
 * (M-08, RF-10; RCN-01, RCN-02; RA-03, RA-10, RA-11).
 *
 * - EtiquetaEstado: «Publicado» o «Borrador», con texto y forma, no solo color.
 * - AvisoArchivo: el registro viene de api/contenidos y el archivo puede
 *   reemplazar lo que se guarde en el panel.
 * - CampoFechaRevision: fecha con máximo hoy y botón «Usar la fecha de hoy».
 * - AccionesEditor: Publicar o Guardar cambios, Guardar borrador o
 *   Despublicar, y el resultado anunciado (role="status"). Los botones no
 *   cambian de lugar: el foco se queda en el que se presionó.
 */
import { CalendarCheck, FileText } from 'lucide-react';
import { hoyEnColombia } from '../utilidades/formato.js';
import Campo from './Campo.jsx';
import { PUBLICADO } from './edicion.js';

export function EtiquetaEstado({ estado }) {
  const publicado = estado === PUBLICADO;
  return (
    <span className={`etiqueta etiqueta--${publicado ? 'publicado' : 'borrador'}`}>
      {publicado ? 'Publicado' : 'Borrador'}
    </span>
  );
}

/** @param {{titulo: React.ReactNode, children: React.ReactNode}} props párrafos del aviso */
export function AvisoArchivo({ titulo, children }) {
  return (
    <div role="note" className="aviso aviso-archivo">
      <FileText aria-hidden="true" />
      <div>
        <p>
          <strong>{titulo}</strong>
        </p>
        {children}
      </div>
    </div>
  );
}

export function CampoFechaRevision({ id, valor, alCambiar, error }) {
  const hoy = hoyEnColombia();
  return (
    <Campo
      id={id}
      etiqueta="Fecha de revisión"
      indicacion="(obligatoria para publicar)"
      error={error}
      pista="Día en que se revisó el texto contra sus fuentes. No puede ser posterior a hoy."
    >
      {(props) => (
        <div className="campo__fila">
          <input
            {...props}
            className="campo__control campo__control--fecha"
            type="date"
            max={hoy}
            value={valor}
            onChange={(evento) => alCambiar(evento.target.value)}
          />
          <button type="button" className="boton boton-secundario" onClick={() => alCambiar(hoy)}>
            <CalendarCheck aria-hidden="true" />
            Usar la fecha de hoy
          </button>
        </div>
      )}
    </Campo>
  );
}

/**
 * @param {{publicado: boolean, pista: string, enviando: boolean, resultado: string|null,
 *   alPublicar: () => void, alGuardarBorrador: () => void}} props `pista` explica
 *   los dos botones según el estado
 */
export function AccionesEditor({ publicado, pista, enviando, resultado, alPublicar, alGuardarBorrador }) {
  return (
    <div className="editor__acciones">
      <p className="campo__pista">{pista}</p>
      <div className="acciones">
        <button type="button" className="boton boton-primario" onClick={alPublicar}>
          {publicado ? 'Guardar cambios' : 'Publicar'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={alGuardarBorrador}>
          {publicado ? 'Despublicar' : 'Guardar borrador'}
        </button>
      </div>
      <p className="campo__pista">
        La sesión se cierra si pasan 30 minutos sin guardar ni abrir otra página del panel. Si pasa, lo que
        escribiste se conserva aquí y puedes volver a entrar para guardarlo.
      </p>
      <div role="status" className="editor__resultado">
        {enviando && <p>Guardando…</p>}
        {resultado && <p className="mensaje mensaje--exito">{resultado}</p>}
      </div>
    </div>
  );
}
