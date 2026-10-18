/**
 * Textos de las tareas de cambio de regla y de Navon (M-09, HU-17, CP-04,
 * RCN-03). Todos los textos visibles de las tareas están aquí, para que una
 * prueba los pase
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
 *
 * La tarea de Navon (T14) usa las mismas dinámicas con su propio marco
 * narrativo, «Los carteles de letras» (ver NAVON, más abajo).
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

/* ---------- Tarea de Navon (T14) ---------- */

/**
 * Textos de la tarea de figuras jerárquicas de Navon. Las mismas dinámicas
 * gamificadas que la tarea de cambio de regla, con su propio marco:
 * - Marco narrativo «Los carteles de letras». Principio: un propósito
 *   sencillo (revisar carteles) da sentido a mirar la letra grande o las
 *   pequeñas y anticipa que el nivel que se mira cambia entre partes, sin
 *   cambiar lo que se mide.
 * - Mensaje de ánimo fijo al final de cada bloque (animoNavon). Principio:
 *   reconocer el esfuerzo y no el resultado sostiene la motivación; nunca
 *   depende del desempeño.
 * - Retroalimentación de acierto solo en la práctica, un ensayo de cada
 *   nivel (CP-04). Principio: la retroalimentación inmediata consolida qué
 *   letra mirar mientras se aprende; en la medición se retira (CT-03).
 * - Recordatorio fijo del nivel arriba del cartel (RECORDATORIOS_NAVON).
 *   Principio: una señal visible y constante reduce la carga de memoria de
 *   trabajo; no cambia de un ensayo a otro dentro del bloque.
 */
export const TITULO_NAVON = 'Los carteles de letras';

/** Recordatorio fijo arriba del cartel durante cada bloque. */
export const RECORDATORIOS_NAVON = Object.freeze({ global: 'GRANDE', local: 'PEQUEÑAS' });

/** Texto alternativo del cartel: «Letra H grande hecha con letras S pequeñas». */
export const nombreFiguraNavon = (estimulo) =>
  `Letra ${estimulo.global} grande hecha con letras ${estimulo.local} pequeñas`;

/** Forma corta para la tabla: «H de S». */
export const nombreCortoNavon = (estimulo) => `${estimulo.global} de ${estimulo.local}`;

export const etiquetaLetra = (opcion) => `Letra ${opcion.valor} (tecla ${opcion.tecla})`;

/** Ejemplo dibujado en las instrucciones de cada nivel: una H grande hecha con S pequeñas. */
export const EJEMPLO_NAVON = Object.freeze({ global: 'H', local: 'S' });

/** Instrucciones antes de cada bloque y de cada ensayo de la práctica. */
export const INSTRUCCIONES_NIVEL = Object.freeze({
  global: Object.freeze({
    titulo: 'Mira la letra grande',
    parrafos: [
      'En esta parte, responde qué letra grande forma el cartel. No importa de qué letras pequeñas está hecha.',
      `Arriba del cartel verás la palabra ${RECORDATORIOS_NAVON.global} para recordártelo.`
    ],
    ejemplo: `En este ejemplo, la letra grande es ${EJEMPLO_NAVON.global}. La respuesta es ${EJEMPLO_NAVON.global}.`
  }),
  local: Object.freeze({
    titulo: 'Mira las letras pequeñas',
    parrafos: [
      'En esta parte, responde de qué letra son las letras pequeñas. No importa qué letra grande forman.',
      `Arriba del cartel verás la palabra ${RECORDATORIOS_NAVON.local} para recordártelo.`
    ],
    ejemplo: `En este ejemplo, las letras pequeñas son ${EJEMPLO_NAVON.local}. La respuesta es ${EJEMPLO_NAVON.local}.`
  })
});

