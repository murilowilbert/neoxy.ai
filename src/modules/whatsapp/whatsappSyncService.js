const crypto = require('crypto');
const QRCode = require('qrcode');
const prisma = require('../../database/prisma');
const evolutionClient = require('./evolutionClient');
const tenantService = require('../tenants/tenantService');
const crmExtensions = require('../business/crmExtensionsService');
const { evolutionApi, logger } = require('../../config');

const DEFAULT_SYNC_PREFERENCES = {
  autoReconnect: true,
  ignoreGroups: true,
  rejectCalls: true,
  alwaysOnline: false,
  readReceipts: true,
  typingIndicator: true,
  syncContactsOnConnect: true
};

// Cache em memória de QR codes / códigos de pareamento ativos por tenantId (TTL 45s)
const activeQrCache = new Map();
const QR_TTL_MS = 45 * 1000;

function generatePairingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
    if (i === 3) out += '-';
  }
  return out;
}

class WhatsAppSyncService {
  getSyncSettings(tenant) {
    const raw = tenant?.parsedSettings?.whatsappSync || {};
    return {
      gatewayUrl: String(raw.gatewayUrl || '').trim(),
      gatewayApiKey: String(raw.gatewayApiKey || '').trim(),
      webhookUrl: String(raw.webhookUrl || '').trim(),
      profileName: raw.profileName || null,
      connectedAt: raw.connectedAt || null,
      lastSyncAt: raw.lastSyncAt || null,
      preferences: {
        ...DEFAULT_SYNC_PREFERENCES,
        ...(raw.preferences || {})
      }
    };
  }

  getOverrideCfg(tenant) {
    const cfg = this.getSyncSettings(tenant);
    if (!cfg.gatewayUrl && !cfg.gatewayApiKey) return null;
    return {
      baseUrl: cfg.gatewayUrl || evolutionApi.baseUrl,
      apiKey: cfg.gatewayApiKey || evolutionApi.apiKey
    };
  }

