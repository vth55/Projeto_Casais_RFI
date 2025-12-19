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
echo    2. Aguardar o servidor ficar pronto
echo    3. Abrir o browser automaticamente
echo.
echo  ====================================================
echo.

:: Verificar se node_modules existe
if not exist "%~dp0Frontend_App\dashboard\node_modules" (
    echo  [!] node_modules nao encontrado. A instalar dependencias...
    cd /d "%~dp0Frontend_App\dashboard"
    npm install
    cd /d "%~dp0"
)

:: Iniciar o Dashboard numa nova janela
echo  [1/3] A iniciar Dashboard...
start "CASAIS Dashboard" cmd /k "cd /d "%~dp0Frontend_App\dashboard" && npm run dev -- --host"

:: Esperar o servidor arrancar (15 segundos para garantir)
echo  [2/3] A aguardar servidor (15 segundos)...
echo.
echo         O servidor Vite pode demorar a iniciar...
timeout /t 15 /nobreak > nul

:: Tentar conectar ao servidor antes de abrir o browser
echo  [3/3] A verificar conexao e abrir browser...
curl -s http://localhost:5173 > nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Servidor ainda nao pronto. A aguardar mais 10 segundos...
    timeout /t 10 /nobreak > nul
)

:: Abrir o browser
start http://localhost:5173

echo.
echo  ====================================================
echo  Dashboard iniciado!
echo  ====================================================
echo.
echo  URL Local:    http://localhost:5173
echo.
echo  Se o browser mostrar erro de conexao:
echo    - Espera mais alguns segundos
echo    - Atualiza a pagina (F5)
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
