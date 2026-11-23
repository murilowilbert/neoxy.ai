const prisma = require('../../database/prisma');
const evolutionClient = require('../whatsapp/evolutionClient');

function parseJsonSafe(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

// =========================================================================
// 1. ANALYTICS EXECUTIVO (MENSAGENS/DIA, IA VS HUMANO, DEMANDAS)
// =========================================================================
async function getTenantAnalytics(tenantId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 86400000);

  const [
    recentMessages,
    allSessions,
    allMessagesSummary,
    existingDemands,
    missedDemands,
    activePromotionsCount,
    blockedContactsCount,
    totalContactsCount
  ] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } },
      select: { role: true, createdAt: true, customerPhone: true, metadata: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.chatSession.findMany({
      where: { tenantId },
      select: { customerPhone: true, state: true, pausedUntil: true, lastInteraction: true }
    }),
    prisma.chatMessage.findMany({
      where: { tenantId },
      select: { role: true, customerPhone: true, metadata: true }
    }),
    prisma.demandTracker.findMany({
      where: { tenantId },
      orderBy: { searchCount: 'desc' },
      take: 8
    }),
    prisma.missedDemand.findMany({
      where: { tenantId },
      orderBy: { searchCount: 'desc' },
      take: 8
    }),
    prisma.promotion.count({ where: { tenantId, active: true } }),
    prisma.whatsAppContact.count({ where: { tenantId, aiBlocked: true } }),
    prisma.whatsAppContact.count({ where: { tenantId } })
  ]);

  // Buckets por hora hoje (00h..23h)
  const hourlyMap = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}h`,
    received: 0,
    aiReplies: 0,
    humanReplies: 0
  }));

  // Buckets dos últimos 7 dias
  const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dailyBuckets = [];
  const dailyIndex = new Map();
  for (let i = 0; i < 7; i++) {
    const dt = new Date(sevenDaysAgo.getTime() + i * 86400000);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const entry = {
      date: iso,
      label: `${dayNamesShort[dt.getDay()]} ${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`,
      shortLabel: dayNamesShort[dt.getDay()],
      received: 0,
      aiReplies: 0,
      humanReplies: 0
    };
    dailyIndex.set(iso, entry);
    dailyBuckets.push(entry);
  }

  let messagesTodayReceived = 0;
  let messagesTodayAi = 0;
  let messagesTodayHuman = 0;

  for (const msg of recentMessages) {
    const dt = new Date(msg.createdAt);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const dBucket = dailyIndex.get(iso);
    if (dBucket) {
      if (msg.role === 'user') dBucket.received += 1;
      else if (msg.role === 'model') dBucket.aiReplies += 1;
      else if (msg.role === 'human_agent') dBucket.humanReplies += 1;
    }

    if (dt >= startOfToday) {
      const h = dt.getHours();
      if (msg.role === 'user') {
        hourlyMap[h].received += 1;
        messagesTodayReceived += 1;
      } else if (msg.role === 'model') {
        hourlyMap[h].aiReplies += 1;
        messagesTodayAi += 1;
      } else if (msg.role === 'human_agent') {
        hourlyMap[h].humanReplies += 1;
        messagesTodayHuman += 1;
      }
    }
  }

  // Cálculo IA 100% vs Intervenção Humana por atendimento (sessão)
  const humanIntervenedPhones = new Set();
  let aiMessagesTotal = 0;
  let humanMessagesTotal = 0;
  let userMessagesTotal = 0;

  for (const s of allSessions) {
    if (s.state === 'HUMAN_HANDOFF' || s.pausedUntil) {
      humanIntervenedPhones.add(s.customerPhone);
    }
  }

  for (const m of allMessagesSummary) {
    if (m.role === 'user') userMessagesTotal += 1;
    if (m.role === 'model') {
      aiMessagesTotal += 1;
      const meta = parseJsonSafe(m.metadata, {});
      if (meta && meta.isHandoff) {
        humanIntervenedPhones.add(m.customerPhone);
      }
    }
    if (m.role === 'human_agent') {
      humanMessagesTotal += 1;
      humanIntervenedPhones.add(m.customerPhone);
    }
  }

  const allPhones = new Set([
    ...allSessions.map((s) => s.customerPhone),
    ...allMessagesSummary.map((m) => m.customerPhone)
  ]);

  const totalConversations = allPhones.size;
  const humanIntervenedSessions = Array.from(allPhones).filter((p) =>
    humanIntervenedPhones.has(p)
  ).length;
  const aiOnlySessions = Math.max(0, totalConversations - humanIntervenedSessions);
  const automationRatePct =
    totalConversations > 0
      ? Math.round((aiOnlySessions / totalConversations) * 100)
      : 100;

  // Radar de conversas frias / aguardando humano
  const coldThresholdMs = 2 * 60 * 60 * 1000;
  let coldConversationsCount = 0;
  for (const s of allSessions) {
    const isHandoff = s.state === 'HUMAN_HANDOFF';
    const isOld = now.getTime() - new Date(s.lastInteraction).getTime() > coldThresholdMs;
    if (isHandoff || isOld) coldConversationsCount += 1;
  }

  return {
    messagesToday: {
      received: messagesTodayReceived,
      aiReplies: messagesTodayAi,
      humanReplies: messagesTodayHuman,
      total: messagesTodayReceived + messagesTodayAi + messagesTodayHuman
    },
    messagesByHourToday: hourlyMap,
    messagesLast7Days: dailyBuckets,
    aiVsHuman: {
      totalConversations,
      aiOnlySessions,
      humanIntervenedSessions,
      automationRatePct,
      aiMessagesTotal,
      humanMessagesTotal,
      userMessagesTotal
    },
    topExistingDemands: existingDemands.map((d) => ({
      id: d.id,
      itemType: d.itemType,
      name: d.itemName,
      searchCount: d.searchCount,
      lastRequested: d.lastRequested,
      inCatalog: true
    })),
    topMissedDemands: missedDemands.map((m) => ({
      id: m.id,
      itemType: 'MISSING',
      name: m.productName,
      searchCount: m.searchCount,
      occurrences: parseJsonSafe(m.occurrences, []),
      lastRequested: m.lastRequested,
      inCatalog: false
    })),
    activePromotionsCount,
    blockedContactsCount,
    totalContactsCount,
    coldConversationsCount
  };
}

// =========================================================================
// 2. CONTATOS WHATSAPP & BLOQUEIO SELETIVO DE IA
// =========================================================================
function formatContact(c) {
  if (!c) return c;
  return {
    ...c,
    tags: parseJsonSafe(c.tags, [])
  };
}

async function listContacts(tenantId, search = '', filter = 'all') {
  // Garante que telefones das sessões de chat apareçam na lista de contatos
  const sessions = await prisma.chatSession.findMany({
    where: { tenantId },
    select: { customerPhone: true, customerName: true, lastInteraction: true }
  });

  for (const s of sessions) {
    const phone = normalizePhone(s.customerPhone);
    if (!phone) continue;
    await prisma.whatsAppContact.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: {
        lastMessageAt: s.lastInteraction,
        ...(s.customerName ? { name: s.customerName } : {})
      },
      create: {
        tenantId,
        phone,
        name: s.customerName || null,
        source: 'whatsapp',
        lastMessageAt: s.lastInteraction
      }
    });
  }

  const where = { tenantId };
  if (filter === 'blocked') where.aiBlocked = true;
  if (filter === 'allowed') where.aiBlocked = false;

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { phone: { contains: q } },
      { name: { contains: q } },
      { pushName: { contains: q } },
      { tags: { contains: q } },
      { notes: { contains: q } }
    ];
  }

  const contacts = await prisma.whatsAppContact.findMany({
    where,
    orderBy: [{ aiBlocked: 'desc' }, { lastMessageAt: 'desc' }, { createdAt: 'desc' }]
  });

  return contacts.map(formatContact);
}

async function upsertContact(tenantId, data) {
  const phone = normalizePhone(data.phone);
  if (!phone || phone.length < 8) {
    throw new Error('Informe um número de telefone válido com DDD (ex: 5551999998888).');
  }

  const tagsArr = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t).trim()).filter(Boolean)
    : typeof data.tags === 'string' && data.tags.trim()
    ? data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const payload = {
    name: data.name ? String(data.name).trim() : null,
    pushName: data.pushName ? String(data.pushName).trim() : undefined,
    avatarUrl: data.avatarUrl ? String(data.avatarUrl).trim() : undefined,
    aiBlocked: data.aiBlocked !== undefined ? Boolean(data.aiBlocked) : undefined,
    tags: JSON.stringify(tagsArr),
    notes: data.notes !== undefined ? (data.notes ? String(data.notes).trim() : null) : undefined,
    source: data.source || 'manual'
  };

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const saved = await prisma.whatsAppContact.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    update: payload,
    create: {
      tenantId,
      phone,
      name: payload.name || null,
      pushName: payload.pushName || null,
      avatarUrl: payload.avatarUrl || null,
      aiBlocked: Boolean(data.aiBlocked),
      tags: payload.tags || '[]',
      notes: payload.notes || null,
      source: data.source || 'manual'
    }
  });

  return formatContact(saved);
}

async function toggleContactAiBlock(tenantId, phoneRaw, aiBlocked) {
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw new Error('Número de telefone inválido.');

  const updated = await prisma.whatsAppContact.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    update: { aiBlocked: Boolean(aiBlocked) },
    create: {
      tenantId,
      phone,
      aiBlocked: Boolean(aiBlocked),
      source: 'whatsapp'
    }
  });

  return formatContact(updated);
}

async function deleteContact(tenantId, contactId) {
  return prisma.whatsAppContact.deleteMany({
    where: { id: contactId, tenantId }
  });
}

async function syncContactsFromWhatsApp(tenant) {
  const tenantId = tenant.id;
  const accounts = await prisma.tenantWhatsAppSession.findMany({ where: { tenantId } });
  const instanceName = accounts[0]?.instanceName || null;

  let syncedFromEvolution = 0;
  if (instanceName) {
    const evoContacts = await evolutionClient.fetchContacts(instanceName);
    for (const c of evoContacts) {
      let avatarUrl = c.avatarUrl || null;
      if (!avatarUrl && syncedFromEvolution < 30) {
        avatarUrl = await evolutionClient.fetchProfilePictureUrl(instanceName, c.phone);
      }
      await prisma.whatsAppContact.upsert({
        where: { tenantId_phone: { tenantId, phone: c.phone } },
        update: {
          ...(c.pushName ? { pushName: c.pushName } : {}),
          ...(c.name ? { name: c.name } : {}),
          ...(avatarUrl ? { avatarUrl } : {})
        },
        create: {
          tenantId,
          phone: c.phone,
          name: c.name || c.pushName || null,
          pushName: c.pushName || null,
          avatarUrl,
          source: 'evolution_sync'
        }
      });
      syncedFromEvolution += 1;
    }
  }

  // Também puxa telefones de Agendamentos e Sessões de Chat
  const [sessions, appointments] = await Promise.all([
    prisma.chatSession.findMany({ where: { tenantId } }),
    prisma.appointment.findMany({ where: { tenantId } })
  ]);

  let syncedLocal = 0;
  for (const s of sessions) {
    const phone = normalizePhone(s.customerPhone);
    if (!phone) continue;
    await prisma.whatsAppContact.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: { lastMessageAt: s.lastInteraction },
      create: {
        tenantId,
        phone,
        name: s.customerName || null,
        source: 'whatsapp',
        lastMessageAt: s.lastInteraction
      }
    });
    syncedLocal += 1;
  }

  for (const a of appointments) {
    const phone = normalizePhone(a.customerPhone);
    if (!phone) continue;
    await prisma.whatsAppContact.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: a.customerName ? { name: a.customerName } : {},
      create: {
        tenantId,
        phone,
        name: a.customerName || null,
        source: 'whatsapp'
      }
    });
    syncedLocal += 1;
  }

  const all = await listContacts(tenantId);
  return {
    syncedFromEvolution,
    syncedLocal,
    total: all.length,
    contacts: all
  };
}

async function isPhoneAiBlocked(tenantId, phoneRaw) {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return false;
  const contact = await prisma.whatsAppContact.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
    select: { aiBlocked: true }
  });
  return Boolean(contact?.aiBlocked);
}

async function touchContact(tenantId, phoneRaw, name = null) {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;
  return prisma.whatsAppContact.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    update: {
      lastMessageAt: new Date(),
      ...(name ? { name } : {})
    },
    create: {
      tenantId,
      phone,
      name: name || null,
      source: 'whatsapp',
      lastMessageAt: new Date()
    }
  });
}

// =========================================================================
// 3. PROMOÇÕES & PRECIFICAÇÃO DINÂMICA (PRODUTOS & SERVIÇOS — MANUAL OU %)
// =========================================================================
function formatPromotion(p) {
  if (!p) return p;
  return {
    ...p,
    appliesTo: p.appliesTo || 'PRODUCTS',
    targetItemIds: parseJsonSafe(p.targetItemIds, []),
    targetServiceIds: parseJsonSafe(p.targetServiceIds, [])
  };
}

function isPromotionCurrentlyValid(promo, now = new Date()) {
  if (!promo || !promo.active) return false;
  if (promo.startsAt && new Date(promo.startsAt) > now) return false;
  if (promo.endsAt && new Date(promo.endsAt) < now) return false;
  return true;
}

function computePromotionalPrice(basePrice, promo) {
  const base = Number(basePrice) || 0;
  if (base <= 0 || !promo) return base;
  if (promo.discountType === 'FIXED_PRICE') {
    const fixed = Number(promo.discountValue);
    return fixed > 0 && fixed < base ? Number(fixed.toFixed(2)) : base;
  }
  const pct = Math.min(95, Math.max(0, Number(promo.discountValue) || 0));
  return Number((base * (1 - pct / 100)).toFixed(2));
}

function doesPromotionApplyToProduct(promo, item) {
  if (!promo || !item) return false;
  const appliesTo = promo.appliesTo || 'PRODUCTS';
  if (appliesTo !== 'PRODUCTS' && appliesTo !== 'BOTH') return false;
  if (promo.scope === 'ALL') return true;
  if (promo.scope === 'CATEGORY') {
    return (
      promo.targetCategory &&
      String(item.category || '').toLowerCase() === String(promo.targetCategory).toLowerCase()
    );
  }
  if (promo.scope === 'PRODUCTS') {
    const ids = Array.isArray(promo.targetItemIds)
      ? promo.targetItemIds
      : parseJsonSafe(promo.targetItemIds, []);
    return ids.includes(item.id) || ids.includes(item.code);
  }
  return false;
}

function doesPromotionApplyToService(promo, srv) {
  if (!promo || !srv) return false;
  const appliesTo = promo.appliesTo || 'PRODUCTS';
  if (appliesTo !== 'SERVICES' && appliesTo !== 'BOTH') return false;
  if (promo.scope === 'ALL') return true;
  if (promo.scope === 'CATEGORY') {
    return (
      promo.targetCategory &&
      String(srv.category || '').toLowerCase() === String(promo.targetCategory).toLowerCase()
    );
  }
  if (promo.scope === 'PRODUCTS') {
    const ids = Array.isArray(promo.targetServiceIds)
      ? promo.targetServiceIds
      : parseJsonSafe(promo.targetServiceIds, []);
    return ids.includes(srv.id) || (srv.sku && ids.includes(srv.sku));
  }
  return false;
}

async function listPromotions(tenantId) {
  const [promos, items, services] = await Promise.all([
    prisma.promotion.findMany({
      where: { tenantId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.catalogItem.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true, price: true, category: true }
    }),
    prisma.serviceItem.findMany({
      where: { tenantId, active: true },
      select: { id: true, sku: true, name: true, price: true, category: true }
    })
  ]);

  return promos.map((raw) => {
    const p = formatPromotion(raw);
    const affectedProducts = items.filter((it) => doesPromotionApplyToProduct(p, it));
    const affectedServices = services.filter((sv) => doesPromotionApplyToService(p, sv));
    const combined = [
      ...affectedProducts.map((it) => ({
        id: it.id,
        kind: 'PRODUCT',
        name: it.name,
        originalPrice: it.price,
        promoPrice: computePromotionalPrice(it.price, p)
      })),
      ...affectedServices.map((sv) => ({
        id: sv.id,
        kind: 'SERVICE',
        name: sv.name,
        originalPrice: sv.price,
        promoPrice: computePromotionalPrice(sv.price, p)
      }))
    ];
    return {
      ...p,
      affectedCount: combined.length,
      sampleItems: combined.slice(0, 5)
    };
  });
}

async function upsertPromotion(tenantId, data) {
  const name = String(data.name || '').trim();
  if (!name) throw new Error('Informe o nome da promoção.');

  const appliesTo = ['PRODUCTS', 'SERVICES', 'BOTH'].includes(data.appliesTo)
    ? data.appliesTo
    : 'PRODUCTS';
  const discountType = data.discountType === 'FIXED_PRICE' ? 'FIXED_PRICE' : 'PERCENT';
  const discountValue = Number(String(data.discountValue ?? 0).replace(',', '.'));
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error(
      discountType === 'PERCENT'
        ? 'Informe uma porcentagem de desconto válida (ex: 15).'
        : 'Informe o preço promocional fixo válido.'
    );
  }

  const scope = ['ALL', 'CATEGORY', 'PRODUCTS'].includes(data.scope) ? data.scope : 'PRODUCTS';
  const targetIds = Array.isArray(data.targetItemIds) ? data.targetItemIds.filter(Boolean) : [];
  const targetSvcIds = Array.isArray(data.targetServiceIds)
    ? data.targetServiceIds.filter(Boolean)
    : [];

  const payload = {
    name,
    description: data.description ? String(data.description).trim() : null,
    appliesTo,
    discountType,
    discountValue,
    scope,
    targetCategory: scope === 'CATEGORY' && data.targetCategory ? String(data.targetCategory).trim() : null,
    targetItemIds: scope === 'PRODUCTS' ? JSON.stringify(targetIds) : null,
    targetServiceIds: scope === 'PRODUCTS' ? JSON.stringify(targetSvcIds) : null,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    active: data.active !== undefined ? Boolean(data.active) : true
  };

  if (data.id) {
    const updated = await prisma.promotion.update({
      where: { id: data.id },
      data: payload
    });
    return formatPromotion(updated);
  }

  const created = await prisma.promotion.create({
    data: { tenantId, ...payload }
  });
  return formatPromotion(created);
}

async function togglePromotion(tenantId, promoId, active) {
  const existing = await prisma.promotion.findFirst({ where: { id: promoId, tenantId } });
  if (!existing) throw new Error('Promoção não encontrada.');
  const updated = await prisma.promotion.update({
    where: { id: promoId },
    data: { active: Boolean(active) }
  });
  return formatPromotion(updated);
}

async function deletePromotion(tenantId, promoId) {
  return prisma.promotion.deleteMany({
    where: { id: promoId, tenantId }
  });
}

async function getActivePromotions(tenantId) {
  const promos = await prisma.promotion.findMany({
    where: { tenantId, active: true },
    orderBy: { createdAt: 'desc' }
  });
  const now = new Date();
  return promos.map(formatPromotion).filter((p) => isPromotionCurrentlyValid(p, now));
}

function annotateListWithPromotions(list, activePromotions, matchFn) {
  if (!Array.isArray(list) || !activePromotions || activePromotions.length === 0) {
    return (list || []).map((item) => ({
      ...item,
      effectivePrice: item.price,
      discountPct: 0,
      activePromotion: null
    }));
  }

  return list.map((item) => {
    let bestPrice = Number(item.price) || 0;
    let bestPromo = null;

    for (const promo of activePromotions) {
      if (!matchFn(promo, item)) continue;
      const candidate = computePromotionalPrice(item.price, promo);
      if (candidate < bestPrice) {
        bestPrice = candidate;
        bestPromo = promo;
      }
    }

    const base = Number(item.price) || 0;
    const discountPct =
      bestPromo && base > 0 ? Math.round(((base - bestPrice) / base) * 100) : 0;

    return {
      ...item,
      effectivePrice: bestPrice,
      discountPct,
      activePromotion: bestPromo
        ? {
            id: bestPromo.id,
            name: bestPromo.name,
            discountType: bestPromo.discountType,
            discountValue: bestPromo.discountValue,
            endsAt: bestPromo.endsAt
          }
        : null
    };
  });
}

function annotateCatalogWithPromotions(items, activePromotions) {
  return annotateListWithPromotions(items, activePromotions, doesPromotionApplyToProduct);
}

function annotateServicesWithPromotions(services, activePromotions) {
  return annotateListWithPromotions(services, activePromotions, doesPromotionApplyToService);
}

// =========================================================================
// 4. RESPOSTAS RÁPIDAS & GATILHOS AUTOMÁTICOS (CHATWOOT / WHATOMATE PATTERN)
// =========================================================================
async function listQuickReplies(tenantId) {
  return prisma.quickReply.findMany({
    where: { tenantId },
    orderBy: [{ autoTrigger: 'desc' }, { usageCount: 'desc' }, { shortcut: 'asc' }]
  });
}

async function upsertQuickReply(tenantId, data) {
  let shortcut = String(data.shortcut || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!shortcut) throw new Error('Informe o atalho (ex: /pix ou /endereco).');
  if (!shortcut.startsWith('/')) shortcut = `/${shortcut}`;

  const title = String(data.title || shortcut).trim();
  const content = String(data.content || '').trim();
  if (!content) throw new Error('Informe o texto da resposta rápida.');

  const payload = {
    shortcut,
    title,
    content,
    category: data.category || 'ATENDIMENTO',
    triggerKeywords: data.triggerKeywords ? String(data.triggerKeywords).trim() : null,
    autoTrigger: Boolean(data.autoTrigger),
    triggerHandoff: Boolean(data.triggerHandoff),
    active: data.active !== undefined ? Boolean(data.active) : true
  };

  if (data.id) {
    return prisma.quickReply.update({
      where: { id: data.id },
      data: payload
    });
  }

  return prisma.quickReply.upsert({
    where: { tenantId_shortcut: { tenantId, shortcut } },
    update: payload,
    create: { tenantId, ...payload }
  });
}

async function deleteQuickReply(tenantId, id) {
  return prisma.quickReply.deleteMany({
    where: { id, tenantId }
  });
}

function renderQuickReplyVariables(content, tenant, customerName = '') {
  const settings = tenant?.parsedSettings || {};
  const storeInfo = settings.storeInfo || {};
  const address = storeInfo.address || 'Consulte nosso endereço no atendimento';

  return String(content || '')
    .replace(/\{\{cliente\}\}/gi, customerName || 'cliente')
    .replace(/\{\{empresa\}\}/gi, tenant?.name || '')
    .replace(/\{\{endereco\}\}/gi, address)
    .replace(/\{\{site\}\}/gi, storeInfo.website || '')
    .replace(/\{\{instagram\}\}/gi, storeInfo.socialLinks?.instagram || '');
}

async function matchAutoQuickReply(tenant, incomingText, customerName = '') {
  if (!incomingText || !incomingText.trim()) return null;
  const normalized = incomingText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const replies = await prisma.quickReply.findMany({
    where: { tenantId: tenant.id, active: true, autoTrigger: true }
  });

  for (const qr of replies) {
    if (!qr.triggerKeywords) continue;
    const keywords = qr.triggerKeywords
      .split(',')
      .map((k) =>
        k
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      )
      .filter((k) => k.length >= 2);

    if (keywords.some((kw) => normalized.includes(kw))) {
      await prisma.quickReply
        .update({
          where: { id: qr.id },
          data: { usageCount: { increment: 1 } }
        })
        .catch(() => {});

      return {
        quickReply: qr,
        renderedText: renderQuickReplyVariables(qr.content, tenant, customerName),
        triggerHandoff: Boolean(qr.triggerHandoff)
      };
    }
  }

  return null;
}

// =========================================================================
// 5. RADAR DE FOLLOW-UP (DESKCOMMCRM PATTERN)
// =========================================================================
async function getFollowUpRadar(tenantId) {
  const sessions = await prisma.chatSession.findMany({
    where: { tenantId },
    orderBy: { lastInteraction: 'desc' },
    take: 50
  });

  const now = Date.now();
  const items = [];

  for (const s of sessions) {
    const lastMsg = await prisma.chatMessage.findFirst({
      where: { tenantId, customerPhone: s.customerPhone },
      orderBy: { createdAt: 'desc' }
    });
    const waitMinutes = Math.max(
      1,
      Math.round((now - new Date(s.lastInteraction).getTime()) / 60000)
    );
    const isHandoff = s.state === 'HUMAN_HANDOFF';
    const awaitingReply = lastMsg?.role === 'user';

    if (isHandoff || awaitingReply || waitMinutes >= 60) {
      items.push({
        id: s.id,
        customerPhone: s.customerPhone,
        customerName: s.customerName || s.customerPhone,
        state: s.state,
        waitMinutes,
        lastMessageRole: lastMsg?.role || null,
        lastMessageText: lastMsg?.content || '',
        lastInteraction: s.lastInteraction,
        priority: isHandoff ? 'URGENT' : awaitingReply ? 'HIGH' : 'FOLLOW_UP',
        reason: isHandoff
          ? 'Aguardando atendente humano (IA pausada)'
          : awaitingReply
          ? 'Última mensagem foi do cliente sem retorno'
          : 'Conversa parada — oportunidade de follow-up'
      });
    }
  }

  return items;
}

// =========================================================================
// 6. RASTREAMENTO DE DEMANDAS (EM CATÁLOGO + SEM CADASTRO)
// =========================================================================
async function recordExistingDemand(tenantId, { itemType = 'PRODUCT', itemName, catalogItemId = null, serviceItemId = null }) {
  const cleanName = String(itemName || '').trim();
  if (!cleanName) return null;

  return prisma.demandTracker.upsert({
    where: {
      tenantId_itemType_itemName: {
        tenantId,
        itemType,
        itemName: cleanName
      }
    },
    update: {
      searchCount: { increment: 1 },
      lastRequested: new Date(),
      ...(catalogItemId ? { catalogItemId } : {}),
      ...(serviceItemId ? { serviceItemId } : {})
    },
    create: {
      tenantId,
      itemType,
      itemName: cleanName,
      catalogItemId,
      serviceItemId,
      searchCount: 1
    }
  });
}

async function recordMissedDemand(tenantId, productName, occurrence = null) {
  const cleanName = String(productName || '').trim();
  if (!cleanName || cleanName.length < 2) return null;

  const existing = await prisma.missedDemand.findUnique({
    where: { tenantId_productName: { tenantId, productName: cleanName } }
  });

  const prevList = existing ? parseJsonSafe(existing.occurrences, []) : [];
  const nextList = Array.isArray(prevList) ? [...prevList] : [];

  if (occurrence && occurrence.customerPhone) {
    nextList.unshift({
      customerPhone: normalizePhone(occurrence.customerPhone),
      customerName: occurrence.customerName || occurrence.customerPhone,
      messageSnippet: String(occurrence.messageSnippet || '').trim() || cleanName,
      requestedAt: new Date().toISOString()
    });
  }

  const trimmed = nextList.slice(0, 15);

  return prisma.missedDemand.upsert({
    where: { tenantId_productName: { tenantId, productName: cleanName } },
    update: {
      searchCount: { increment: 1 },
      lastRequested: new Date(),
      occurrences: JSON.stringify(trimmed)
    },
    create: {
      tenantId,
      productName: cleanName,
      searchCount: 1,
      occurrences: JSON.stringify(trimmed)
    }
  });
}

module.exports = {
  getTenantAnalytics,
  listContacts,
  upsertContact,
  toggleContactAiBlock,
  deleteContact,
  syncContactsFromWhatsApp,
  isPhoneAiBlocked,
  touchContact,
  listPromotions,
  upsertPromotion,
  togglePromotion,
  deletePromotion,
  getActivePromotions,
  annotateCatalogWithPromotions,
  annotateServicesWithPromotions,
  listQuickReplies,
  upsertQuickReply,
  deleteQuickReply,
  matchAutoQuickReply,
  renderQuickReplyVariables,
  getFollowUpRadar,
  recordExistingDemand,
  recordMissedDemand
};
