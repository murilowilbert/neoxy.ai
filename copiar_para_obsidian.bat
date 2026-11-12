@echo off
chcp 65001 > nul
echo ===================================================
echo 🚀 Sincronizando Cofre do Obsidian (Neoxy.ai)...
echo ===================================================

:: 1. Executa git pull para baixar as ultimas atualizações da nuvem
echo [1/3] Baixando novidades do GitHub...
git pull origin main

:: 2. Sincroniza para a pasta exata do cofre (C:\Users\...\Desktop\neoxy.ai\neoxy.ai)
set "DESTINO1=%USERPROFILE%\Desktop\neoxy.ai\neoxy.ai"
if exist "%DESTINO1%" (
    echo [2/3] Copiando arquivos para o cofre: %DESTINO1%
    xcopy /E /I /Y vault "%DESTINO1%" > nul
)

:: 3. Sincroniza também para C:\Users\...\Desktop\neoxy.ai (caso o cofre seja a pasta pai)
set "DESTINO2=%USERPROFILE%\Desktop\neoxy.ai"
if exist "%DESTINO2%" (
    echo [3/3] Garantindo sincronização em: %DESTINO2%
    xcopy /E /I /Y vault "%DESTINO2%" > nul
)

echo.
echo ===================================================
echo ✅ Sincronização concluída com sucesso!
echo Todas as notas e decisões já estão disponíveis no seu Obsidian.
echo ===================================================
pause
