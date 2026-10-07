/**
 * Lógica común de los editores del panel: contenidos y pasos de la ruta
 * (M-08, RF-10; RCN-01, RCN-02; RA-03, RA-11).
 *
 * - Fuentes: filas del formulario ↔ datos para la API.
 * - Errores del servidor: un mensaje por campo y por fila de fuente, y la
 *   lista del resumen de arriba, en el orden del formulario.
 * - useEditor: guardar (crear o editar), mensajes del resultado y foco en el
 *   resumen de errores.
 * - useCargaEditor: el registro que se edita, que se conserva aunque los
 *   datos se vuelvan a pedir al iniciar sesión de nuevo.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ESTADOS } from '../api/useDatos.js';
import { ID_AGREGAR_FUENTE, filaVacia, idEnlaceFuente, idTextoFuente } from './EditorFuentes.jsx';
import useDatosAdmin from './useDatosAdmin.js';
import { ErrorAdmin, mensajeDeError, pedirAdmin } from './clienteAdmin.js';

export const PUBLICADO = 'publicado';
export const BORRADOR = 'borrador';

/** Fuentes guardadas → filas del formulario; siempre al menos una fila vacía. */
export function fuentesAFilas(fuentes) {
  return fuentes?.length ? fuentes.map(({ texto, url }) => filaVacia(texto ?? '', url ?? '')) : [filaVacia()];
}

/**
 * Las filas vacías no se envían. `filasEnviadas` guarda a qué fila del
 * formulario corresponde cada fuente enviada, para ubicar los errores
 * `fuentes.N.*` del servidor.
 */
export function fuentesParaEnviar(filas) {
  const filasEnviadas = filas.filter((fila) => fila.texto.trim() !== '' || fila.url.trim() !== '');
  return { filasEnviadas, fuentes: filasEnviadas.map(({ texto, url }) => ({ texto, url })) };
}

/** Reparte los mensajes del servidor entre los campos y las filas de fuentes. */
export function repartirErrores(campos, filasEnviadas, ordenCampos) {
  const errores = { porCampo: {}, porFila: {}, otros: [] };
  for (const [ruta, mensaje] of Object.entries(campos)) {
    const fila = /^fuentes\.(\d+)\.(texto|url)$/.exec(ruta);
    if (fila) {
      const destino = filasEnviadas[Number(fila[1])];
      if (destino) {
        errores.porFila[destino.clave] = { ...errores.porFila[destino.clave], [fila[2]]: mensaje };
        continue;
      }
    }
    if (ordenCampos.includes(ruta)) errores.porCampo[ruta] = mensaje;
    else errores.otros.push(mensaje);
  }
  return errores;
}

/**
 * Lista del resumen de errores, en el orden del formulario.
 * @param {{orden: string[], ids: Object<string, string>, etiquetas: Object<string, string>}} campos
 *   `ids` dice a qué control lleva el enlace de cada campo
 */
export function listaDelResumen(errores, filas, { orden, ids, etiquetas }) {
  const lista = [];
  for (const campo of orden) {
    if (campo === 'fuentes') {
      if (errores.porCampo.fuentes) {
        const destino = filas[0] ? idTextoFuente(filas[0].clave) : ID_AGREGAR_FUENTE;
        lista.push({ id: destino, etiqueta: etiquetas.fuentes, mensaje: errores.porCampo.fuentes });
      }
      filas.forEach((fila, indice) => {
        const deLaFila = errores.porFila[fila.clave] ?? {};
        if (deLaFila.texto) {
          lista.push({ id: idTextoFuente(fila.clave), etiqueta: `Fuente ${indice + 1}`, mensaje: deLaFila.texto });
        }
        if (deLaFila.url) {
          lista.push({ id: idEnlaceFuente(fila.clave), etiqueta: `Enlace de la fuente ${indice + 1}`, mensaje: deLaFila.url });
        }
      });
    } else if (errores.porCampo[campo]) {
      lista.push({ id: ids[campo], etiqueta: etiquetas[campo], mensaje: errores.porCampo[campo] });
    }
  }
  return [...lista, ...errores.otros.map((mensaje) => ({ id: null, etiqueta: '', mensaje }))];
}

