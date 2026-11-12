# 🛠️ Stack Tecnológica — Neoxy.ai

| Camada | Tecnologia | Motivação |
| :--- | :--- | :--- |
| **Backend Core** | Node.js (v24 LTS) + Express | Alta performance I/O assíncrona, leveza e ecossistema maduro. |
| **Banco de Dados** | PostgreSQL (Prod) / SQLite (Dev) via Prisma ORM | Isolamento relacional limpo com queries rápidas por `tenantId`. |
| **Motor de IA** | Google Gemini 2.5 Flash | Respostas abaixo de 1.5s, suporte nativo multimodal (texto + imagens de peças) e custo extremamente acessível. |
| **Mensageria WhatsApp** | Evolution API v2 (Docker) | Gateway desacoplado que gerencia centenas de instâncias Baileys externamente via QR Code e webhooks REST. |
| **Filas e Concorrência** | Redis (BullMQ) com fallback In-Memory | Debounce distribuído de 4.5 segundos e trava de concorrência por conversa de cliente. |
| **Motor de Busca Difusa** | Fuse.js | Busca difusa tolerante a erros de digitação e abreviações em catálogos de até dezenas de milhares de itens. |
| **Design & UI Intelligence**| Skill UI/UX Pro Max | Catálogo de 80 estilos, 192 paletas de cores e 120 diretrizes de UX para criação de interfaces. |
