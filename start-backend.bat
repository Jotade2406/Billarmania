@echo off
title Billarmania Backend
cd /d "%~dp0apps\backend"
echo Iniciando backend en puerto 3000...
npx dotenv-cli -e ..\..\\.env -- node dist/main
pause
