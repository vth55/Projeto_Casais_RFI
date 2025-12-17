@echo off
echo ========================================
echo   CASAIS Fleet - Deploy Cloud Functions
echo ========================================
echo.

cd /d "%~dp0Backend_Cloud"

echo A verificar autenticacao Firebase...
call firebase login --interactive

echo.
echo A fazer deploy das Cloud Functions...
call firebase deploy --only functions

echo.
echo ========================================
echo   Deploy concluido!
echo ========================================
pause