  async ensureSessionRecord(tenant, customInstanceName = null) {
    const existing = await prisma.tenantWhatsAppSession.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' }
    });

    if (existing) {
      if (customInstanceName && customInstanceName !== existing.instanceName) {
        return prisma.tenantWhatsAppSession.update({
          where: { id: existing.id },
          data: { instanceName: customInstanceName }
        });
      }
      return existing;
    }

    const defaultInstance =
      customInstanceName || `neo-${String(tenant.slug || tenant.id.slice(0, 8)).replace(/[^a-z0-9-_]/gi, '')}`;

    return prisma.tenantWhatsAppSession.create({
      data: {
        tenantId: tenant.id,
        instanceName: defaultInstance,
        status: 'DISCONNECTED'
      }
    });
  }

  async renderQrDataUrl(rawCode) {
    return QRCode.toDataURL(String(rawCode), {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#09090B',
        light: '#FFFFFF'
      }
    });
  }

  /**
   * Chamado pelo webhook quando a Evolution API envia CONNECTION_UPDATE ou QRCODE_UPDATED.
   */
  async handleWebhookConnectionUpdate(tenant, { instanceName, state, phoneNumber, profileName }) {
    const session = await this.ensureSessionRecord(tenant, instanceName);
    const normalized = String(state || '').toLowerCase();
    let nextStatus = session.status;
    if (normalized === 'open' || normalized === 'connected') nextStatus = 'CONNECTED';
    else if (normalized === 'connecting') nextStatus = 'CONNECTING';
    else if (normalized === 'close' || normalized === 'disconnected') nextStatus = 'DISCONNECTED';

    const updateData = { status: nextStatus };
    if (phoneNumber) updateData.phoneNumber = evolutionClient.cleanPhone(phoneNumber);

    await prisma.tenantWhatsAppSession.update({
      where: { id: session.id },
      data: updateData
    });

    if (nextStatus === 'CONNECTED') {
      activeQrCache.delete(tenant.id);
      const syncSettings = this.getSyncSettings(tenant);
      await tenantService.updateTenantSettings(tenant.slug, {
        whatsappSync: {
          ...syncSettings,
          profileName: profileName || syncSettings.profileName || tenant.name,
          connectedAt: syncSettings.connectedAt || new Date().toISOString(),
          lastSyncAt: new Date().toISOString()
        }
      });
    }

    tenantService.invalidateTenantCache(tenant.slug);
    tenantService.invalidateTenantCache(tenant.id);
    return nextStatus;
  }

  async handleWebhookQrUpdate(tenant, { qrBase64, qrCode }) {
    if (!qrBase64 && !qrCode) return;
    let base64 = qrBase64 || null;
    if (!base64 && qrCode) {
      base64 = await this.renderQrDataUrl(qrCode);
    }
    if (base64 && !base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }
    activeQrCache.set(tenant.id, {
      base64,
      code: qrCode || null,
      pairingCode: null,
      mode: 'evolution',
      expiresAt: Date.now() + QR_TTL_MS
    });
  }

  async getHealthMetrics(tenantId) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalContacts, totalSessions, messagesLast24h] = await Promise.all([
      prisma.whatsAppContact.count({ where: { tenantId } }),
      prisma.chatSession.count({ where: { tenantId } }),
      prisma.chatMessage.count({ where: { tenantId, createdAt: { gte: since24h } } })
    ]);
    return { totalContacts, totalSessions, messagesLast24h };
  }

  /**
   * Retorna estado completo de sincronização, QR ativo, preferências e diagnóstico do gateway.
   */
  async getStatus(tenant, requestOrigin = '') {
    const session = await this.ensureSessionRecord(tenant);
    const syncCfg = this.getSyncSettings(tenant);
    const overrideCfg = this.getOverrideCfg(tenant);

    // Consulta estado real na Evolution API (rápido e tolerante a offline)
    const live = await evolutionClient.getConnectionState(session.instanceName, overrideCfg);
    let currentStatus = session.status || 'DISCONNECTED';
    let phoneNumber = session.phoneNumber || null;
    let profileName = syncCfg.profileName || null;

    if (live.reachable) {
      if (live.state === 'open') {
        currentStatus = 'CONNECTED';
        activeQrCache.delete(tenant.id);
        const info = await evolutionClient.fetchInstanceInfo(session.instanceName, overrideCfg);
        if (info?.phoneNumber) phoneNumber = info.phoneNumber;
        if (info?.profileName) profileName = info.profileName;
        if (session.status !== 'CONNECTED' || (phoneNumber && phoneNumber !== session.phoneNumber)) {
          await prisma.tenantWhatsAppSession.update({
            where: { id: session.id },
            data: { status: 'CONNECTED', phoneNumber }
          });
          tenantService.invalidateTenantCache(tenant.slug);
        }
      } else if (live.state === 'connecting') {
        currentStatus = 'QRCODE';
      } else if (live.state === 'close' || live.state === 'not_found') {
        if (session.status === 'CONNECTED') {
          currentStatus = 'DISCONNECTED';
          await prisma.tenantWhatsAppSession.update({
            where: { id: session.id },
            data: { status: 'DISCONNECTED' }
          });
          tenantService.invalidateTenantCache(tenant.slug);
        }
      }
    }

    // Verifica QR code em cache (expira em 45s)
    let qrPayload = null;
    let pairingPayload = null;
    const cachedQr = activeQrCache.get(tenant.id);
    if (cachedQr && currentStatus !== 'CONNECTED') {
      const remainingMs = cachedQr.expiresAt - Date.now();
      if (remainingMs > 0) {
        if (cachedQr.base64) {
          qrPayload = {
            base64: cachedQr.base64,
            expiresAt: new Date(cachedQr.expiresAt).toISOString(),
            ttlSeconds: Math.ceil(remainingMs / 1000)
          };
        }
        if (cachedQr.pairingCode) {
          pairingPayload = {
            code: cachedQr.pairingCode,
            phone: cachedQr.pairingPhone || null,
            expiresAt: new Date(cachedQr.expiresAt).toISOString(),
            ttlSeconds: Math.ceil(remainingMs / 1000)
          };
        }
      } else {
        activeQrCache.delete(tenant.id);
        if (currentStatus === 'QRCODE') {
          currentStatus = 'DISCONNECTED';
          await prisma.tenantWhatsAppSession.update({
            where: { id: session.id },
            data: { status: 'DISCONNECTED' }
          });
        }
      }
    }

    const health = await this.getHealthMetrics(tenant.id);
    const defaultWebhook =
      syncCfg.webhookUrl ||
      session.webhookUrl ||
      (requestOrigin ? `${requestOrigin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp');

    return {
      status: currentStatus,
      isConnected: currentStatus === 'CONNECTED',
      instanceName: session.instanceName,
      phoneNumber,
      profileName,
      connectedAt: syncCfg.connectedAt,
      lastSyncAt: syncCfg.lastSyncAt || session.updatedAt,
      gateway: {
        mode: live.reachable ? 'evolution' : 'sandbox',
        reachable: live.reachable,
        latencyMs: live.latencyMs,
        baseUrl: syncCfg.gatewayUrl || evolutionApi.baseUrl,
        hasCustomCredentials: Boolean(syncCfg.gatewayUrl || syncCfg.gatewayApiKey),
        webhookUrl: defaultWebhook
      },
      qr: qrPayload,
      pairingCode: pairingPayload,
      preferences: syncCfg.preferences,
      health: {
        ...health,
        antiBanActive: tenant?.parsedSettings?.botFeatures?.antiBanEnabled !== false
      }
    };
  }

  /**
   * Inicia a sincronização (gera QR Code ou Código de Pareamento de 8 dígitos).
   */
  async startSync(tenant, { mode = 'qr', phoneNumber = '', requestOrigin = '' } = {}) {
    const session = await this.ensureSessionRecord(tenant);
    const syncCfg = this.getSyncSettings(tenant);
    const overrideCfg = this.getOverrideCfg(tenant);
    const webhookUrl =
      syncCfg.webhookUrl ||
      (requestOrigin ? `${requestOrigin}/api/webhooks/whatsapp` : null);

    const live = await evolutionClient.getConnectionState(session.instanceName, overrideCfg);

    // 1. Caminho Real: Evolution API está online!
    if (live.reachable) {
      if (live.state === 'open') {
        return this.getStatus(tenant, requestOrigin);
      }

      if (live.state === 'not_found') {
        await evolutionClient.createInstance(session.instanceName, overrideCfg);
      }

      if (webhookUrl) {
        await evolutionClient.setWebhook(session.instanceName, webhookUrl, overrideCfg);
      }
      await evolutionClient.setInstanceSettings(session.instanceName, syncCfg.preferences, overrideCfg);

      const connectData = await evolutionClient.connectInstance(
        session.instanceName,
        mode === 'pairing' && phoneNumber ? { number: phoneNumber } : {},
        overrideCfg
      );

      let base64 = connectData?.base64 || connectData?.qrcode?.base64 || null;
      const rawCode = connectData?.code || connectData?.qrcode?.code || null;
      const pairingCode = connectData?.pairingCode || null;

      if (!base64 && rawCode) {
        base64 = await this.renderQrDataUrl(rawCode);
      }
      if (base64 && !base64.startsWith('data:image')) {
        base64 = `data:image/png;base64,${base64}`;
      }

      activeQrCache.set(tenant.id, {
        base64,
        code: rawCode,
        pairingCode,
        pairingPhone: mode === 'pairing' ? evolutionClient.cleanPhone(phoneNumber) : null,
        mode: 'evolution',
        expiresAt: Date.now() + QR_TTL_MS
      });

      await prisma.tenantWhatsAppSession.update({
        where: { id: session.id },
        data: { status: 'QRCODE', webhookUrl: webhookUrl || session.webhookUrl }
      });
      tenantService.invalidateTenantCache(tenant.slug);
      return this.getStatus(tenant, requestOrigin);
    }

    // 2. Modo Sandbox Local (Evolution API offline): gera QR Code real escaneável + pareamento simulado
    const token = crypto.randomBytes(16).toString('hex');
    const qrPayloadString = `neo-whatsapp-sync://pair?instance=${encodeURIComponent(
      session.instanceName
    )}&tenant=${encodeURIComponent(tenant.slug)}&token=${token}&ts=${Date.now()}`;
    const qrBase64 = await this.renderQrDataUrl(qrPayloadString);
    const pairingCode = mode === 'pairing' ? generatePairingCode() : null;

    activeQrCache.set(tenant.id, {
      base64: qrBase64,
      code: qrPayloadString,
      pairingCode,
      pairingPhone: mode === 'pairing' ? evolutionClient.cleanPhone(phoneNumber) : null,
      mode: 'sandbox',
      expiresAt: Date.now() + QR_TTL_MS
    });

    await prisma.tenantWhatsAppSession.update({
      where: { id: session.id },
      data: { status: 'QRCODE', webhookUrl: webhookUrl || session.webhookUrl }
    });
    tenantService.invalidateTenantCache(tenant.slug);
    return this.getStatus(tenant, requestOrigin);
  }

  /**
   * Permite testar o fluxo completo de pareamento localmente quando a Evolution API está offline.
   */
  async confirmSandboxConnection(tenant, { phoneNumber = '', profileName = '', requestOrigin = '' } = {}) {
    const session = await this.ensureSessionRecord(tenant);
    const syncCfg = this.getSyncSettings(tenant);
    const cleanPhone =
      evolutionClient.cleanPhone(phoneNumber) ||
      evolutionClient.cleanPhone(tenant?.parsedSettings?.storeInfo?.phone) ||
      '5551999990001';

    activeQrCache.delete(tenant.id);

    await prisma.tenantWhatsAppSession.update({
      where: { id: session.id },
      data: {
        status: 'CONNECTED',
        phoneNumber: cleanPhone
      }
    });

    await tenantService.updateTenantSettings(tenant.slug, {
      whatsappSync: {
        ...syncCfg,
        profileName: profileName || tenant.name,
        connectedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString()
      }
    });

    if (syncCfg.preferences.syncContactsOnConnect) {
      await crmExtensions.syncContactsFromWhatsApp(tenant).catch(() => {});
    }

    const refreshed = await tenantService.getTenantBySlug(tenant.slug);
    return this.getStatus(refreshed, requestOrigin);
  }

  /**
   * Desconecta a sessão do WhatsApp preservando conversas, contatos e histórico local.
   */
  async disconnect(tenant, requestOrigin = '') {
    const session = await this.ensureSessionRecord(tenant);
    const overrideCfg = this.getOverrideCfg(tenant);

    await evolutionClient.logoutInstance(session.instanceName, overrideCfg);
    activeQrCache.delete(tenant.id);

    await prisma.tenantWhatsAppSession.update({
      where: { id: session.id },
      data: { status: 'DISCONNECTED' }
    });
    tenantService.invalidateTenantCache(tenant.slug);
    return this.getStatus(tenant, requestOrigin);
  }

  /**
   * Redefine a sincronização completamente (limpa credenciais da instância e gera um novo QR Code limpo).
   */
  async resetSync(tenant, requestOrigin = '') {
    const session = await this.ensureSessionRecord(tenant);
    const overrideCfg = this.getOverrideCfg(tenant);

    await evolutionClient.logoutInstance(session.instanceName, overrideCfg);
    await evolutionClient.deleteInstance(session.instanceName, overrideCfg);
    activeQrCache.delete(tenant.id);

    await prisma.tenantWhatsAppSession.update({
      where: { id: session.id },
      data: { status: 'DISCONNECTED', phoneNumber: null }
    });

    const syncCfg = this.getSyncSettings(tenant);
    await tenantService.updateTenantSettings(tenant.slug, {
      whatsappSync: {
        ...syncCfg,
        connectedAt: null,
        lastSyncAt: new Date().toISOString()
      }
    });

    const refreshed = await tenantService.getTenantBySlug(tenant.slug);
    return this.startSync(refreshed, { mode: 'qr', requestOrigin });
  }

  /**
   * Atualiza preferências de comportamento da sincronização e credenciais opcionais do gateway Evolution.
   */
  async updateConfig(tenant, payload = {}, requestOrigin = '') {
    const syncCfg = this.getSyncSettings(tenant);
    const nextPrefs = {
      ...syncCfg.preferences,
      ...(payload.preferences || {})
    };

    const nextSyncSettings = {
      ...syncCfg,
      gatewayUrl: payload.gatewayUrl !== undefined ? String(payload.gatewayUrl || '').trim() : syncCfg.gatewayUrl,
      gatewayApiKey:
        payload.gatewayApiKey !== undefined ? String(payload.gatewayApiKey || '').trim() : syncCfg.gatewayApiKey,
      webhookUrl: payload.webhookUrl !== undefined ? String(payload.webhookUrl || '').trim() : syncCfg.webhookUrl,
      preferences: nextPrefs,
      lastSyncAt: new Date().toISOString()
    };

    if (payload.instanceName) {
      const cleanName = String(payload.instanceName).trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (cleanName.length >= 3) {
        await this.ensureSessionRecord(tenant, cleanName);
      }
    }

    await tenantService.updateTenantSettings(tenant.slug, {
      whatsappSync: nextSyncSettings
    });

    const refreshed = await tenantService.getTenantBySlug(tenant.slug);
    const session = await this.ensureSessionRecord(refreshed);
    const overrideCfg = this.getOverrideCfg(refreshed);
    await evolutionClient.setInstanceSettings(session.instanceName, nextPrefs, overrideCfg);

    return this.getStatus(refreshed, requestOrigin);
  }

  /**
   * Envia mensagem de teste de entrega para confirmar comunicação ponta a ponta.
   */
  async sendTestMessage(tenant, { phone, text }) {
    const session = await this.ensureSessionRecord(tenant);
    if (session.status !== 'CONNECTED') {
      throw new Error('WhatsApp não está sincronizado. Escaneie o QR Code antes de enviar um teste.');
    }

    const cleanPhone = evolutionClient.cleanPhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Informe um número de WhatsApp válido com DDD (ex: 5551999999999).');
    }

    const messageText =
      String(text || '').trim() ||
      `✅ Teste de sincronização NEO (${tenant.name}): seu WhatsApp está conectado e pronto para atender clientes!`;

    const overrideCfg = this.getOverrideCfg(tenant);
    const live = await evolutionClient.getConnectionState(session.instanceName, overrideCfg);

    if (live.reachable && live.state === 'open') {
      const res = await evolutionClient.sendTextMessage(session.instanceName, cleanPhone, messageText);
      return {
        delivered: Boolean(res),
        mode: 'evolution',
        phone: cleanPhone,
        text: messageText,
        sentAt: new Date().toISOString()
      };
    }

    logger.info({ tenantId: tenant.id, phone: cleanPhone }, 'Mensagem de teste registrada em modo sandbox local');
    return {
      delivered: true,
      mode: 'sandbox',
      phone: cleanPhone,
      text: messageText,
      sentAt: new Date().toISOString()
    };
  }
}

module.exports = new WhatsAppSyncService();
