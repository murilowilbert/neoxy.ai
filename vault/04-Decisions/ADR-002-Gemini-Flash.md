# ADR-002: Escolha do Google Gemini 2.5 Flash como Motor de IA

## Status: APROVADO

## Contexto
O Neoxy.ai precisa de um modelo de linguagem que combine:
1. Latência ultrabaixa (< 2 segundos) para que a conversa no WhatsApp seja ágil.
2. Capacidade multimodal de visão computacional nativa para analisar fotos de peças reais enviadas por clientes.
3. Custo por milhão de tokens extremamente econômico para viabilizar o modelo de negócios SaaS em escala.

## Decisão
Adotamos o **Google Gemini 2.5 Flash** (via `@google/generative-ai`) como modelo principal de produção.

## Consequências
- Excelente capacidade de seguir diretrizes complexas de sistema (Zero-Robô e Title Case).
- Análise visual precisa de etiquetas, marcas e silhuetas de produtos sem necessidade de OCR externo.
- Custo operacional substancialmente menor que GPT-4o ou Claude Opus.
