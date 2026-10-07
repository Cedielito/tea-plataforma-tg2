/**
 * Pruebas de lo que dice cada tarjeta de /recursos (M-05, RF-06, HU-09), con
 * el ejecutor de pruebas de Node (node --test), sin dependencias.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { enlaceDeRecurso, nombreDelSitio, paraQuien } from './enlaceRecurso.js';

describe('RF-06 enlace de cada recurso: qué abre y en qué sitio', () => {
  test('un archivo PDF dice «Descargar PDF» con el dominio, sin «www.»', () => {
    const url = 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/CA/Protocolo-TEA-final.pdf';
    assert.deepEqual(enlaceDeRecurso({ tipo: 'archivo', url }), {
      href: url,
      texto: 'Descargar PDF (minsalud.gov.co)',
      accion: 'Descargar PDF',
      sitio: 'minsalud.gov.co',
      pdf: true
    });
  });

  test('una página oficial dice «Abrir página oficial» con el dominio', () => {
    const enlace = enlaceDeRecurso({
      tipo: 'enlace',
      url: 'https://www.who.int/es/news-room/fact-sheets/detail/autism-spectrum-disorders'
    });
    assert.equal(enlace.texto, 'Abrir página oficial (who.int)');
    assert.equal(enlace.pdf, false);
  });

  test('un PDF con parámetros o en mayúsculas sigue siendo un PDF', () => {
    assert.equal(enlaceDeRecurso({ tipo: 'archivo', url: 'https://sitio.gov.co/GUIA.PDF?v=2' }).accion, 'Descargar PDF');
  });

  test('un archivo que no es PDF dice «Descargar archivo»', () => {
    assert.equal(enlaceDeRecurso({ tipo: 'archivo', url: 'https://sitio.gov.co/guia.docx' }).texto, 'Descargar archivo (sitio.gov.co)');
  });

  test('un archivo del mismo sitio no lleva dominio', () => {
    const enlace = enlaceDeRecurso({ tipo: 'archivo', url: '/recursos/guia.pdf' });
    assert.equal(enlace.texto, 'Descargar PDF');
    assert.equal(enlace.sitio, null);
  });

  test('no enlaza esquemas peligrosos ni direcciones a otro dominio sin protocolo', () => {
    for (const url of ['javascript:alert(1)', '//otro.com/guia.pdf', 'ftp://sitio/guia.pdf', '', undefined]) {
      assert.equal(enlaceDeRecurso({ tipo: 'archivo', url }), null);
    }
  });

  test('nombreDelSitio solo responde para enlaces web', () => {
    assert.equal(nombreDelSitio('https://WWW.MinEducacion.gov.co/portal'), 'mineducacion.gov.co');
    assert.equal(nombreDelSitio('https://normograma.supersalud.gov.co/x'), 'normograma.supersalud.gov.co');
    assert.equal(nombreDelSitio('/recursos/guia.pdf'), null);
  });
});

describe('RF-06 para quién es cada recurso', () => {
  test('nombra los perfiles en el orden del catálogo', () => {
    assert.equal(paraQuien(['docente', 'familia']), 'Para familias y docentes');
    assert.equal(paraQuien(['docente']), 'Para docentes');
    assert.equal(paraQuien(['familia']), 'Para familias');
  });

  test('sin perfiles conocidos no dice nada', () => {
    assert.equal(paraQuien([]), null);
    assert.equal(paraQuien(['estudiante']), null);
    assert.equal(paraQuien(), null);
  });
});
