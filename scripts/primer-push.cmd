@echo off
REM Primer envio del repositorio. Se ejecuta UNA sola vez, desde la raiz, en CMD.
REM Uso: scripts\primer-push.cmd https://github.com/USUARIO/tea-plataforma.git
setlocal

if "%~1"=="" (
  echo Falta la URL del repositorio.
  echo Uso: scripts\primer-push.cmd https://github.com/USUARIO/tea-plataforma.git
  exit /b 1
)

git init -b main || exit /b 1

git add package.json package-lock.json .gitignore .editorconfig .gitattributes README.md CONTRIBUTING.md CLAUDE.md .claude .github docs scripts
git commit -m "chore: estructura del repositorio, CI y guias del equipo" || exit /b 1

git add api/package.json api/jest.config.js api/.env.example api/src/dominio/privacidad api/test/privacidad.test.js
git commit -m "feat(privacidad): incremento 1 - CT-11 CT-12 CT-14 seudonimo, consentimiento y asentimiento" || exit /b 1

git add api/src/dominio/minijuegos api/test/secuenciador.test.js
git commit -m "feat(minijuegos): incremento 2 - CT-08 CP-01 CP-04 catalogo y secuenciador" || exit /b 1

git add api/src/dominio/indicadores api/src/dominio/puntuacion api/test/indicadores.test.js api/test/reporte.test.js api/test/motor.test.js
git commit -m "feat(indicadores): incremento 3 - CC-01 a CC-12, RC-01 a RC-05 y motor sin salidas diagnosticas" || exit /b 1

git add api/src/api api/src/datos api/src/index.js api/test/api.test.js web
git commit -m "feat(api,web): incremento 4 - rutas, puerta de consentimiento, esquemas y pantallas base" || exit /b 1

git status --short
git remote add origin %1 || exit /b 1
git push -u origin main || exit /b 1

echo.
echo Listo. Revisa el repositorio en GitHub y la pestana Actions.
endlocal
