# 📦 Catálogo e Estoque Híbrido — Neoxy.ai

Cada lojista tem sua própria maturidade tecnológica: alguns usam planilhas do Google Sheets compartilhadas com a equipe da loja, outros possuem ERPs modernos ou planilhas locais. O Neoxy.ai suporta diferentes origens via padrão **Adapter**.

## 1. Adaptadores Suportados

### A. `GoogleSheetsStockAdapter`
- Baixa o CSV da planilha do Google periodicamente (cache configurável, padrão 10 minutos).
- Detecta automaticamente se a primeira linha é um título decorativo ou o cabeçalho real.
- Normaliza os nomes de colunas conforme o `mapping` configurado no Tenant.
- Cria um índice de busca difusa (Fuse.js) em memória.

### B. `DatabaseStockAdapter`
- Lê diretamente da tabela `CatalogItem` gerenciada pelo Prisma.
- Ideal para lojas que cadastram produtos via painel administrativo do Neoxy.

## 2. Limpeza Inteligente de Stop-Words
Quando o cliente digita:
> *"Vocês por acaso têm algum chuveiro elétrico lorenzetti 220v para vender hoje?"*

O `stockService.js` filtra pronomes, saudações e ruídos conversacionais (`vocês`, `tem`, `algum`, `para`, `vender`, `hoje`) e extrai as palavras-chave críticas:
> `chuveiro eletrico lorenzetti 220v`

Se a busca completa não retornar resultados, o motor faz automaticamente um fallback buscando por palavras-chave individuais para nunca deixar o cliente sem sugestões relevantes.
