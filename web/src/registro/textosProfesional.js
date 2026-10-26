/**
 * Textos del flujo del profesional y de la aplicación del registro conductual
 * (M-09, HU-16 a HU-19, RCN-03, CP-03). Español de Colombia, frases cortas y
 * literales; lo que ve el participante (APLICACION y SUS) va en frases de 15
 * palabras o menos (CP-03, en textos.test.js). Pasan por
 * buscarVocabularioProhibido (textosProfesional.test.js): sin etiquetas
 * diagnósticas, niveles, puntos de corte ni puntajes. El SUS valora la
 * herramienta, no a la persona: su resultado se llama «valor SUS».
 */

export const ZONA = Object.freeze({
  tituloPagina: 'Sesiones del registro',
  navegacion: 'Registro',
  sesiones: 'Sesiones',
  nueva: 'Nueva sesión',
  sesionDe: 'Sesión de',
  cerrarSesion: 'Cerrar sesión',
  comprobando: 'tu sesión',
  accesoTitulo: 'Iniciar sesión',
  accesoDescripcion:
    'Esta página es solo para profesionales con una cuenta del registro conductual. La cuenta la crea el equipo de la plataforma.',
  cerrada: 'Cerraste la sesión.',
  sinAccesoTitulo: 'Esta cuenta no tiene acceso al registro',
  sinAcceso: 'El registro conductual es solo para las cuentas de profesional. Cierra la sesión y entra con una de ellas.'
});

export const ESTADOS_SESION = Object.freeze({
  en_curso: 'En curso',
  completada: 'Completa',
  interrumpida: 'Interrumpida',
  abandonada: 'Sin completar'
});

export const LISTA = Object.freeze({
  titulo: 'Sesiones',
  descripcion:
    'Tus sesiones, de la más reciente a la más antigua. Cada una se identifica solo con su seudónimo: el registro no guarda nombres, documentos ni datos de contacto.',
  queCarga: 'las sesiones',
  nueva: 'Nueva sesión',
  vacia: 'Todavía no tienes sesiones. Crea una para empezar.',
  columnas: Object.freeze({
    seudonimo: 'Seudónimo',
    creada: 'Creada',
    estado: 'Estado',
    sus: 'Cuestionario SUS',
    ver: 'Detalle'
  }),
  susRespondido: 'Respondido',
  susPendiente: 'Sin responder',
  ver: 'Ver la sesión',
  exportar: 'Descargar los datos',
  exportarDescripcion:
    'Dos archivos CSV (separados por coma, con punto decimal): uno con todos los ensayos y otro con los valores observados y el cuestionario SUS de cada sesión. Cada fila lleva el seudónimo, las versiones del algoritmo y del catálogo, el reloj y el navegador.',
  descargarEnsayos: 'Descargar los ensayos (CSV)',
  descargarValores: 'Descargar los valores y el SUS (CSV)',
  descargando: 'Preparando el archivo…',
  errorDescarga: 'No se pudo descargar el archivo.'
});

export const NUEVA = Object.freeze({
  titulo: 'Nueva sesión',
  descripcion:
    'Antes de crear la sesión, la persona debe firmar en papel el consentimiento informado. Aquí solo se deja la constancia: no se escribe ningún dato de la persona.',
  consentimiento: 'La persona firmó en papel el consentimiento informado.',
  version: 'Versión del formato de consentimiento',
  versionPista: 'Está impresa en el formato, por ejemplo 1.0.',
  mayorDeEdad: 'La persona tiene 18 años o más.',
  mayorDeEdadPista: 'En esta fase solo participan personas adultas.',
  faltaConsentimiento: 'Marca que la persona firmó el consentimiento informado en papel.',
  faltaVersion: 'Escribe la versión del formato de consentimiento que firmó la persona, por ejemplo 1.0.',
  faltaMayorDeEdad: 'Marca que la persona es mayor de edad. En esta fase solo participan personas adultas.',
  crear: 'Crear la sesión',
  creando: 'Creando…',
  revisa: 'No pudimos crear la sesión',
  creadaTitulo: 'Sesión creada',
  seudonimoEtiqueta: 'Seudónimo de la sesión',
  seudonimoIndicacion:
    'Escribe este código en la copia del consentimiento que se lleva la persona. Lo necesitará si pide eliminar sus datos.',
  copiar: 'Copiar el seudónimo',
  copiado: 'Seudónimo copiado.',
  noCopiado: 'No se pudo copiar. Escríbelo a mano.',
  verSesion: 'Ver la sesión',
  volver: 'Volver a las sesiones'
});

export const ENTREGA = Object.freeze({
  titulo: 'Entregar el dispositivo',
  explicacion: [
    'La persona hace las dos tareas y responde el cuestionario en este mismo dispositivo.',
    'Al entregarlo se cierra tu sesión en este navegador, para que la persona no vea otras sesiones. Cuando termine, vuelve a iniciar sesión para ver los valores.'
  ],
  boton: 'Entregar el dispositivo y empezar',
  entregando: 'Preparando…',
  vencida: 'Esta sesión venció sin completarse. Crea una nueva.'
});

