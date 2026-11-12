const prisma = require('../../database/prisma');
const { logger } = require('../../config');

// Cache em memória para resolução ultrarrápida do contexto do tenant
const tenantCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Presets de módulos por tipo de negócio
const BUSINESS_TYPE_PRESETS = {
  RETAIL: ['stock', 'crm'],
  SERVICES: ['services', 'appointments', 'crm'],
  OFFICE: ['appointments', 'documents', 'crm'],
  HYBRID: ['stock', 'services', 'appointments', 'documents', 'crm']
};

function parseTenantSettings(tenant) {
  if (!tenant) return null;
  let settings = {};
  if (typeof tenant.settings === 'string') {
    try {
      settings = JSON.parse(tenant.settings);
    } catch (e) {
      logger.error({ err: e, tenantId: tenant.id }, 'Falha ao parsear settings do tenant');
    }
  } else if (typeof tenant.settings === 'object') {
    settings = tenant.settings;
  }

  let enabledModules = [];
  if (typeof tenant.enabledModules === 'string') {
    try {
      enabledModules = JSON.parse(tenant.enabledModules);
    } catch (e) {
      enabledModules = BUSINESS_TYPE_PRESETS[tenant.businessType] || ['stock'];
    }
  } else if (Array.isArray(tenant.enabledModules)) {
    enabledModules = tenant.enabledModules;
  }

  return {
    ...tenant,
    parsedSettings: settings,
    parsedModules: enabledModules
  };
}

async function getTenantBySlug(slug) {
  const cached = tenantCache.get(`slug:${slug}`);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { whatsappAccounts: true }
  });

  const parsed = parseTenantSettings(tenant);
  if (parsed) {
    tenantCache.set(`slug:${slug}`, { data: parsed, timestamp: Date.now() });
    tenantCache.set(`id:${parsed.id}`, { data: parsed, timestamp: Date.now() });
  }
  return parsed;
}

async function getTenantById(id) {
  const cached = tenantCache.get(`id:${id}`);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { whatsappAccounts: true }
  });

  const parsed = parseTenantSettings(tenant);
  if (parsed) {
    tenantCache.set(`slug:${parsed.slug}`, { data: parsed, timestamp: Date.now() });
    tenantCache.set(`id:${parsed.id}`, { data: parsed, timestamp: Date.now() });
  }
  return parsed;
}

async function getTenantByWhatsAppInstance(instanceName) {
  const cached = tenantCache.get(`instance:${instanceName}`);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const session = await prisma.tenantWhatsAppSession.findUnique({
    where: { instanceName },
    include: { tenant: true }
  });

  if (!session || !session.tenant) return null;

  const parsed = parseTenantSettings(session.tenant);
  if (parsed) {
    tenantCache.set(`instance:${instanceName}`, { data: parsed, timestamp: Date.now() });
    tenantCache.set(`slug:${parsed.slug}`, { data: parsed, timestamp: Date.now() });
    tenantCache.set(`id:${parsed.id}`, { data: parsed, timestamp: Date.now() });
  }
  return parsed;
}

async function upsertTenant({
  slug,
  name,
  segment,
  businessType = 'RETAIL',
  enabledModules,
  active = true,
  settings
}) {
  const settingsStr = typeof settings === 'string' ? settings : JSON.stringify(settings || {});
  const modulesArray = Array.isArray(enabledModules)
    ? enabledModules
    : (BUSINESS_TYPE_PRESETS[businessType] || ['stock']);
  const modulesStr = JSON.stringify(modulesArray);

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {
      name,
      segment,
      businessType,
      enabledModules: modulesStr,
      active,
      settings: settingsStr
    },
    create: {
      slug,
      name,
      segment,
      businessType,
      enabledModules: modulesStr,
      active,
      settings: settingsStr
    }
  });

  invalidateTenantCache(slug);
  invalidateTenantCache(tenant.id);

  return parseTenantSettings(tenant);
}

async function updateTenantSettings(slug, partialSettings, metaUpdates = {}) {
  const current = await getTenantBySlug(slug);
  if (!current) throw new Error('Estabelecimento não encontrado');

  const mergedSettings = {
    ...current.parsedSettings,
    ...partialSettings
  };

  const updateData = {
    settings: JSON.stringify(mergedSettings)
  };

  if (metaUpdates.name) updateData.name = metaUpdates.name;
  if (metaUpdates.segment) updateData.segment = metaUpdates.segment;
  if (metaUpdates.businessType) updateData.businessType = metaUpdates.businessType;
  if (Array.isArray(metaUpdates.enabledModules)) {
    updateData.enabledModules = JSON.stringify(metaUpdates.enabledModules);
  }
  if (typeof metaUpdates.active === 'boolean') {
    updateData.active = metaUpdates.active;
  }

  const updated = await prisma.tenant.update({
    where: { slug },
    data: updateData,
    include: { whatsappAccounts: true }
  });

  invalidateTenantCache(slug);
  invalidateTenantCache(updated.id);

  return parseTenantSettings(updated);
}

async function listTenants() {
  const tenants = await prisma.tenant.findMany({
    include: {
      whatsappAccounts: true,
      _count: {
        select: {
          catalogItems: true,
          serviceItems: true,
          appointments: true,
          documents: true,
          chatSessions: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  return tenants.map(parseTenantSettings);
}

function invalidateTenantCache(tenantIdOrSlug) {
  tenantCache.delete(`slug:${tenantIdOrSlug}`);
  tenantCache.delete(`id:${tenantIdOrSlug}`);
}

module.exports = {
  BUSINESS_TYPE_PRESETS,
  parseTenantSettings,
  getTenantBySlug,
  getTenantById,
  getTenantByWhatsAppInstance,
  upsertTenant,
  updateTenantSettings,
  listTenants,
  invalidateTenantCache
};
