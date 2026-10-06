# Requisitos de la Fase I

Copia de los cuadros del documento de tesis que gobiernan el desarrollo. **El documento
manda**: si algo aquí no coincide con la tesis, se corrige primero en la tesis y luego en
este archivo, en el mismo PR. Los números entre corchetes ([1], [29], ...) son las
referencias bibliográficas del documento.

Usa solo estos códigos en comentarios, pruebas, commits y PR. No inventes códigos nuevos.

Nota de implementación: el Cuadro 14 fija una base tipográfica mínima de 16 px; la
plataforma usa 18 px (más legible y dentro de la regla).

## 1. Requisitos

### Cuadro 5. Requisitos de contenido

| Código | Requisito | Fuente | Verificación |
|---|---|---|---|
| RCN-01 | Todo contenido cita la fuente oficial o científica que lo respalda; el equipo no formula contenido clínico propio. | [2], [5], [22], [23] | Revisión de cada página publicada |
| RCN-02 | Cada página muestra la fecha de su última revisión. | [22], [23] | Revisión de cada página publicada |
| RCN-03 | Un aviso visible indica que la información no constituye diagnóstico ni sustituye la valoración profesional. | [8], [22] | Inspección de inicio, señales y ruta |
| RCN-04 | Las señales de alerta se presentan por tramo de edad (4 a 7, 8 a 12 y 13 a 17 años) como motivos de consulta, nunca como una lista que se pueda sumar. | [2], [4], [14] | Revisión de la sección de señales |
| RCN-05 | La ruta de atención sigue el protocolo del Ministerio de Salud y Protección Social y la Ley 1616 de 2013. | [2], [53] | Contraste con la fuente oficial |
| RCN-06 | Redacción literal y breve: párrafos cortos, instrucciones de dos frases como máximo, sin metáforas y con los tecnicismos explicados. | [4], [73] | Revisión de textos |
| RCN-07 | Adaptación al contexto colombiano en términos, entidades y ejemplos. | [7], [65] | Revisión de textos |
| RCN-08 | Lenguaje respetuoso y con enfoque de derechos, sin describir el TEA como enfermedad. | [49], [54] | Revisión de textos |

### Cuadro 6. Requisitos de accesibilidad y diseño

| Código | Requisito | Fuente | Verificación |
|---|---|---|---|
| RA-01 | Contraste mínimo de 4,5:1 en texto normal y de 3:1 en texto grande y componentes de interfaz. | WCAG 2.1, 1.4.3 [1] | axe-core y revisión manual |
| RA-02 | Ningún contenido destella más de tres veces por segundo y las animaciones pueden desactivarse. | WCAG 2.1, 2.3.1 [1]; [73] | Revisión visual |
| RA-03 | Operación completa con teclado, con foco visible y orden lógico. | WCAG 2.1, 2.1.1 y 2.4.7 [1] | Recorrido sin ratón |
| RA-04 | Alternativa textual para todas las imágenes e íconos con significado. | WCAG 2.1, 1.1.1 [1] | axe-core |
| RA-05 | Diseño adaptable desde 320 píxeles de ancho, sin desplazamiento horizontal, en celular, tableta y computador. | WCAG 2.1, 1.4.10 [1]; [23] | Prueba en tres anchos de pantalla |
| RA-06 | Ampliación del texto al 200 % sin pérdida de contenido ni superposición. | WCAG 2.1, 1.4.4 [1] | Prueba de ampliación |
| RA-07 | Ajustes de visualización —tamaño de letra, alto contraste y reducción de movimiento— disponibles en todas las páginas y conservados durante la visita. | [72], [73] | Prueba funcional |
| RA-08 | Estructura consistente: la navegación y los controles ocupan la misma posición en todas las páginas. | WCAG 2.1, 3.2.3 [1]; [72] | Comparación entre páginas |
| RA-09 | Un solo elemento animado por pantalla, fondo plano y sin decoración irrelevante. | [35], [71] | Revisión visual |
| RA-10 | Sin límites de tiempo ni ventanas emergentes automáticas. | WCAG 2.1, 2.2.1 [1]; [73] | Revisión de interfaz |
| RA-11 | Encabezados, regiones y etiquetas semánticas que permitan el uso con lector de pantalla. | WCAG 2.1, 1.3.1 [1] | axe-core y lector de pantalla |

