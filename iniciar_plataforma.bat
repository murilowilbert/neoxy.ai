@echo off
chcp 65001 > nul
title Neoxy.ai - Servidor da Plataforma SaaS
echo ===================================================
echo 🚀 Iniciando a Plataforma Neoxy.ai no seu Windows...
echo ===================================================
echo.

echo [1/4] Baixando ultimas atualizacoes do GitHub...
git pull origin main

echo.
echo [2/4] Verificando dependencias (npm install)...
call npm install

echo.
echo [3/4] Sincronizando Banco de Dados e Contas de Teste...
if not exist ".env" (
    copy .env.example .env > nul
)
call npx prisma db push
call npm run prisma:seed

echo.
echo [4/4] Abrindo navegador e iniciando servidor na porta 3000...
start http://localhost:3000
call npm start
pause
