/**
 * Las tres preguntas de la guía de la ruta de atención (M-03, RF-04): quién
 * consulta, la edad y el régimen de afiliación a salud. Nunca preguntan por
 * conductas ni síntomas: solo ubican el caso en la ruta.
 *
 * Si consulta un docente, las preguntas 2 y 3 hablan de «el estudiante», y la
 * pregunta 3 ofrece «No lo sé», porque muchos docentes no conocen la
 * afiliación del estudiante.
 */
import { PERFILES, REGIMENES, etiquetaDe } from '../catalogos.js';
import { TRAMOS_EDAD } from '../secciones.js';
import { NO_LO_SE } from './filtroPasos.js';

const esDocente = (perfil) => perfil === 'docente';
const quien = (perfil) => (esDocente(perfil) ? 'el estudiante' : 'el niño, la niña o el adolescente');

const DESCRIPCION_PERFIL = {
  familia: 'Madre, padre u otra persona que cuida al niño, la niña o el adolescente.',
  docente: 'Docente de aula, docente de apoyo u orientación escolar.'
};

const DESCRIPCION_REGIMEN = {
  contributivo: 'La EPS se paga con los aportes de un trabajo o de una pensión.',
  subsidiado: 'El Estado paga la EPS de las personas que no pueden pagarla.',
  'sin-afiliacion': 'No está afiliado a ninguna EPS.'
};

const OPCION_NO_LO_SE = {
  valor: NO_LO_SE,
  etiqueta: 'No lo sé',
  descripcion: 'Te mostramos los pasos de todos los regímenes.'
};

/**
 * Cada pregunta guarda su respuesta en `campo`. El enunciado y las opciones
 * dependen del perfil elegido en la primera.
 */
export const PREGUNTAS = [
  {
    campo: 'perfil',
    enunciado: () => '¿Quién consulta?',
    opciones: () => PERFILES.map(({ valor, etiqueta }) => ({ valor, etiqueta, descripcion: DESCRIPCION_PERFIL[valor] }))
  },
  {
    campo: 'tramo',
    enunciado: (perfil) => `¿Qué edad tiene ${quien(perfil)}?`,
    opciones: () => TRAMOS_EDAD.map(({ valor, etiqueta }) => ({ valor, etiqueta }))
  },
  {
    campo: 'regimen',
    enunciado: (perfil) => `¿A qué régimen de salud está afiliado ${quien(perfil)}?`,
    opciones: (perfil) => [
      ...REGIMENES.map(({ valor, etiqueta }) => ({ valor, etiqueta, descripcion: DESCRIPCION_REGIMEN[valor] })),
      ...(esDocente(perfil) ? [OPCION_NO_LO_SE] : [])
    ]
  }
];

export const RESPUESTAS_VACIAS = Object.freeze({ perfil: null, tramo: null, regimen: null });

/**
 * Al cambiar de perfil, una respuesta que el nuevo perfil no ofrece se borra:
 * «No lo sé» es solo para docentes.
 */
export function responder(respuestas, campo, valor) {
  const nuevas = { ...respuestas, [campo]: valor };
  if (campo === 'perfil' && !esDocente(valor) && nuevas.regimen === NO_LO_SE) nuevas.regimen = null;
  return nuevas;
}

/** «Docente · 8 a 12 años · Régimen: no lo sé», para el final de la guía. */
export function resumirRespuestas({ perfil, tramo, regimen }) {
  const regimenVisible = regimen === NO_LO_SE ? 'Régimen: no lo sé' : etiquetaDe(REGIMENES, regimen);
  return [etiquetaDe(PERFILES, perfil), etiquetaDe(TRAMOS_EDAD, tramo), regimenVisible].join(' · ');
}