### Cuadro 7. Requisitos funcionales

| Código | Requisito | Perfil | Verificación |
|---|---|---|---|
| RF-01 | Navegación por las secciones del portal desde el menú y la página de inicio. | Familia, docente | Caso de aceptación |
| RF-02 | Buscador de contenidos y preguntas frecuentes por palabra clave. | Familia, docente | Caso de aceptación |
| RF-03 | Señales de alerta filtrables por tramo de edad. | Familia, docente | Caso de aceptación |
| RF-04 | Ruta de atención interactiva de tres preguntas —quién consulta, tramo de edad y régimen de afiliación— que muestra pasos y entidades sin almacenar las respuestas. | Familia, docente | Caso de aceptación y revisión de tráfico |
| RF-05 | Directorio filtrable por ciudad y tipo de entidad, con fecha de verificación en cada registro. | Familia, docente | Caso de aceptación |
| RF-06 | Recursos descargables y enlaces a guías oficiales, con su fuente. | Familia, docente | Caso de aceptación |
| RF-07 | Preguntas frecuentes en formato desplegable. | Familia, docente | Caso de aceptación |
| RF-08 | Formulario de contacto que no se envía sin la autorización expresa de tratamiento de datos. | Familia, docente | Prueba automatizada |
| RF-09 | Panel de administración con acceso autenticado. | Administrador | Prueba automatizada |
| RF-10 | Gestión (crear, editar, publicar y despublicar) de contenidos, preguntas, recursos, directorio y pasos de la ruta, con fuente y fecha de revisión obligatorias. | Administrador | Prueba automatizada |
| RF-11 | Bandeja de mensajes de contacto con opción de eliminar. | Administrador | Caso de aceptación |
| RF-12 | Páginas «Acerca de» y de privacidad con el alcance de la plataforma y el aviso de no diagnóstico. | Todos | Revisión de contenido |

### Cuadro 8. Requisitos de seguridad y privacidad

| Código | Requisito | Fuente normativa | Verificación |
|---|---|---|---|
| RS-01 | La zona pública no solicita registro ni recolecta datos personales, y no usa cookies de seguimiento ni analítica de terceros. | Ley 1581, art. 4 [29] | Revisión de tráfico y de código |
| RS-02 | El formulario de contacto pide los datos mínimos (correo y mensaje) y exige autorización previa, expresa e informada. | Ley 1581, art. 9 [29]; Decreto 1377 [55] | Prueba automatizada |
| RS-03 | La política de tratamiento de datos está publicada y enlazada desde el formulario. | Decreto 1377 [55] | Revisión de contenido |
| RS-04 | Los mensajes se suprimen a solicitud del titular y de forma automática a los seis meses. | Ley 1581, art. 8 [29] | Prueba automatizada |
| RS-05 | El administrador se autentica con contraseña almacenada mediante función hash, y la sesión expira por inactividad. | Ley 1581, art. 4, lit. g [29] | Prueba automatizada |
| RS-06 | Toda la comunicación se cifra mediante HTTPS. | Ley 1581, art. 4, lit. g [29] | Revisión del despliegue |
| RS-07 | El directorio solo publica datos institucionales públicos o datos de profesionales con su autorización expresa. | Ley 1581, art. 9 [29] | Revisión del directorio |

## 2. Módulos y contenidos

### Cuadro 10. Módulos de la plataforma y requisitos que gobiernan su diseño

