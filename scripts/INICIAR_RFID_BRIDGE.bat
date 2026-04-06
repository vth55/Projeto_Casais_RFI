@echo off
title CASAIS Fleet - RFID Bridge
color 0B

echo.
echo  ====================================================
echo       CASAIS Fleet Intelligence - RFID Bridge
echo  ====================================================
echo.
echo  Este script conecta o Arduino RFID ao servidor Cloud
echo.

cd /d "%~dp0Hardware_Bridge_PC"

echo  Pasta: %CD%
echo.
echo  IMPORTANTE:
echo  - Verifica que o Arduino esta ligado
echo  - Verifica a porta COM no script (default: COM4)
echo.
echo  Pressiona qualquer tecla para iniciar...
pause > nul
echo.
echo  ====================================================
echo  A iniciar ponte RFID...
echo  ====================================================
echo.

python serial_to_cloud_bridge.py

echo.
echo  Ponte terminada.
pause
