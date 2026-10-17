/**
 * Colores de las figuras de la tarea de cambio de regla (M-09; RA-01, M-07).
 * El color es el estímulo: rojo y azul, nunca rojo y verde, distinguibles con
 * protanopía y deuteranopía. El modo alto contraste de la barra de
 * accesibilidad no los cambia.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const TOKENS = leer('../tokens.css');
const VARIABLES = ['--estimulo-rojo', '--estimulo-azul', '--estimulo-contorno'];

/** Bloques de CSS «selector { ... }» de primer nivel, sin comentarios. */
function reglas(css) {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...limpio.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), cuerpo: m[2] }));
}

const valor = (nombre) => {
  const raiz = reglas(TOKENS).find((r) => r.selector === ':root' && r.cuerpo.includes(nombre));
  return raiz.cuerpo.match(new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`))[1];
};

const canal = (hex, i) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
const lineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => {
  const x = Math.min(1, Math.max(0, c));
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
};
const rgbLineal = (hex) => [0, 1, 2].map((i) => lineal(canal(hex, i)));
const luminancia = (hex) => {
  const [r, g, b] = rgbLineal(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
function tono(hex) {
  const [r, g, b] = [0, 1, 2].map((i) => canal(hex, i));
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** Simulación de Viénot, Brettel y Mollon (1999) en RGB lineal. */
const DALTONISMO = {
  protanopia: [[0.11238, 0.88762, 0], [0.11238, 0.88762, 0], [0.00401, -0.00401, 1]],
  deuteranopia: [[0.29275, 0.70725, 0], [0.29275, 0.70725, 0], [-0.02234, 0.02234, 1]]
};
const simular = (hex, m) => {
  const v = rgbLineal(hex);
  return m.map((fila) => gamma(fila.reduce((s, k, i) => s + k * v[i], 0)));
};
const distancia = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));

describe('M-09 colores de las figuras', () => {
  const rojo = valor('--estimulo-rojo');
  const azul = valor('--estimulo-azul');

  test('son rojo y azul, no verde', () => {
    const tr = tono(rojo);
    assert.ok(tr >= 345 || tr <= 15, `tono del rojo ${tr}`);
    const ta = tono(azul);
    assert.ok(ta >= 200 && ta <= 250, `tono del azul ${ta}`);
  });

  test('se distinguen con protanopía y deuteranopía', () => {
    for (const [tipo, m] of Object.entries(DALTONISMO)) {
      const d = distancia(simular(rojo, m), simular(azul, m));
      assert.ok(d >= 100, `${tipo}: ${d}`);
    }
  });

  test('contrastan al menos 3:1 con el blanco y con el fondo', () => {
    for (const c of [rojo, azul]) {
      assert.ok(contraste(c, '#ffffff') >= 3);
      assert.ok(contraste(c, valor('--color-fondo')) >= 3);
    }
  });
});

describe('M-07 el alto contraste no cambia el color del estímulo', () => {
  test('las variables de las figuras solo se definen una vez, en :root', () => {
    for (const nombre of VARIABLES) {
      const definiciones = reglas(TOKENS).filter((r) => new RegExp(`${nombre}\\s*:`).test(r.cuerpo));
      assert.deepEqual(definiciones.map((r) => r.selector), [':root'], nombre);
    }
    const alto = reglas(TOKENS).find((r) => r.selector === '.alto-contraste');
    assert.ok(alto, 'existe el modo alto contraste');
    assert.doesNotMatch(alto.cuerpo, /--estimulo/);
  });

  test('ninguna hoja de estilos cambia las figuras en alto contraste', () => {
    const hojas = readdirSync(new URL('../estilos/', import.meta.url)).filter((f) => f.endsWith('.css'));
    for (const hoja of hojas) {
      for (const r of reglas(leer(`../estilos/${hoja}`))) {
        if (!r.selector.includes('alto-contraste')) continue;
        assert.doesNotMatch(r.selector, /figura|estimulo/, `${hoja}: ${r.selector}`);
        assert.doesNotMatch(r.cuerpo, /--estimulo/, `${hoja}: ${r.selector}`);
      }
      for (const nombre of VARIABLES) assert.doesNotMatch(leer(`../estilos/${hoja}`), new RegExp(`${nombre}\\s*:`), hoja);
    }
  });

  test('la figura pinta con las variables del estímulo', () => {
    const figura = leer('./Figura.jsx');
    assert.match(figura, /var\(--estimulo-rojo\)/);
    assert.match(figura, /var\(--estimulo-azul\)/);
    assert.match(figura, /var\(--estimulo-contorno\)/);
    assert.doesNotMatch(figura, /#[0-9a-fA-F]{3,6}\b/);
  });
});
