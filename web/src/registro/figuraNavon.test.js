/**
 * Tamaño del cartel de la tarea de Navon (M-09, CC-10; M-07, RA-01 a RA-11):
 * fijo en píxeles, para que no cambie con el tamaño de letra de la barra de
 * accesibilidad (que cambia el rem), y no más ancho que lo que cabe en 320 px.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const TOKENS = leer('../tokens.css');
const ESTILOS = leer('../estilos/registro.css');
const FIGURA = leer('./FiguraNavon.jsx');

const valor = (nombre) => {
  const m = TOKENS.match(new RegExp(`${nombre}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
};

describe('M-09 cartel de Navon con tamaño fijo', () => {
  test('el ancho y el alto del cartel y del ejemplo están en px, no en rem ni em', () => {
    for (const nombre of [
      '--figura-navon-ancho',
      '--figura-navon-alto',
      '--figura-navon-ejemplo-ancho',
      '--figura-navon-ejemplo-alto'
    ]) {
      assert.match(valor(nombre), /^\d+px$/, nombre);
    }
  });

  test('el cartel cabe en 320 px y conserva la proporción de la cuadrícula de 5 × 7', () => {
    const ancho = parseInt(valor('--figura-navon-ancho'), 10);
    const alto = parseInt(valor('--figura-navon-alto'), 10);
    assert.ok(ancho <= 220);
    assert.equal(ancho / alto, 5 / 7);
    assert.match(FIGURA, /viewBox=\{`0 0 \$\{COLUMNAS \* CELDA\} \$\{FILAS \* CELDA\}`\}/);
  });

  test('la pantalla del ensayo usa esas variables para el cartel', () => {
    assert.match(ESTILOS, /\.ensayo__figura-navon\s*\{[^}]*width:\s*var\(--figura-navon-ancho\);[^}]*height:\s*var\(--figura-navon-alto\)/);
    assert.match(ESTILOS, /\.tarea__ejemplo-figura\s*\{[^}]*width:\s*var\(--figura-navon-ejemplo-ancho\)/);
  });

  test('el modo alto contraste no cambia el tamaño del cartel', () => {
    const sinRaiz = TOKENS.replace(/:root\s*\{[^}]*\}/, '');
    assert.doesNotMatch(sinRaiz, /--figura-navon/);
  });
});
