/**
 * Textos de la tarea de cambio de regla (M-09, HU-17, CP-04, RCN-03). Todos
 * los textos visibles de la tarea están aquí, para que una prueba los pase
 * por buscarVocabularioProhibido (api/src/dominio/registro/
 * vocabularioProhibido.js): ni etiquetas diagnósticas, ni niveles, ni puntos,
 * ni puntajes. Frases cortas y literales.
 *
 * Dinámicas gamificadas que no alteran la medición (cada una declara su
 * principio neuroeducativo):
 * - Marco narrativo «El taller que cambia». Principio: el aprendizaje y la
 *   atención mejoran cuando la tarea tiene un contexto con sentido; una
 *   historia sencilla da propósito a clasificar y anticipa que las reglas
 *   cambiarán, sin cambiar lo que se mide.
 * - Mensaje de ánimo al final de cada bloque (animo). Principio: reconocer el
 *   esfuerzo y no el resultado sostiene la motivación y baja la ansiedad de
 *   ser evaluado. Por eso cada mensaje es fijo por bloque y nunca depende de
 *   cómo le fue a la persona: no es retroalimentación del desempeño.
 * - Retroalimentación de acierto solo en la práctica (RETROALIMENTACION).
 *   Principio: la retroalimentación inmediata consolida una regla nueva
 *   mientras se aprende (CP-04); en la medición se retira para no cambiar la
 *   conducta que se registra (CT-03).
 */

export const TITULO_TAREA = 'El taller que cambia';

/** Copia del aviso de M-09 (AVISO_NO_DIAGNOSTICO en api/); textos.test.js comprueba que es igual. */
export const AVISO_REGISTRO =
  'Estos valores describen el desempeño en dos tareas. No constituyen diagnóstico ni clasificación ' +
  'y no sustituyen la valoración profesional; su interpretación corresponde al profesional.';

/** Señal de cada regla: la palabra que aparece arriba del juguete, junto con el ícono. */
export const SENALES = Object.freeze({ color: 'COLOR', forma: 'FORMA' });

const EXPLICACION_REGLA = Object.freeze({
  color: 'cada juguete va en la caja de su mismo color: lo rojo con lo rojo y lo azul con lo azul.',
  forma: 'cada juguete va en la caja de su misma forma: el conejo con el conejo y el barco con el barco, sin importar el color.'
});

const otraRegla = (regla) => Object.keys(SENALES).find((r) => r !== regla);

export const NOMBRES_FIGURA = Object.freeze({
  forma: Object.freeze({ conejo: 'Conejo', barco: 'Barco' }),
  color: Object.freeze({ rojo: 'rojo', azul: 'azul' })
});

/** «Conejo azul», para el texto alternativo de la figura y la tabla. */
export const nombreFigura = (estimulo) => `${NOMBRES_FIGURA.forma[estimulo.forma]} ${NOMBRES_FIGURA.color[estimulo.color]}`;

export const etiquetaCaja = (caja) => `Caja del ${nombreFigura(caja).toLowerCase()} (tecla ${caja.tecla})`;

export const BIENVENIDA = Object.freeze({
  titulo: TITULO_TAREA,
  parrafos: [
    'Te damos la bienvenida al taller. Aquí llegan juguetes: conejos y barcos, rojos y azules.',
    'Tu trabajo es guardar cada juguete en una de las dos cajas del taller.',
    'En este taller las reglas cambian. Te avisaremos cada vez que cambien.'
  ],
  boton: 'Ver las instrucciones'
});

export const INSTRUCCIONES = Object.freeze({
  titulo: 'Cómo guardar los juguetes',
  parrafos: [
    'Hay dos cajas. La de la izquierda tiene un conejo rojo. La de la derecha tiene un barco azul.',
    'En el centro aparece un juguete. Arriba del juguete aparece una palabra: es la regla para ese juguete.',
    'Para guardarlo en la caja de la izquierda, presiona la tecla F. Para la caja de la derecha, presiona la tecla J. En una pantalla táctil, toca la caja.',
    'Responde rápido, pero procura no equivocarte. Si no eliges una caja en unos segundos, el juguete se va y llega otro.',
    'Entre una parte y otra puedes descansar el tiempo que quieras.'
  ],
  boton: 'Continuar'
});

export const PRACTICA = Object.freeze({
  titulo: 'Práctica',
  parrafos: [
    `Primero vas a practicar con dos juguetes. La regla es ${SENALES.color}: ${EXPLICACION_REGLA.color}`,
    'En la práctica te diremos si elegiste la caja correcta.'
  ],
  boton: 'Empezar la práctica'
});

export const RETROALIMENTACION = Object.freeze({
  correcta: 'Correcto. Elegiste la caja que pedía la regla.',
  incorrecta: (regla) => `Esa no era la caja. Con la regla ${SENALES[regla]}, ${EXPLICACION_REGLA[regla]}`,
  omitida: 'No elegiste una caja a tiempo. En la tarea, el juguete se va y llega otro.',
  boton: 'Siguiente'
});

export const FIN_PRACTICA = Object.freeze({
  titulo: 'Terminaste la práctica',
  parrafos: ['Desde ahora ya no te diremos si elegiste la caja correcta.'],
  boton: 'Continuar'
});

