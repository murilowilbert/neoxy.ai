const tenantService = require('../tenants/tenantService');
const messageQueueService = require('../queue/messageQueueService');
const evolutionClient = require('./evolutionClient');
const { logger } = require('../../config');

function stripDataUrl(raw) {
  if (!raw) return null;
  const str = String(raw);
  return str.includes(',') ? str.split(',')[1] : str;
}

class WebhookController {
  async handleEvolutionWebhook(req, res) {
    const { event, instance, data } = req.body || {};

    // Responde 200 imediatamente para o gateway de mensageria
    res.status(200).json({ received: true });

    if (!event || !instance) {
      return;
    }

    logger.debug({ event, instance }, 'Evento de webhook recebido da Evolution API');

    const tenant = await tenantService.getTenantByWhatsAppInstance(instance);
    if (!tenant) {
      logger.warn({ instance }, 'Instância de WhatsApp não mapeada para nenhum tenant no Neoxy');
      return;
    }

    if (!tenant.active) {
      logger.info({ tenantId: tenant.id }, 'Tenant inativo. Ignorando mensagem.');
      return;
    }

    // Processa novas mensagens recebidas
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const messageData = data?.message || data;
      if (!messageData) return;

      const key = messageData.key || {};
      const fromMe = key.fromMe;
      const remoteJid = key.remoteJid || '';

      // Ignora mensagens enviadas pelo próprio bot ou de grupos / status
      if (fromMe || remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
        return;
      }

      const customerPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      if (!customerPhone) return;

      const pushName = messageData.pushName || data?.pushName || null;
      const messageContent = messageData.message || messageData;

      let text = '';
      let imagePart = null;
      let audioPart = null;
      let documentPart = null;

      if (messageContent.conversation) {
        text = messageContent.conversation;
      } else if (messageContent.extendedTextMessage?.text) {
        text = messageContent.extendedTextMessage.text;
      } else if (messageContent.imageMessage?.caption) {
        text = messageContent.imageMessage.caption;
      } else if (messageContent.documentMessage?.caption) {
        text = messageContent.documentMessage.caption;
      }

      // 1. Foto enviada pelo cliente (Visão Computacional)
      if (messageContent.imageMessage) {
        let rawBase64 =
          data?.base64 ||
          messageData?.base64 ||
          messageContent.imageMessage?.jpegThumbnail ||
          null;
        let mimeType = messageContent.imageMessage.mimetype || 'image/jpeg';

        if (!rawBase64 && key.id) {
          const fetched = await evolutionClient.getMediaBase64(instance, key);
          if (fetched?.base64) {
            rawBase64 = fetched.base64;
            if (fetched.mimeType) mimeType = fetched.mimeType;
          }
        }

        if (rawBase64) {
          imagePart = {
            inlineData: {
              mimeType,
              data: stripDataUrl(rawBase64)
            }
          };
        }
      }

      // 2. Áudio / Mensagem de Voz (Compreensão Nativa via Gemini)
      if (messageContent.audioMessage) {
        let rawBase64 = data?.base64 || messageData?.base64 || null;
        let mimeType = (messageContent.audioMessage.mimetype || 'audio/ogg').split(';')[0].trim();

        if (!rawBase64 && key.id) {
          const fetched = await evolutionClient.getMediaBase64(instance, key);
          if (fetched?.base64) {
            rawBase64 = fetched.base64;
            if (fetched.mimeType) mimeType = String(fetched.mimeType).split(';')[0].trim();
          }
        }

        if (rawBase64) {
          audioPart = {
            inlineData: {
              mimeType,
              data: stripDataUrl(rawBase64)
            }
          };
        }
      }

      // 3. Documento PDF / Comprovante / Boleto
      if (messageContent.documentMessage) {
        let rawBase64 = data?.base64 || messageData?.base64 || null;
        let mimeType = (messageContent.documentMessage.mimetype || 'application/pdf').split(';')[0].trim();
        const fileName = messageContent.documentMessage.fileName || 'documento.pdf';

        if (!rawBase64 && key.id) {
          const fetched = await evolutionClient.getMediaBase64(instance, key);
          if (fetched?.base64) {
            rawBase64 = fetched.base64;
            if (fetched.mimeType) mimeType = String(fetched.mimeType).split(';')[0].trim();
          }
        }

        if (rawBase64) {
          documentPart = {
            fileName,
            inlineData: {
              mimeType,
              data: stripDataUrl(rawBase64)
            }
          };
        }
      }

      await messageQueueService.enqueueMessage({
        tenant,
        customerPhone,
        pushName,
        text,
        media: imagePart,
        audio: audioPart,
        document: documentPart,
        messageKey: key,
        instanceName: instance
      });
    }
  }
}

module.exports = new WebhookController();
