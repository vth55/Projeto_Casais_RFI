@echo off
echo ========================================
echo CASAIS Fleet - Deploy Cloud Functions
echo ========================================
echo.
cd /d "%~dp0"
echo Verificando login do Firebase...
firebase login --reauth
echo.
echo Fazendo deploy das Cloud Functions...
firebase deploy --only functions
echo.
echo ========================================
echo Deploy concluido!
echo ========================================
pause
