# Requisitos de la Fase I

Copia de los cuadros del documento de tesis que gobiernan el desarrollo. **El documento
manda**: si algo aquí no coincide con la tesis, se corrige primero en la tesis y luego en
este archivo, en el mismo PR. Los números entre corchetes ([1], [29], ...) son las
referencias bibliográficas del documento.

Usa solo estos códigos en comentarios, pruebas, commits y PR. No inventes códigos nuevos.

Los códigos de M-09 (sección 7) vienen del documento anterior y de la versión 2.3 del
documento, que lleva los mismos textos: RF-13 a RF-15; CT-01 a CT-09 y CT-11 a CT-13;
CC-08, CC-09, CC-10 y CC-12; CP-01 a CP-05 y CP-07 a CP-12. CT-10 y CT-14 pasan a la
Fase II y CP-06 se excluye (sección 7). Los demás códigos de la Fase II (RF-20, RF-23,
RN-01, ...) no se usan: chocan con los de este archivo.

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
| M-09. Registro conductual estructurado | Herramienta para que un profesional registre de forma estandarizada el desempeño en dos tareas de dominio público, la clasificación con cambio de regla (DCCS) y las figuras jerárquicas de Navon, y entregue los valores observados por tarea con el aviso de no diagnóstico. En esta fase se evalúa solo con adultos voluntarios. | Profesional, participante adulto | RF-13 a RF-15; CT-01 a CT-09 y CT-11 a CT-13; CC-08, CC-09, CC-10 y CC-12; CP-01 a CP-05 y CP-07 a CP-12 |

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
| HU-16 | Profesional | Quiero crear una sesión con un seudónimo aleatorio y dejar constancia de que el adulto firmó el consentimiento, para aplicar las tareas sin guardar datos que lo identifiquen. | La sesión se crea solo después de marcar la constancia del consentimiento firmado, recibe un seudónimo aleatorio de 8 caracteres y ningún campo del registro guarda nombre, documento ni contacto. | CT-11 |
| HU-17 | Participante adulto | Quiero instrucciones claras, práctica con retroalimentación y una barra de progreso, para completar las dos tareas sin ayuda. | Cada tarea empieza con instrucciones y al menos dos ensayos de práctica con retroalimentación; durante los ensayos se ve una barra de progreso y no se ven temporizadores, marcadores ni puntajes; la aplicación dura 20 minutos o menos, con pausas. | CP-01, CP-04, CT-03, CT-07, CT-08 |
| HU-18 | Profesional | Quiero ver los valores observados por tarea con el aviso de no diagnóstico, para interpretarlos con mi propio criterio. | La vista muestra por tarea cada valor observado con su constructo, el aviso de no diagnóstico y la versión del algoritmo, sin etiquetas, niveles, puntos de corte ni puntajes globales; una sesión incompleta no muestra valores. | CC-08, CC-09, CC-10, CC-12, RF-13, RF-14, RF-15, CT-13, RCN-03 |
| HU-19 | Profesional | Quiero exportar los ensayos y los valores en CSV y eliminar una sesión por su seudónimo, para analizar los datos y atender una solicitud de supresión. | El CSV trae los ensayos y los valores con el seudónimo y la versión del algoritmo, sin datos identificables; al eliminar por seudónimo se borran la sesión y sus ensayos. | CT-11, CT-13 |

## 4. Modelo de datos

### Cuadro 13. Colecciones del modelo de datos y su justificación

| Colección | Contenido | Campos principales | Requisitos |
|---|---|---|---|
| contenido | Páginas de las secciones informativas | título, slug, sección, tramo de edad (opcional), cuerpo, fuentes, fecha de revisión, estado de publicación | RCN-01, RCN-02, RF-10 |
| pregunta_frecuente | Preguntas y respuestas | pregunta, respuesta, fuentes, orden, fecha de revisión, estado de publicación | RF-07 |
| recurso | Guías y enlaces descargables | título, descripción, archivo o enlace, fuentes, perfil destinatario, fecha de revisión, estado de publicación | RF-06 |
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

## 7. Módulo M-09. Registro conductual estructurado

Códigos del documento anterior que aplican a M-09, con los textos de la versión 2.3 del
documento. Los indicadores conservan su código; su constructo se nombra sin términos
clínicos y ninguno se asocia a un dominio del DSM-5-TR.

### Requisitos funcionales de M-09

| Código | Requisito | Perfil | Verificación |
|---|---|---|---|
| RF-13 | Los indicadores de tiempo usan el tiempo de reacción neto, sin las pausas ocurridas durante el ensayo. | Profesional | Prueba automatizada |
| RF-14 | Los ensayos de práctica, las omisiones y las anticipaciones no entran al cálculo. | Profesional | Prueba automatizada |
| RF-15 | Las sesiones incompletas no se procesan. | Profesional | Prueba automatizada |

### Criterios técnicos de M-09

