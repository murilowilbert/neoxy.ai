# 🏢 Arquitetura Multi-Tenant — Neoxy.ai

O Neoxy.ai foi projetado desde o primeiro dia para suportar múltiplos estabelecimentos comerciais com **isolamento absoluto de dados e comportamento elástico**.

## 1. Modelo de Dados (`prisma/schema.prisma`)
Cada loja é uma entidade `Tenant` no banco de dados. Todas as entidades filhas contêm obrigatoriamente `tenantId`:
- `TenantWhatsAppSession`: Instância de conexão e número de WhatsApp da loja.
- `ChatSession`: Estado da conversa com determinado cliente (`state: IDLE | AWAITING_TRIAGE_ANSWER | HUMAN_HANDOFF`).
- `ChatMessage`: Mensagens trocadas no histórico, isoladas por `tenantId`.
- `CatalogItem`: Estoque específico da loja (se armazenado no banco).
- `MissedDemand`: Produtos que clientes pediram e a loja não tinha (para inteligência de reposição).

## 2. A "Plasticidade" de Regras por Loja (`settings` JSON)
Em vez de regras fixas no código, cada loja possui um campo `settings` que customiza seu ecossistema:
```json
{
  "persona": {
    "tone": "humano, vendedor experiente de balcão, prestativo",
    "forbiddenWords": ["sistema", "robô", "planilha"],
    "allowedDiscounts": false,
    "discountHandoffMessage": "Sobre desconto à vista, vou pedir pro colega verificar!"
  },
  "businessHours": {
    "timezone": "America/Sao_Paulo",
    "schedule": {
      "1": [{"start": "08:00", "end": "18:00"}],
      "0": []
    },
    "exceptions": [
      {"date": "2026-12-25", "type": "closed", "reason": "Natal"}
    ]
  },
  "catalogSource": {
    "type": "google_sheets_csv",
    "url": "https://docs.google.com/...",
    "mapping": {
      "code": "Código",
      "name": "Produto",
      "price": "Preço de Venda"
    }
  }
}
```

## 3. Garantias de Isolamento
1. A busca difusa no estoque roda em índices do Fuse.js separados por `tenantId`.
2. As conversas e o histórico de mensagens são indexados por `(tenantId, customerPhone)`.
3. Informações de preços, marcas e promoções de um cliente **nunca vazam** para outro estabelecimento.
