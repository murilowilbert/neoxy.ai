# Diretrizes de Design System & UI/UX Humanizado — Neoxy.ai

Todas as interfaces da plataforma **Neoxy.ai** (Landing Page, Autenticação e Painel Multi-Tenant Adaptativo) seguem uma direção de arte de **Software Operacional / ERP Industrial Brasileiro** (inspirada em Omie, Conta Azul, Linear e Bling), auditada contra padrões genéricos de IA (*Anti-AI-Slop*).

---

## 1. Skills de UI/UX e Anti-AI-Slop Instaladas

1. **`avoid-ai-design`** (`funboy322/avoid-ai-design`): Auditoria de código e visual (com scanner `scripts/detect.mjs`) que bloqueia clichês de primeira ordem (gradientes em texto, badges com sparkles, 3 cards simétricos, sombras neon) e de segunda ordem (creme + terracota, mono uppercase em tudo, numeração `01/02/03` gigante).
2. **`hallmark`** (`nutlope/hallmark`): Regras de composição web autoral (Workbench Hero assimétrico 6/6 com produto vivo no primeiro ecrã, superfície de comando contínua, zero ícones em círculos coloridos).
3. **`design-taste-frontend`** (`leonxlnx/taste-skill`): Escala tipográfica disciplinada, copy direto com voz própria, densidade de dados real e microinterações contidas.
4. **`frontend-design`** (`anthropics/skills`): Direção estética intencional e escolhas tipográficas/cromáticas não padronizadas.
5. **`superdesign`** (`superdesigndev/superdesign-skill`): Arquitetura de fluxos multi-página e consistência de sistema de design.
6. **`ui-ux-pro-max`**: Diretrizes de usabilidade, contraste WCAG AA e ergonomia operacional.

---

## 2. Sistema Cromático e Tipográfico (Industrial / Mineral ERP)

- **Tipografia**:
  - Fonte primária e de display: **`IBM Plex Sans`** (pesos 400, 500, 600, 700), escolhida pela sua legibilidade técnica em tabelas financeiras, códigos SKU e conversas operacionais.
  - Números tabulares: Classe utilitária `.tabular-data` (`font-variant-numeric: tabular-nums`) aplicada a todos os preços, horários, protocolos, CNPJs e contadores de estoque.
- **Paleta de Cores (Modo Claro Mineral)**:
  - **Canvas Principal**: `#F6F8FA` (cinza mineral claro de baixa fadiga visual para uso prolongado no balcão/escritório).
  - **Superfície de Trabalho**: `#FFFFFF` (tabelas, formulários, gavetas operacionais).
  - **Superfície Secundária / Cabeçalhos de Tabela**: `#EDF1F5`.
  - **Tinta Primária**: `#111827` (grafite profundo).
  - **Tinta Secundária / Metadados**: `#4B5563` / `#6B7280`.
  - **Ação Primária (Brand ERP)**: `#0F4C81` (azul marinho industrial; hover `#0B3861`).
  - **Status Operacional / WhatsApp Conectado**: `#166534` (verde floresta técnico sobre fundo `#ECFDF3`).
  - **Bordas Estruturais**: `1px solid #DCE2EA` (divisórias secas `divide-x` e `divide-y` em vez de múltiplos cartões flutuantes com sombra).

---

## 3. Agente Auditor (`ui_human_critic`)

O projeto conta com o subagente especializado **`ui_human_critic`**, que executa duas etapas obrigatórias antes de qualquer entrega visual:
1. Execução do scanner estático `avoid-ai-design/scripts/detect.mjs` sobre `web/src` (exigindo **0 findings** em P0, P1 e P2).
2. Inspeção humana e estrutural das páginas (`LandingPage.tsx`, `AuthPage.tsx`, `DashboardPage.tsx`), validando ausência de emojis decorativos, ausência de gradientes de texto, presença de dados brasileiros verossímeis e hierarquia de software B2B real.
