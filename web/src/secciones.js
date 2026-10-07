/**
 * Secciones públicas de la plataforma. M-01 (navegación, RF-01), M-02 a M-06.
 * Fuente única para la navegación, las tarjetas del inicio, las rutas y los
 * enlaces de los resultados del buscador. El orden es el del Cuadro 11.
 *
 * `seccion` es el código del contenido en la API (S1 a S5) y `slug` el del
 * contenido que muestra la página. Señales de alerta (S2) reúne la
 * introducción y los tres tramos de edad (RCN-04).
 */
import {
  BookOpen,
  CircleQuestionMark,
  Download,
  Eye,
  Lightbulb,
  MapPin,
  Route,
  Scale
} from 'lucide-react';

/** Página del directorio (M-04); la guía de la ruta enlaza aquí, sin filtros. */
export const RUTA_DIRECTORIO_WEB = '/directorio';

/** Páginas de recursos y de preguntas frecuentes (M-05). */
export const RUTA_RECURSOS_WEB = '/recursos';
export const RUTA_PREGUNTAS_WEB = '/preguntas-frecuentes';

/** Pregunta frecuente dentro de su página: el ancla #slug la abre (RF-07). */
export const rutaDePregunta = (slug) => `${RUTA_PREGUNTAS_WEB}#${slug}`;

/** Contacto y páginas fijas (M-06): formulario, política de privacidad y «Acerca de». */
export const RUTA_CONTACTO_WEB = '/contacto';
export const RUTA_PRIVACIDAD_WEB = '/privacidad';
export const RUTA_API_CONTACTO = '/api/contacto';
export const RUTA_API_POLITICA = '/api/paginas/privacidad';

export const SECCIONES = [
  {
    ruta: '/que-es-el-tea',
    nav: 'Qué es el TEA',
    titulo: 'Qué es el TEA',
    descripcion: 'Una explicación clara del trastorno del espectro autista.',
    Icono: BookOpen,
    seccion: 'S1',
    slug: 'que-es-el-tea'
  },
  {
    ruta: '/senales-de-alerta',
    nav: 'Señales',
    titulo: 'Señales de alerta',
    descripcion: 'Motivos para consultar, según la edad: 4 a 7, 8 a 12 y 13 a 17 años.',
    Icono: Eye,
    seccion: 'S2',
    avisoNoDiagnostico: true
  },
  {
    ruta: '/mitos-y-realidades',
    nav: 'Mitos',
    titulo: 'Mitos y realidades',
    descripcion: 'Lo que dice la evidencia frente a ideas equivocadas sobre el autismo.',
    Icono: Lightbulb,
    seccion: 'S3',
    slug: 'mitos-y-realidades'
  },
  {
    ruta: '/ruta-de-atencion',
    nav: 'Ruta de atención',
    titulo: 'Ruta de atención',
    descripcion: 'Los pasos para pedir una valoración y a quién acudir en cada uno.',
    Icono: Route,
    seccion: 'S4',
    slug: 'ruta-de-atencion',
    avisoNoDiagnostico: true
  },
  {
    ruta: '/derechos',
    nav: 'Derechos',
    titulo: 'Derechos',
    descripcion: 'Derechos en salud y educación de niños, niñas y adolescentes autistas.',
    Icono: Scale,
    seccion: 'S5',
    slug: 'derechos'
  },
  {
    ruta: RUTA_DIRECTORIO_WEB,
    nav: 'Directorio',
    titulo: 'Directorio',
    descripcion: 'Entidades públicas de orientación, por ciudad y tipo.',
    Icono: MapPin
  },
  {
    ruta: RUTA_RECURSOS_WEB,
    nav: 'Recursos',
    titulo: 'Recursos',
    descripcion: 'Guías y documentos oficiales para descargar o consultar.',
    Icono: Download
  },
  {
    ruta: RUTA_PREGUNTAS_WEB,
    nav: 'Preguntas',
    titulo: 'Preguntas frecuentes',
    descripcion: 'Respuestas cortas a las dudas más comunes de familias y docentes.',
    Icono: CircleQuestionMark
  }
];

/**
 * Páginas del pie (M-06, RF-08, RF-12). La política y «Acerca de» vienen de
 * api/contenidos/paginas por /api/paginas/:slug (`api`) y usan la plantilla
 * de contenido; Contacto tiene su formulario.
 */
export const PAGINAS_PIE = [
  {
    ruta: RUTA_CONTACTO_WEB,
    titulo: 'Contacto',
    descripcion: 'Escríbenos una pregunta o una sugerencia.'
  },
  {
    ruta: RUTA_PRIVACIDAD_WEB,
    titulo: 'Política de privacidad',
    descripcion: 'Cómo tratamos los datos personales, según la Ley 1581 de 2012.',
    api: RUTA_API_POLITICA
  },
  {
    ruta: '/acerca-de',
    titulo: 'Acerca de',
    descripcion: 'Quiénes hacen esta plataforma y con qué propósito.',
    api: '/api/paginas/acerca-de'
  }
];

/**
 * Tramos de edad de las señales de alerta (RCN-04), en orden de edad. `corta`
 * es el texto visible de cada pestaña; «años» va en la indicación de encima.
 */
export const TRAMOS_EDAD = [
  { valor: '4-7', corta: '4 a 7', etiqueta: '4 a 7 años' },
  { valor: '8-12', corta: '8 a 12', etiqueta: '8 a 12 años' },
  { valor: '13-17', corta: '13 a 17', etiqueta: '13 a 17 años' }
];

const seccionDe = (codigo) => SECCIONES.find((s) => s.seccion === codigo);
const tramoDe = (valor) => TRAMOS_EDAD.find((t) => t.valor === valor);

/** Página donde se lee un contenido; las señales abren la pestaña de su tramo. */
export function rutaDeContenido({ seccion, tramoEdad }) {
  const pagina = seccionDe(seccion);
  if (!pagina) return '/';
  return tramoDe(tramoEdad) ? `${pagina.ruta}?edad=${tramoEdad}` : pagina.ruta;
}

/** «Señales de alerta · 8 a 12 años», para los resultados del buscador. */
export function nombreDeContenido({ seccion, tramoEdad }) {
  const pagina = seccionDe(seccion);
  const tramo = tramoDe(tramoEdad);
  return [pagina?.titulo, tramo?.etiqueta].filter(Boolean).join(' · ');
}
