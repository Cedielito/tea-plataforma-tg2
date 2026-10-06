/**
 * Cliente de la API pública (M-01, M-02, RS-01). Siempre con rutas relativas
 * /api/...: en producción Vercel las reenvía a Render y en local Vite a
 * localhost:3000 (docs/despliegue.md). No envía cookies ni datos de quien
 * consulta.
 *
 * La API gratuita se duerme y puede tardar hasta un minuto en despertar. Si la
 * respuesta es 502, 503 o 504, o la red falla, se reintenta una sola vez, de
 * inmediato y sin temporizadores. Si vuelve a fallar, la página ofrece
 * «Intentar de nuevo».
 */

export class ErrorApi extends Error {
  constructor(estado) {
    super(`La API respondió ${estado}`);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

const REINTENTABLES = new Set([502, 503, 504]);

/** Errores de red (TypeError de fetch) o de una API que todavía está despertando. */
export const esReintentable = (error) => !(error instanceof ErrorApi) || REINTENTABLES.has(error.estado);

async function pedir(ruta, signal) {
  const respuesta = await fetch(ruta, { signal, headers: { Accept: 'application/json' } });
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  return respuesta.json();
}

export async function obtenerJson(ruta, { signal } = {}) {
  try {
    return await pedir(ruta, signal);
  } catch (error) {
    if (signal?.aborted || !esReintentable(error)) throw error;
    return pedir(ruta, signal);
  }
}