/**
 * Estado y guardado de un formulario del panel.
 * @param {{inicial: object, aFormulario: (registro) => object,
 *   aDatos: (formulario, estado) => {datos: object, filasEnviadas: object[]},
 *   rutaApi: string, rutaEditor: string, ordenCampos: string[],
 *   textoDeExito: (anterior: string, nuevo: string) => string}} opciones
 *   `rutaApi` es la colección en la API (/api/admin/contenidos) y
 *   `rutaEditor`, la del editor en el panel (/admin/contenidos)
 */
export function useEditor({ inicial, aFormulario, aDatos, rutaApi, rutaEditor, ordenCampos, textoDeExito }) {
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const resumen = useRef(null);
  const [registro, setRegistro] = useState(inicial);
  const [formulario, setFormulario] = useState(() => aFormulario(inicial));
  const [errores, setErrores] = useState(null);
  // Al crear se llega aquí con el mensaje del resultado: va arriba, junto al h1 que recibe el foco.
  const [avisoCreacion, setAvisoCreacion] = useState(state?.mensaje ?? null);
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (errores) resumen.current?.focus();
  }, [errores]);
  // El mensaje no se repite si se recarga la página.
  useEffect(() => {
    if (state?.mensaje) navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  const cambiar = (campo) => (evento) => setFormulario((anterior) => ({ ...anterior, [campo]: evento.target.value }));

  async function guardar(estado) {
    if (enviando) return;
    setEnviando(true);
    setErrores(null);
    setResultado(null);
    setAvisoCreacion(null);
    const { datos, filasEnviadas } = aDatos(formulario, estado);
    try {
      const guardado = registro._id
        ? await pedirAdmin(`${rutaApi}/${registro._id}`, { metodo: 'PATCH', datos })
        : await pedirAdmin(rutaApi, { metodo: 'POST', datos });
      const mensaje = textoDeExito(registro.estado, guardado.estado);
      if (!registro._id) {
        navigate(`${rutaEditor}/${guardado._id}`, { replace: true, state: { mensaje } });
        return;
      }
      setRegistro(guardado);
      setFormulario(aFormulario(guardado));
      setResultado(mensaje);
    } catch (error) {
      // Sesión vencida: SesionVencida toma el foco y lo escrito se conserva.
      if (error instanceof ErrorAdmin && error.estado === 401) return;
      const campos = error instanceof ErrorAdmin ? error.campos : {};
      const repartidos = repartirErrores(campos, filasEnviadas, ordenCampos);
      if (Object.keys(campos).length === 0) repartidos.otros.push(mensajeDeError(error));
      setErrores(repartidos);
    } finally {
      setEnviando(false);
    }
  }

  return { registro, formulario, setFormulario, cambiar, errores, avisoCreacion, resultado, enviando, guardar, resumen };
}

/**
 * Registro que abre el editor: el de la dirección (/:id) o `nuevo`. Lo que se
 * cargó primero se conserva aunque los datos se vuelvan a pedir (por ejemplo,
 * al iniciar sesión de nuevo): así no se pierde lo escrito.
 * @param {string} rutaApi colección en la API, como /api/admin/contenidos
 * @param {object} nuevo registro vacío para crear
 */
export function useCargaEditor(rutaApi, nuevo) {
  const { id } = useParams();
  const esNuevo = !id;
  const { estado, datos, reintentar } = useDatosAdmin(esNuevo ? null : `${rutaApi}/${id}`);
  const [inicial, setInicial] = useState(esNuevo ? nuevo : null);
  useEffect(() => {
    if (estado === ESTADOS.LISTO && datos && inicial?._id !== datos._id) setInicial(datos);
  }, [estado, datos, inicial]);
  return { esNuevo, inicial, estado, reintentar };
}
