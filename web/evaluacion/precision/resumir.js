/**
 * Resumen del experimento de precisión temporal (M-09, CT-07, T16): lee los
 * CSV de una carpeta (precision-<motor>-<reloj>-<carga>.csv) y sus
 * metadatos (metadatos-<motor>.json) y escribe en Markdown el entorno, la
 * tabla del error y la de la cota superior, por celda (estadisticas.js).
 *
 *   node evaluacion/precision/resumir.js <carpeta> [--salida resumen.md]
 *
 * Sin --salida, escribe en la salida estándar (el flujo manual lo agrega al
 * resumen de la corrida).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCsv } from './csv.js';
import { COLUMNAS } from './medicion.js';
import {
  MINIMO_ENSAYOS_POR_CELDA,
  ORDEN,
  resumirCeldas,
  tablaMarkdown,
  UMBRAL_CT07_MS,
  UMBRAL_DESVIO_ARNES_MS
} from './estadisticas.js';

const TEXTO = new Set(['motor', 'versionMotor', 'reloj', 'carga', 'tarea', 'tecla']);

/** Fila del CSV con los números como números y la práctica como booleano. */
export function convertirFila(fila) {
  const salida = {};
  for (const columna of COLUMNAS) {
    const valor = fila[columna];
    if (TEXTO.has(columna)) salida[columna] = valor;
    else if (columna === 'practica') salida[columna] = valor === 'true';
    else salida[columna] = valor === '' ? null : Number(valor);
  }
  return salida;
}

function leerCarpeta(carpeta) {
  const archivos = readdirSync(carpeta);
  const filas = archivos
    .filter((a) => /^precision-.+\.csv$/.test(a))
    .flatMap((a) => leerCsv(readFileSync(join(carpeta, a), 'utf8')).map(convertirFila));
  const metadatos = archivos
    .filter((a) => /^metadatos-.+\.json$/.test(a))
    .map((a) => JSON.parse(readFileSync(join(carpeta, a), 'utf8')))
    .sort((a, b) => ORDEN.motor.indexOf(a.motor) - ORDEN.motor.indexOf(b.motor));
  return { filas, metadatos };
}

function tablaEntorno(metadatos) {
  if (metadatos.length === 0) return '';
  const filas = metadatos.map(
    (m) =>
      `| ${m.motor} ${m.versionMotor} | ${m.versionPlaywright} | ${m.sistema} | ${m.cpu} (${m.nucleos} núcleos) | ${m.sesionesPorCelda} | ${m.versionCatalogo} / ${m.versionAlgoritmo} | ${m.commit ? m.commit.slice(0, 7) : '—'} | ${m.fecha} |`
  );
  return [
    '| Motor | Playwright | Sistema | CPU | Sesiones por celda | Catálogo / algoritmo | Commit | Fecha |',
    '|---|---|---|---|---:|---|---|---|',
    ...filas
  ].join('\n');
}

/** Informe completo en Markdown. */
export function informe({ filas, metadatos }) {
  const celdas = resumirCeldas(filas);
  const notas = [];
  if (celdas.some((c) => c.soloCota)) {
    notas.push(
      `¹ Con la carga, el percentil 95 del desvío del arnés sube más de ${UMBRAL_DESVIO_ARNES_MS} ms frente a la carga normal: la tecla llegó tarde, el arnés no pudo separar esa espera y en esta celda vale la cota superior.`
    );
  }
  if (celdas.some((c) => c.pocosEnsayos)) {
    notas.push(`² Menos de ${MINIMO_ENSAYOS_POR_CELDA} ensayos: corrida de comprobación, no del experimento.`);
  }
  return [
    '### Entorno',
    '',
    tablaEntorno(metadatos),
    '',
    `### Error del tiempo de reacción registrado (TR registrado − latencia efectiva del arnés)`,
    '',
    tablaMarkdown(celdas, 'error'),
    '',
    `### Cota superior (TR registrado − latencia programada)`,
    '',
    tablaMarkdown(celdas, 'cota'),
    '',
    `«≤ 50 ms»: porcentaje de ensayos con error absoluto de ${UMBRAL_CT07_MS} ms o menos (CT-07).`,
    ...(notas.length ? ['', ...notas] : []),
    ''
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [carpeta, opcion, destino] = process.argv.slice(2);
  if (!carpeta) {
    console.error('Uso: node evaluacion/precision/resumir.js <carpeta> [--salida resumen.md]');
    process.exit(1);
  }
  const texto = informe(leerCarpeta(carpeta));
  if (opcion === '--salida' && destino) writeFileSync(destino, texto);
  else process.stdout.write(texto);
}
