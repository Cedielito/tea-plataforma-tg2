# Guía de instalación del equipo

Hay dos formas de trabajar:

- **Claude Code web** (recomendada, la que usamos en la Fase I): se entra a
  [claude.ai/code](https://claude.ai/code), se elige el repositorio
  `Cedielito/tea-plataforma-tg2` y Claude trabaja en la nube. No hay que instalar nada.
  Ver la sección 7.
- **En el computador propio** (secciones 1 a 6): útil para ver el sitio en local o
  trabajar sin conexión. Hacerlo en el **portátil propio**: los computadores de la
  universidad bloquean scripts y pueden borrar lo instalado.

## 1. Instalar herramientas (una sola vez)

| Herramienta | Dónde | Comprobar en CMD |
|---|---|---|
| Node.js LTS (22.9 o superior) | nodejs.org | `node -v` |
| Git para Windows | git-scm.com | `git --version` |
| VS Code | code.visualstudio.com | — |

Al instalar Git, dejar las opciones por defecto.

## 2. Configurar Git (una sola vez)

En CMD, con el nombre y correo de la cuenta de GitHub:

```
git config --global user.name "Nombre Apellido"
git config --global user.email "correo@ejemplo.com"
git config --global init.defaultBranch main
```

## 3. Instalar Claude Code

En **CMD** (no PowerShell):

```
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

Cerrar y volver a abrir CMD. Comprobar con `claude --version`.
La primera vez que se ejecuta `claude` abre el navegador para iniciar sesión. Requiere
plan Pro o superior: el plan gratuito de claude.ai no incluye Claude Code.

## 4. Clonar el repositorio

```
cd %USERPROFILE%\Documents
git clone https://github.com/Cedielito/tea-plataforma-tg2.git
cd tea-plataforma-tg2
npm install
npm test
```

Debe terminar sin pruebas fallidas (`Tests: N passed`). La primera vez tarda unos
minutos más porque descarga MongoDB para las pruebas.

## 5. Abrir en VS Code

```
code .
```

En VS Code, cambiar la terminal por defecto a CMD:
`Ctrl + Shift + P` → *Terminal: Select Default Profile* → *Command Prompt*.

## 6. Trabajar con Claude Code

Dentro de la terminal de VS Code, en la raíz del repositorio:

```
git checkout main
git pull
git checkout -b feat/<modulo>-<descripcion>
claude
```

Primer mensaje recomendado en cada sesión:

> Lee CLAUDE.md y docs/backlog-fase-i.md. Tarea TN. Propón un plan antes de escribir código.

Revisar el plan, pedir ajustes, y solo entonces dejar que implemente. Al terminar:

> Corre npm test y muéstrame el diff.

Si todo está bien, commit, push y Pull Request según `CONTRIBUTING.md`.

## 7. Trabajar con Claude Code web

1. Entrar a [claude.ai/code](https://claude.ai/code) y elegir el repositorio
   `Cedielito/tea-plataforma-tg2`, rama `main`.
2. Pegar el prompt de la tarea que corresponde en `docs/backlog-fase-i.md`.
3. Leer el plan que propone Claude, pedir ajustes y aprobarlo.
4. Claude programa, corre las pruebas, sube la rama de la tarea y abre el Pull Request.
5. En GitHub: revisar el CI y la vista previa; el otro integrante aprueba y hace
   *Squash and merge*. Luego se borra la rama.
6. Para la siguiente tarea, abrir una **sesión nueva** desde `main`.
