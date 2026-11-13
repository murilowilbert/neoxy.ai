const prisma = require('../../database/prisma');

function parseJsonSafe(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatService(s) {
  if (!s) return s;
  return {
    ...s,
    variants: parseJsonSafe(s.variants, [])
  };
}

function formatAppointment(a) {
  if (!a) return a;
  return {
    ...a,
    service: a.service ? formatService(a.service) : null,
    checkinChecklist: parseJsonSafe(a.checkinChecklist, [])
  };
}

/**
 * Dashboard Metrics & Overview
 */
async function getTenantMetrics(tenantId) {
  const [
    totalCatalog,
    totalServices,
    totalProfessionals,
    totalAppointments,
    pendingDocuments,
    activeSessions,
    totalMessages,
    missedDemands,
    recentSessions,
    allAppointments
  ] = await Promise.all([
    prisma.catalogItem.count({ where: { tenantId } }),
    prisma.serviceItem.count({ where: { tenantId, active: true } }),
    prisma.professional.count({ where: { tenantId, active: true } }),
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
    }),
    prisma.appointment.findMany({
      where: { tenantId, status: { not: 'CANCELLED' } },
      include: { service: true, professional: true }
    })
  ]);

  const handoffSessions = await prisma.chatSession.count({
    where: { tenantId, state: 'HUMAN_HANDOFF' }
  });

  const readyForPickupCount = allAppointments.filter((a) => a.status === 'READY_FOR_PICKUP').length;
  const inProgressCount = allAppointments.filter((a) => a.status === 'IN_PROGRESS').length;

  const soonThreshold = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const dueReturnsCount = allAppointments.filter(
    (a) => a.returnDueAt && new Date(a.returnDueAt) <= soonThreshold && !a.returnNotified
  ).length;

  return {
    totalCatalog,
    totalServices,
    totalProfessionals,
    totalAppointments,
    readyForPickupCount,
    inProgressCount,
    dueReturnsCount,
    pendingDocuments,
    activeSessions,
    handoffSessions,
    totalMessages,
    missedDemands: missedDemands.map((m) => ({
      ...m,
      term: m.productName
    })),
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
 * Professionals / Resources & Commissions CRUD
 */
async function listProfessionals(tenantId) {
  const [pros, appointments] = await Promise.all([
    prisma.professional.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    }),
    prisma.appointment.findMany({
      where: { tenantId, status: { not: 'CANCELLED' } },
      include: { service: true }
    })
  ]);

  return pros.map((p) => {
    const proAppts = appointments.filter((a) => a.professionalId === p.id);
    const totalRevenue = proAppts.reduce(
      (sum, a) => sum + Number(a.agreedPrice ?? a.service?.price ?? 0),
      0
    );
    const totalCommission = (totalRevenue * Number(p.commissionPct || 0)) / 100;

    return {
      ...p,
      appointmentsCount: proAppts.length,
      totalRevenue,
      totalCommission
    };
  });
}

async function createOrUpdateProfessional(tenantId, data) {
  const payload = {
    name: data.name,
    role: data.role || 'Especialista',
    specialty: data.specialty || null,
    commissionPct: Number(data.commissionPct ?? 30),
    phone: data.phone || null,
    active: typeof data.active === 'boolean' ? data.active : true
  };

  if (data.id) {
    return prisma.professional.update({
      where: { id: data.id },
      data: payload
    });
  }

  return prisma.professional.create({
    data: {
      tenantId,
      ...payload
    }
  });
}

async function deleteProfessional(tenantId, professionalId) {
  return prisma.professional.deleteMany({
    where: { id: professionalId, tenantId }
  });
}

/**
 * Services CRUD (with Porte/Complexity Variants & Return Cycle Days)
 */
async function listServices(tenantId) {
  const list = await prisma.serviceItem.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' }
  });
  return list.map(formatService);
}

async function createOrUpdateService(tenantId, data) {
  const variantsJson = Array.isArray(data.variants)
    ? JSON.stringify(data.variants)
    : typeof data.variants === 'string'
    ? data.variants
    : null;

  const returnCycleDays =
    data.returnCycleDays !== undefined && data.returnCycleDays !== '' && data.returnCycleDays !== null
      ? Number(data.returnCycleDays)
      : null;

  if (data.id) {
    const updated = await prisma.serviceItem.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        durationMinutes: Number(data.durationMinutes || 30),
        price: Number(data.price || 0),
        category: data.category || 'Serviços',
        variants: variantsJson,
        returnCycleDays,
        active: typeof data.active === 'boolean' ? data.active : true
      }
    });
    return formatService(updated);
  }

  const created = await prisma.serviceItem.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description || null,
      durationMinutes: Number(data.durationMinutes || 30),
      price: Number(data.price || 0),
      category: data.category || 'Serviços',
      variants: variantsJson,
      returnCycleDays,
      active: true
    }
  });
  return formatService(created);
}

