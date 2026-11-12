const prisma = require('../../database/prisma');
const tenantService = require('../tenants/tenantService');

/**
 * Dashboard Metrics & Overview
 */
async function getTenantMetrics(tenantId) {
  const [
    totalCatalog,
    totalServices,
    totalAppointments,
    pendingDocuments,
    activeSessions,
    totalMessages,
    missedDemands,
    recentSessions
  ] = await Promise.all([
    prisma.catalogItem.count({ where: { tenantId } }),
    prisma.serviceItem.count({ where: { tenantId, active: true } }),
    prisma.appointment.count({ where: { tenantId, status: { not: 'CANCELLED' } } }),
    prisma.documentSubmission.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.chatSession.count({ where: { tenantId } }),
    prisma.chatMessage.count({ where: { tenantId } }),
    prisma.missedDemand.findMany({
      where: { tenantId },
      orderBy: { searchCount: 'desc' },
      take: 6
    }),
    prisma.chatSession.findMany({
      where: { tenantId },
      orderBy: { lastInteraction: 'desc' },
      take: 5
    })
  ]);

  const handoffSessions = await prisma.chatSession.count({
    where: { tenantId, state: 'HUMAN_HANDOFF' }
  });

  return {
    totalCatalog,
    totalServices,
    totalAppointments,
    pendingDocuments,
    activeSessions,
    handoffSessions,
    totalMessages,
    missedDemands,
    recentSessions
  };
}

/**
 * Catalog / Stock CRUD
 */
async function listCatalogItems(tenantId, search = '', limit = 50) {
  const where = { tenantId };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { category: { contains: search } }
    ];
  }

  return prisma.catalogItem.findMany({
    where,
    orderBy: { name: 'asc' },
    take: Number(limit)
  });
}

async function upsertCatalogItem(tenantId, data) {
  const code = String(data.code || `ITEM-${Date.now()}`).trim();
  return prisma.catalogItem.upsert({
    where: {
      tenantId_code: {
        tenantId,
        code
      }
    },
    update: {
      name: data.name,
      description: data.description || null,
      price: Number(data.price || 0),
      stockQty: Number(data.stockQty || 0),
      category: data.category || 'Geral',
      brand: data.brand || null
    },
    create: {
      tenantId,
      code,
      name: data.name,
      description: data.description || null,
      price: Number(data.price || 0),
      stockQty: Number(data.stockQty || 0),
      category: data.category || 'Geral',
      brand: data.brand || null
    }
  });
}

async function deleteCatalogItem(tenantId, itemId) {
  return prisma.catalogItem.deleteMany({
    where: { id: itemId, tenantId }
  });
}

/**
 * Services CRUD
 */
async function listServices(tenantId) {
  return prisma.serviceItem.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' }
  });
}

async function createOrUpdateService(tenantId, data) {
  if (data.id) {
    return prisma.serviceItem.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        durationMinutes: Number(data.durationMinutes || 30),
        price: Number(data.price || 0),
        category: data.category || 'Serviços',
        active: typeof data.active === 'boolean' ? data.active : true
      }
    });
  }
  return prisma.serviceItem.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description || null,
      durationMinutes: Number(data.durationMinutes || 30),
      price: Number(data.price || 0),
      category: data.category || 'Serviços',
      active: true
    }
  });
}

async function deleteService(tenantId, serviceId) {
  return prisma.serviceItem.deleteMany({
    where: { id: serviceId, tenantId }
  });
}

/**
 * Appointments CRUD
 */
async function listAppointments(tenantId) {
  return prisma.appointment.findMany({
    where: { tenantId },
    include: { service: true },
    orderBy: { scheduledAt: 'asc' }
  });
}

async function createOrUpdateAppointment(tenantId, data) {
  if (data.id) {
    return prisma.appointment.update({
      where: { id: data.id },
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        serviceId: data.serviceId || null,
        scheduledAt: new Date(data.scheduledAt),
        status: data.status || 'CONFIRMED',
        notes: data.notes || null
      },
      include: { service: true }
    });
  }
  return prisma.appointment.create({
    data: {
      tenantId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: data.serviceId || null,
      scheduledAt: new Date(data.scheduledAt),
      status: data.status || 'CONFIRMED',
      notes: data.notes || null
    },
    include: { service: true }
  });
}

/**
 * Documents / Bills Submission CRUD (Escritórios / Contabilidade / Financeiro)
 */
async function listDocuments(tenantId) {
  return prisma.documentSubmission.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

async function createOrUpdateDocument(tenantId, data) {
  if (data.id) {
    return prisma.documentSubmission.update({
      where: { id: data.id },
      data: {
        title: data.title,
        docType: data.docType || 'BOLETO',
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        amount: data.amount !== undefined ? Number(data.amount) : null,
        dueDate: data.dueDate || null,
        status: data.status || 'PENDING',
        aiSummary: data.aiSummary || null
      }
    });
  }
  return prisma.documentSubmission.create({
    data: {
      tenantId,
      title: data.title,
      docType: data.docType || 'BOLETO',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      amount: data.amount !== undefined ? Number(data.amount) : null,
      dueDate: data.dueDate || null,
      status: data.status || 'PENDING',
      aiSummary: data.aiSummary || null
    }
  });
}

/**
 * Live Inbox & Human Handoff Control
 */
async function listChatSessionsWithLastMessage(tenantId) {
  const sessions = await prisma.chatSession.findMany({
    where: { tenantId },
    orderBy: { lastInteraction: 'desc' }
  });

  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const messages = await prisma.chatMessage.findMany({
        where: { tenantId, customerPhone: s.customerPhone },
        orderBy: { createdAt: 'asc' },
        take: 30
      });
      return {
        ...s,
        messages
      };
    })
  );

  return enriched;
}

async function toggleHumanHandoff(tenantId, customerPhone, pauseForHuman = true) {
  const pausedUntil = pauseForHuman ? new Date(Date.now() + 4 * 60 * 60 * 1000) : null;
  const state = pauseForHuman ? 'HUMAN_HANDOFF' : 'IDLE';

  return prisma.chatSession.upsert({
    where: {
      tenantId_customerPhone: {
        tenantId,
        customerPhone
      }
    },
    update: {
      state,
      pausedUntil,
      lastInteraction: new Date()
    },
    create: {
      tenantId,
      customerPhone,
      state,
      pausedUntil
    }
  });
}

module.exports = {
  getTenantMetrics,
  listCatalogItems,
  upsertCatalogItem,
  deleteCatalogItem,
  listServices,
  createOrUpdateService,
  deleteService,
  listAppointments,
  createOrUpdateAppointment,
  listDocuments,
  createOrUpdateDocument,
  listChatSessionsWithLastMessage,
  toggleHumanHandoff
};
