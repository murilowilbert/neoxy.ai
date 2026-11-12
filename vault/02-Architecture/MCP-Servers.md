# 🔌 Servidores MCP (Model Context Protocol) — Neoxy.ai

O Neoxy.ai suporta nativamente servidores **MCP (Model Context Protocol)** para permitir que agentes de IA (Cursor, Claude Desktop, Roo Code, Antigravity) interajam diretamente com o ecossistema local do projeto.

---

## 🛠️ Servidores Ativos e Utilidade

| Servidor MCP | Função no Neoxy.ai | Pacote Oficial |
| :--- | :--- | :--- |
| **`filesystem-obsidian`** | Permite à IA ler e atualizar o cofre do Obsidian, regras invioláveis e ADRs em tempo real. | `@modelcontextprotocol/server-filesystem` |
| **`sqlite-neoxy`** | Permite à IA consultar tabelas do Prisma (`Tenant`, `CatalogItem`, `MissedDemand`, `ChatMessage`). | `mcp-server-sqlite` |
| **`docker`** | Permite à IA gerenciar a **Evolution API** e o **Redis**, ler logs e inspecionar saúde dos contêineres. | `@modelcontextprotocol/server-docker` |

---

## 📁 Arquivos de Configuração no Repositório

1. **`.cursor/mcp.json`**:
   - Usado automaticamente pelo **Cursor IDE**.
   - Usa a variável dinâmica `${workspaceFolder}`, funcionando em qualquer máquina ou sistema operacional.
2. **`mcp.config.json`**:
   - Arquivo padronizado de MCP na raiz do repositório para editores e agentes modernos.
3. **`configurar_mcp.bat`**:
   - Script para Windows que configura com 1 clique o `claude_desktop_config.json` para quem utiliza o **Claude Desktop**.

---

## 🚀 Como Testar e Usar

1. No **Cursor**: Basta abrir a pasta `neoxy.ai`. O Cursor detecta automaticamente os servidores MCP em `.cursor/mcp.json` (visível em `Settings -> Features -> MCP`).
2. No **Claude Desktop**: Dê um duplo clique no script `configurar_mcp.bat` dentro da pasta do projeto e reinicie o Claude Desktop.