export const NAVON = Object.freeze({
  bienvenida: Object.freeze({
    titulo: TITULO_NAVON,
    parrafos: [
      'Ahora vas a revisar carteles. Cada cartel tiene una letra grande hecha con muchas letras pequeñas.',
      'Las letras son H y S. Unas veces vas a mirar la letra grande y otras veces, las letras pequeñas.',
      'Antes de cada parte te diremos qué letra mirar.'
    ],
    boton: 'Ver las instrucciones'
  }),
  instrucciones: Object.freeze({
    titulo: 'Cómo responder',
    parrafos: [
      'En el centro aparece un cartel. Arriba aparece una palabra: GRANDE o PEQUEÑAS. Te recuerda qué letra mirar.',
      'Si la letra es H, presiona la tecla F. Si es S, presiona la tecla J. En una pantalla táctil, toca el botón de la letra.',
      'Responde rápido, pero procura no equivocarte. Si no respondes en unos segundos, el cartel se va y llega otro.',
      'Entre una parte y otra puedes descansar el tiempo que quieras.'
    ],
    boton: 'Continuar'
  }),
  practica: Object.freeze({
    titulo: 'Práctica',
    parrafos: [
      'Primero vas a practicar con dos carteles: en uno miras la letra grande y en el otro, las letras pequeñas.',
      'En la práctica te diremos si elegiste la letra correcta.'
    ],
    boton: 'Empezar la práctica'
  }),
  botonVerCartel: 'Ver el cartel',
  retroalimentacion: Object.freeze({
    correcta: 'Correcto. Elegiste la letra que pedía el cartel.',
    incorrecta: (condicion, vista) =>
      condicion === 'global'
        ? `Esa no era la letra. La letra grande era ${vista.estimulo.global}.`
        : `Esa no era la letra. Las letras pequeñas eran ${vista.estimulo.local}.`,
    omitida: 'No elegiste una letra a tiempo. En la tarea, el cartel se va y llega otro.',
    boton: 'Siguiente'
  }),
  finPractica: Object.freeze({
    titulo: 'Terminaste la práctica',
    parrafos: ['Desde ahora ya no te diremos si elegiste la letra correcta.'],
    boton: 'Continuar'
  }),
  progreso: Object.freeze({
    etiqueta: 'Avance en los carteles',
    practica: 'Práctica',
    parte: (actual, total) => `Parte ${actual} de ${total}`
  }),
  ensayo: Object.freeze({
    region: 'Cartel y letras',
    fijacion: 'Prepárate: mira el centro de la pantalla.'
  }),
  fin: Object.freeze({ titulo: 'Terminaste los carteles' })
});

const ANIMOS_NAVON = Object.freeze([
  'Terminaste la primera parte de los carteles. Gracias por tu atención.',
  'Terminaste otra parte. Gracias por mirar con cuidado.'
]);

/** Mensaje de ánimo al terminar el bloque `orden` de `total`. Fijo por bloque, como animo. */
export function animoNavon(orden, total) {
  if (orden >= total) return 'Terminaste todos los carteles. Gracias por tu tiempo.';
  if (orden === total - 1) return 'Solo queda una parte. Gracias por tu paciencia.';
  return ANIMOS_NAVON[orden - 1] || 'Terminaste otra parte. Gracias por tu esfuerzo.';
}

/** Pausa entre la tarea de cambio de regla y la de Navon (CT-08). */
export const ENTRE_TAREAS = Object.freeze({
  titulo: 'Terminaste el taller',
  parrafos: [
    'Terminaste la primera tarea. Gracias por tu tiempo.',
    'Ahora sigue una segunda tarea, con carteles de letras.',
    'Puedes descansar el tiempo que quieras. Cuando quieras, continúa.'
  ],
  boton: 'Continuar'
});

/** Layout de las páginas de M-09 (/registro). Sin el nombre de la plataforma. */
export const MODULO = Object.freeze({
  nombre: 'Registro conductual',
  descripcion: 'Registro estandarizado del desempeño en dos tareas de dominio público.',
  noEncontrada: 'Página no encontrada',
  noExiste: 'Esta dirección no existe.'
});

/** Página de prueba (/registro/prueba): para el equipo, no para el participante. */
export const PAGINA_PRUEBA = Object.freeze({
  tituloPagina: 'Prueba de las tareas',
  nota:
    'Esta página es solo para revisar las tareas durante el desarrollo. La sesión no se envía ni se guarda: ' +
    'al terminar puedes ver los ensayos y descargarlos.',
  finSesion: 'Terminaste las dos tareas',
  semilla: 'Semilla',
  reloj: 'Reloj',
  queCarga: 'el plan de las tareas',
  tituloTabla: 'Ensayos registrados',
  descargar: 'Descargar JSON',
  otraVez: 'Empezar de nuevo con otra semilla'
});

export const COLUMNAS_TABLA = Object.freeze([
  ['tarea', 'Tarea'],
  ['numero', 'N.º'],
  ['bloque', 'Bloque'],
  ['fase', 'Fase'],
  ['regla', 'Regla'],
  ['condicion', 'Nivel'],
  ['congruencia', 'Congruencia'],
  ['estimulo', 'Estímulo'],
  ['respuesta', 'Respuesta'],
  ['estadoItem', 'Estado'],
  ['acierto', 'Acierto'],
  ['claseError', 'Clase de error'],
  ['tiempoReaccionMs', 'Tiempo de reacción (ms)'],
  ['pausasDuranteItemMs', 'Pausa durante el ensayo (ms)'],
  ['tipoEntrada', 'Entrada']
]);
