@echo off
chcp 65001 > nul
title Neoxy.ai - Obsidian Auto-Sync (Segundo Plano)
echo ===================================================
echo 🔄 Neoxy.ai — Sincronizador Automático em Segundo Plano
echo ===================================================
echo Este processo sincroniza seu cofre do Obsidian automaticamente.
echo Toda vez que uma alteração for feita pela IA, ela aparecerá
echo no seu Obsidian em segundos, sem você precisar fazer nada!
echo.
echo 💡 Pode minimizar esta janela. Para parar, basta fechá-la.
echo ===================================================
echo.

:loop
git pull origin main --quiet > nul 2>&1
set "DESTINO1=%USERPROFILE%\Desktop\neoxy.ai\neoxy.ai"
if exist "%DESTINO1%" (
    xcopy /E /I /Y vault "%DESTINO1%" > nul 2>&1
)
timeout /t 20 /nobreak > nul
goto loop