async function deleteService(tenantId, serviceId) {
  return prisma.serviceItem.deleteMany({
    where: { id: serviceId, tenantId }
  });
}

/**
 * Appointments / Service Orders CRUD (with Check-in Checklist, Variants, Professional & Real-time Tracking)
 */
async function listAppointments(tenantId) {
  const list = await prisma.appointment.findMany({
    where: { tenantId },
    include: { service: true, professional: true },
    orderBy: { scheduledAt: 'asc' }
  });
  return list.map(formatAppointment);
}

async function createOrUpdateAppointment(tenantId, data) {
  let serviceObj = null;
  if (data.serviceId) {
    serviceObj = await prisma.serviceItem.findUnique({ where: { id: data.serviceId } });
  }

  const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : new Date();

  // Calcula data de retorno automaticamente caso o serviço tenha ciclo de retorno
  let returnDueAt = data.returnDueAt ? new Date(data.returnDueAt) : null;
  if (!returnDueAt && serviceObj?.returnCycleDays) {
    returnDueAt = new Date(
      scheduledDate.getTime() + Number(serviceObj.returnCycleDays) * 24 * 3600 * 1000
    );
  }

  const checklistJson = Array.isArray(data.checkinChecklist)
    ? JSON.stringify(data.checkinChecklist)
    : typeof data.checkinChecklist === 'string'
    ? data.checkinChecklist
    : JSON.stringify([]);

  const agreedPrice =
    data.agreedPrice !== undefined && data.agreedPrice !== '' && data.agreedPrice !== null
      ? Number(data.agreedPrice)
      : serviceObj
      ? Number(serviceObj.price)
      : null;

  const agreedDuration =
    data.agreedDuration !== undefined && data.agreedDuration !== '' && data.agreedDuration !== null
      ? Number(data.agreedDuration)
      : serviceObj
      ? Number(serviceObj.durationMinutes)
      : null;

  const payload = {
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    serviceId: data.serviceId || null,
    professionalId: data.professionalId || null,
    scheduledAt: scheduledDate,
    status: data.status || 'CONFIRMED',
    variantLabel: data.variantLabel || null,
    agreedPrice,
    agreedDuration,
    checkinChecklist: checklistJson,
    returnDueAt,
    returnNotified: typeof data.returnNotified === 'boolean' ? data.returnNotified : false,
    notes: data.notes || null
  };

  let saved;
  if (data.id) {
    saved = await prisma.appointment.update({
      where: { id: data.id },
      data: payload,
      include: { service: true, professional: true }
    });
  } else {
    saved = await prisma.appointment.create({
      data: {
        tenantId,
        ...payload
      },
      include: { service: true, professional: true }
    });
  }

  // Se mudou para READY_FOR_PICKUP ou se foi solicitado disparo de notificação no WhatsApp, registra na conversa do cliente
  if (data.notifyWhatsAppMessage && saved.customerPhone) {
    await prisma.chatSession.upsert({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone: saved.customerPhone
        }
      },
      update: {
        customerName: saved.customerName,
        lastInteraction: new Date()
      },
      create: {
        tenantId,
        customerPhone: saved.customerPhone,
        customerName: saved.customerName,
        state: 'IDLE'
      }
    });

    await prisma.chatMessage.create({
      data: {
        tenantId,
        customerPhone: saved.customerPhone,
        role: 'model',
        content: data.notifyWhatsAppMessage
      }
    });
  }

  return formatAppointment(saved);
}

async function deleteAppointment(tenantId, appointmentId) {
  return prisma.appointment.deleteMany({
    where: { id: appointmentId, tenantId }
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

async function deleteDocument(tenantId, documentId) {
  return prisma.documentSubmission.deleteMany({
    where: { id: documentId, tenantId }
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
  listProfessionals,
  createOrUpdateProfessional,
  deleteProfessional,
  listServices,
  createOrUpdateService,
  deleteService,
  listAppointments,
  createOrUpdateAppointment,
  deleteAppointment,
  listDocuments,
  createOrUpdateDocument,
  deleteDocument,
  listChatSessionsWithLastMessage,
  toggleHumanHandoff
};
