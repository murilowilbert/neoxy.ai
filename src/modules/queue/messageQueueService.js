const { logger } = require('../../config');
const stockService = require('../stock/stockService');
const aiService = require('../ai/aiService');
const chatSessionService = require('../chat/chatSessionService');
const evolutionClient = require('../whatsapp/evolutionClient');

class MessageQueueService {
  constructor() {
    this.debounceTimeMs = 4500; // 4.5 segundos
    this.buffer = new Map(); // key -> { timer, messages: [], tenant, customerPhone, instanceName }
    this.processingLocks = new Set(); // Trava de concorrência por conversa
  }

  /**
   * Enfileira uma mensagem recebida com debounce automático.
   */
  async enqueueMessage({ tenant, customerPhone, text, media, instanceName }) {
    const queueKey = `${tenant.id}:${customerPhone}`;

    // Se a conversa já estiver em processamento pela IA, acumulamos na fila de espera
    let queueItem = this.buffer.get(queueKey);

    if (!queueItem) {
      queueItem = {
        tenant,
        customerPhone,
        instanceName,
        messages: [],
        mediaItems: [],
        timer: null
      };
      this.buffer.set(queueKey, queueItem);
    }

    if (text) {
      queueItem.messages.push(text);
    }
    if (media) {
      queueItem.mediaItems.push(media);
    }

    // Cancela timer anterior e reinicia a janela de debounce
    if (queueItem.timer) {
      clearTimeout(queueItem.timer);
    }

    logger.debug({ queueKey, msgCount: queueItem.messages.length }, 'Mensagem adicionada ao buffer de debounce');

    queueItem.timer = setTimeout(() => {
      this.processQueueItem(queueKey);
    }, this.debounceTimeMs);
  }

  async processQueueItem(queueKey) {
    const item = this.buffer.get(queueKey);
    if (!item) return;

    // Se já estiver sendo processado, reagenda com pequeno delay
    if (this.processingLocks.has(queueKey)) {
      item.timer = setTimeout(() => this.processQueueItem(queueKey), 1000);
      return;
    }

    this.processingLocks.add(queueKey);
    this.buffer.delete(queueKey);

    const { tenant, customerPhone, messages, mediaItems, instanceName } = item;
    const consolidatedText = messages.join('\n').trim();

    try {
      // 1. Checa se o atendimento está em pausa/handoff humano
      const session = await chatSessionService.getOrCreateSession(tenant.id, customerPhone);
      const isPaused = await chatSessionService.isSessionPaused(session);

      if (isPaused) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Sessão em pausa por atendente humano. Mensagem arquivada sem resposta do bot.');
        // Registra a mensagem do usuário no histórico mesmo em pausa
        await chatSessionService.appendMessage({
          tenantId: tenant.id,
          customerPhone,
          role: 'user',
          content: consolidatedText
        });
        return;
      }

      // 2. Busca histórico recente
      const history = await chatSessionService.getRecentHistory(tenant.id, customerPhone, 10);

      // 3. Salva a mensagem do usuário
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'user',
        content: consolidatedText
      });

      // 4. Busca no estoque do tenant
      let stockContext = [];
      if (consolidatedText) {
        stockContext = await stockService.searchProduct(tenant, consolidatedText);
      }

      // 5. Gera resposta com o Gemini 2.5 Flash
      const aiResult = await aiService.generateResponse({
        tenant,
        customerText: consolidatedText,
        chatHistory: history,
        stockContext,
        imageParts: mediaItems
      });

      // 6. Verifica silêncio inteligente
      if (aiResult.isNoResponse) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Tag [NO_RESPONSE] detectada. Silêncio inteligente aplicado.');
        return;
      }

      // 7. Envia resposta via Evolution API (se houver texto)
      if (aiResult.text && instanceName) {
        // Envia presença digitando
        await evolutionClient.sendPresence(instanceName, customerPhone, 'composing');

        // Separa em parágrafos para simular bolhas humanas de WhatsApp
        const bubbles = aiResult.text.split('\n\n').filter(b => b.trim() !== '');

        for (const bubble of bubbles) {
          await evolutionClient.sendTextMessage(instanceName, customerPhone, bubble.trim());
          // Pequena pausa entre bolhas para naturalidade
          if (bubbles.length > 1) {
            await new Promise(r => setTimeout(r, 600));
          }
        }
      }

      // 8. Se houver Handoff, marca a pausa na sessão
      if (aiResult.isHandoff) {
        const handoffHours = tenant.parsedSettings?.features?.automaticHandoffHours || 6;
        await chatSessionService.pauseSession(tenant.id, customerPhone, handoffHours);
        logger.info({ tenantId: tenant.id, customerPhone, handoffHours }, 'Handoff acionado. Sessão pausada para atendente humano.');
      }

      // 9. Registra a resposta da IA no banco
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: aiResult.text,
        metadata: {
          isHandoff: aiResult.isHandoff,
          photoCodes: aiResult.photoCodes
        }
      });

      return aiResult;
    } catch (err) {
      logger.error({ err: err.message, stack: err.stack, tenantId: tenant.id, customerPhone }, 'Erro no pipeline de processamento de mensagens');
      throw err;
    } finally {
      this.processingLocks.delete(queueKey);
    }
  }

  /**
   * Processa uma mensagem imediatamente para fins de teste ou API síncrona.
   */
  async processQueueItemDirect({ tenant, customerPhone, text, media }) {
    const queueKey = `direct:${tenant.id}:${customerPhone}`;
    const mediaItems = media ? (Array.isArray(media) ? media : [media]) : [];

    const history = await chatSessionService.getRecentHistory(tenant.id, customerPhone, 10);

    await chatSessionService.appendMessage({
      tenantId: tenant.id,
      customerPhone,
      role: 'user',
      content: text || ''
    });

    let stockContext = [];
    if (text) {
      stockContext = await stockService.searchProduct(tenant, text);
    }

    const aiResult = await aiService.generateResponse({
      tenant,
      customerText: text,
      chatHistory: history,
      stockContext,
      imageParts: mediaItems
    });

    if (!aiResult.isNoResponse) {
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: aiResult.text,
        metadata: {
          isHandoff: aiResult.isHandoff,
          photoCodes: aiResult.photoCodes
        }
      });
    }

    if (aiResult.isHandoff) {
      const handoffHours = tenant.parsedSettings?.features?.automaticHandoffHours || 6;
      await chatSessionService.pauseSession(tenant.id, customerPhone, handoffHours);
    }

    return {
      ...aiResult,
      matchedStockCount: stockContext.length,
      sampleMatchedStock: stockContext.slice(0, 3)
    };
  }
}

module.exports = new MessageQueueService();

