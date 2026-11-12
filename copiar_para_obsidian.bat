@echo off
chcp 65001 > nul
echo ===================================================
echo 🚀 Sincronizando Cofre do Obsidian (Neoxy.ai)...
echo ===================================================

set "DESTINO=%USERPROFILE%\Desktop\neoxy.ai"

if not exist "%DESTINO%" (
    echo Criando pasta do cofre no Desktop: %DESTINO%
    mkdir "%DESTINO%"
)

echo Copiando arquivos do vault para %DESTINO%...
xcopy /E /I /Y vault "%DESTINO%"

echo.
echo ✅ Concluído com sucesso!
echo Abra o Obsidian e visualize seu cofre atualizado em %DESTINO%
echo ===================================================
pause