| Módulo | Función | Perfil | Requisitos |
|---|---|---|---|
| M-01. Inicio y navegación | Presenta el propósito del portal, el acceso a las secciones, el buscador y el aviso de no diagnóstico. | Familia, docente | RF-01, RF-02, RCN-03 |
| M-02. Contenidos informativos | Secciones sobre qué es el TEA, señales de alerta por edad, mitos y realidades, y derechos. | Familia, docente | RCN-01 a RCN-08, RF-03 |
| M-03. Ruta de atención interactiva | Guía de tres preguntas que muestra los pasos y las entidades a las que acudir según quién consulta, la edad y el régimen de afiliación. | Familia, docente | RF-04, RCN-05, RS-01 |
| M-04. Directorio de orientación | Listado filtrable de entidades y profesionales con datos de contacto autorizados y fecha de verificación. | Familia, docente | RF-05, RS-07 |
| M-05. Recursos y preguntas frecuentes | Guías descargables, enlaces oficiales y preguntas frecuentes. | Familia, docente | RF-06, RF-07 |
| M-06. Contacto y privacidad | Formulario de contacto con autorización de tratamiento de datos, política de privacidad y página «Acerca de». | Familia, docente | RF-08, RF-12, RS-02, RS-03 |
| M-07. Ajustes de accesibilidad | Control permanente de tamaño de letra, alto contraste y reducción de movimiento. | Todos | RA-07 |
| M-08. Panel de administración | Gestión de contenidos, preguntas, recursos, directorio, pasos de la ruta y mensajes, con acceso autenticado. | Administrador | RF-09 a RF-11, RS-04, RS-05 |

### Cuadro 11. Arquitectura de contenidos del portal

| Sección | Contenido | Fuente principal | Requisitos |
|---|---|---|---|
| S1. ¿Qué es el TEA? | Definición, dominios del DSM-5-TR explicados en lenguaje sencillo y concepto de espectro. | [4], [5], [20] | RCN-01, RCN-06 |
| S2. Señales de alerta por edad | Conductas orientativas por tramo (4 a 7, 8 a 12 y 13 a 17 años), presentadas como motivos de consulta y no como criterios diagnósticos. | [2], [4], [14] | RCN-04, RF-03 |
| S3. Mitos y realidades | Aclaraciones frente a creencias frecuentes sobre las causas, el pronóstico y la prevalencia. | [5], [6] | RCN-06, RCN-08 |
| S4. Ruta de atención en Colombia | Pasos desde la sospecha hasta la valoración especializada, conforme al protocolo del Ministerio de Salud, y acceso a la guía interactiva. | [2], [53] | RCN-05, RF-04 |
| S5. Derechos y marco legal | Derechos en salud y educación de niños, niñas y adolescentes con TEA. | [49], [52], [53], [54] | RCN-08 |
| S6. Directorio de orientación | Entidades y profesionales, publicados con autorización de sus datos de contacto y con fecha de verificación. | Ley 1581 de 2012 [29] | RF-05, RS-07 |
| S7. Recursos para familias y docentes | Orientaciones sobre el acompañamiento en casa y sobre ajustes razonables en el aula, con enlaces a guías oficiales. | [2], [16], [21] | RF-06, RCN-07 |
| S8. Preguntas frecuentes | Respuestas breves a las dudas más comunes, cada una con su fuente. | Fuentes de S1 a S5 | RF-07, RCN-01 |
| S9. Acerca de y privacidad | Propósito y alcance de la plataforma, aviso de no diagnóstico y política de tratamiento de datos. | Apartado 1.2.2; [29], [55] | RF-12, RS-03 |

## 3. Historias de usuario

### Cuadro 12. Historias de usuario y criterios de aceptación

