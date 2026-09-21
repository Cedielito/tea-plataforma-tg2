# CLAUDE.md — Plataforma TEA

Plataforma web gamificada para el **tamizaje preliminar** de indicadores del TEA en
niños, niñas y adolescentes de 4 a 17 años en Colombia. Trabajo de grado de Ingeniería de
Sistemas, Universidad Católica de Colombia. Equipo de 2 personas.

La plataforma **no diagnostica**. Recolecta indicadores conductuales mediante minijuegos
basados en paradigmas experimentales de acceso abierto y reporta valores observados a un
profesional de salud mental.

## Reglas no negociables

Estas reglas vienen del documento de tesis y tienen pruebas que las verifican. Si una
tarea parece exigir romper una, detente y pregunta.

1. **Nada de salidas diagnósticas.** Ninguna respuesta, pantalla ni campo puede emitir
   diagnóstico, nivel de apoyo, severidad, banda de riesgo, puntaje global ni punto de
   corte. Se reportan valores observados. (RF-28, RN-01)
2. **B4 nunca se estima desde los ajustes de accesibilidad.** Volumen, audio, contraste y
   movimiento son metadatos de contexto. B4 sale solo de la escala RC-05. (RN-08, RF-43)
3. **Omitido ≠ incorrecto.** Un ítem sin respuesta se guarda con `estadoItem: 'omitido'`
   y se excluye del cálculo de precisión. (RF-23, RN-10)
4. **Tiempo de reacción neto.** Se mide con `performance.now()` (nunca `Date.now()`) y
   se resta `pausasDuranteItemMs`. (RF-20)
5. **Cero datos identificables en colecciones conductuales.** Solo el seudónimo `uuid`.
   Nombres, documentos y contactos viven únicamente en `consentimiento`. (CT-11)
6. **Consentimiento y asentimiento son la puerta.** Ninguna ruta que escriba datos
   conductuales se ejecuta sin pasar por `exigirConsentimiento`. La negativa del menor
   bloquea aunque el acudiente haya autorizado. (CT-12, CT-14)
7. **Todo dato del perfil declara su origen**: `desempeno` o `reporte_informante`. (RF-42)
8. **Los indicadores se calculan en el servidor**, nunca en el cliente.

## Mapa del código

```
api/src/dominio/     lógica pura, sin dependencias externas. Aquí viven las reglas.
  privacidad/        seudónimo, consentimiento, asentimiento           CT-11 CT-12 CT-14
  minijuegos/        catálogo y secuenciador de bloques                CT-08 CP-01 CP-04
  indicadores/       calculos.js (CC-01 a CC-12) y reporte.js (RC-01 a RC-05)
  puntuacion/        motor.js y version.js                             CT-13
api/src/api/         Express: rutas y middleware
api/src/datos/       esquemas Mongoose y repositorio
api/test/            pruebas Jest, agrupadas por código de criterio
web/src/             React + Vite
  pantallas/         una pantalla por módulo (M-01 a M-07)
  tokens.css         sistema visual del Cuadro 20; no uses colores ni tamaños sueltos
docs/                operacionalizacion.md, requerimientos.md, decisiones/, backlog.md
```

## Comandos

Se ejecutan desde la raíz del repositorio.

```
npm install          instala api y web (workspaces)
npm test             pruebas del backend
npm run test:cov     pruebas con cobertura; el umbral mínimo es 70 %
npm run dev:api      API en http://localhost:3000 (requiere MongoDB y api/.env)
npm run dev:web      interfaz en http://localhost:5173
npm run build:web    compila el frontend
```

## Convenciones

- **Idioma**: código, nombres, comentarios, commits y pruebas en español, sin tildes en
  identificadores (`calcularEscalas`, no `calcularEscálas`).
- **Trazabilidad**: todo módulo nuevo declara en su comentario inicial los códigos de la
  matriz que implementa (CT-xx, CC-xx, CP-xx, RC-xx, RF-xx). Todo `describe` de prueba
  empieza con el código que verifica.
- **Códigos oficiales**: los indicadores y escalas usan exactamente la numeración del
  Cuadro 12 de la tesis. No inventes códigos nuevos; si hace falta uno, pregunta.
- **Lógica nueva va al dominio** con su prueba. Las rutas solo validan, llaman al dominio
  y responden.
- **Toda función nueva del dominio lleva prueba** en el mismo commit.
- `VERSION_ALGORITMO` en `puntuacion/version.js` sube de versión si cambia cualquier
  cálculo de indicador o escala. `VERSION_CATALOGO` sube si cambian ítems o estímulos.

## Flujo de trabajo

1. Nunca trabajes sobre `main`. Crea rama desde `main` actualizado:
   `feat/<modulo>-<descripcion>`, `fix/...`, `test/...`, `docs/...`
2. Antes de cada commit: `npm test` en verde.
3. Commits en formato Conventional Commits con el código del criterio:
   `feat(consentimiento): CT-12 revocación con supresión de eventos`
4. Al terminar: push de la rama y Pull Request usando la plantilla. La revisión la hace
   el otro integrante. No se fusiona sin CI en verde.

## Qué no hacer sin preguntar

- Modificar `docs/operacionalizacion.md` o `docs/requerimientos.md`: están alineados con
  el documento de tesis y cualquier cambio debe reflejarse allá.
- Cambiar el esquema de una colección existente (afecta el Cuadro 19 de la tesis).
- Agregar dependencias nuevas.
- Tocar `.github/workflows/`.
- Crear archivos `.env` con credenciales reales o subirlos al repositorio.

## Estado actual

Implementado y probado: dominio completo, API, esquemas y pantallas base de React.
Pendiente: ver `docs/backlog.md`.
