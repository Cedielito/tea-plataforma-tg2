/**
 * Secciones públicas de la plataforma. M-01 (navegación), M-02 a M-05.
 * Fuente única para la navegación, las tarjetas del inicio y las rutas.
 */
import { BookOpen, CircleQuestionMark, Download, Eye, MapPin, Route } from 'lucide-react';

export const SECCIONES = [
  {
    ruta: '/que-es-el-tea',
    nav: 'Qué es el TEA',
    titulo: 'Qué es el TEA',
    descripcion: 'Una explicación clara del trastorno del espectro autista.',
    Icono: BookOpen
  },
  {
    ruta: '/senales-de-alerta',
    nav: 'Señales',
    titulo: 'Señales de alerta',
    descripcion: 'Motivos para consultar, según la edad: 4 a 7, 8 a 12 y 13 a 17 años.',
    Icono: Eye,
    avisoNoDiagnostico: true
  },
  {
    ruta: '/ruta-de-atencion',
    nav: 'Ruta de atención',
    titulo: 'Ruta de atención',
    descripcion: 'Los pasos para pedir una valoración y a quién acudir en cada uno.',
    Icono: Route,
    avisoNoDiagnostico: true
  },
  {
    ruta: '/directorio',
    nav: 'Directorio',
    titulo: 'Directorio',
    descripcion: 'Entidades públicas de orientación, por ciudad y tipo.',
    Icono: MapPin
  },
  {
    ruta: '/recursos',
    nav: 'Recursos',
    titulo: 'Recursos',
    descripcion: 'Guías y documentos oficiales para descargar o consultar.',
    Icono: Download
  },
  {
    ruta: '/preguntas-frecuentes',
    nav: 'Preguntas',
    titulo: 'Preguntas frecuentes',
    descripcion: 'Respuestas cortas a las dudas más comunes de familias y docentes.',
    Icono: CircleQuestionMark
  }
];

export const PAGINAS_PIE = [
  {
    ruta: '/privacidad',
    titulo: 'Política de privacidad',
    descripcion: 'Cómo tratamos los datos personales, según la Ley 1581 de 2012.'
  },
  {
    ruta: '/acerca-de',
    titulo: 'Acerca de',
    descripcion: 'Quiénes hacen esta plataforma y con qué propósito.'
  }
];
