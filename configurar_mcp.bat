@echo off
chcp 65001 > nul
title Neoxy.ai - Configurador de MCP Servers
echo ===================================================
echo 🔌 Neoxy.ai — Configuração de MCP Servers
echo ===================================================
echo.

set "PROJ_DIR=%~dp0"
:: Remove trailing backslash if exists
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"

echo [1/3] Detectado diretorio do projeto:
echo       %PROJ_DIR%
echo.

:: 1. Cursor já lê direto de .cursor/mcp.json
echo [2/3] Cursor IDE:
echo       Ja configurado em: .cursor\mcp.json (com ${workspaceFolder})!
echo       Basta abrir o projeto no Cursor e o MCP sera reconhecido.
echo.

:: 2. Claude Desktop (AppData\Roaming\Claude)
echo [3/3] Configurando para Claude Desktop...
set "CLAUDE_DIR=%APPDATA%\Claude"
set "CLAUDE_CONFIG=%CLAUDE_DIR%\claude_desktop_config.json"

if not exist "%CLAUDE_DIR%" (
    echo       Criando pasta do Claude Desktop: %CLAUDE_DIR%
    mkdir "%CLAUDE_DIR%" 2>nul
)

:: Cria/Atualiza claude_desktop_config.json com barras duplas
set "PROJ_ESCAPED=%PROJ_DIR:\=\\%"

echo {> "%CLAUDE_CONFIG%"
echo   "mcpServers": {>> "%CLAUDE_CONFIG%"
echo     "filesystem-obsidian": {>> "%CLAUDE_CONFIG%"
echo       "command": "npx",>> "%CLAUDE_CONFIG%"
echo       "args": [>> "%CLAUDE_CONFIG%"
echo         "-y",>> "%CLAUDE_CONFIG%"
echo         "@modelcontextprotocol/server-filesystem",>> "%CLAUDE_CONFIG%"
echo         "%PROJ_ESCAPED%">> "%CLAUDE_CONFIG%"
echo       ]>> "%CLAUDE_CONFIG%"
echo     },>> "%CLAUDE_CONFIG%"
echo     "sqlite-neoxy": {>> "%CLAUDE_CONFIG%"
echo       "command": "npx",>> "%CLAUDE_CONFIG%"
echo       "args": [>> "%CLAUDE_CONFIG%"
echo         "-y",>> "%CLAUDE_CONFIG%"
echo         "mcp-server-sqlite",>> "%CLAUDE_CONFIG%"
echo         "--db-path",>> "%CLAUDE_CONFIG%"
echo         "%PROJ_ESCAPED%\\prisma\\neoxy.db">> "%CLAUDE_CONFIG%"
echo       ]>> "%CLAUDE_CONFIG%"
echo     },>> "%CLAUDE_CONFIG%"
echo     "docker": {>> "%CLAUDE_CONFIG%"
echo       "command": "npx",>> "%CLAUDE_CONFIG%"
echo       "args": [>> "%CLAUDE_CONFIG%"
echo         "-y",>> "%CLAUDE_CONFIG%"
echo         "@modelcontextprotocol/server-docker">> "%CLAUDE_CONFIG%"
echo       ]>> "%CLAUDE_CONFIG%"
echo     }>> "%CLAUDE_CONFIG%"
echo   }>> "%CLAUDE_CONFIG%"
echo }>> "%CLAUDE_CONFIG%"

echo       Arquivo atualizado com sucesso em:
echo       %CLAUDE_CONFIG%
echo.
echo ===================================================
echo ✅ Todos os MCP Servers configurados com sucesso!
echo - Filesystem (Obsidian & Projeto)
echo - SQLite (Banco Prisma Neoxy)
echo - Docker (Evolution API & Redis)
echo ===================================================
pause
