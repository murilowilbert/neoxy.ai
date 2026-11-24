const axios = require('axios');
const { evolutionApi, logger } = require('../../config');

class EvolutionClient {
  constructor() {
    this.client = axios.create({
      baseURL: evolutionApi.baseUrl,
      headers: {
        apikey: evolutionApi.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 12000
    });
  }

  cleanPhone(number) {
    return String(number || '').replace(/[^0-9]/g, '');
  }

  /**
   * Envia mensagem de texto com suporte opcional a citação (quotedMessageKey).
   */
  async sendTextMessage(instanceName, number, text, quotedMessageKey = null) {
    try {
      const cleanNumber = this.cleanPhone(number);
      const payload = {
        number: cleanNumber,
        text
      };
      if (quotedMessageKey && quotedMessageKey.id) {
        payload.quoted = { key: quotedMessageKey };
      }
      const response = await this.client.post(`/message/sendText/${instanceName}`, payload);
      return response.data;
    } catch (err) {
      logger.warn(
        { err: err.message, instanceName, number },
        'Falha ao enviar mensagem de texto via Evolution API (pode estar offline em ambiente de teste)'
      );
      return null;
    }
  }

  /**
   * Envia reação com emoji (ex: 👍) diretamente na mensagem do cliente.
   */
  async sendReaction(instanceName, messageKey, reaction = '👍') {
    if (!instanceName || !messageKey?.id) return null;
    try {
      const response = await this.client.post(`/message/sendReaction/${instanceName}`, {
        key: messageKey,
        reaction
      });
      return response.data;
    } catch (err) {
      logger.debug({ err: err.message, instanceName }, 'Falha silenciosa ao enviar reação');
      return null;
    }
  }

  /**
   * Marca mensagem como lida (dois riscos azuis) após atraso humano.
   */
  async markAsRead(instanceName, remoteJid, messageId) {
    if (!instanceName || !remoteJid || !messageId) return null;
    try {
      const response = await this.client.post(`/chat/markMessageAsRead/${instanceName}`, {
        readMessages: [{ remoteJid, id: messageId, fromMe: false }]
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Envia indicador de presença ("digitando..." ou "gravando áudio...").
   */
  async sendPresence(instanceName, number, presence = 'composing', delayMs = 1500) {
    try {
      const cleanNumber = this.cleanPhone(number);
      const response = await this.client.post(`/chat/sendPresence/${instanceName}`, {
        number: cleanNumber,
        presence,
        delay: delayMs
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Envia Enquete Nativa do WhatsApp (funciona em todas as contas, ideal para triagem e CSAT).
   */
  async sendPoll(instanceName, number, name, values = [], selectableCount = 1) {
    if (!instanceName || !number || !name || !Array.isArray(values) || values.length < 2) {
      return null;
    }
    try {
      const cleanNumber = this.cleanPhone(number);
      const response = await this.client.post(`/message/sendPoll/${instanceName}`, {
        number: cleanNumber,
        name,
        selectableCount,
        values: values.slice(0, 12)
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName, number }, 'Falha ao enviar enquete via Evolution API');
      return null;
    }
  }

  /**
   * Envia Localização Nativa (Pin clicável no Mapa do WhatsApp).
   */
  async sendLocation(instanceName, number, { name, address, latitude, longitude }) {
    if (!instanceName || !number || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return null;
    }
    try {
      const cleanNumber = this.cleanPhone(number);
      const response = await this.client.post(`/message/sendLocation/${instanceName}`, {
        number: cleanNumber,
        name: name || 'Nossa localização',
        address: address || '',
        latitude: Number(latitude),
        longitude: Number(longitude)
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName, number }, 'Falha ao enviar localização via Evolution API');
      return null;
    }
  }

  /**
   * Envia Cartão de Contato oficial (vCard) da empresa.
   */
  async sendContactCard(instanceName, number, { fullName, phoneNumber, organization }) {
    if (!instanceName || !number || !phoneNumber) return null;
    try {
      const cleanNumber = this.cleanPhone(number);
      const cleanCardPhone = this.cleanPhone(phoneNumber);
      const response = await this.client.post(`/message/sendContact/${instanceName}`, {
        number: cleanNumber,
        contact: [
          {
            fullName: fullName || organization || 'Atendimento',
            wuid: cleanCardPhone,
            phoneNumber: `+${cleanCardPhone}`,
            organization: organization || fullName || ''
          }
        ]
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName, number }, 'Falha ao enviar vCard via Evolution API');
      return null;
    }
  }

  /**
   * Baixa mídia (áudio, foto ou PDF) em base64 da Evolution API quando o webhook não enviar inline.
   */
  async getMediaBase64(instanceName, messageKey) {
    if (!instanceName || !messageKey?.id) return null;
    try {
      const response = await this.client.post(`/chat/getBase64FromMediaMessage/${instanceName}`, {
        message: { key: messageKey },
        convertToMp4: false
      });
      if (response.data?.base64) {
        return {
          base64: response.data.base64,
          mimeType: response.data.mimetype || null
        };
      }
      return null;
    } catch (err) {
      logger.debug({ err: err.message, instanceName }, 'Não foi possível baixar mídia base64 da Evolution API');
      return null;
    }
  }

  detectMediaType(mediaUrl, explicitType) {
    if (explicitType) return explicitType;
    const lower = String(mediaUrl || '').toLowerCase();
    if (/\.(mp4|mov|webm|mkv|avi)(\?|$)/.test(lower)) return 'video';
    if (/\.(pdf|doc|docx|xls|xlsx|csv)(\?|$)/.test(lower)) return 'document';
    return 'image';
  }

  async sendMediaMessage(instanceName, number, mediaUrl, caption = '', mediatype = null) {
    try {
      const cleanNumber = this.cleanPhone(number);
      const resolvedType = this.detectMediaType(mediaUrl, mediatype);
      const response = await this.client.post(`/message/sendMedia/${instanceName}`, {
        number: cleanNumber,
        mediatype: resolvedType,
        media: mediaUrl,
        caption
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName, number, mediaUrl }, 'Falha ao enviar mídia via Evolution API');
      return null;
    }
  }

  async sendVideoMessage(instanceName, number, videoUrl, caption = '') {
    return this.sendMediaMessage(instanceName, number, videoUrl, caption, 'video');
  }

  getHttpClient(overrideCfg = null) {
    if (!overrideCfg?.baseUrl && !overrideCfg?.apiKey) return this.client;
    return axios.create({
      baseURL: String(overrideCfg.baseUrl || evolutionApi.baseUrl).replace(/\/+$/, ''),
      headers: {
        apikey: overrideCfg.apiKey || evolutionApi.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });
  }

  async createInstance(instanceName, overrideCfg = null) {
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.post('/instance/create', {
        instanceName,
        token: overrideCfg?.apiKey || evolutionApi.apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName }, 'Erro ao criar instância na Evolution API');
      throw err;
    }
  }

  async connectInstance(instanceName, options = {}, overrideCfg = null) {
    try {
      const http = this.getHttpClient(overrideCfg);
      const params = {};
      if (options?.number) {
        params.number = this.cleanPhone(options.number);
      }
      const response = await http.get(`/instance/connect/${instanceName}`, { params });
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName }, 'Erro ao conectar instância na Evolution API');
      throw err;
    }
  }

  async getConnectionState(instanceName, overrideCfg = null) {
    const start = Date.now();
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.get(`/instance/connectionState/${instanceName}`);
      const state =
        response.data?.instance?.state ||
        response.data?.state ||
        'close';
      return {
        reachable: true,
        latencyMs: Date.now() - start,
        state: String(state).toLowerCase(),
        raw: response.data
      };
    } catch (err) {
      const status = err?.response?.status;
      // 404 significa que a Evolution API está ONLINE, mas a instância ainda não foi criada
      if (status === 404 || status === 400) {
        return {
          reachable: true,
          latencyMs: Date.now() - start,
          state: 'not_found',
          raw: null
        };
      }
      return {
        reachable: false,
        latencyMs: null,
        state: 'offline',
        error: err.message
      };
    }
  }

  async fetchInstanceInfo(instanceName, overrideCfg = null) {
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.get('/instance/fetchInstances', {
        params: { instanceName }
      });
      const list = Array.isArray(response.data) ? response.data : [];
      const found =
        list.find((it) => it?.name === instanceName || it?.instance?.instanceName === instanceName) ||
        list[0] ||
        null;
      if (!found) return null;
      const inst = found.instance || found;
      const ownerJid = inst.ownerJid || inst.owner || '';
      return {
        instanceName: inst.name || inst.instanceName || instanceName,
        profileName: inst.profileName || null,
        profilePicUrl: inst.profilePicUrl || null,
        phoneNumber: ownerJid ? this.cleanPhone(String(ownerJid).split('@')[0]) : null,
        connectionStatus: inst.connectionStatus || inst.status || null
      };
    } catch {
      return null;
    }
  }

  async logoutInstance(instanceName, overrideCfg = null) {
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.delete(`/instance/logout/${instanceName}`);
      return response.data;
    } catch (err) {
      logger.warn({ err: err.message, instanceName }, 'Logout Evolution API retornou aviso');
      return null;
    }
  }

  async restartInstance(instanceName, overrideCfg = null) {
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.put(`/instance/restart/${instanceName}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async deleteInstance(instanceName, overrideCfg = null) {
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.delete(`/instance/delete/${instanceName}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async setWebhook(instanceName, webhookUrl, overrideCfg = null) {
    if (!instanceName || !webhookUrl) return null;
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.post(`/webhook/set/${instanceName}`, {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
        }
      });
      return response.data;
    } catch (err) {
      logger.debug({ err: err.message, instanceName }, 'Falha ao configurar webhook na Evolution API');
      return null;
    }
  }

  async setInstanceSettings(instanceName, settings = {}, overrideCfg = null) {
    if (!instanceName) return null;
    try {
      const http = this.getHttpClient(overrideCfg);
      const response = await http.post(`/settings/set/${instanceName}`, {
        rejectCall: Boolean(settings.rejectCalls),
        msgCall: settings.rejectCalls ? 'No momento não recebemos chamadas por aqui, envie uma mensagem de texto ou áudio.' : '',
        groupsIgnore: settings.ignoreGroups !== false,
        alwaysOnline: Boolean(settings.alwaysOnline),
        readMessages: settings.readReceipts !== false,
        readStatus: false,
        syncFullHistory: Boolean(settings.syncContactsOnConnect)
      });
      return response.data;
    } catch (err) {
      logger.debug({ err: err.message, instanceName }, 'Falha ao enviar configurações de instância para Evolution API');
      return null;
    }
  }

  async fetchProfilePictureUrl(instanceName, number) {
    if (!instanceName || !number) return null;
    try {
      const cleanNumber = this.cleanPhone(number);
      const response = await this.client.post(`/chat/fetchProfilePictureUrl/${instanceName}`, {
        number: cleanNumber
      });
      return response.data?.profilePictureUrl || response.data?.picture || null;
    } catch {
      return null;
    }
  }

  async fetchContacts(instanceName) {
    if (!instanceName) return [];
    try {
      const response = await this.client.post(`/chat/findContacts/${instanceName}`, {
        where: {}
      });
      const raw = Array.isArray(response.data) ? response.data : [];
      return raw
        .filter((c) => c && (c.remoteJid || c.id) && !String(c.remoteJid || c.id).includes('@g.us'))
        .map((c) => {
          const jid = String(c.remoteJid || c.id || '');
          const phone = jid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
          return {
            phone,
            pushName: c.pushName || c.name || null,
            name: c.name || c.pushName || null,
            avatarUrl: c.profilePicUrl || c.profilePictureUrl || c.imgUrl || null
          };
        })
        .filter((c) => c.phone.length >= 8);
    } catch (err) {
      logger.warn(
        { err: err.message, instanceName },
        'Evolution API offline ao sincronizar contatos (usando contatos locais)'
      );
      return [];
    }
  }
}

module.exports = new EvolutionClient();
