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
        lastInteraction: new Date()
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