/**
 * Instrucciones antes de cada bloque. Cada cambio de regla tiene su pantalla
 * de instrucciones (no es práctica): antes del bloque de forma se dice
 * explícitamente que ahora se clasifica por forma, y antes del primer bloque
 * mixto se explica que la palabra de arriba indica la regla en cada ensayo.
 * Sin ellas, los errores medirían no conocer la regla y no la perseveración.
 */
export function textosAntesDeBloque(bloque, esPrimerMixto) {
  if (bloque.fase === 'pre-cambio') {
    return {
      titulo: 'Empieza el trabajo',
      parrafos: [
        `La regla es ${SENALES[bloque.regla]}: ${EXPLICACION_REGLA[bloque.regla]}`,
        'La palabra de arriba del juguete te recuerda la regla.'
      ]
    };
  }
  if (bloque.fase === 'post-cambio') {
    return {
      titulo: 'El taller cambió la regla',
      parrafos: [
        `Ahora la regla es ${SENALES[bloque.regla]}: ${EXPLICACION_REGLA[bloque.regla]}`,
        `Ya no se guarda por ${SENALES[otraRegla(bloque.regla)]}. La palabra de arriba del juguete te recuerda la regla.`
      ]
    };
  }
  if (esPrimerMixto) {
    return {
      titulo: 'Ahora la regla cambia con cada juguete',
      parrafos: [
        `Arriba de cada juguete aparece una palabra: ${SENALES.color} o ${SENALES.forma}. Esa palabra dice la regla para ese juguete.`,
        `Si dice ${SENALES.color}, ${EXPLICACION_REGLA.color}`,
        `Si dice ${SENALES.forma}, ${EXPLICACION_REGLA.forma}`,
        'Mira la palabra en cada juguete, porque puede cambiar de uno a otro.'
      ]
    };
  }
  return {
    titulo: 'Sigue la palabra de arriba',
    parrafos: [
      `La palabra de arriba de cada juguete sigue diciendo la regla: ${SENALES.color} o ${SENALES.forma}.`
    ]
  };
}

export const BOTON_EMPEZAR_BLOQUE = 'Empezar';

const ANIMOS = Object.freeze([
  'Terminaste la primera parte. Gracias por tu atención.',
  'Terminaste otra parte. Gracias por seguir con la regla nueva.',
  'Ya llevas tres partes. Gracias por tu esfuerzo.',
  'Ya llevas cuatro partes. Gracias por tu concentración.'
]);

/**
 * Mensaje de ánimo al terminar el bloque `orden` de `total`. Fijo por bloque:
 * no depende del desempeño, así que no es retroalimentación.
 */
export function animo(orden, total) {
  if (orden >= total) return 'Terminaste todas las partes del taller. Gracias por tu tiempo.';
  if (orden === total - 1) return 'Solo queda una parte. Gracias por tu paciencia.';
  return ANIMOS[orden - 1] || 'Terminaste otra parte. Gracias por tu esfuerzo.';
}

export const PAUSA = Object.freeze({
  titulo: 'Pausa',
  parrafo: 'Puedes descansar el tiempo que quieras. Cuando quieras, continúa.',
  boton: 'Continuar',
  verInstrucciones: 'Ver de nuevo las instrucciones',
  ocultarInstrucciones: 'Ocultar las instrucciones'
});

export const PROGRESO = Object.freeze({
  etiqueta: 'Avance en el taller',
  practica: 'Práctica',
  parte: (actual, total) => `Parte ${actual} de ${total}`
});

export const ENSAYO = Object.freeze({
  region: 'Juguete y cajas',
  fijacion: 'Prepárate: mira el centro de la pantalla.'
});

export const FIN = Object.freeze({ titulo: 'Terminaste el taller' });

/** Layout de las páginas de M-09 (/registro). Sin el nombre de la plataforma. */
export const MODULO = Object.freeze({
  nombre: 'Registro conductual',
  descripcion: 'Registro estandarizado del desempeño en dos tareas de dominio público.',
  noEncontrada: 'Página no encontrada',
  noExiste: 'Esta dirección no existe.'
});

/** Página de prueba (/registro/prueba): para el equipo, no para el participante. */
export const PAGINA_PRUEBA = Object.freeze({
  tituloPagina: 'Prueba de la tarea de cambio de regla',
  nota:
    'Esta página es solo para revisar la tarea durante el desarrollo. La sesión no se envía ni se guarda: ' +
    'al terminar puedes ver los ensayos y descargarlos.',
  semilla: 'Semilla',
  reloj: 'Reloj',
  queCarga: 'el plan de la tarea',
  tituloTabla: 'Ensayos registrados',
  descargar: 'Descargar JSON',
  otraVez: 'Empezar de nuevo con otra semilla'
});

export const COLUMNAS_TABLA = Object.freeze([
  ['numero', 'N.º'],
  ['bloque', 'Bloque'],
  ['fase', 'Fase'],
  ['regla', 'Regla'],
  ['estimulo', 'Juguete'],
  ['respuesta', 'Caja elegida'],
  ['estadoItem', 'Estado'],
  ['acierto', 'Acierto'],
  ['claseError', 'Clase de error'],
  ['tiempoReaccionMs', 'Tiempo de reacción (ms)'],
  ['pausasDuranteItemMs', 'Pausa durante el ensayo (ms)'],
  ['tipoEntrada', 'Entrada']
]);
