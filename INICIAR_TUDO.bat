@echo off
title CASAIS Fleet - Iniciar Tudo
color 0E

echo.
echo  ====================================================
echo       CASAIS Fleet Intelligence - Setup Completo
echo  ====================================================
echo.
echo  Este script vai:
echo    1. Iniciar o servidor Dashboard
echo    2. Abrir o browser automaticamente
echo    3. (Opcional) Iniciar a ponte RFID
echo.
echo  ====================================================
echo.

:: Iniciar o Dashboard numa nova janela
echo  [1/3] A iniciar Dashboard...
start "CASAIS Dashboard" cmd /k "cd /d "%~dp0Frontend_App\dashboard" && npm run dev -- --host"

:: Esperar o servidor arrancar
echo  [2/3] A aguardar servidor (5 segundos)...
timeout /t 5 /nobreak > nul

:: Abrir o browser
echo  [3/3] A abrir browser...
start http://localhost:5173

echo.
echo  ====================================================
echo  Dashboard iniciado!
echo  ====================================================
echo.
echo  URL Local:    http://localhost:5173
echo.
echo  Queres iniciar tambem a ponte RFID? (S/N)
echo.

set /p rfid="  Resposta: "

if /i "%rfid%"=="S" (
    echo.
    echo  A iniciar ponte RFID...
    start "CASAIS RFID Bridge" cmd /k "cd /d "%~dp0Hardware_Bridge_PC" && python serial_to_cloud_bridge.py"
    echo  Ponte RFID iniciada numa nova janela.
)

echo.
echo  ====================================================
echo  Tudo pronto! Bom trabalho!
echo  ====================================================
echo.
echo  Para parar: fecha as janelas do terminal
echo.
pause
