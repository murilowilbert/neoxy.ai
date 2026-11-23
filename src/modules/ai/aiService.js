const { GoogleGenerativeAI } = require('@google/generative-ai');
const promptFactory = require('./promptFactory');
const { geminiApiKey, logger } = require('../../config');

class AIService {
  constructor() {
    this.cachedKey = null;
    this.genAI = null;
  }

  getModel(tenant) {
    const activeKey = process.env.GEMINI_API_KEY || process.env.API_KEY || geminiApiKey;
    if (!activeKey || activeKey === 'sua_chave_gemini_aqui') {
      throw new Error('GEMINI_API_KEY não configurada. Informe sua chave em Perfil & Módulos -> Chave API Gemini.');
    }
    if (!this.genAI || this.cachedKey !== activeKey) {
      this.cachedKey = activeKey;
      this.genAI = new GoogleGenerativeAI(activeKey);
    }

    const modelName = tenant?.parsedSettings?.ai?.model || 'gemini-2.5-flash';
    const temperature = tenant?.parsedSettings?.ai?.temperature ?? 0.4;

    return this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature,
        maxOutputTokens: 1500
      }
    });
  }

  /**
   * Gera a resposta humanizada da IA para o cliente de um estabelecimento específico.
   */
  async generateResponse({
    tenant,
    customerText,
    chatHistory = [],
    stockContext = [],
    imageParts = [],
    audioParts = [],
    documentParts = [],
    activePromotions = []
  }) {
    const MAX_RETRIES = 3;
    let delay = 1500;

    const systemPrompt = promptFactory.buildSystemPrompt(tenant);
    const sessionPrompt = promptFactory.buildSessionPrompt(
      tenant,
      stockContext,
      chatHistory,
      {
        hasImages: imageParts.length > 0,
        hasAudio: audioParts.length > 0,
        hasDocuments: documentParts.length > 0
      },
      activePromotions
    );

    const model = this.getModel(tenant);

    // Constrói histórico de conversa no formato Gemini
    const contents = [];
    const recentHistory = chatHistory.slice(-10); // Janela rolante de 10 mensagens

    for (const msg of recentHistory) {
      const role = msg.role === 'user' ? 'user' : 'model';
      const part = { text: msg.content };

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push(part);
      } else {
        contents.push({ role, parts: [part] });
      }
    }

    // Mensagem atual do usuário (texto + imagens + áudio + PDFs/documentos)
    const currentParts = [];
    if (customerText) {
      currentParts.push({ text: customerText });
    }
    if (imageParts && imageParts.length > 0) {
      currentParts.push(...imageParts);
    }
    if (audioParts && audioParts.length > 0) {
      currentParts.push(...audioParts);
    }
    if (documentParts && documentParts.length > 0) {
      for (const doc of documentParts) {
        if (doc?.inlineData?.data) {
          currentParts.push({ inlineData: doc.inlineData });
        }
      }
    }

    if (currentParts.length > 0) {
      contents.push({ role: 'user', parts: currentParts });
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent({
          contents,
          systemInstruction: {
            parts: [{ text: `${systemPrompt}\n\n${sessionPrompt}` }]
          }
        });

        const rawText = result.response.text();
        return this.parseModelResponse(rawText);
      } catch (err) {
        logger.warn({ err: err.message, attempt, tenantId: tenant.id }, 'Tentativa de geração Gemini falhou');
        if (attempt === MAX_RETRIES) {
          throw err;
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
  }

  parseModelResponse(rawText) {
    if (!rawText) {
      return {
        text: '',
        isHandoff: false,
        isNoResponse: false,
        photoCodes: [],
        missedDemands: [],
        sentiment: 'NEUTRAL',
        reactionEmoji: null,
        sendLocation: false,
        sendVcard: false,
        sendReview: false,
        poll: null,
        docExtract: null
      };
    }

    const isNoResponse = rawText.includes('[NO_RESPONSE]');
    const isHandoff = rawText.includes('[HANDOFF]');
    const sendLocation = /\[SEND_LOCATION\]/i.test(rawText);
    const sendVcard = /\[SEND_VCARD\]/i.test(rawText);
    const sendReview = /\[SEND_REVIEW\]/i.test(rawText);

    // Termômetro de sentimento: [SENTIMENT:POSITIVE|NEUTRAL|FRUSTRATED|URGENT]
    const sentimentMatch = rawText.match(/\[SENTIMENT:(POSITIVE|NEUTRAL|FRUSTRATED|URGENT)\]/i);
    const sentiment = sentimentMatch ? sentimentMatch[1].toUpperCase() : 'NEUTRAL';

    // Reação com emoji: [REACT:👍]
    const reactMatch = rawText.match(/\[REACT:([^\]]+)\]/i);
    const reactionEmoji = reactMatch ? reactMatch[1].trim() : null;

    // Enquete nativa: [POLL:Pergunta|Opção 1|Opção 2|...]
    let poll = null;
    const pollMatch = rawText.match(/\[POLL:([^\]]+)\]/i);
    if (pollMatch) {
      const parts = pollMatch[1]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length >= 3) {
        poll = {
          name: parts[0],
          values: parts.slice(1, 13)
        };
      }
    }

    // Extração estruturada de documento/comprovante: [DOC_EXTRACT:{...}]
    let docExtract = null;
    const docMatch = rawText.match(/\[DOC_EXTRACT:(\{[\s\S]*?\})\]/i);
    if (docMatch) {
      try {
        const parsed = JSON.parse(docMatch[1]);
        if (parsed && typeof parsed === 'object') {
          docExtract = {
            docType: String(parsed.docType || 'COMPROVANTE').toUpperCase(),
            title: String(parsed.title || 'Documento recebido via WhatsApp').trim(),
            amount:
              parsed.amount !== undefined && parsed.amount !== null && parsed.amount !== ''
                ? Number(String(parsed.amount).replace(',', '.'))
                : null,
            dueDate: parsed.dueDate ? String(parsed.dueDate).trim() : null,
            summary: parsed.summary ? String(parsed.summary).trim() : null
          };
          if (docExtract.amount !== null && !Number.isFinite(docExtract.amount)) {
            docExtract.amount = null;
          }
        }
      } catch {
        docExtract = null;
      }
    }

    // Extrai códigos de fotos recomendados pela IA: {{COD:12345}}
    const photoRegex = /\{\{COD:([^\}]+)\}\}/g;
    const photoCodes = [];
    let match;
    while ((match = photoRegex.exec(rawText)) !== null) {
      photoCodes.push(match[1].trim());
    }

    // Extrai demandas não cadastradas detectadas pela IA: [MISSED_DEMAND:Serra Mármore]
    const missedRegex = /\[MISSED_DEMAND:([^\]]+)\]/gi;
    const missedDemands = [];
    let mMatch;
    while ((mMatch = missedRegex.exec(rawText)) !== null) {
      const term = mMatch[1].trim();
      if (term.length >= 2) missedDemands.push(term);
    }

    // Limpa todas as tags internas do texto final a ser enviado para o cliente
    let cleanText = rawText
      .replace(/\[NO_RESPONSE\]/gi, '')
      .replace(/\[HANDOFF\]/gi, '')
      .replace(/\[SEND_LOCATION\]/gi, '')
      .replace(/\[SEND_VCARD\]/gi, '')
      .replace(/\[SEND_REVIEW\]/gi, '')
      .replace(/\[SENTIMENT:[^\]]+\]/gi, '')
      .replace(/\[REACT:[^\]]+\]/gi, '')
      .replace(/\[POLL:[^\]]+\]/gi, '')
      .replace(/\[DOC_EXTRACT:\{[\s\S]*?\}\]/gi, '')
      .replace(/\[MISSED_DEMAND:[^\]]+\]/gi, '')
      .replace(/\{\{COD:[^\}]+\}\}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text: cleanText,
      rawText,
      isHandoff,
      isNoResponse,
      photoCodes,
      missedDemands,
      sentiment,
      reactionEmoji,
      sendLocation,
      sendVcard,
      sendReview,
      poll,
      docExtract
    };
  }
}

module.exports = new AIService();
