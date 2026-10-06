# Cómo trabajamos

## Reparto

| Integrante | Área principal | Revisa los PR de |
|---|---|---|
| Lucas | Desarrollo de la plataforma (`api/`, `web/`), despliegue | — (sus PR los revisa Santiago) |
| Santiago Cárdenas Rubio | Contenidos con fuente y fecha, directorio, documento de tesis, prueba con voluntarios | Lucas |

Nadie fusiona su propio código: **todo cambio entra por Pull Request aprobado por el
otro integrante**. Esa revisión cruzada es además evidencia para el documento.

## El ciclo de una tarea (Claude Code web)

```
1. Tomar la siguiente tarea de docs/backlog-fase-i.md (T1, T2, ...)
2. Abrir una sesión nueva en claude.ai/code sobre el repositorio, desde main
3. Pegar el prompt de la tarea; Claude propone un plan → revisarlo y aprobarlo
4. Claude programa, corre las pruebas, hace commit y push a la rama de la tarea
   y abre el Pull Request
5. Revisar la vista previa (Vercel) y el CI en verde
6. El otro integrante revisa → aprueba → "Squash and merge"
7. Borrar la rama
```

## Nombres de rama

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feat/` | funcionalidad nueva | `feat/directorio` |
| `fix/` | corrección | `fix/contraste-aviso` |
| `test/` | solo pruebas | `test/accesibilidad` |
| `docs/` | solo documentación | `docs/casos-aceptacion` |
| `chore/` | configuración, dependencias, despliegue | `chore/despliegue` |

## Mensajes de commit

Formato Conventional Commits, en español, con el código del requisito cuando aplique:

```
feat(contenidos): RCN-01 rechazar contenido sin fuente
feat(ruta): RF-04 resolver la ruta en el navegador
fix(accesibilidad): RA-03 foco visible en el menú
docs(backlog): marcar T2 como terminada
```

Un commit = un cambio con sentido.

## Revisión de un Pull Request

Quien revisa comprueba, como mínimo:

1. El CI está en verde.
2. La lista de verificación de la plantilla está completa.
3. Ninguna pantalla evalúa, puntúa ni clasifica a un niño (RCN-04).
4. Todo contenido nuevo trae fuente y fecha de revisión (RCN-01/02).
5. La vista previa se puede usar solo con teclado y a 320 px de ancho.

Si algo falta, se comenta en el PR (no por WhatsApp), para que quede registrado.

## Reglas de convivencia con Claude Code

- Una sesión de Claude Code por tarea y por rama. Nunca dos sesiones sobre la misma rama.
- Claude Code lee `CLAUDE.md` al iniciar. Si aparece una regla nueva, se agrega ahí
  mediante un PR.
- Preferencias personales van en `.claude/settings.local.json`, que no se sube.
- Revisen siempre el diff del PR antes de aprobar. Claude Code propone; ustedes firman.
