const tenantService = require('../tenants/tenantService');
const messageQueueService = require('../queue/messageQueueService');
const { logger } = require('../../config');

class WebhookController {
  async handleEvolutionWebhook(req, res) {
    const { event, instance, data } = req.body || {};

    // Responde 200 imediatamente para o gateway de mensageria
    res.status(200).json({ received: true });

    if (!event || !instance) {
      return;
    }

    logger.debug({ event, instance }, 'Evento de webhook recebido da Evolution API');

    // Resolve qual estabelecimento pertence a esta instância
    const tenant = await tenantService.getTenantByWhatsAppInstance(instance);
    if (!tenant) {
      logger.warn({ instance }, 'Instância de WhatsApp não mapeada para nenhum tenant no Neoxy');
      return;
    }

    if (!tenant.active) {
      logger.info({ tenantId: tenant.id }, 'Tenant inativo. Ignorando mensagem.');
      return;
    }

    // Processa apenas novas mensagens recebidas
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

      // Extrai texto da mensagem
      const messageContent = messageData.message || messageData;
      let text = '';

      if (messageContent.conversation) {
        text = messageContent.conversation;
      } else if (messageContent.extendedTextMessage?.text) {
        text = messageContent.extendedTextMessage.text;
      } else if (messageContent.imageMessage?.caption) {
        text = messageContent.imageMessage.caption;
      }

      // Enfileira com debounce
      await messageQueueService.enqueueMessage({
        tenant,
        customerPhone,
        text,
        instanceName: instance
      });
    }
  }
}

module.exports = new WebhookController();
