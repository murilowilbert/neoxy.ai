const prisma = require('../../database/prisma');
const { logger } = require('../../config');

class ChatSessionService {
  async getOrCreateSession(tenantId, customerPhone) {
    let session = await prisma.chatSession.findUnique({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone
        }
      }
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          tenantId,
          customerPhone,
          state: 'IDLE',
          lastInteraction: new Date()
        }
      });
    }

    return session;
  }

  async isSessionPaused(session) {
    if (!session || !session.pausedUntil) return false;
    return new Date(session.pausedUntil) > new Date();
  }

  async pauseSession(tenantId, customerPhone, durationHours = 6) {
    const pausedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    return prisma.chatSession.update({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone
        }
      },
      data: {
        state: 'HUMAN_HANDOFF',
        pausedUntil,
        lastInteraction: new Date()
      }
    });
  }

  async resumeSession(tenantId, customerPhone) {
    const existing = await prisma.chatSession.findUnique({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone
        }
      }
    });
    let nextStateData = null;
    if (existing?.stateData) {
      try {
        const parsed = JSON.parse(existing.stateData);
        parsed.sentiment = 'NEUTRAL';
        parsed.alertResolvedAt = new Date().toISOString();
        nextStateData = JSON.stringify(parsed);
      } catch {
        nextStateData = null;
      }
    }
    return prisma.chatSession.update({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone
        }
      },
      data: {
        state: 'IDLE',
        pausedUntil: null,
        stateData: nextStateData,
        lastInteraction: new Date()
      }
    });
  }

  async updateSessionSentiment(tenantId, customerPhone, { sentiment, reason = null }) {
    const existing = await this.getOrCreateSession(tenantId, customerPhone);
    let parsed = {};
    if (existing?.stateData) {
      try {
        parsed = JSON.parse(existing.stateData);
      } catch {
        parsed = {};
      }
    }
    parsed.sentiment = sentiment;
    parsed.sentimentUpdatedAt = new Date().toISOString();
    if (sentiment === 'URGENT' || sentiment === 'FRUSTRATED') {
      parsed.sentimentReason = reason || (sentiment === 'URGENT' ? 'Cliente em situação urgente' : 'Cliente demonstrou insatisfação');
      parsed.flaggedAt = new Date().toISOString();
    }
    return prisma.chatSession.update({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone
        }
      },
      data: {
        stateData: JSON.stringify(parsed)
      }
    });
  }

  async getRecentHistory(tenantId, customerPhone, limit = 12) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        tenantId,
        customerPhone
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return messages.reverse();
  }

  async appendMessage({ tenantId, customerPhone, role, content, mediaType, mediaUrl, metadata }) {
    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    const msg = await prisma.chatMessage.create({
      data: {
        tenantId,
        customerPhone,
        role,
        content,
        mediaType,
        mediaUrl,
        metadata: metadataStr
      }
    });

    await prisma.chatSession.upsert({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone
        }
      },
      update: { lastInteraction: new Date() },
      create: {
        tenantId,
        customerPhone,
        lastInteraction: new Date()
      }
    });

    return msg;
  }
}

module.exports = new ChatSessionService();
