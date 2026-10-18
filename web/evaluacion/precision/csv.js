/**
 * CSV del experimento de precisión temporal (M-09, CT-07, T16), con el mismo
 * formato que la exportación de M-09: coma como separador, punto decimal,
 * UTF-8 y fin de línea CRLF (RFC 4180). Funciones puras.
 */

const FIN_DE_LINEA = '\r\n';

function celda(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Texto del CSV con la fila de encabezado y una fila por objeto, en el orden de `columnas`. */
export function aCsv(columnas, filas) {
  const lineas = [columnas.join(','), ...filas.map((fila) => columnas.map((c) => celda(fila[c])).join(','))];
  return lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

/** Celdas de cada línea, respetando las comillas. */
function separar(texto) {
  const lineas = [];
  let linea = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else if (c === '"') entreComillas = false;
      else actual += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') {
      linea.push(actual);
      actual = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      linea.push(actual);
      lineas.push(linea);
      linea = [];
      actual = '';
    } else actual += c;
  }
  if (actual !== '' || linea.length > 0) {
    linea.push(actual);
    lineas.push(linea);
  }
  return lineas;
}

/** Objetos por fila, con las claves del encabezado; los valores quedan como texto. */
export function leerCsv(texto) {
  const [encabezado, ...filas] = separar(texto);
  if (!encabezado) return [];
  return filas.map((valores) => Object.fromEntries(encabezado.map((clave, i) => [clave, valores[i] ?? ''])));
}
