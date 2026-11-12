# ADR-003: Fila de Mensagens com Debounce de 4.5 Segundos

## Status: APROVADO

## Contexto
No WhatsApp, é extremamente comum o usuário enviar mensagens curtas fragmentadas:
- 10:00:00: *"Oi"*
- 10:00:02: *"Tem chuveiro?"*
- 10:00:04: *"Aquele eletrônico 220v"*

Sem debounce, a aplicação dispararia 3 requisições paralelas ao Gemini, gerando 3 respostas desconexas e gastando o triplo de tokens.

## Decisão
Implementamos um buffer com debounce de **4.5 segundos** por conversa (`tenantId:customerPhone`). Toda nova mensagem recebida dentro da janela reinicia o cronômetro. Quando a janela expira sem novas mensagens, todo o texto é consolidado em uma única solicitação para a IA.

## Consequências
- Conversação muito mais humana e coerente.
- Redução drástica no custo de tokens de entrada e saída.
- Proteção contra condições de corrida (race conditions) entre mensagens rápidas.
