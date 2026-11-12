# 🧭 Neoxy.ai — Mapa de Contexto e Biblioteca Central (MOC)

Bem-vindo ao cofre de contexto do **Neoxy.ai**. Este repositório de conhecimento funciona como a **memória de longo prazo** da plataforma e deve ser consultado por qualquer IA ou desenvolvedor antes de iniciar alterações de código, prompts ou regras de negócio.

---

## 📌 Visão do Produto
O **Neoxy.ai** é uma plataforma SaaS Multi-Tenant projetada para permitir que estabelecimentos comerciais (ferragens, pet shops, farmácias, materiais de construção, etc.) atendam seus clientes no WhatsApp através de Inteligência Artificial humanizada ("Zero-Robô"), validação de estoque em tempo real e visão computacional para identificação de fotos de peças e produtos.

---

## 🗺️ Mapa de Conteúdo (Links Rápidos)

### 1. Projeto e Visão de Negócio
- [[Vision]]: O que é o Neoxy.ai, objetivos de escala e diferenciais competitivos.
- [[Roadmap]]: Fases de entrega, funcionalidades concluídas e próximos passos.
- [[Tech-Stack]]: Tecnologias aprovadas (Node 24, Gemini 2.5 Flash, Evolution API, Redis, Prisma).

### 2. Arquitetura Técnica
- [[Pipeline-Mensageria]]: Fluxo completo desde a mensagem no WhatsApp até a IA e retorno em bolhas.
- [[Multi-Tenancy]]: Como os dados, catálogos e regras são estritamente isolados por estabelecimento.
- [[Estoque-Hibrido]]: Adaptadores para Google Sheets, planilhas offline e banco relacional via Fuse.js.
- [[Custos-AWS]]: Estratégia de hospedagem com custo mínimo/gratuito na nuvem.
- [[Design-System-UIUX]]: Padrões visuais, acessibilidade e componentes com a inteligência UI/UX Pro Max.
- [[Obsidian-Context-Engine]]: Integração com a Obsidian CLI e fluxo de memória persistente para IAs.


### 3. Diretrizes e Regras de Ouro (Invioláveis)
- [[Regras-De-Ouro-Bot]]: Regras críticas de humanização, vocabulário proibido, Title Case e Handoff.
- [[Convencoes-Codigo]]: Padrões de engenharia de software, tratamento de erros e segurança.

### 4. Registros de Decisões de Arquitetura (ADRs)
- [[ADR-001-Evolution-API]]: Por que desacoplamos o WhatsApp via Evolution API v2.
- [[ADR-002-Gemini-Flash]]: Por que usamos Gemini 2.5 Flash em vez de modelos caros.
- [[ADR-003-Redis-Debounce]]: Por que utilizamos fila com janela de debounce de 4.5 segundos.

### 5. Estabelecimentos Cadastrados (Tenants)
- [[Ferragens-Demo]]: Loja piloto de ferragens espelhada na Ferragem Marlene (8.004 produtos).
- [[PetShop-Demo]]: Segundo estabelecimento de teste para validação de nicho pet.

---

## 🤖 Instrução para IAs e Agentes
> "Ao ler este cofre, adote estritamente as convenções de código descritas em [[Convencoes-Codigo]] e as diretrizes de atendimento de [[Regras-De-Ouro-Bot]]. Nunca sugira reverter decisões já aprovadas nos documentos de [[ADR-001-Evolution-API]]."
