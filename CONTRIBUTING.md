# Cómo trabajamos

## Reparto

| Integrante | Área principal | Carpeta | Revisa los PR de |
|---|---|---|---|
| Lucas | Backend: dominio, API, datos, despliegue de la API | `api/` | Compañero/a |
| Compañero/a | Frontend: pantallas, minijuegos, accesibilidad, despliegue web | `web/` | Lucas |

Cada uno es dueño de su carpeta, pero ninguno fusiona su propio código: **todo cambio
entra por Pull Request aprobado por el otro**. Esa revisión cruzada es además evidencia
para la tesis.

## El ciclo de una tarea

```
1. Tomar un issue del tablero y asignárselo
2. git checkout main  →  git pull
3. git checkout -b feat/<modulo>-<descripcion>
4. Programar (con Claude Code) + pruebas
5. npm test  →  en verde
6. git add .  →  git commit -m "feat(modulo): CT-xx descripcion"
7. git push -u origin feat/<modulo>-<descripcion>
8. Abrir el Pull Request en GitHub, enlazar el issue ("Cierra #N")
9. El otro revisa → aprueba → "Squash and merge"
10. Borrar la rama
```

## Nombres de rama

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feat/` | funcionalidad nueva | `feat/cuidador-cuestionario` |
| `fix/` | corrección | `fix/tr-neto-pausas` |
| `test/` | solo pruebas | `test/motor-cobertura` |
| `docs/` | solo documentación | `docs/adr-despliegue` |
| `chore/` | configuración, dependencias | `chore/ci-node-20` |

## Mensajes de commit

Formato Conventional Commits, en español, con el código del criterio cuando aplique:

```
feat(consentimiento): CT-12 supresión de eventos tras revocación
fix(indicadores): RF-20 descontar pausas en CC-09
test(motor): RF-28 verificar ausencia de banda de riesgo
docs(backlog): actualizar estado del sprint 2
```

Un commit = un cambio con sentido. Si el mensaje necesita la palabra "y", probablemente
son dos commits.

## Revisión de un Pull Request

Quien revisa comprueba, como mínimo:

1. El CI está en verde.
2. La lista de verificación de la plantilla está completa.
3. No hay salidas diagnósticas, datos identificables ni cálculos en el cliente.
4. El código nuevo del dominio trae su prueba.

Si algo falta, se comenta en el PR (no por WhatsApp), para que quede registrado.

## Reglas de convivencia con Claude Code

- Cada uno trabaja con Claude Code **en su propia rama**. Nunca dos sesiones sobre la
  misma rama a la vez.
- Claude Code lee `CLAUDE.md` al iniciar. Si descubren una regla nueva que Claude debería
  saber, se agrega ahí mediante un PR, no en local.
- Preferencias personales (modelo, atajos) van en `.claude/settings.local.json`, que no
  se sube.
- Revisen siempre el diff antes de hacer commit. Claude Code propone; ustedes firman.
