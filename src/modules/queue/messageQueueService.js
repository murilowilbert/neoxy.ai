const { logger } = require('../../config');
const prisma = require('../../database/prisma');
const stockService = require('../stock/stockService');
const aiService = require('../ai/aiService');
const chatSessionService = require('../chat/chatSessionService');
const evolutionClient = require('../whatsapp/evolutionClient');
const antiBanService = require('../whatsapp/antiBanService');
const crmExtensions = require('../business/crmExtensionsService');

class MessageQueueService {
  constructor() {
    this.debounceTimeMs = 4500; // 4.5 segundos
    this.buffer = new Map(); // key -> { timer, messages, mediaItems, audioItems, documentItems, ... }
    this.processingLocks = new Set(); // Trava de concorrência por conversa
  }

  getBotFeatures(tenant) {
    const raw = tenant?.parsedSettings?.botFeatures || {};
    const storeInfo = tenant?.parsedSettings?.storeInfo || {};
    return {
      audioUnderstandingEnabled: raw.audioUnderstandingEnabled !== false,
      pdfReadingEnabled: raw.pdfReadingEnabled !== false,
      antiBanEnabled: raw.antiBanEnabled !== false,
      quotedRepliesEnabled: raw.quotedRepliesEnabled !== false,
      reactionsEnabled: raw.reactionsEnabled !== false,
      locationPinEnabled: raw.locationPinEnabled !== false,
      sentimentAlertEnabled: raw.sentimentAlertEnabled !== false,
      reviewMode: raw.reviewMode || (storeInfo.googleReviewUrl ? 'google_review' : 'poll_csat')
    };
  }

  /**
   * Enfileira uma mensagem recebida com debounce automático.
   */
  async enqueueMessage({
    tenant,
    customerPhone,
    pushName = null,
    text,
    media,
    audio = null,
    document = null,
    messageKey = null,
    instanceName
  }) {
    const queueKey = `${tenant.id}:${customerPhone}`;

    let queueItem = this.buffer.get(queueKey);

    if (!queueItem) {
      queueItem = {
        tenant,
        customerPhone,
        pushName,
        instanceName,
        messages: [],
        mediaItems: [],
        audioItems: [],
        documentItems: [],
        lastMessageKey: null,
        timer: null
      };
      this.buffer.set(queueKey, queueItem);
    }

    if (pushName && !queueItem.pushName) {
      queueItem.pushName = pushName;
    }
    if (text) {
      queueItem.messages.push(text);
    }
    if (media) {
      queueItem.mediaItems.push(media);
    }
    if (audio) {
      queueItem.audioItems.push(audio);
    }
    if (document) {
      queueItem.documentItems.push(document);
    }
    if (messageKey && messageKey.id) {
      queueItem.lastMessageKey = messageKey;
    }

    // Cancela timer anterior e reinicia a janela de debounce
    if (queueItem.timer) {
      clearTimeout(queueItem.timer);
    }

    logger.debug(
      {
        queueKey,
        msgCount: queueItem.messages.length,
        images: queueItem.mediaItems.length,
        audios: queueItem.audioItems.length,
        docs: queueItem.documentItems.length
      },
      'Mensagem adicionada ao buffer de debounce'
    );

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

  /**
   * Dispara convite de avaliação (Google Meu Negócio direto, Enquete CSAT ou Ambos).
   */
  async dispatchReviewRequest(tenant, customerPhone, instanceName = null, overrideMode = null) {
    const storeInfo = tenant?.parsedSettings?.storeInfo || {};
    const features = this.getBotFeatures(tenant);
    const mode = overrideMode || features.reviewMode;
    const googleUrl = String(storeInfo.googleReviewUrl || '').trim();
    const sentParts = [];

    if ((mode === 'google_review' || mode === 'both') && googleUrl) {
      const reviewText =
        `Obrigado pelo contato com *${tenant.name}*! Sua opinião faz toda a diferença para continuarmos melhorando.\n\n` +
        `Se puder deixar sua avaliação no nosso perfil do Google, leva menos de 15 segundos:\n${googleUrl}`;
      if (instanceName) {
        await evolutionClient.sendTextMessage(instanceName, customerPhone, reviewText);
      }
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: reviewText,
        metadata: { action: 'google_review_link', googleReviewUrl: googleUrl }
      });
      sentParts.push('google_review');
    }

