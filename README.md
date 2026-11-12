# Neoxy.ai 🚀

Plataforma SaaS Multi-Tenant para atendimento humanizado no WhatsApp com Inteligência Artificial (Google Gemini 2.5 Flash), visão computacional e gestão dinâmica de estoque.

Projetada para suportar múltiplos estabelecimentos e milhares de mensagens simultâneas sem travamentos, com custos de infraestrutura reduzidos ao mínimo (AWS / Docker / Supabase).

---

## 🏗️ Arquitetura do Sistema

```
[ WhatsApp Clientes ]
       │
       ▼
[ Evolution API (Gateway WhatsApp Multi-Sessão) ]
       │ (Webhooks REST)
       ▼
[ Neoxy API (Node.js) ]
       ├── [ Ingestion & Debounce Queue ] (Agrupamento inteligente ~4.5s)
       ├── [ Multi-Tenant Context Resolver ] (Resolução do estabelecimento)
       ├── [ Hybrid Stock Engine ] (Google Sheets / Banco / ERP + Fuse.js)
       ├── [ Dynamic Prompt Factory ] (Injeção de persona, regras e horários)
       └── [ Gemini 2.5 Flash ] (Geração ágil + Visão computacional)
```

### Principais Diferenciais:
1. **Multi-Tenancy Plástico**: Cada loja possui sua própria persona, horários de funcionamento, regras de descontos, políticas de entrega e fontes de estoque. Uma loja pode ser uma ferragem com planilha no Google Sheets e outra um pet shop com banco de dados próprio.
2. **Debounce e Concorrência**: Agrupa rajadas de mensagens de clientes em um único contexto antes de acionar o modelo de IA, evitando custos duplicados e respostas truncadas.
3. **Desacoplamento do WhatsApp**: Utiliza a **Evolution API** como gateway de mensageria externo, permitindo conectar centenas de números simultâneos via QR Code sem travar o processamento central.
4. **Custo Mínimo (Zero-Cost Dev & Baixo Custo Prod)**:
   - **Desenvolvimento**: Executa 100% localmente com SQLite e in-memory queue.
   - **Produção**: Docker Compose em instância econômica AWS (t4g.small / Lightsail) + Supabase/PostgreSQL.

---

## 📂 Estrutura de Pastas

```
neoxy.ai/
├── docker-compose.yml           # Stack completa (Neoxy + Redis + Evolution API)
├── Dockerfile                   # Build otimizado Alpine
├── prisma/
│   ├── schema.prisma            # Schema multi-tenant (compatível com SQLite e Postgres)
│   └── seed.js                  # Povoamento com lojas de teste (Ferragens e Pet Shop)
├── scripts/
│   └── simulate_chat.js         # Simulador CLI de conversas e catálogo
├── src/
│   ├── config/                  # Variáveis de ambiente e logging estruturado (Pino)
│   ├── database/prisma.js       # Instância do Prisma Client
│   ├── modules/
│   │   ├── ai/                  # PromptFactory e integração com Gemini 2.5 Flash
│   │   ├── chat/                # Sessões de clientes, histórico e handoff
│   │   ├── queue/               # Debounce e pipeline de processamento
│   │   ├── stock/               # Adaptadores de catálogo (Google Sheets, Banco) + Fuse.js
│   │   ├── tenants/             # Gestão de estabelecimentos e credenciais
│   │   └── whatsapp/            # Cliente e Webhooks da Evolution API
│   └── server.js                # Servidor Express com APIs e Webhooks
└── .env.example
```

---

## ⚡ Como Rodar Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar o banco de dados e semente
```bash
cp .env.example .env
npm run prisma:push
npm run prisma:seed
```

### 3. Executar o simulador de teste
```bash
npm run test:chat
```

### 4. Iniciar o servidor Neoxy
```bash
npm start
# ou em modo de desenvolvimento com hot-reload:
npm run dev
```

---

## 🐳 Execução via Docker Compose (Com WhatsApp Gateway)

Para subir o ambiente completo com Evolution API e Redis:
```bash
docker compose up -d
```
- **Neoxy API**: http://localhost:3000
- **Evolution API**: http://localhost:8080 (chave padrão: `neoxy-secret-token`)

---

## 📡 Endpoints da API

- `GET /health` - Verificação de integridade do sistema.
- `GET /api/tenants` - Lista estabelecimentos cadastrados.
- `GET /api/tenants/:slug` - Detalhes e configurações de uma loja específica.
- `POST /api/tenants` - Cadastro ou atualização de uma nova loja.
- `POST /api/tenants/:slug/test-chat` - Envia mensagem simulada para testar o bot de uma loja específica via HTTP.
- `POST /api/webhooks/whatsapp` - Endpoint que recebe os eventos da Evolution API.
