/**
 * Perfiles simulados con el formato de la web (M-09, CC-08, CC-09, CC-10,
 * CC-12, CT-11, CT-13, RF-14, T16). Las sesiones de los seis perfiles se
 * guardan en api/test/ayudas/perfilesSimulados.json, que procesan
 * api/test/registroPerfiles.test.js y registroReproducibilidad.test.js. Si el
 * formato cambia a propósito, se regenera con:
 *   ACTUALIZAR_SESION_SIMULADA=1 npm test -w web
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { planificarSesion } from '../../../api/src/dominio/registro/secuenciador.js';
import { procesarSesion } from '../../../api/src/dominio/registro/motor.js';
import { contieneDatoIdentificable } from '../../../api/src/dominio/registro/seudonimo.js';
import { PERFILES, simularPerfil, simularPerfiles, tasasDe, textoDeArchivo } from './perfilesSimulados.js';

const ARCHIVO = new URL('../../../api/test/ayudas/perfilesSimulados.json', import.meta.url);
const plan = planificarSesion();
const perfiles = simularPerfiles(plan);

const BLOQUES = plan.secuencias.reduce((n, s) => n + s.bloques.length, 0);
const ENSAYOS = plan.secuencias.reduce((n, s) => n + s.ensayosPractica + s.ensayosPuntuados, 0);

/** Valores de procesarSesion por código, y el tiempo medio de cada tarea. */
function valores(sesion) {
  const r = procesarSesion(sesion);
  const porCodigo = Object.fromEntries(
    Object.values(r.tareas).flatMap((t) => t.indicadores.map((i) => [i.codigo, i.observado]))
  );
  const tiempoMedio = (tarea) => {
    const c = r.tareas[tarea].contexto;
    return c.variabilidadTiempoReaccion / c.coeficienteVariacion;
  };
  return { ...porCodigo, medioCambioRegla: tiempoMedio('cambio-regla'), medioNavon: tiempoMedio('navon') };
}

describe('CT-13 archivo de los perfiles simulados', () => {
  test('el archivo de api/test/ayudas es lo que produce la web', () => {
    const texto = textoDeArchivo(perfiles);
    if (process.env.ACTUALIZAR_SESION_SIMULADA === '1') writeFileSync(ARCHIVO, texto);
    assert.equal(readFileSync(ARCHIVO, 'utf8'), texto);
    assert.deepEqual(JSON.parse(texto).perfiles, perfiles);
  });

  test('el mismo perfil con la misma semilla da exactamente la misma sesión', () => {
    for (const perfil of PERFILES) {
      assert.equal(JSON.stringify(simularPerfil(plan, perfil)), JSON.stringify(simularPerfil(plan, perfil)));
    }
  });
});

describe('M-09 sesiones de los perfiles con el formato de la web', () => {
  test('seis perfiles distintos, cada uno con su semilla', () => {
    assert.equal(perfiles.length, 6);
    assert.equal(new Set(PERFILES.map((p) => p.semilla)).size, 6);
    assert.equal(new Set(PERFILES.map((p) => p.id)).size, 6);
  });

  test('cada sesión tiene las dos tareas completas, sin datos identificables (CT-11)', () => {
    for (const { sesion } of perfiles) {
      assert.equal(sesion.estado, 'completada');
      assert.equal(sesion.ensayos.length, ENSAYOS);
      assert.deepEqual([...new Set(sesion.ensayos.map((e) => e.tarea))], ['cambio-regla', 'navon']);
      assert.equal(contieneDatoIdentificable(sesion), false);
    }
  });

  test('los errores y las omisiones son los del perfil; ningún tiempo es una anticipación', () => {
    for (const { parametros, sesion } of perfiles) {
      const puntuados = sesion.ensayos.filter((e) => !e.practica);
      const omitidos = puntuados.filter((e) => e.estadoItem === 'omitido');
      const errores = puntuados.filter((e) => e.estadoItem === 'respondido' && !e.acierto);
      assert.equal(omitidos.length, parametros.omisionesPorBloque * BLOQUES);
      assert.equal(errores.length, parametros.erroresPorBloque * BLOQUES);
      for (const e of puntuados.filter((x) => x.estadoItem === 'respondido')) {
        assert.ok(e.tiempoReaccionMs >= 300 && e.tiempoReaccionMs < 2000, `${e.tiempoReaccionMs} ms`);
      }
      assert.ok(sesion.ensayos.filter((e) => e.practica).every((e) => e.acierto));
    }
  });

  test('en el bloque de forma los errores van primero y son perseverativos', () => {
    for (const { parametros, sesion } of perfiles) {
      const forma = sesion.ensayos.filter((e) => e.bloque === 'CR-FORMA' && e.estadoItem === 'respondido');
      const k = parametros.erroresPorBloque;
      assert.ok(forma.slice(0, k).every((e) => e.claseError === 'perseverativa'));
      assert.ok(forma.slice(k).every((e) => e.claseError === 'correcta'));
    }
  });

  test('las tasas salen de los conteos por bloque', () => {
    assert.deepEqual(tasasDe({ erroresPorBloque: 0, omisionesPorBloque: 0 }), { tasaError: 0, tasaOmision: 0 });
    assert.deepEqual(tasasDe({ erroresPorBloque: 1, omisionesPorBloque: 1 }), { tasaError: 1 / 6, tasaOmision: 1 / 7 });
  });
});

describe('CC-09 CC-10 con otra semilla, otros ensayos y los mismos valores', () => {
  test('procesarSesion recupera los parámetros con cualquier semilla', () => {
    for (const perfil of PERFILES) {
      const otra = { ...perfil, semilla: perfil.semilla + 777 };
      const a = simularPerfil(plan, perfil);
      const b = simularPerfil(plan, otra);
      assert.notDeepEqual(a.ensayos.map((e) => e.estimulo), b.ensayos.map((e) => e.estimulo));
      const va = valores(a);
      const vb = valores(b);
      for (const clave of ['CC-08', 'CC-12']) assert.equal(vb[clave], va[clave]);
      for (const clave of ['CC-09', 'CC-10', 'medioCambioRegla', 'medioNavon']) {
        assert.ok(Math.abs(vb[clave] - va[clave]) <= 1, `${perfil.id} ${clave}`);
      }
    }
  });
});
