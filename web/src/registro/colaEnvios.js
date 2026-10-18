/**
 * Cola de envíos de la aplicación del registro conductual (M-09, HU-17). Al
 * terminar cada tarea, sus ensayos se envían a la API; al final, el SUS. Si
 * un envío falla, lo registrado no se pierde: queda en la cola, en memoria,
 * hasta que la API lo confirma.
 *
 * - Los envíos salen de a uno y en el orden en que llegaron.
 * - Si uno falla por la red o porque la API está despertando (sin respuesta,
 *   408, 429, 5xx), se reintenta una vez de inmediato; si vuelve a fallar, la
 *   cola se detiene y espera a la siguiente ocasión: otro envío nuevo, la
 *   conexión que vuelve (evento `online`) o el botón «Intentar de nuevo». Sin
 *   temporizadores (RA-10).
 * - Si la API lo rechaza (400, 401, 409, 422), reintentar no sirve: el envío
 *   pasa a `rechazados` y la cola sigue con el siguiente.
 * - Un envío con la misma clave (la tarea, o 'sus') no se agrega dos veces.
 *   La API tampoco guarda dos veces lo que ya recibió.
 *
 * Lógica pura: `enviar` llega de afuera (clienteAplicacion.js en la web, una
 * función falsa en las pruebas).
 */

export const SITUACIONES = Object.freeze({
  AL_DIA: 'al-dia',
  ENVIANDO: 'enviando',
  PENDIENTE: 'pendiente',
  RECHAZADO: 'rechazado'
});

const TRANSITORIOS = new Set([408, 429, 500, 502, 503, 504]);

/** Sin respuesta de la API (falla de red) o un estado que puede cambiar si se reintenta. */
export const esTransitorio = (error) => typeof error?.estado !== 'number' || TRANSITORIOS.has(error.estado);

/**
 * @param {{enviar: (envio: object) => Promise<unknown>, alCambiar?: (estado: object) => void}} opciones
 *   cada envío es { clave, ruta, metodo, datos }
 */
export function crearColaEnvios({ enviar, alCambiar = () => {} }) {
  const pendientes = [];
  const rechazados = [];
  let enviando = false;
  let detenida = false;
  let enCurso = Promise.resolve();

  function estado() {
    let situacion = SITUACIONES.AL_DIA;
    if (rechazados.length > 0) situacion = SITUACIONES.RECHAZADO;
    else if (enviando) situacion = SITUACIONES.ENVIANDO;
    else if (pendientes.length > 0) situacion = SITUACIONES.PENDIENTE;
    return {
      situacion,
      enviando,
      detenida,
      pendientes: pendientes.map((e) => e.clave),
      rechazados: rechazados.map((e) => e.clave)
    };
  }

  const avisar = () => alCambiar(estado());

  /** @returns {Promise<'enviado'|'pendiente'|'rechazado'>} */
  async function intentar(envio) {
    for (let vez = 1; vez <= 2; vez += 1) {
      try {
        await enviar(envio);
        return 'enviado';
      } catch (error) {
        if (!esTransitorio(error)) return 'rechazado';
      }
    }
    return 'pendiente';
  }

  async function vaciar() {
    enviando = true;
    detenida = false;
    avisar();
    while (pendientes.length > 0) {
      const resultado = await intentar(pendientes[0]);
      if (resultado === 'pendiente') {
        detenida = true;
        break;
      }
      const [hecho] = pendientes.splice(0, 1);
      if (resultado === 'rechazado') rechazados.push(hecho);
    }
    enviando = false;
    avisar();
  }

  /** Envía lo pendiente. Si ya está enviando, lo nuevo sale en la misma vuelta. */
  function procesar() {
    if (!enviando) enCurso = vaciar();
    return enCurso.then(estado);
  }

  return {
    estado,
    procesar,
    /** @param {{clave: string, ruta: string, metodo?: string, datos: unknown}} envio */
    agregar(envio) {
      const repetido = [...pendientes, ...rechazados].some((e) => e.clave === envio.clave);
      if (!repetido) pendientes.push(envio);
      return procesar();
    }
  };
}
