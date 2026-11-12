const { GoogleGenerativeAI } = require('@google/generative-ai');
const promptFactory = require('./promptFactory');
const { geminiApiKey, logger } = require('../../config');

class AIService {
  constructor() {
    this.genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
  }

  getModel(tenant) {
    if (!this.genAI) {
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY não configurada no ambiente (.env).');
      }
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
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
    audioParts = []
  }) {
    const MAX_RETRIES = 3;
    let delay = 1500;

    const systemPrompt = promptFactory.buildSystemPrompt(tenant);
    const sessionPrompt = promptFactory.buildSessionPrompt(tenant, stockContext, chatHistory, imageParts.length > 0);

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

    // Mensagem atual do usuário
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
    if (!rawText) return { text: '', isHandoff: false, isNoResponse: false, photoCodes: [] };

    const isNoResponse = rawText.includes('[NO_RESPONSE]');
    const isHandoff = rawText.includes('[HANDOFF]');

    // Extrai códigos de fotos recomendados pela IA: {{COD:12345}}
    const photoRegex = /\{\{COD:([^\}]+)\}\}/g;
    const photoCodes = [];
    let match;
    while ((match = photoRegex.exec(rawText)) !== null) {
      photoCodes.push(match[1].trim());
    }

    // Limpa tags do texto final a ser enviado para o cliente
    let cleanText = rawText
      .replace(/\[NO_RESPONSE\]/g, '')
      .replace(/\[HANDOFF\]/g, '')
      .replace(/\{\{COD:[^\}]+\}\}/g, '')
      .trim();

    return {
      text: cleanText,
      rawText,
      isHandoff,
      isNoResponse,
      photoCodes
    };
  }
}

module.exports = new AIService();
