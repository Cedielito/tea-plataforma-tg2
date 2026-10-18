/**
 * /registro/nueva: nueva sesión del registro conductual (M-09, HU-16, CT-11;
 * RA-03, RA-11).
 *
 * - El profesional marca que la persona firmó el consentimiento en papel
 *   (con la versión del formato) y que es mayor de edad. Sin las dos marcas
 *   no se crea la sesión: lo revisa la página y lo vuelve a revisar la API.
 * - No hay ningún campo para datos de la persona.
 * - Creada la sesión, el seudónimo aparece en grande, con «Copiar», para
 *   escribirlo en la copia del consentimiento que se lleva la persona. Desde
 *   ahí se entrega el dispositivo.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Copy, FilePlus2 } from 'lucide-react';
import Campo, { MensajeError, describir } from '../componentes/Campo.jsx';
import ResumenErrores from '../componentes/ResumenErrores.jsx';
import SesionVencida from '../admin/SesionVencida.jsx';
import { ErrorAdmin, mensajeDeError, pedirAdmin } from '../admin/clienteAdmin.js';
import EntregarDispositivo from './EntregarDispositivo.jsx';
import { RUTA_API_SESIONES, rutaSesionWeb } from './rutasProfesional.js';
import { NUEVA } from './textosProfesional.js';

const VACIO = Object.freeze({ consentimientoFirmado: false, versionConsentimiento: '', mayorDeEdad: false });

/** Las mismas reglas que la API (api/src/dominio/registro/sesionRegistro.js, leerNuevaSesion). */
function validar(valores) {
  const errores = {};
  if (!valores.consentimientoFirmado) errores.consentimientoFirmado = NUEVA.faltaConsentimiento;
  if (valores.versionConsentimiento.trim() === '') errores.versionConsentimiento = NUEVA.faltaVersion;
  if (!valores.mayorDeEdad) errores.mayorDeEdad = NUEVA.faltaMayorDeEdad;
  return errores;
}

function Casilla({ id, campo, etiqueta, pista, error, valores, cambiar }) {
  return (
    <div className={`campo${error ? ' campo--con-error' : ''}`}>
      <MensajeError id={`${id}-error`}>{error}</MensajeError>
      <label className="casilla">
        <input
          {...describir(id, { pista, error })}
          type="checkbox"
          checked={valores[campo]}
          onChange={(evento) => cambiar(campo, evento.target.checked)}
        />
        {etiqueta}
      </label>
      {pista && (
        <p id={`${id}-pista`} className="campo__pista">
          {pista}
        </p>
      )}
    </div>
  );
}

function SeudonimoCreado({ sesion }) {
  const titulo = useRef(null);
  const [copia, setCopia] = useState('');
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(sesion.seudonimo);
      setCopia(NUEVA.copiado);
    } catch {
      setCopia(NUEVA.noCopiado);
    }
  }

  return (
    <>
      <section className="tarjeta-admin seudonimo-creado" aria-labelledby="seudonimo-creado">
        <h2 id="seudonimo-creado" ref={titulo} tabIndex={-1} className="tarjeta-admin__titulo">{NUEVA.creadaTitulo}</h2>
        <p className="seudonimo-creado__etiqueta">{NUEVA.seudonimoEtiqueta}</p>
        <p className="seudonimo" lang="es">{sesion.seudonimo}</p>
        <p>{NUEVA.seudonimoIndicacion}</p>
        <div className="acciones">
          <button type="button" className="boton boton-secundario" onClick={copiar}>
            {copia === NUEVA.copiado ? <ClipboardCheck aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {NUEVA.copiar}
          </button>
          <Link to={rutaSesionWeb(sesion.seudonimo)} className="boton boton-secundario">{NUEVA.verSesion}</Link>
        </div>
        <p role="status">{copia}</p>
      </section>
      <EntregarDispositivo seudonimo={sesion.seudonimo} />
    </>
  );
}

export default function NuevaSesion() {
  const id = useId();
  const ids = { consentimientoFirmado: `${id}-consentimiento`, versionConsentimiento: `${id}-version`, mayorDeEdad: `${id}-mayor` };
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [creada, setCreada] = useState(null);
  const resumen = useRef(null);
  const hayErrores = Object.keys(errores).length > 0 || general;

  useEffect(() => {
    if (hayErrores) resumen.current?.focus();
  }, [errores, general]);

  function cambiar(campo, valor) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
  }

  async function alEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    const encontrados = validar(valores);
    setGeneral(null);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      const sesion = await pedirAdmin(RUTA_API_SESIONES, {
        metodo: 'POST',
        datos: { ...valores, versionConsentimiento: valores.versionConsentimiento.trim() }
      });
      setCreada(sesion);
    } catch (problema) {
      if (problema instanceof ErrorAdmin && problema.estado === 401) return;
      if (problema instanceof ErrorAdmin && problema.estado === 422) setErrores(problema.campos);
      else setGeneral(mensajeDeError(problema));
    } finally {
      setEnviando(false);
    }
  }

  const etiquetas = {
    consentimientoFirmado: NUEVA.consentimiento,
    versionConsentimiento: NUEVA.version,
    mayorDeEdad: NUEVA.mayorDeEdad
  };
  const listaErrores = [
    ...Object.entries(errores).map(([campo, mensaje]) => ({ id: ids[campo] || '', etiqueta: etiquetas[campo] || '', mensaje })),
    ...(general ? [{ id: '', etiqueta: '', mensaje: general }] : [])
  ];

  return (
    <div className="contenedor pagina registro-profesional">
      <h1>{NUEVA.titulo}</h1>
      <SesionVencida />
      {creada ? (
        <SeudonimoCreado sesion={creada} />
      ) : (
        <>
          <p className="pagina__descripcion">{NUEVA.descripcion}</p>
          {hayErrores && <ResumenErrores ref={resumen} titulo={NUEVA.revisa} errores={listaErrores} />}
          <form className="formulario" onSubmit={alEnviar} noValidate>
            <Casilla
              id={ids.consentimientoFirmado}
              campo="consentimientoFirmado"
              etiqueta={NUEVA.consentimiento}
              error={errores.consentimientoFirmado}
              valores={valores}
              cambiar={cambiar}
            />
            <Campo
              id={ids.versionConsentimiento}
              etiqueta={NUEVA.version}
              pista={NUEVA.versionPista}
              error={errores.versionConsentimiento}
            >
              {(props) => (
                <input
                  {...props}
                  className="campo__control campo__control--corto"
                  name="versionConsentimiento"
                  autoComplete="off"
                  maxLength={20}
                  value={valores.versionConsentimiento}
                  onChange={(evento) => cambiar('versionConsentimiento', evento.target.value)}
                />
              )}
            </Campo>
            <Casilla
              id={ids.mayorDeEdad}
              campo="mayorDeEdad"
              etiqueta={NUEVA.mayorDeEdad}
              pista={NUEVA.mayorDeEdadPista}
              error={errores.mayorDeEdad}
              valores={valores}
              cambiar={cambiar}
            />
            <button type="submit" className="boton boton-primario">
              <FilePlus2 aria-hidden="true" />
              {enviando ? NUEVA.creando : NUEVA.crear}
            </button>
          </form>
        </>
      )}
      <p className="registro-profesional__volver">
        <Link to="/registro">{NUEVA.volver}</Link>
      </p>
    </div>
  );
}
