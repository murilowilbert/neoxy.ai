const axios = require('axios');
const { evolutionApi, logger } = require('../../config');

class EvolutionClient {
  constructor() {
    this.client = axios.create({
      baseURL: evolutionApi.baseUrl,
      headers: {
        'apikey': evolutionApi.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async sendTextMessage(instanceName, number, text) {
    try {
      const cleanNumber = number.replace(/[^0-9]/g, '');
      const response = await this.client.post(`/message/sendText/${instanceName}`, {
        number: cleanNumber,
        text
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName, number }, 'Falha ao enviar mensagem de texto via Evolution API (pode estar offline em ambiente de teste)');
      return null;
    }
  }

  async sendPresence(instanceName, number, presence = 'composing') {
    try {
      const cleanNumber = number.replace(/[^0-9]/g, '');
      const response = await this.client.post(`/chat/sendPresence/${instanceName}`, {
        number: cleanNumber,
        presence,
        delay: 1200
      });
      return response.data;
    } catch (err) {
      // Falha silenciosa para presença
      return null;
    }
  }

  async sendMediaMessage(instanceName, number, mediaUrl, caption = '') {
    try {
      const cleanNumber = number.replace(/[^0-9]/g, '');
      const response = await this.client.post(`/message/sendMedia/${instanceName}`, {
        number: cleanNumber,
        media: mediaUrl,
        caption
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName, number }, 'Falha ao enviar mídia via Evolution API');
      return null;
    }
  }

  async createInstance(instanceName) {
    try {
      const response = await this.client.post('/instance/create', {
        instanceName,
        token: evolutionApi.apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      return response.data;
    } catch (err) {
      logger.error({ err: err.message, instanceName }, 'Erro ao criar instância na Evolution API');
      throw err;
    }
  }

  async connectInstance(instanceName) {
    try {
      const response = await this.client.get(`/instance/connect/${instanceName}`);
      return response.data;
    } catch (err) {
      logger.error({ err: err.message, instanceName }, 'Erro ao conectar instância');
      throw err;
    }
  }
}

module.exports = new EvolutionClient();
