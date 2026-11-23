const { logger } = require('../../config');

/**
 * Camada Anti-Banimento e Ritmo Humano (HumanEntropy + Jitter + Rate Limiter).
 * Inspirado em kobie3717/baileys-antiban e DeskcommCRM.
 */
class AntiBanService {
  constructor() {
    // tenantId -> array de timestamps (ms) de envios no último minuto
    this.outboundWindows = new Map();
  }

  getConfig(tenant) {
    const cfg = tenant?.parsedSettings?.botFeatures || {};
    return {
      enabled: cfg.antiBanEnabled !== false, // Ativo por padrão
      maxMessagesPerMinute: Number(cfg.maxMessagesPerMinute || 20),
      minReadDelayMs: Number(cfg.minReadDelayMs || 1200),
      maxReadDelayMs: Number(cfg.maxReadDelayMs || 3200),
      charsPerSecond: Number(cfg.typingCharsPerSecond || 48)
    };
  }

  randomBetween(min, max) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  }

  /**
   * Calcula tempo realista de "digitando..." proporcional ao tamanho do texto + jitter humano.
   */
  computeTypingDelayMs(text, tenant) {
    const cfg = this.getConfig(tenant);
    if (!cfg.enabled) return 600;
    const len = String(text || '').length;
    const baseMs = Math.round((len / Math.max(15, cfg.charsPerSecond)) * 1000);
    const clamped = Math.min(6200, Math.max(1100, baseMs));
    const jitter = this.randomBetween(-250, 450);
    return Math.max(900, clamped + jitter);
  }

  /**
   * Tempo aleatório de leitura antes de marcar como lido (dois riscos azuis).
   */
  computeReadDelayMs(tenant) {
    const cfg = this.getConfig(tenant);
    if (!cfg.enabled) return 0;
    return this.randomBetween(cfg.minReadDelayMs, cfg.maxReadDelayMs);
  }

  /**
   * Pausa aleatória entre bolhas de texto para evitar padrão robótico fixo.
   */
  computeBubbleJitterMs(tenant) {
    const cfg = this.getConfig(tenant);
    if (!cfg.enabled) return 400;
    return this.randomBetween(700, 1650);
  }

  /**
   * Controla limite de disparos por minuto por estabelecimento (janela deslizante de 60s).
   */
  async enforceRateLimit(tenant) {
    const cfg = this.getConfig(tenant);
    if (!cfg.enabled || !tenant?.id) return { throttled: false, remaining: cfg.maxMessagesPerMinute };

    const now = Date.now();
    const windowMs = 60 * 1000;
    const prev = (this.outboundWindows.get(tenant.id) || []).filter((ts) => now - ts < windowMs);

    if (prev.length >= cfg.maxMessagesPerMinute) {
      const oldest = prev[0];
      const waitMs = Math.min(5000, Math.max(500, windowMs - (now - oldest) + 250));
      logger.warn(
        { tenantId: tenant.id, count: prev.length, waitMs },
        'Anti-Ban throttle ativado: aguardando janela segura de envio'
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }

    prev.push(Date.now());
    this.outboundWindows.set(tenant.id, prev);
    return {
      throttled: prev.length > cfg.maxMessagesPerMinute,
      remaining: Math.max(0, cfg.maxMessagesPerMinute - prev.length)
    };
  }

  sleep(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = new AntiBanService();
