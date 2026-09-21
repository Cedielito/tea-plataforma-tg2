# Guía de instalación del equipo

Pasos para que cada integrante deje su equipo listo. Hacerlo en el **portátil propio**:
los computadores de la universidad bloquean scripts y pueden borrar lo instalado.

## 1. Instalar herramientas (una sola vez)

| Herramienta | Dónde | Comprobar en CMD |
|---|---|---|
| Node.js LTS (20 o superior) | nodejs.org | `node -v` |
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
git clone https://github.com/<usuario>/tea-plataforma.git
cd tea-plataforma
npm install
npm test
```

Debe terminar con `Tests: 81 passed`.

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

> Lee CLAUDE.md y el issue #N. Propón un plan antes de escribir código.

Revisar el plan, pedir ajustes, y solo entonces dejar que implemente. Al terminar:

> Corre npm test y muéstrame el diff.

Si todo está bien, commit, push y Pull Request según `CONTRIBUTING.md`.
