# 🪨 Obsidian Context Engine & CLI Workflow — Neoxy.ai

O cofre do Obsidian atua como o **cérebro externo persistente** do Neoxy.ai, implementando o padrão de *Agent Skills* e *LLM Wiki*.

---

## 1. Como a IA Interage com o Cofre

```
[ Desenvolvedor / Usuário ]
        │
        ├────────────────────────────┐
        ▼                            ▼
[ Obsidian Desktop App ]    [ Terminal / Scripts ]
 (Visualização, Edição,      (Git, Obsidian CLI,
   Graph View Ctrl+G)          Agentes de IA)
        │                            │
        └──────────────┬─────────────┘
                       ▼
         [ Pasta vault/ do Neoxy.ai ]
         ├── _START_HERE.md (MOC)
         ├── 01-Project / 02-Architecture
         ├── 03-Rules / 04-Decisions (ADRs)
         └── 05-Tenants
```

1. **Leitura Direta sem Conversores**: Por ser Markdown puro, qualquer agente (Antigravity, Cursor, Claude Code, Gemini) lê os arquivos instantaneamente com zero overhead de APIs proprietárias.
2. **Navegação em Grafo**: Os links bidirecionais (`[[WikiLinks]]`) formam uma árvore de dependências clara que a IA percorre para entender decisões técnicas sem precisar ler o cofre inteiro.

---

## 2. Comandos Úteis via Obsidian CLI

Com a CLI oficial do Obsidian habilitada no seu computador, você ou scripts automatizados podem manipular o cofre direto pelo terminal:

| Comando | Descrição |
| :--- | :--- |
| `obsidian read file="Vision"` | Lê o conteúdo da nota de visão diretamente no terminal. |
| `obsidian search query="handoff"` | Busca todas as notas que citam a regra de handoff. |
| `obsidian append file="Roadmap" content="- [ ] Nova feature"` | Adiciona uma nova tarefa ao Roadmap sem abrir o app. |
| `obsidian create name="ADR-004-Novo" content="# Novo ADR"` | Cria um novo registro de decisão via script. |

---

## 3. Boas Práticas do Ecossistema (Skill `obsidian-best-practices`)

- **Respeito aos Componentes do Obsidian**:
  - Uso de sintaxe padrão de wikilinks (`[[Nome-Da-Nota]]`).
  - Notas autocontidas com escopo bem definido (1 a 2 páginas).
  - Títulos descritivos que funcionam como identificadores semânticos no Graph View.
- **Evitar Poluição**: Manter logs de execução e arquivos temporários fora do cofre de contexto.
