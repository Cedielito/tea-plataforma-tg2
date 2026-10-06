'use strict';
const mongoose = require('mongoose');
const { conectar, MENSAJE_SIN_URI } = require('./conexion');
const { Contenido } = require('./modelos');
const contenidos = require('./repositorios/contenidos');
const { ESTADOS } = require('../dominio/catalogos');

/**
 * Semilla de desarrollo: dos contenidos de ejemplo en borrador. M-02, RCN-01, RCN-02
 *
 *   npm run seed:api      (desde la raiz; usa MONGODB_URI de api/.env)
 *
 * - Siempre se guardan como borrador: nada de esto queda visible al publico.
 * - El texto es de relleno. El contenido real lo redacta el equipo a partir de
 *   las fuentes oficiales y lo publica desde el panel con su fuente y su fecha
 *   de revision (RCN-01, RCN-02).
 * - Si ya existe un contenido con el mismo slug, se omite y no se modifica:
 *   correrla dos veces, o contra una base con contenido editado, es seguro.
 */

const CONTENIDOS_DE_EJEMPLO = Object.freeze([
  {
    titulo: '¿Qué es el TEA?',
    slug: 'que-es-el-tea',
    seccion: 'S1',
    cuerpo: [
      '**Texto de ejemplo.** Este borrador se reemplaza por el texto revisado antes de publicarlo.',
      '',
      '## Definición',
      '',
      'Aquí va la definición del trastorno del espectro autista en párrafos cortos, tomada de la fuente citada.'
    ].join('\n'),
    fuentes: [
      {
        texto: 'Organización Mundial de la Salud. Autismo. Nota descriptiva.',
        url: 'https://www.who.int/es/news-room/fact-sheets/detail/autism-spectrum-disorders'
      }
    ]
  },
  {
    titulo: 'Señales de alerta de 4 a 7 años',
    slug: 'senales-de-alerta-4-a-7-anos',
    seccion: 'S2',
    tramoEdad: '4-7',
    cuerpo: [
      '**Texto de ejemplo.** Este borrador todavía no tiene fuente ni fecha de revisión, por eso no se puede publicar.',
      '',
      'Aquí van las señales de este tramo de edad, escritas como motivos para consultar.'
    ].join('\n')
  }
]);

/** @returns {Promise<{creados: string[], omitidos: string[]}>} slugs de cada grupo */
async function sembrar() {
  const resultado = { creados: [], omitidos: [] };
  for (const datos of CONTENIDOS_DE_EJEMPLO) {
    if (await Contenido.exists({ slug: datos.slug })) {
      resultado.omitidos.push(datos.slug);
      continue;
    }
    await contenidos.crear({ ...datos, estado: ESTADOS.BORRADOR });
    resultado.creados.push(datos.slug);
  }
  return resultado;
}

async function principal(uri) {
  await conectar(uri);
  try {
    const { creados, omitidos } = await sembrar();
    console.log(`Contenidos de ejemplo creados en borrador: ${creados.length}. Ya existían: ${omitidos.length}.`);
  } finally {
    await mongoose.disconnect();
  }
}

/** Un error de configuracion se muestra como mensaje, no como traza. */
if (require.main === module) {
  principal().catch((e) => {
    console.error(e.message === MENSAJE_SIN_URI ? e.message : e);
    process.exitCode = 1;
  });
}

module.exports = { CONTENIDOS_DE_EJEMPLO, sembrar, principal };
