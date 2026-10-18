/**
 * Formato de los valores observados de una sesión para el profesional (M-09,
 * HU-18, RF-15). Cada valor se muestra con su unidad, tal como sale de
 * procesarSesion: sin redondear a categorías, sin comparar con nada y sin
 * sumar valores. Un valor que no se pudo calcular (null) se dice con palabras.
 * Lógica pura.
 */
import { contar } from '../utilidades/formato.js';
import { ESTADOS_SESION, TIPOS_ENTRADA, VALORES } from './textosProfesional.js';

const PROPORCION = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });
const MILISEGUNDOS = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

const vacio = (valor) => valor === null || valor === undefined || Number.isNaN(valor);

/** Valor observado de un indicador (CC-08, CC-09, CC-10, CC-12). */
export function valorObservado(indicador) {
  if (indicador.criterioAlcanzado === false) return VALORES.criterioNoAlcanzado;
  const { observado, unidad } = indicador;
  if (vacio(observado)) return VALORES.sinDatos;
  if (unidad === 'proporcion') return PROPORCION.format(observado);
  if (unidad === 'ms') return `${MILISEGUNDOS.format(observado)} ms`;
  if (unidad === 'ensayos') return contar(observado, VALORES.ensayo, VALORES.ensayos);
  return NUMERO.format(observado);
}

/** Variables de contexto de una tarea (indicadores.js, variablesContextuales). */
export function valorDeContextoTarea(clave, valor) {
  if (vacio(valor)) return VALORES.sinDatos;
  if (clave === 'variabilidadTiempoReaccion') return `${MILISEGUNDOS.format(valor)} ms`;
  if (clave === 'tasaOmision' || clave === 'tasaAnticipacion') return PROPORCION.format(valor);
  return NUMERO.format(valor);
}

/** Contexto de la sesión: tipo de entrada, pausas y repeticiones de instrucciones. */
export function valorDeContextoSesion(clave, valor) {
  if (vacio(valor)) return VALORES.sinDatos;
  if (clave === 'tipoEntrada') return TIPOS_ENTRADA[valor] || valor;
  return NUMERO.format(valor);
}

export const etiquetaEstado = (estado) => ESTADOS_SESION[estado] || estado;

/** Valor SUS (de 0 a 100, en pasos de 2,5): valora la herramienta, no a la persona. */
export const valorSus = (valor) => (vacio(valor) ? VALORES.sinDatos : NUMERO.format(valor));