| Cód. | Perfil | Historia de usuario | Criterio de aceptación | Requisitos |
|---|---|---|---|---|
| HU-01 | Familia | Quiero entender qué es el TEA con palabras sencillas. | La sección presenta la definición en párrafos breves, sin tecnicismos sin explicar, con su fuente y su fecha de revisión. | RCN-01, RCN-02, RCN-06 |
| HU-02 | Familia | Quiero saber qué señales observar según la edad de mi hijo. | Las señales se filtran por tramo de edad y cada una se presenta como motivo de consulta, con enlace a la ruta de atención. | RF-03, RCN-04 |
| HU-03 | Familia | Quiero saber a dónde acudir según mi situación. | La ruta muestra pasos y entidades tras responder tres preguntas, sin pedir datos personales ni guardar las respuestas. | RF-04, RCN-05, RS-01 |
| HU-04 | Familia | Quiero encontrar entidades en mi ciudad. | El directorio filtra por ciudad y tipo de entidad, y cada registro muestra su fecha de verificación. | RF-05, RS-07 |
| HU-05 | Familia | Quiero leer la información desde mi celular. | Todas las páginas se usan sin desplazamiento horizontal desde 320 píxeles de ancho. | RA-05 |
| HU-06 | Familia | Quiero agrandar la letra o reducir el movimiento de la página. | Los ajustes se aplican de inmediato y se conservan durante la visita. | RA-06, RA-07 |
| HU-07 | Familia | Quiero saber qué significa y qué no significa la información. | El aviso de no diagnóstico es visible en la página de inicio, en las señales de alerta y en la ruta. | RCN-03, RF-12 |
| HU-08 | Familia | Quiero hacer una pregunta al equipo sin exponer mis datos. | El formulario pide solo correo y mensaje, y no se envía sin la autorización expresa de tratamiento de datos. | RF-08, RS-02, RS-03 |
| HU-09 | Docente | Quiero descargar material para orientar a una familia. | Los recursos se descargan en PDF o enlazan a la guía oficial, con su fuente. | RF-06, RCN-01 |
| HU-10 | Docente | Quiero encontrar rápido una respuesta concreta. | El buscador devuelve las páginas y preguntas que contienen el término, y las preguntas frecuentes se despliegan por separado. | RF-02, RF-07 |
| HU-11 | Docente | Quiero navegar solo con el teclado. | Todas las funciones se operan con teclado, con foco visible y en orden lógico. | RA-03, RA-11 |
| HU-12 | Administrador | Quiero entrar al panel de forma segura. | El acceso exige usuario y contraseña; la contraseña se almacena cifrada y la sesión expira por inactividad. | RF-09, RS-05 |
| HU-13 | Administrador | Quiero publicar o corregir un contenido sin tocar el código. | El editor exige fuente y fecha de revisión antes de publicar, y permite despublicar. | RF-10, RCN-01, RCN-02 |
| HU-14 | Administrador | Quiero mantener actualizados el directorio y la ruta. | Cada entidad exige tipo, ciudad, contacto, fecha de verificación y constancia de autorización si es un profesional; cada paso de la ruta exige su fuente. | RF-10, RS-07, RCN-05 |
| HU-15 | Administrador | Quiero responder y luego eliminar los mensajes recibidos. | La bandeja muestra los mensajes y permite eliminarlos; los mensajes con más de seis meses se suprimen de forma automática. | RF-11, RS-04 |

## 4. Modelo de datos

### Cuadro 13. Colecciones del modelo de datos y su justificación

| Colección | Contenido | Campos principales | Requisitos |
|---|---|---|---|
| contenido | Páginas de las secciones informativas | título, sección, tramo de edad (opcional), cuerpo, fuentes, fecha de revisión, estado de publicación | RCN-01, RCN-02, RF-10 |
| pregunta_frecuente | Preguntas y respuestas | pregunta, respuesta, fuente, orden, estado | RF-07 |
| recurso | Guías y enlaces descargables | título, descripción, archivo o enlace, fuente, perfil destinatario | RF-06 |
| entidad_directorio | Entidades y profesionales del directorio | nombre, tipo, ciudad, contacto, fecha de verificación, constancia de autorización | RF-05, RS-07 |
| paso_ruta | Pasos de la ruta de atención | perfil, tramo de edad, régimen, orden, texto, entidad enlazada, fuente | RF-04, RCN-05 |
| mensaje_contacto | Mensajes recibidos | correo, mensaje, fecha, versión de la autorización aceptada | RF-08, RS-02, RS-04 |
| administrador | Cuentas del panel | usuario, contraseña cifrada, fecha del último acceso | RF-09, RS-05 |

