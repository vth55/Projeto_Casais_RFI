@echo off
title CASAIS Fleet - Dashboard
color 0A

echo.
echo  ====================================================
echo       CASAIS Fleet Intelligence - Dashboard
echo  ====================================================
echo.
echo  A iniciar servidor de desenvolvimento...
echo.

cd /d "%~dp0Frontend_App\dashboard"

echo  Pasta: %CD%
echo.
echo  Servidor: http://localhost:5173
echo  Rede:     http://[IP-LOCAL]:5173
echo.
echo  Pressiona Ctrl+C para parar o servidor
echo  ====================================================
echo.

npm run dev -- --host

pause