| Código | Criterio | Fuente | Verificación |
|---|---|---|---|
| CT-01 | Contraste mínimo de 4,5:1 en el texto normal y de 3:1 en el texto grande y los componentes de la interfaz. | WCAG 2.1, 1.4.3 [1] | Auditoría con axe-core |
| CT-02 | Ningún contenido destella más de tres veces por segundo. | WCAG 2.1, 2.3.1 [1] | Revisión del código y de las pantallas |
| CT-03 | Durante los ensayos, el participante no ve temporizadores, marcadores ni puntajes; el tiempo de reacción se registra sin mostrarse. | WCAG 2.1, 2.2.1 [1]; carga cognitiva [35] | Prueba automatizada y revisión de la interfaz |
| CT-04 | Todas las funciones se operan con el teclado, sin gestos complejos. | WCAG 2.1, 2.1.1 [1] | Recorrido solo con teclado |
| CT-05 | Todo contenido no textual, incluidos los estímulos de las tareas, tiene una alternativa textual. | WCAG 2.1, 1.1.1 [1] | Auditoría con axe-core |
| CT-06 | Ajustes de tamaño de letra, alto contraste y reducción de movimiento disponibles antes y durante la sesión; los estímulos conservan su tamaño y sus colores. | WCAG 2.1 [1]; [72] | Prueba funcional y auditoría en alto contraste |
| CT-07 | El tiempo de reacción de cada ensayo se registra con un error de 50 ms o menos. | [96], [97] | Experimento de precisión temporal |
| CT-08 | La aplicación de las tareas dura 20 minutos o menos, con una pausa al menos cada 5 minutos. | Carga cognitiva [35], [70] | Prueba automatizada y sesiones con voluntarios |
| CT-09 | La interfaz se usa sin desplazamiento horizontal desde 320 píxeles de ancho, en computador y tableta. | Diseño responsivo; equidad de acceso [23] | Auditoría a 320 píxeles |
| CT-11 | Cada sesión se identifica con un seudónimo aleatorio y ninguna colección del registro guarda datos identificables. | Ley 1581 de 2012 [29] | Prueba automatizada |
| CT-12 | Consentimiento informado escrito del participante adulto, con constancia en la plataforma antes de crear la sesión. | Ley 1581, art. 9 [29]; Res. 8430, arts. 15 y 16 [56] | Prueba automatizada |
| CT-13 | Cada resultado guarda la versión del algoritmo; la misma entrada con la misma versión produce la misma salida. | Reproducibilidad del cálculo | Prueba automatizada |

CT-10 (sincronización diferida sin conexión) y CT-14 (asentimiento del menor) pasan a la
Fase II. CT-06, CT-07, CT-11 y CT-12 se adaptaron a la evaluación con adultos.

### Criterios pedagógicos y neuroeducativos de M-09

| Código | Criterio | Fundamento | Verificación |
|---|---|---|---|
| CP-01 | Bloques de siete ensayos como máximo, con una pausa entre bloques. | Carga cognitiva [35]; segmentación [70] | Prueba automatizada |
| CP-02 | Instrucciones con texto y un ejemplo visual del estímulo, contiguos en la misma pantalla. | Modalidad y contigüidad [70] | Revisión de las pantallas de instrucción |
| CP-03 | Frases de quince palabras o menos, en lenguaje literal, sin metáforas ni ironía. | Lenguaje sencillo [73] | Conteo automatizado sobre los textos de las tareas |
| CP-04 | Al menos dos ensayos de práctica con retroalimentación antes de la medición; no entran al cálculo. | Diseño instruccional; validez de la medición | Prueba automatizada |
| CP-05 | Retroalimentación inmediata y de tono positivo o neutro, solo en la práctica; sin sonidos ni señales enfáticas del error. | Neuroeducación; motivación intrínseca [34] | Revisión de la interfaz |
| CP-07 | Progreso visible con una barra de avance por partes; sin insignias ni recompensas por aciertos. | Competencia en la teoría de la autodeterminación [34] | Revisión de la interfaz |
| CP-08 | Sin comparación social, tablas de clasificación ni puntajes visibles. | Prevención de la ansiedad evaluativa [73] | Revisión de la interfaz y vocabulario prohibido |
| CP-09 | Un elemento animado como máximo por pantalla y fondo plano, sin decoración irrelevante. | Carga extrínseca [35], [70] | Revisión de las pantallas |
| CP-10 | Consistencia entre las dos tareas: misma posición de las opciones, misma paleta y misma estructura de pantalla. | Predictibilidad [73] | Pantalla de ensayo común a las dos tareas |
| CP-11 | Textos, objetos y ejemplos adaptados al español de Colombia. | Adecuación cultural [65] | Revisión por los jueces |
| CP-12 | Sin penalización por error ni por tiempo; la dinámica no contempla perder. | Motivación intrínseca [34] | Revisión de las reglas de las tareas |

CP-06 (elegir el orden de las tareas y personalizar un avatar) se excluye porque rompería la
estandarización. CP-02, CP-03 y CP-07 se adaptaron a la evaluación con adultos.

### Indicadores de desempeño de M-09

Valores observados por tarea: no se suman, no se comparan con puntos de corte y no se
asocian a ninguna categoría. Los de tiempo usan el tiempo de reacción neto (RF-13) y
ninguno cuenta la práctica, las omisiones ni las anticipaciones, es decir, los tiempos
netos menores de 200 ms (RF-14).

| Código | Constructo | Métrica | Cálculo | Tarea |
|---|---|---|---|---|
| CC-08 | Perseveración tras el cambio de regla | Proporción de errores perseverativos | Errores perseverativos / ensayos del bloque posterior al cambio. Un error es perseverativo si la respuesta habría sido correcta con la regla anterior. | Cambio de regla |
| CC-09 | Costo de cambio | Diferencia de tiempo entre ensayos de cambio y de repetición | Tiempo medio de los ensayos de cambio menos el de los ensayos de repetición, solo en los bloques mixtos y solo con aciertos, en ms. El primer ensayo de cada bloque no cuenta. | Cambio de regla |
| CC-10 | Diferencia global-local | Diferencia de tiempo entre condiciones | Tiempo medio de los ensayos de atención global menos el de los de atención local, solo con aciertos, en ms. | Navon |
| CC-12 | Ensayos hasta criterio | Ensayos hasta tres aciertos seguidos | Ensayos del bloque posterior al cambio hasta tres aciertos seguidos; si no se alcanza, se informa que el criterio no se alcanzó. | Cambio de regla |
