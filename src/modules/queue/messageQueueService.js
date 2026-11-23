const { logger } = require('../../config');
const stockService = require('../stock/stockService');
const aiService = require('../ai/aiService');
const chatSessionService = require('../chat/chatSessionService');
const evolutionClient = require('../whatsapp/evolutionClient');
const crmExtensions = require('../business/crmExtensionsService');

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

  async trackMatchedDemands(tenantId, stockContext) {
    if (!Array.isArray(stockContext) || stockContext.length === 0) return;
    const topItem = stockContext.find((it) => it && (it['modelo/produto'] || it.name));
    if (!topItem) return;
    const itemName = topItem['modelo/produto'] || topItem.name;
    await crmExtensions
      .recordExistingDemand(tenantId, {
        itemType: 'PRODUCT',
        itemName
      })
      .catch(() => {});
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
      // 0. Registra/atualiza contato automaticamente no CRM
      await crmExtensions.touchContact(tenant.id, customerPhone).catch(() => {});

      // 0.5 Verifica se o contato está na Lista de Bloqueio da IA
      const isBlocked = await crmExtensions.isPhoneAiBlocked(tenant.id, customerPhone);
      if (isBlocked) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Contato bloqueado para IA no filtro de Contatos. Mensagem apenas registrada.');
        await chatSessionService.appendMessage({
          tenantId: tenant.id,
          customerPhone,
          role: 'user',
          content: consolidatedText || '[Mídia]'
        });
        return { text: '', isNoResponse: true, blockedByContactFilter: true };
      }

      // 1. Checa se o atendimento está em pausa/handoff humano
      const session = await chatSessionService.getOrCreateSession(tenant.id, customerPhone);
      const isPaused = await chatSessionService.isSessionPaused(session);

      if (isPaused) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Sessão em pausa por atendente humano. Mensagem arquivada sem resposta do bot.');
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

      // 3.5 Verifica Gatilhos Automáticos de Respostas Rápidas (Quick Replies)
      if (consolidatedText && mediaItems.length === 0) {
        const autoReply = await crmExtensions.matchAutoQuickReply(
          tenant,
          consolidatedText,
          session.customerName || ''
        );
        if (autoReply) {
          if (instanceName) {
            await evolutionClient.sendTextMessage(instanceName, customerPhone, autoReply.renderedText);
          }
          if (autoReply.triggerHandoff) {
            const handoffHours = tenant.parsedSettings?.features?.automaticHandoffHours || 6;
            await chatSessionService.pauseSession(tenant.id, customerPhone, handoffHours);
          }
          await chatSessionService.appendMessage({
            tenantId: tenant.id,
            customerPhone,
            role: 'model',
            content: autoReply.renderedText,
            metadata: { quickReplyShortcut: autoReply.quickReply.shortcut, isHandoff: autoReply.triggerHandoff }
          });
          return {
            text: autoReply.renderedText,
            isHandoff: autoReply.triggerHandoff,
            isNoResponse: false,
            photoCodes: []
          };
        }
      }

      // 4. Busca no estoque do tenant + promoções ativas
      let stockContext = [];
      if (consolidatedText) {
        stockContext = await stockService.searchProduct(tenant, consolidatedText);
        await this.trackMatchedDemands(tenant.id, stockContext);
      }
      const activePromotions = await crmExtensions.getActivePromotions(tenant.id).catch(() => []);

      // 5. Gera resposta com o Gemini
      const aiResult = await aiService.generateResponse({
        tenant,
        customerText: consolidatedText,
        chatHistory: history,
        stockContext,
        imageParts: mediaItems,
        activePromotions
      });

      // 5.5 Salva oportunidades/itens não cadastrados vinculados a esta conversa
      if (Array.isArray(aiResult.missedDemands) && aiResult.missedDemands.length > 0) {
        for (const term of aiResult.missedDemands) {
          await crmExtensions
            .recordMissedDemand(tenant.id, term, {
              customerPhone,
              customerName: session.customerName || customerPhone,
              messageSnippet: consolidatedText.slice(0, 220)
            })
            .catch(() => {});
        }
      }

      // 6. Verifica silêncio inteligente
      if (aiResult.isNoResponse) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Tag [NO_RESPONSE] detectada. Silêncio inteligente aplicado.');
        return;
      }

      // 7. Envia resposta via Evolution API (se houver texto)
      if (aiResult.text && instanceName) {
        await evolutionClient.sendPresence(instanceName, customerPhone, 'composing');
        const bubbles = aiResult.text.split('\n\n').filter(b => b.trim() !== '');
        for (const bubble of bubbles) {
          await evolutionClient.sendTextMessage(instanceName, customerPhone, bubble.trim());
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

  normalizeMediaPart(m) {
    if (!m) return null;
    if (m.inlineData?.data) return m;
    if (typeof m === 'string' && m.startsWith('data:')) {
      const match = m.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { inlineData: { mimeType: match[1], data: match[2] } };
      }
    }
    if (m.base64) {
      const clean = String(m.base64).includes(',')
        ? String(m.base64).split(',')[1]
        : String(m.base64);
      return {
        inlineData: {
          mimeType: m.mimeType || 'image/jpeg',
          data: clean
        }
      };
    }
    return null;
  }

  /**
   * Processa uma mensagem imediatamente para fins de teste ou API síncrona.
   */
  async processQueueItemDirect({ tenant, customerPhone, text, media }) {
    const rawList = media ? (Array.isArray(media) ? media : [media]) : [];
    const mediaItems = rawList.map((m) => this.normalizeMediaPart(m)).filter(Boolean);

    await crmExtensions.touchContact(tenant.id, customerPhone).catch(() => {});

    // Verifica filtro de bloqueio de IA por contato
    const isBlocked = await crmExtensions.isPhoneAiBlocked(tenant.id, customerPhone);
    if (isBlocked) {
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'user',
        content: text || (mediaItems.length > 0 ? '[Foto enviada pelo cliente]' : ''),
        mediaType: mediaItems.length > 0 ? 'image' : null
      });
      return {
        text: '',
        replyText: '[IA bloqueada para este contato no filtro de WhatsApp → Contatos. Nenhuma resposta automática foi enviada.]',
        isNoResponse: true,
        isHandoff: false,
        blockedByContactFilter: true,
        photoCodes: [],
        imageAnalyzed: false,
        matchedStockCount: 0,
        sampleMatchedStock: []
      };
    }

    const history = await chatSessionService.getRecentHistory(tenant.id, customerPhone, 10);

    await chatSessionService.appendMessage({
      tenantId: tenant.id,
      customerPhone,
      role: 'user',
      content: text || (mediaItems.length > 0 ? '[Foto enviada pelo cliente]' : ''),
      mediaType: mediaItems.length > 0 ? 'image' : null
    });

    // Verifica gatilhos automáticos de respostas rápidas
    if (text && mediaItems.length === 0) {
      const autoReply = await crmExtensions.matchAutoQuickReply(tenant, text, '');
      if (autoReply) {
        await chatSessionService.appendMessage({
          tenantId: tenant.id,
          customerPhone,
          role: 'model',
          content: autoReply.renderedText,
          metadata: { quickReplyShortcut: autoReply.quickReply.shortcut, isHandoff: autoReply.triggerHandoff }
        });
        if (autoReply.triggerHandoff) {
          const handoffHours = tenant.parsedSettings?.features?.automaticHandoffHours || 6;
          await chatSessionService.pauseSession(tenant.id, customerPhone, handoffHours);
        }
        return {
          text: autoReply.renderedText,
          replyText: autoReply.renderedText,
          isHandoff: autoReply.triggerHandoff,
          isNoResponse: false,
          quickReplyTriggered: autoReply.quickReply.shortcut,
          photoCodes: [],
          imageAnalyzed: false,
          matchedStockCount: 0,
          sampleMatchedStock: []
        };
      }
    }

    let stockContext = [];
    if (text) {
      stockContext = await stockService.searchProduct(tenant, text);
      await this.trackMatchedDemands(tenant.id, stockContext);
    } else if (mediaItems.length > 0) {
      stockContext = await stockService.searchProduct(tenant, 'a');
    }

    const activePromotions = await crmExtensions.getActivePromotions(tenant.id).catch(() => []);

    const aiResult = await aiService.generateResponse({
      tenant,
      customerText:
        text ||
        (mediaItems.length > 0
          ? 'Identifique o produto ou problema mostrado nesta foto e verifique como podemos ajudar.'
          : ''),
      chatHistory: history,
      stockContext,
      imageParts: mediaItems,
      activePromotions
    });

    if (Array.isArray(aiResult.missedDemands) && aiResult.missedDemands.length > 0) {
      for (const term of aiResult.missedDemands) {
        await crmExtensions
          .recordMissedDemand(tenant.id, term, {
            customerPhone,
            customerName: customerPhone,
            messageSnippet: String(text || '[Foto enviada]').slice(0, 220)
          })
          .catch(() => {});
      }
    }

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
      replyText: aiResult.text,
      imageAnalyzed: mediaItems.length > 0,
      matchedStockCount: stockContext.length,
      sampleMatchedStock: stockContext.slice(0, 3)
    };
  }
}

module.exports = new MessageQueueService();