## 5. Sistema visual

### Cuadro 14. Reglas del sistema visual y de interacción

| Regla | Especificación de diseño | Requisitos |
|---|---|---|
| Contraste | Relación mínima de 4,5:1 en texto normal y de 3:1 en texto grande y componentes, verificada sobre la paleta completa. | RA-01 |
| Tipografía | Fuente sin serifas, cuerpo base de 16 píxeles, escalable hasta el 200 % sin pérdida de contenido. | RA-06, RA-07 |
| Área de interacción | Objetivos táctiles de 44 por 44 píxeles como mínimo, separados al menos 8 píxeles. | RA-03, RA-05 |
| Animación | Un solo elemento animado por pantalla, sin destellos y desactivable desde los ajustes. | RA-02, RA-09 |
| Paleta | Colores de baja saturación sobre fondo plano; el color nunca es el único portador de información. | RA-01, RA-09 |
| Patrón de página | Encabezado con navegación, buscador y ajustes; migas de pan; contenido; pie con aviso de no diagnóstico y privacidad. | RA-08, RCN-03 |
| Lenguaje | Párrafos breves en forma literal, sin metáforas ni ironía, con fuente y fecha al final de cada página. | RCN-01, RCN-02, RCN-06 |
| Navegación | Recorrido completo por teclado, foco visible y enlace para saltar al contenido. | RA-03, RA-11 |

## 6. Pruebas y evaluación

### Cuadro 19. Tipos de prueba, herramientas y metas

| Tipo de prueba | Herramienta | Qué verifica | Meta |
|---|---|---|---|
| Unitarias y de integración del servidor | Jest y MongoDB en memoria | Reglas de dominio y rutas de la API: campos obligatorios, autenticación, autorización del formulario y supresión programada | ≥ 70 % de cobertura |
| Casos de aceptación | Casos derivados del Cuadro 12, ejecutados en el entorno desplegado | Criterios de aceptación de las quince historias de usuario | 100 % superados, sin incidencias bloqueantes |
| Accesibilidad | axe-core, Lighthouse y revisión manual (teclado, ampliación al 200 % y lector de pantalla) | Requisitos RA-01 a RA-11 | 0 violaciones críticas o graves; Lighthouse ≥ 90 |
| Rendimiento | Lighthouse con perfil móvil | Tiempo de carga y peso de las páginas en conexiones limitadas | Lighthouse ≥ 80 |

### Cuadro B.1. Tareas de la prueba de usabilidad

| N.º | Tarea | Criterio de éxito | Historia |
|---|---|---|---|
| T1 | Encuentre qué es el trastorno del espectro autista. | Llega a la sección S1 desde el inicio. | HU-01 |
| T2 | Encuentre las señales de alerta para un niño de 6 años. | Aplica el filtro del tramo de 4 a 7 años. | HU-02 |
| T3 | Una madre con afiliación al régimen subsidiado tiene una hija de 10 años: consulte a dónde debería acudir. | Completa las tres preguntas y llega a los pasos correspondientes. | HU-03 |
| T4 | Busque una entidad de orientación en Bogotá. | Aplica el filtro de ciudad y abre un registro. | HU-04 |
| T5 | Aumente el tamaño de la letra de la página. | Aplica el ajuste desde la barra de accesibilidad. | HU-06 |
| T6 | Descargue un recurso para docentes. | Inicia la descarga o abre el enlace del recurso. | HU-09 |
| T7 | Encuentre la respuesta a «¿A quién debo consultar primero?». | Despliega la pregunta frecuente o la encuentra con el buscador. | HU-10 |
| T8 | Envíe un mensaje de contacto con una pregunta. | Acepta la autorización y envía el formulario. | HU-08 |
