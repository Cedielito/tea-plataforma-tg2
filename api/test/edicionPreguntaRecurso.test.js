'use strict';
const { MENSAJES: MENSAJES_PREGUNTA, leerCambiosPregunta } = require('../src/dominio/edicionPregunta');
const { MENSAJES: MENSAJES_RECURSO, leerCambiosRecurso } = require('../src/dominio/edicionRecurso');

const FUENTES = [{ texto: 'Protocolo clínico para TEA.', url: 'https://www.minsalud.gov.co/' }];

describe('RF-10 datos del editor de preguntas frecuentes', () => {
  const completo = {
    pregunta: '¿A quién debo consultar primero?',
    slug: 'a-quien-consultar-primero',
    respuesta: 'Pide una cita en tu EPS.',
    estado: 'publicado',
    orden: 10,
    fechaRevision: ' 2026-10-06 ',
    fuentes: FUENTES
  };

  test('acepta los campos del formulario, con su tipo, e ignora los demas', () => {
    expect(leerCambiosPregunta({ ...completo, _id: 'x', archivo: 'preguntas/preguntas.yaml' })).toEqual({
      cambios: { ...completo, fechaRevision: '2026-10-06' }
    });
  });

  test('el cuerpo debe ser un objeto', () => {
    expect(leerCambiosPregunta(null)).toEqual({ errores: { general: MENSAJES_PREGUNTA.CUERPO_INVALIDO } });
    expect(leerCambiosPregunta(['pregunta'])).toEqual({ errores: { general: MENSAJES_PREGUNTA.CUERPO_INVALIDO } });
  });

  test('rechaza textos que no son texto, un orden que no es numero y una fecha que no es texto', () => {
    expect(leerCambiosPregunta({ respuesta: { $gt: '' }, orden: '10', fechaRevision: 20261006 }).errores).toEqual({
      respuesta: MENSAJES_PREGUNTA.VALOR_INVALIDO,
      orden: MENSAJES_PREGUNTA.ORDEN_INVALIDO,
      fechaRevision: MENSAJES_PREGUNTA.VALOR_INVALIDO
    });
  });

  test('un orden null llega al modelo, que responde que es obligatorio', () => {
    expect(leerCambiosPregunta({ orden: null }).cambios).toEqual({ orden: null });
  });

  test('un slug vacio se quita para que el modelo lo genere; una fecha vacia queda en null', () => {
    expect(leerCambiosPregunta({ slug: ' ', fechaRevision: '' }).cambios).toEqual({ slug: undefined, fechaRevision: null });
  });

  test('las fuentes se leen igual que en el editor de contenidos', () => {
    expect(leerCambiosPregunta({ fuentes: 'OMS' }).errores).toEqual({ fuentes: 'Las fuentes deben ser una lista.' });
  });
});

describe('RF-10 datos del editor de recursos', () => {
  const completo = {
    titulo: 'Decreto 1421 de 2017',
    slug: 'decreto-1421',
    descripcion: 'Norma de educación inclusiva.',
    tipo: 'enlace',
    url: 'https://www.funcionpublica.gov.co/',
    estado: 'publicado',
    perfiles: ['docente', 'familia'],
    fechaRevision: '2026-10-06',
    fuentes: FUENTES
  };

  test('acepta los campos del formulario, con su tipo, e ignora los demas', () => {
    expect(leerCambiosRecurso({ ...completo, createdAt: 'hoy' })).toEqual({ cambios: completo });
  });

  test('el cuerpo debe ser un objeto', () => {
    expect(leerCambiosRecurso('recurso')).toEqual({ errores: { general: MENSAJES_RECURSO.CUERPO_INVALIDO } });
  });

  test('rechaza textos que no son texto y perfiles que no son una lista de textos', () => {
    expect(leerCambiosRecurso({ url: { $ne: null }, tipo: 1, perfiles: 'docente' }).errores).toEqual({
      url: MENSAJES_RECURSO.VALOR_INVALIDO,
      tipo: MENSAJES_RECURSO.VALOR_INVALIDO,
      perfiles: MENSAJES_RECURSO.LISTA_INVALIDA
    });
    expect(leerCambiosRecurso({ perfiles: [1] }).errores).toEqual({ perfiles: MENSAJES_RECURSO.LISTA_INVALIDA });
  });

  test('los perfiles repetidos se quitan', () => {
    expect(leerCambiosRecurso({ perfiles: ['docente', 'docente'] }).cambios).toEqual({ perfiles: ['docente'] });
  });

  test('un slug vacio se quita; una fecha vacia queda en null; una fecha que no es texto se rechaza', () => {
    expect(leerCambiosRecurso({ slug: '', fechaRevision: '  ' }).cambios).toEqual({ slug: undefined, fechaRevision: null });
    expect(leerCambiosRecurso({ fechaRevision: [] }).errores).toEqual({ fechaRevision: MENSAJES_RECURSO.VALOR_INVALIDO });
  });

  test('las fuentes se leen igual que en el editor de contenidos', () => {
    expect(leerCambiosRecurso({ fuentes: [{ texto: 'OMS', otro: 1 }] }).errores).toEqual({
      fuentes: 'Cada fuente debe tener un texto y, si quieres, un enlace.'
    });
  });

  test('el mensaje del slug de archivo nombra el archivo', () => {
    expect(MENSAJES_RECURSO.SLUG_DE_ARCHIVO('recursos/recursos.yaml')).toContain('recursos/recursos.yaml');
    expect(MENSAJES_PREGUNTA.SLUG_DE_ARCHIVO('preguntas/preguntas.yaml')).toContain('preguntas/preguntas.yaml');
  });
});
