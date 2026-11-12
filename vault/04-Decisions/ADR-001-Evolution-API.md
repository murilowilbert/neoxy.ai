# ADR-001: Adoção da Evolution API v2 para Mensageria WhatsApp

## Status: APROVADO

## Contexto
O projeto anterior (`whatsapp-stock-bot`) executava a biblioteca `@whiskeysockets/baileys` diretamente na mesma thread do Node.js. Toda vez que a aplicação precisava reiniciar ou atualizar código, a conexão do WhatsApp caía. Além disso, gerenciar múltiplos estabelecimentos no mesmo processo causava concorrência de portas e risco de corrupção de sessões criptográficas.

## Decisão
Desacoplamos a camada de WhatsApp utilizando a **Evolution API v2** rodando em container Docker dedicado. O Neoxy.ai atua puramente como consumidor de webhooks e cliente REST.

## Consequências
- A inteligência do bot e as regras podem ser atualizadas a qualquer momento sem desconectar o WhatsApp.
- Cada loja ganha uma instância independente na Evolution API com seu próprio QR Code.
- Facilidade de escalar e monitorar conexões sem mexer no código central.
