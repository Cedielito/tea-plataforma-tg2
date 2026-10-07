'use strict';
const { MENSAJES, leerCambiosPasoRuta } = require('../src/dominio/edicionPasoRuta');

describe('RF-10 datos del editor de pasos de la ruta', () => {
  const completo = {
    titulo: 'Pide una cita en tu EPS',
    slug: 'familia-cita-eps',
    texto: 'Pide una cita de medicina general.',
    estado: 'publicado',
    perfiles: ['familia'],
    tramos: ['4-7', '8-12'],
    regimenes: ['contributivo', 'subsidiado'],
    tiposEntidad: ['salud'],
    orden: 40,
    fechaRevision: ' 2026-10-06 ',
    fuentes: [{ texto: 'Protocolo clínico para TEA.', url: 'https://www.minsalud.gov.co/' }]
  };

  test('acepta los campos del formulario, con su tipo', () => {
    expect(leerCambiosPasoRuta(completo)).toEqual({ cambios: { ...completo, fechaRevision: '2026-10-06' } });
  });

  test('ignora los campos que no son del formulario', () => {
    const { cambios } = leerCambiosPasoRuta({ titulo: 'Paso', _id: 'x', createdAt: 'hoy', archivo: 'ruta/pasos.yaml' });
    expect(cambios).toEqual({ titulo: 'Paso' });
  });

  test('el cuerpo debe ser un objeto', () => {
    expect(leerCambiosPasoRuta(null)).toEqual({ errores: { general: MENSAJES.CUERPO_INVALIDO } });
    expect(leerCambiosPasoRuta(['titulo'])).toEqual({ errores: { general: MENSAJES.CUERPO_INVALIDO } });
  });

  test('rechaza textos que no son texto, como un objeto de consulta', () => {
    const { errores } = leerCambiosPasoRuta({ titulo: { $gt: '' }, estado: 1 });
    expect(errores).toEqual({ titulo: MENSAJES.VALOR_INVALIDO, estado: MENSAJES.VALOR_INVALIDO });
  });

  test('las listas deben ser listas de textos; los valores repetidos se quitan', () => {
    const { errores } = leerCambiosPasoRuta({ perfiles: 'familia', tramos: [4], regimenes: [{ $ne: 1 }] });
    expect(errores).toEqual({
      perfiles: MENSAJES.LISTA_INVALIDA,
      tramos: MENSAJES.LISTA_INVALIDA,
      regimenes: MENSAJES.LISTA_INVALIDA
    });
    expect(leerCambiosPasoRuta({ perfiles: ['familia', 'familia'] }).cambios.perfiles).toEqual(['familia']);
  });

  test('el orden es un numero o null; un texto se rechaza', () => {
    expect(leerCambiosPasoRuta({ orden: '20' }).errores).toEqual({ orden: MENSAJES.ORDEN_INVALIDO });
    expect(leerCambiosPasoRuta({ orden: null }).cambios).toEqual({ orden: null });
    expect(leerCambiosPasoRuta({ orden: 0 }).cambios).toEqual({ orden: 0 });
  });

  test('un slug vacio se quita para que el modelo lo genere; una fecha vacia queda en null', () => {
    expect(leerCambiosPasoRuta({ slug: '  ', fechaRevision: '' }).cambios).toEqual({
      slug: undefined,
      fechaRevision: null
    });
    expect(leerCambiosPasoRuta({ fechaRevision: 20261006 }).errores).toEqual({ fechaRevision: MENSAJES.VALOR_INVALIDO });
  });

  test('las fuentes se leen igual que en el editor de contenidos', () => {
    expect(leerCambiosPasoRuta({ fuentes: 'Minsalud' }).errores).toEqual({ fuentes: 'Las fuentes deben ser una lista.' });
    expect(leerCambiosPasoRuta({ fuentes: [{ texto: 'OMS', url: '' }] }).cambios.fuentes).toEqual([
      { texto: 'OMS', url: undefined }
    ]);
  });
});