    if (mode === 'poll_csat' || mode === 'both' || !googleUrl) {
      const pollTitle = `Como você avalia seu atendimento na ${tenant.name}?`;
      const pollValues = ['⭐⭐⭐⭐⭐ Excelente', '⭐⭐⭐⭐ Muito bom', '⭐⭐⭐ Regular', '⭐ Precisa melhorar'];
      if (instanceName) {
        await evolutionClient.sendPoll(instanceName, customerPhone, pollTitle, pollValues, 1);
      }
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: `[Enquete CSAT] ${pollTitle} (${pollValues.join(' | ')})`,
        metadata: { action: 'csat_poll', poll: { name: pollTitle, values: pollValues } }
      });
      sentParts.push('poll_csat');
    }

    return {
      mode,
      sentParts,
      googleReviewUrl: googleUrl || null
    };
  }

  /**
   * Dispara Pin de Localização nativo (ou link Google Maps caso coordenadas não estejam preenchidas).
   */
  async dispatchLocationPin(tenant, customerPhone, instanceName = null) {
    const storeInfo = tenant?.parsedSettings?.storeInfo || {};
    const lat = Number(storeInfo.latitude);
    const lng = Number(storeInfo.longitude);
    const hasCoords =
      String(storeInfo.latitude || '').trim() !== '' &&
      String(storeInfo.longitude || '').trim() !== '' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    if (hasCoords) {
      if (instanceName) {
        await evolutionClient.sendLocation(instanceName, customerPhone, {
          name: tenant.name,
          address: storeInfo.address || storeInfo.city || '',
          latitude: lat,
          longitude: lng
        });
      }
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: `[Pin de Localização] ${tenant.name}${storeInfo.address ? ` — ${storeInfo.address}` : ''} (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        metadata: { action: 'location_pin', latitude: lat, longitude: lng }
      });
      return { type: 'native_pin', latitude: lat, longitude: lng };
    }

    const fallbackText = storeInfo.mapsUrl
      ? `Nossa localização no mapa: ${storeInfo.mapsUrl}${storeInfo.address ? `\nEndereço: ${storeInfo.address}` : ''}`
      : storeInfo.address
      ? `Nosso endereço: ${storeInfo.address}${storeInfo.city ? ` (${storeInfo.city})` : ''}`
      : null;

    if (fallbackText) {
      if (instanceName) {
        await evolutionClient.sendTextMessage(instanceName, customerPhone, fallbackText);
      }
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: fallbackText,
        metadata: { action: 'location_text' }
      });
      return { type: 'maps_link', text: fallbackText };
    }

    return { type: 'none' };
  }

  /**
   * Executa os efeitos colaterais das tags ocultas da IA (PDF extract, reação, pin, vCard, poll, review, sentimento).
   */
  async executeAiSideEffects({
    tenant,
    customerPhone,
    customerName,
    aiResult,
    instanceName = null,
    lastMessageKey = null,
    messageSnippet = ''
  }) {
    const features = this.getBotFeatures(tenant);
    const storeInfo = tenant?.parsedSettings?.storeInfo || {};
    const sideEffects = {
      documentSaved: null,
      reactionSent: null,
      locationSent: false,
      vcardSent: false,
      pollSent: false,
      reviewSent: false,
      sentimentAlertTriggered: false
    };

    // 1. Demandas perdidas (oportunidades vinculadas à conversa)
    if (Array.isArray(aiResult.missedDemands) && aiResult.missedDemands.length > 0) {
      for (const term of aiResult.missedDemands) {
        await crmExtensions
          .recordMissedDemand(tenant.id, term, {
            customerPhone,
            customerName: customerName || customerPhone,
            messageSnippet: String(messageSnippet || '').slice(0, 220)
          })
          .catch(() => {});
      }
    }

    // 2. Documento / Comprovante PIX / Boleto extraído -> cria registro automático em DocumentSubmission
    if (aiResult.docExtract && features.pdfReadingEnabled) {
      try {
        const savedDoc = await prisma.documentSubmission.create({
          data: {
            tenantId: tenant.id,
            customerPhone,
            customerName: customerName || customerPhone,
            docType: aiResult.docExtract.docType || 'COMPROVANTE',
            title: aiResult.docExtract.title || 'Documento recebido via WhatsApp',
            amount: aiResult.docExtract.amount,
            dueDate: aiResult.docExtract.dueDate,
            status: 'PENDING',
            aiSummary: aiResult.docExtract.summary || aiResult.text.slice(0, 300)
          }
        });
        sideEffects.documentSaved = savedDoc;
      } catch (err) {
        logger.warn({ err: err.message, tenantId: tenant.id }, 'Erro ao salvar DocumentSubmission extraído pela IA');
      }
    }

    // 3. Reação com emoji na mensagem do cliente
    const emoji = aiResult.reactionEmoji || (aiResult.docExtract ? '👍' : null);
    if (emoji && features.reactionsEnabled) {
      sideEffects.reactionSent = emoji;
      if (instanceName && lastMessageKey?.id) {
        await evolutionClient.sendReaction(instanceName, lastMessageKey, emoji);
      }
    }

    // 4. Pin de Localização nativo
    if (aiResult.sendLocation && features.locationPinEnabled) {
      const locRes = await this.dispatchLocationPin(tenant, customerPhone, instanceName);
      sideEffects.locationSent = locRes.type !== 'none';
    }

    // 5. Cartão de Contato (vCard)
    if (aiResult.sendVcard && features.locationPinEnabled && storeInfo.phone) {
      if (instanceName) {
        await evolutionClient.sendContactCard(instanceName, customerPhone, {
          fullName: tenant.name,
          phoneNumber: storeInfo.phone,
          organization: tenant.name
        });
      }
      sideEffects.vcardSent = true;
    }

    // 6. Enquete Nativa do WhatsApp
    if (aiResult.poll && aiResult.poll.name && Array.isArray(aiResult.poll.values) && aiResult.poll.values.length >= 2) {
      if (instanceName) {
        await evolutionClient.sendPoll(
          instanceName,
          customerPhone,
          aiResult.poll.name,
          aiResult.poll.values,
          1
        );
      }
      sideEffects.pollSent = true;
    }

    // 7. Avaliação Pós-Atendimento (Google Meu Negócio ou Enquete CSAT)
    if (aiResult.sendReview) {
      await this.dispatchReviewRequest(tenant, customerPhone, instanceName);
      sideEffects.reviewSent = true;
    }

    // 8. Termômetro de Sentimento & Alerta Vermelho Urgente
    if (aiResult.sentiment) {
      await chatSessionService
        .updateSessionSentiment(tenant.id, customerPhone, {
          sentiment: aiResult.sentiment,
          reason:
            aiResult.sentiment === 'URGENT'
              ? 'Alerta Urgente detectado pela IA — prioridade máxima'
              : aiResult.sentiment === 'FRUSTRATED'
              ? 'Cliente insatisfeito / frustrado detectado pela IA'
              : null
        })
        .catch(() => {});

      if (
        features.sentimentAlertEnabled &&
        (aiResult.sentiment === 'URGENT' || aiResult.sentiment === 'FRUSTRATED')
      ) {
        sideEffects.sentimentAlertTriggered = true;
        aiResult.isHandoff = true;
      }
    }

    return sideEffects;
  }

  async processQueueItem(queueKey) {
    const item = this.buffer.get(queueKey);
    if (!item) return;

    if (this.processingLocks.has(queueKey)) {
      item.timer = setTimeout(() => this.processQueueItem(queueKey), 1000);
      return;
    }

    this.processingLocks.add(queueKey);
    this.buffer.delete(queueKey);

    const {
      tenant,
      customerPhone,
      pushName,
      messages,
      mediaItems,
      audioItems,
      documentItems,
      lastMessageKey,
      instanceName
    } = item;

    const features = this.getBotFeatures(tenant);
    const activeAudios = features.audioUnderstandingEnabled ? audioItems : [];
    const activeDocs = features.pdfReadingEnabled ? documentItems : [];
    const consolidatedText = messages.join('\n').trim();

    const mediaSummaryLabel =
      consolidatedText ||
      (activeDocs.length > 0
        ? `[Documento enviado: ${activeDocs[0]?.fileName || 'arquivo.pdf'}]`
        : activeAudios.length > 0
        ? '[Áudio enviado pelo cliente]'
        : mediaItems.length > 0
        ? '[Foto enviada pelo cliente]'
        : '[Mídia]');

    const mediaType =
      activeDocs.length > 0
        ? 'document'
        : activeAudios.length > 0
        ? 'audio'
        : mediaItems.length > 0
        ? 'image'
        : null;

    try {
      // 0. Registra/atualiza contato automaticamente no CRM (com pushName do WhatsApp)
      await crmExtensions.touchContact(tenant.id, customerPhone, pushName).catch(() => {});

      // 0.5 Verifica se o contato está na Lista de Bloqueio da IA
      const isBlocked = await crmExtensions.isPhoneAiBlocked(tenant.id, customerPhone);
      if (isBlocked) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Contato bloqueado para IA no filtro de Contatos. Mensagem apenas registrada.');
        await chatSessionService.appendMessage({
          tenantId: tenant.id,
          customerPhone,
          role: 'user',
          content: mediaSummaryLabel,
          mediaType
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
          content: mediaSummaryLabel,
          mediaType
        });
        return;
      }

      // 1.5 Anti-Ban: Atraso humano de leitura + dois riscos azuis
      if (instanceName && lastMessageKey?.id && features.antiBanEnabled) {
        const readDelay = antiBanService.computeReadDelayMs(tenant);
        await antiBanService.sleep(readDelay);
        await evolutionClient.markAsRead(
          instanceName,
          lastMessageKey.remoteJid || `${customerPhone}@s.whatsapp.net`,
          lastMessageKey.id
        );
      }

      // 2. Busca histórico recente
      const history = await chatSessionService.getRecentHistory(tenant.id, customerPhone, 10);

      // 3. Salva a mensagem do usuário
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'user',
        content: mediaSummaryLabel,
        mediaType
      });

      // 3.5 Verifica Gatilhos Automáticos de Respostas Rápidas (Quick Replies)
      if (consolidatedText && mediaItems.length === 0 && activeAudios.length === 0 && activeDocs.length === 0) {
        const autoReply = await crmExtensions.matchAutoQuickReply(
          tenant,
          consolidatedText,
          session.customerName || pushName || ''
        );
        if (autoReply) {
          if (instanceName) {
            await antiBanService.enforceRateLimit(tenant);
            const typingMs = antiBanService.computeTypingDelayMs(autoReply.renderedText, tenant);
            await evolutionClient.sendPresence(instanceName, customerPhone, 'composing', typingMs);
            await antiBanService.sleep(typingMs);
            await evolutionClient.sendTextMessage(
              instanceName,
              customerPhone,
              autoReply.renderedText,
              features.quotedRepliesEnabled ? lastMessageKey : null
            );
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
      } else if (mediaItems.length > 0 || activeAudios.length > 0) {
        stockContext = await stockService.searchProduct(tenant, 'a');
      }
      const activePromotions = await crmExtensions.getActivePromotions(tenant.id).catch(() => []);

      const fallbackPromptText =
        consolidatedText ||
        (activeDocs.length > 0
          ? 'Analise este documento/comprovante PDF enviado pelo cliente, identifique tipo, valor e vencimento, confirme o recebimento e emita [DOC_EXTRACT].'
          : activeAudios.length > 0
          ? 'Ouça o áudio enviado pelo cliente e responda naturalmente à sua solicitação.'
          : mediaItems.length > 0
          ? 'Identifique o produto, problema ou comprovante mostrado nesta foto e verifique como podemos ajudar.'
          : '');

      // 5. Gera resposta com o Gemini (Multimodal: texto + fotos + áudios + PDFs)
      const aiResult = await aiService.generateResponse({
        tenant,
        customerText: fallbackPromptText,
        chatHistory: history,
        stockContext,
        imageParts: mediaItems,
        audioParts: activeAudios,
        documentParts: activeDocs,
        activePromotions
      });

      // 6. Verifica silêncio inteligente
      if (aiResult.isNoResponse) {
        logger.info({ tenantId: tenant.id, customerPhone }, 'Tag [NO_RESPONSE] detectada. Silêncio inteligente aplicado.');
        return aiResult;
      }

      // 7. Envia resposta via Evolution API com Camada Anti-Ban + Citação (Quoted Reply)
      if (aiResult.text && instanceName) {
        const bubbles = aiResult.text.split('\n\n').filter((b) => b.trim() !== '');
        for (let idx = 0; idx < bubbles.length; idx++) {
          const bubble = bubbles[idx].trim();
          await antiBanService.enforceRateLimit(tenant);
          const typingMs = antiBanService.computeTypingDelayMs(bubble, tenant);
          await evolutionClient.sendPresence(instanceName, customerPhone, 'composing', typingMs);
          await antiBanService.sleep(typingMs);
          await evolutionClient.sendTextMessage(
            instanceName,
            customerPhone,
            bubble,
            idx === 0 && features.quotedRepliesEnabled ? lastMessageKey : null
          );
          if (idx < bubbles.length - 1) {
            await antiBanService.sleep(antiBanService.computeBubbleJitterMs(tenant));
          }
        }
      }

      // 7.5 Executa ações nativas do bot (PDF extract, reação, pin, vCard, poll, review, sentimento)
      const sideEffects = await this.executeAiSideEffects({
        tenant,
        customerPhone,
        customerName: session.customerName || pushName || customerPhone,
        aiResult,
        instanceName,
        lastMessageKey,
        messageSnippet: mediaSummaryLabel
      });

      // 8. Se houver Handoff (ou Alerta Vermelho de Sentimento), marca a pausa na sessão
      if (aiResult.isHandoff) {
        const handoffHours = tenant.parsedSettings?.features?.automaticHandoffHours || 6;
        await chatSessionService.pauseSession(tenant.id, customerPhone, handoffHours);
        logger.info(
          { tenantId: tenant.id, customerPhone, handoffHours, sentiment: aiResult.sentiment },
          'Handoff acionado. Sessão pausada para atendente humano.'
        );
      }

      // 9. Registra a resposta da IA no banco
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: aiResult.text,
        metadata: {
          isHandoff: aiResult.isHandoff,
          photoCodes: aiResult.photoCodes,
          sentiment: aiResult.sentiment,
          reactionEmoji: sideEffects.reactionSent,
          documentId: sideEffects.documentSaved?.id || null,
          poll: aiResult.poll || null,
          locationSent: sideEffects.locationSent,
          reviewSent: sideEffects.reviewSent
        }
      });

      return { ...aiResult, sideEffects };
    } catch (err) {
      logger.error({ err: err.message, stack: err.stack, tenantId: tenant.id, customerPhone }, 'Erro no pipeline de processamento de mensagens');
      throw err;
    } finally {
      this.processingLocks.delete(queueKey);
    }
  }

  normalizeMediaPart(m, fallbackMime = 'image/jpeg') {
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
        fileName: m.fileName || undefined,
        inlineData: {
          mimeType: m.mimeType || fallbackMime,
          data: clean
        }
      };
    }
    return null;
  }

  /**
   * Processa uma mensagem imediatamente para fins de teste ou API síncrona (Simulador do Dashboard).
   */
  async processQueueItemDirect({ tenant, customerPhone, text, media, audio, document }) {
    const features = this.getBotFeatures(tenant);

    const rawImages = media ? (Array.isArray(media) ? media : [media]) : [];
    const mediaItems = rawImages.map((m) => this.normalizeMediaPart(m, 'image/jpeg')).filter(Boolean);

    const rawAudios = audio ? (Array.isArray(audio) ? audio : [audio]) : [];
    const audioItems = features.audioUnderstandingEnabled
      ? rawAudios.map((a) => this.normalizeMediaPart(a, 'audio/ogg')).filter(Boolean)
      : [];

    const rawDocs = document ? (Array.isArray(document) ? document : [document]) : [];
    const documentItems = features.pdfReadingEnabled
      ? rawDocs.map((d) => this.normalizeMediaPart(d, 'application/pdf')).filter(Boolean)
      : [];

    const userLabel =
      text ||
      (documentItems.length > 0
        ? `[Documento PDF enviado: ${documentItems[0]?.fileName || 'documento.pdf'}]`
        : audioItems.length > 0
        ? '[Áudio de voz enviado pelo cliente]'
        : mediaItems.length > 0
        ? '[Foto enviada pelo cliente]'
        : '');

    const mediaType =
      documentItems.length > 0
        ? 'document'
        : audioItems.length > 0
        ? 'audio'
        : mediaItems.length > 0
        ? 'image'
        : null;

    await crmExtensions.touchContact(tenant.id, customerPhone).catch(() => {});

    // Verifica filtro de bloqueio de IA por contato
    const isBlocked = await crmExtensions.isPhoneAiBlocked(tenant.id, customerPhone);
    if (isBlocked) {
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'user',
        content: userLabel,
        mediaType
      });
      return {
        text: '',
        replyText: '[IA bloqueada para este contato no filtro de WhatsApp → Contatos. Nenhuma resposta automática foi enviada.]',
        isNoResponse: true,
        isHandoff: false,
        blockedByContactFilter: true,
        photoCodes: [],
        imageAnalyzed: false,
        audioAnalyzed: false,
        documentAnalyzed: false,
        matchedStockCount: 0,
        sampleMatchedStock: []
      };
    }

    const history = await chatSessionService.getRecentHistory(tenant.id, customerPhone, 10);

    await chatSessionService.appendMessage({
      tenantId: tenant.id,
      customerPhone,
      role: 'user',
      content: userLabel,
      mediaType
    });

    // Verifica gatilhos automáticos de respostas rápidas
    if (text && mediaItems.length === 0 && audioItems.length === 0 && documentItems.length === 0) {
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
          sentiment: 'NEUTRAL',
          imageAnalyzed: false,
          audioAnalyzed: false,
          documentAnalyzed: false,
          matchedStockCount: 0,
          sampleMatchedStock: []
        };
      }
    }

    let stockContext = [];
    if (text) {
      stockContext = await stockService.searchProduct(tenant, text);
      await this.trackMatchedDemands(tenant.id, stockContext);
    } else if (mediaItems.length > 0 || audioItems.length > 0) {
      stockContext = await stockService.searchProduct(tenant, 'a');
    }

    const activePromotions = await crmExtensions.getActivePromotions(tenant.id).catch(() => []);

    const promptText =
      text ||
      (documentItems.length > 0
        ? 'Analise este documento/comprovante PDF enviado pelo cliente, identifique tipo, valor e vencimento, confirme o recebimento e emita [DOC_EXTRACT].'
        : audioItems.length > 0
        ? 'Ouça o áudio enviado pelo cliente e responda naturalmente à sua solicitação.'
        : mediaItems.length > 0
        ? 'Identifique o produto, problema ou comprovante mostrado nesta foto e verifique como podemos ajudar.'
        : '');

    const aiResult = await aiService.generateResponse({
      tenant,
      customerText: promptText,
      chatHistory: history,
      stockContext,
      imageParts: mediaItems,
      audioParts: audioItems,
      documentParts: documentItems,
      activePromotions
    });

    const sideEffects = await this.executeAiSideEffects({
      tenant,
      customerPhone,
      customerName: customerPhone,
      aiResult,
      instanceName: null,
      lastMessageKey: null,
      messageSnippet: userLabel
    });

    if (!aiResult.isNoResponse) {
      await chatSessionService.appendMessage({
        tenantId: tenant.id,
        customerPhone,
        role: 'model',
        content: aiResult.text,
        metadata: {
          isHandoff: aiResult.isHandoff,
          photoCodes: aiResult.photoCodes,
          sentiment: aiResult.sentiment,
          reactionEmoji: sideEffects.reactionSent,
          documentId: sideEffects.documentSaved?.id || null,
          poll: aiResult.poll || null,
          locationSent: sideEffects.locationSent,
          reviewSent: sideEffects.reviewSent
        }
      });
    }

    if (aiResult.isHandoff) {
      const handoffHours = tenant.parsedSettings?.features?.automaticHandoffHours || 6;
      await chatSessionService.pauseSession(tenant.id, customerPhone, handoffHours);
    }

    return {
      ...aiResult,
      sideEffects,
      replyText: aiResult.text,
      imageAnalyzed: mediaItems.length > 0,
      audioAnalyzed: audioItems.length > 0,
      documentAnalyzed: documentItems.length > 0,
      matchedStockCount: stockContext.length,
      sampleMatchedStock: stockContext.slice(0, 3)
    };
  }
}

module.exports = new MessageQueueService();


