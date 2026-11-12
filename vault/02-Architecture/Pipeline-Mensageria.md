# ⚡ Pipeline de Mensageria — Neoxy.ai

O pipeline foi desenhado para resolver dois problemas clássicos de bots de WhatsApp:
1. **Rajadas de Mensagens Rápidas**: Clientes mandam "Oi" -> "tudo bem?" -> "tem parafuso 8mm?".
2. **Duplicação de Respostas e Custo Excessivo**: Se cada mensagem disparar um LLM, o bot enviará 3 respostas truncadas e gastará 3x mais tokens.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (WhatsApp)
    participant Gateway as Evolution API
    participant Queue as Neoxy MessageQueue (Debounce 4.5s)
    participant Core as Neoxy Core (Tenant & Stock)
    participant Gemini as Google Gemini 2.5 Flash

    Cliente->>Gateway: "Olá"
    Gateway->>Queue: Webhook Event (Mensagem 1)
    Queue->>Queue: Inicia janela de debounce (4.5s)
    Cliente->>Gateway: "Tem chuveiro lorenzetti?"
    Gateway->>Queue: Webhook Event (Mensagem 2)
    Queue->>Queue: Reinicia janela de debounce (4.5s)
    Note over Queue: Janela encerra sem novas mensagens
    Queue->>Core: Payload Consolidado: "Olá\nTem chuveiro lorenzetti?"
    Core->>Core: Busca estoque via Fuse.js
    Core->>Gemini: Prompt Montado (Regras + Estoque + Histórico)
    Gemini-->>Core: Resposta Humanizada + Tags
    Core->>Gateway: Dispara presença "digitando..."
    Core->>Gateway: Envia bolha 1 (ex: "Bom dia! Tudo bem?")
    Core->>Gateway: Envia bolha 2 (ex: "Temos sim! O Maxi Ducha está por R$95,00...")
    Gateway-->>Cliente: Mensagens entregues no WhatsApp
```

### Componentes Chave:
- **`messageQueueService.js`**: Gerencia o timer por chave `tenantId:customerPhone`.
- **`processingLocks`**: Trava atômica que impede que uma nova mensagem seja processada enquanto o Gemini ainda está gerando a anterior.
- **Divisão em Bolhas**: Quebra as respostas da IA por parágrafos duplos (`\n\n`) e envia com intervalo de ~600ms, simulando a digitação de uma pessoa real.
