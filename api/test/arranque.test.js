'use strict';
const { levantar, bajar, uri } = require('./ayudas/baseEnMemoria');
const { crearRegistro } = require('./ayudas/administrador');
const { prepararArranque } = require('../src/index');
const {
  Administrador,
  Contenido,
  EntidadDirectorio,
  PasoRuta,
  PreguntaFrecuente,
  Recurso
} = require('../src/datos/modelos');
const { cuestionarioSus } = require('../src/datos/cuestionarioSus');
const { paginasFijas } = require('../src/datos/paginasFijas');

/**
 * Preparacion del arranque (M-02 a M-09): la que corre la API antes de
 * escuchar y la que usa el servidor de la auditoria de accesibilidad (T10)
 * sobre una base en memoria.
 */

beforeAll(levantar);
afterAll(bajar);

const CLAVE = 'clave de prueba suficientemente larga';

describe('Arranque: prepararArranque carga los datos y crea las cuentas', () => {
  test('con una base vacia deja los contenidos publicados y las dos cuentas', async () => {
    const registro = crearRegistro();
    await prepararArranque({
      uri: uri(),
      entorno: { ADMIN_USUARIO: 'admin.prueba', ADMIN_CLAVE: CLAVE, PROFESIONAL_USUARIO: 'profesional.prueba', PROFESIONAL_CLAVE: CLAVE },
      registro
    });

    const cuentas = await Administrador.find().lean();
    expect(cuentas.map((c) => [c.usuario, c.rol ?? 'administrador']).sort()).toEqual([
      ['admin.prueba', 'administrador'],
      ['profesional.prueba', 'profesional']
    ]);
    expect(await Contenido.countDocuments({ estado: 'publicado' })).toBeGreaterThan(0);
    expect(await PasoRuta.countDocuments({ estado: 'publicado' })).toBeGreaterThan(0);
    expect(await EntidadDirectorio.countDocuments({ estado: 'publicado' })).toBeGreaterThan(0);
    expect(await PreguntaFrecuente.countDocuments({ estado: 'publicado' })).toBeGreaterThan(0);
    expect(await Recurso.countDocuments({ estado: 'publicado' })).toBeGreaterThan(0);
    expect(await paginasFijas.obtener('privacidad')).not.toBeNull();
    expect(await cuestionarioSus.obtener()).not.toBeNull();
    expect(registro.error).not.toHaveBeenCalled();
    // Nunca se registra la clave.
    expect(registro.lineas.join('\n')).not.toContain(CLAVE);
  });
});
