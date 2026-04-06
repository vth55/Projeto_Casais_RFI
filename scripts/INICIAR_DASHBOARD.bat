@echo off
title CASAIS Fleet - Dashboard
color 0A

echo.
echo  ====================================================
echo       CASAIS Fleet Intelligence - Dashboard
echo  ====================================================
echo.

:: Verificar se node_modules existe
if not exist "%~dp0Frontend_App\dashboard\node_modules" (
    echo  [!] node_modules nao encontrado.
    echo  A instalar dependencias... (pode demorar)
    echo.
    cd /d "%~dp0Frontend_App\dashboard"
    npm install
    echo.
)

cd /d "%~dp0Frontend_App\dashboard"

echo  Pasta: %CD%
echo.
echo  A iniciar servidor de desenvolvimento...
echo.
echo  ====================================================
echo  Servidor: http://localhost:5173
echo  Rede:     http://[IP-LOCAL]:5173
echo  ====================================================
echo.
echo  Aguarda ate ver "ready in XXX ms" no terminal
echo  Depois abre o browser em: http://localhost:5173
echo.
echo  Pressiona Ctrl+C para parar o servidor
echo  ====================================================
echo.

npm run dev -- --host

pause
