# 🗺️ Roadmap de Desenvolvimento — Neoxy.ai

## ✅ Fase 1: Arquitetura Core & Multi-Tenant (Concluída)
- [x] Criação do repositório limpo e desacoplado (`neoxy.ai`).
- [x] Modelagem do banco de dados multi-tenant com Prisma (`Tenant`, `ChatSession`, `ChatMessage`, etc.).
- [x] Fábrica de prompts dinâmicos (`promptFactory.js`) com injeção de horários de funcionamento e regras por loja.
- [x] Adaptadores de estoque (`GoogleSheetsStockAdapter` e `DatabaseStockAdapter`) com limpeza de *stop-words* e busca difusa Fuse.js.
- [x] Fila de mensagens com debounce de 4.5 segundos e trava de concorrência por conversa.
- [x] Integração com Google Gemini 2.5 Flash via `@google/generative-ai`.
- [x] Conector REST e Webhooks para Evolution API.
- [x] Criação de lojas pilotos de validação (`ferragens-demo` e `petshop-demo`).

## 🔄 Fase 2: Conexão Real de WhatsApp & Painel Administrativo (Atual)
- [ ] Subida da Evolution API em container Docker.
- [ ] Interface visual para o lojista gerar QR Code de conexão do WhatsApp.
- [ ] Dashboard analítico de conversas, transferências para humano (handoff) e demandas reprimidas.

## 🚀 Fase 3: Escala & Expansão de Canais (Futuro)
- [ ] Conectores diretos para ERPs (Bling, Tiny, Omie) além de planilhas.
- [ ] Suporte a WhatsApp Cloud API Oficial (Meta) para contas verificadas de alto volume.
- [ ] Deploy automatizado em infraestrutura AWS ARM Graviton de baixo custo.
