/**
 * CT-03. Lo que el participante puede ver de un ensayo: nunca el tiempo, la
 * clase de error, un temporizador ni un marcador. El acierto solo se muestra
 * en la práctica, como retroalimentación (CP-04).
 *
 * Copia de vistaDeEnsayo (api/src/dominio/registro/secuenciador.js), que el
 * build de la web no puede importar. vista.test.js compara las dos con todos
 * los ensayos de una sesión: si una cambia sin la otra, la prueba falla.
 */
export function vistaDeEnsayo(ensayo) {
  const { tiempoReaccionMs, pausasDuranteItemMs, acierto, claseError, ...visible } = ensayo;
  const practica = ensayo.practica === true;
  return {
    ...visible,
    ...(practica ? { acierto } : {}),
    mostrarTemporizador: false,
    mostrarMarcador: false,
    mostrarAcierto: practica
  };
}

/**
 * Retroalimentación tras un ensayo, solo a partir de lo visible (CT-03): en
 * la práctica, si acertó; fuera de la práctica, nada (null). La pantalla de la
 * tarea solo muestra lo que devuelve esta función.
 *
 * @param {object} ensayo el ensayo registrado
 * @param {object} textos { correcta, incorrecta(regla o condición, vista), omitida } (textos.js):
 *   en cambio de regla, la regla del ensayo; en Navon (sin regla), la condición
 */
export function retroalimentacion(ensayo, textos) {
  const vista = vistaDeEnsayo(ensayo);
  if (!vista.mostrarAcierto) return null;
  if (vista.estadoItem === 'omitido') return { correcta: false, texto: textos.omitida };
  return vista.acierto
    ? { correcta: true, texto: textos.correcta }
    : { correcta: false, texto: textos.incorrecta(vista.regla ?? vista.condicion, vista) };
}