export const DETALLE = Object.freeze({
  queCarga: 'la sesión',
  noEncontrada: 'No encontramos esta sesión. Puede que se haya eliminado.',
  volver: 'Volver a las sesiones',
  datos: 'Datos de la sesión',
  creada: 'Creada',
  estado: 'Estado',
  consentimiento: 'Formato de consentimiento',
  catalogo: 'Versión del catálogo',
  reloj: 'Reloj',
  navegador: 'Navegador',
  sinNavegador: 'Todavía no se entregó el dispositivo',
  tareasRecibidas: 'Tareas recibidas',
  ninguna: 'Ninguna',
  sus: 'Valor SUS (valora la herramienta, no a la persona)',
  susPendiente: 'Sin responder',
  valores: 'Valores observados',
  sinProcesar:
    'Esta sesión no está completa. Sus ensayos se guardan, pero no se procesan: solo una sesión con las dos tareas tiene valores.',
  versionAlgoritmo: 'Versión del algoritmo',
  columnas: Object.freeze({ codigo: 'Código', constructo: 'Constructo', metrica: 'Métrica', valor: 'Valor observado' }),
  contextoTarea: 'Variables de contexto de la tarea (ayudan a interpretar; no son indicadores)',
  contextoSesion: 'Contexto de la sesión',
  variable: 'Variable',
  valor: 'Valor'
});

export const TAREAS_RECIBIDAS = Object.freeze({ 'cambio-regla': 'Cambio de regla', navon: 'Navon' });

export const VARIABLES_TAREA = Object.freeze({
  tasaOmision: 'Proporción de ensayos sin respuesta',
  tasaAnticipacion: 'Proporción de respuestas anticipadas',
  variabilidadTiempoReaccion: 'Desviación estándar del tiempo de reacción',
  coeficienteVariacion: 'Coeficiente de variación del tiempo de reacción',
  rectificacionesPromedio: 'Rectificaciones por ensayo (promedio)'
});

export const VARIABLES_SESION = Object.freeze({
  tipoEntrada: 'Tipo de entrada más usado',
  pausas: 'Veces que la pestaña se ocultó',
  repeticionesInstruccion: 'Veces que se volvieron a ver las instrucciones'
});

export const TIPOS_ENTRADA = Object.freeze({ teclado: 'Teclado', tactil: 'Pantalla táctil', raton: 'Ratón' });

export const VALORES = Object.freeze({
  sinDatos: 'Sin datos suficientes',
  criterioNoAlcanzado: 'No se alcanzaron tres aciertos seguidos',
  ensayo: 'ensayo',
  ensayos: 'ensayos'
});

export const ELIMINAR = Object.freeze({
  titulo: 'Eliminar una sesión',
  descripcion:
    'Si una persona pide eliminar sus datos (Ley 1581 de 2012), escribe el seudónimo de su copia del consentimiento. Se borran la sesión y todos sus ensayos.',
  campo: 'Seudónimo',
  pista: '8 caracteres, por ejemplo ABCD-2345. Puedes escribirlo en minúsculas o sin el guion.',
  invalido: 'El seudónimo tiene 8 caracteres en dos grupos de 4, por ejemplo ABCD-2345.',
  buscar: 'Eliminar',
  pregunta: (seudonimo) => `¿Eliminar la sesión ${seudonimo} y todos sus ensayos? No se puede deshacer.`,
  confirmar: 'Sí, eliminar',
  eliminando: 'Eliminando…',
  cancelar: 'Cancelar',
  eliminada: (seudonimo) => `Se eliminó la sesión ${seudonimo} con todos sus ensayos.`,
  noEncontrada: (seudonimo) => `No hay ninguna sesión tuya con el seudónimo ${seudonimo}.`,
  botonDetalle: 'Eliminar esta sesión'
});

/* ---------- Aplicación (lo que ve el participante) ---------- */

export const APLICACION = Object.freeze({
  tituloPagina: 'Actividades',
  titulo: 'Actividades',
  queCarga: 'las actividades',
  sinAplicacionTitulo: 'No hay actividades en curso',
  sinAplicacion: 'En este dispositivo no hay actividades en curso. Devuelve el dispositivo a la persona que te acompaña.',
  interrumpidaTitulo: 'Las actividades se interrumpieron',
  interrumpida: [
    'La página se cerró o se volvió a cargar en medio de una actividad. Por eso no se puede continuar.',
    'Devuelve el dispositivo a la persona que te acompaña.'
  ],
  graciasTitulo: 'Gracias',
  gracias: ['Gracias por participar.', 'Ya terminaste. Devuelve el dispositivo a la persona que te acompaña.'],
  guardado: 'Todo quedó guardado.',
  guardando: 'Estamos guardando lo registrado. No cierres esta página.',
  pendiente: 'Falta guardar una parte de lo registrado. No cierres esta página.',
  rechazado: 'Una parte de lo registrado no se pudo guardar. Avisa a la persona que te acompaña.',
  reintentar: 'Intentar de nuevo'
});

export const SUS = Object.freeze({
  titulo: 'Unas preguntas sobre la herramienta',
  descripcion: [
    'Para terminar, cuéntanos cómo te pareció la herramienta que usaste. No hay respuestas buenas ni malas: lo que valoras es la herramienta, no a ti.',
    'Marca un número del 1 al 5 en cada frase.'
  ],
  enunciado: (numero, total) => `Frase ${numero} de ${total}`,
  opcion: (numero, escala) => {
    if (numero === escala.minimo) return `${numero}: ${escala.etiquetaMinimo}`;
    if (numero === escala.maximo) return `${numero}: ${escala.etiquetaMaximo}`;
    return String(numero);
  },
  faltan: 'Falta responder algunas frases',
  falta: 'Marca un número del 1 al 5.',
  enviar: 'Terminar'
});
