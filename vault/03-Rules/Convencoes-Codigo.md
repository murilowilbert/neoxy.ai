# 💻 Convenções de Código e Engenharia — Neoxy.ai

Para garantir que o código permaneça limpo, manutenível e seguro à medida que o time ou as IAs alteram arquivos:

## 1. Organização e Camadas
- **Nenhum acoplamento de loja no código**: Nomes de estabelecimentos, produtos ou regras nunca devem ser codificados diretamente nos arquivos `.js`. Tudo deve ser resolvido via `tenant.parsedSettings`.
- **Separação de Módulos**:
  - `modules/ai`: Apenas chamadas e formatações de prompts.
  - `modules/stock`: Apenas busca e normalização de estoque.
  - `modules/chat`: Apenas persistência e estado da sessão.
  - `modules/queue`: Apenas debouncing e coordenação de fluxo.
  - `modules/whatsapp`: Apenas comunicação com a Evolution API.

## 2. Tratamento de Erros e Logging
- Usar sempre o logger estruturado `pino`:
  ```javascript
  const { logger } = require('../../config');
  logger.info({ tenantId: tenant.id, customerPhone }, 'Mensagem processada');
  logger.error({ err: err.message, stack: err.stack }, 'Falha na operação');
  ```
- **Nunca derrubar o processo Node**: Erros de APIs externas (Gemini, Google Sheets, WhatsApp) devem ser capturados e registrados com retentativas ou fallbacks graciosos.

## 3. Segurança e Segredos
- Chaves de API (`GEMINI_API_KEY`, `DATABASE_URL`, `EVOLUTION_API_KEY`) residem exclusivamente no `.env`.
- O arquivo `.env` nunca deve ser versionado no Git.
