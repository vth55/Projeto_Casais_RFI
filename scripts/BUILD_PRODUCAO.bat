@echo off
title CASAIS Fleet - Build Producao
color 0B

echo.
echo  ====================================================
echo       CASAIS Fleet Intelligence - BUILD PRODUCAO
echo  ====================================================
echo.
echo  Este script cria a versao final para deploy.
echo  O DevTools NAO sera incluido na build.
echo.
echo  ====================================================
echo.

cd /d "%~dp0Frontend_App\dashboard"

echo  [1/3] A limpar builds anteriores...
if exist "dist" rmdir /s /q dist

echo  [2/3] A criar build de producao...
echo.
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Build falhou! Verifica os erros acima.
    pause
    exit /b 1
)

echo.
echo  [3/3] Build concluida!
echo.
echo  ====================================================
echo  SUCESSO! Ficheiros em: Frontend_App\dashboard\dist
echo  ====================================================
echo.
echo  Para testar localmente:
echo    npx serve dist
echo.
echo  Para deploy Firebase:
echo    firebase deploy --only hosting
echo.
echo  ====================================================
echo.
pause
