const prisma = require('../../database/prisma');
const { logger } = require('../../config');

// Cache em memória para resolução ultrarrápida do contexto do tenant
const tenantCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

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
  return { ...tenant, parsedSettings: settings };
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

async function upsertTenant({ slug, name, segment, active = true, settings }) {
  const settingsStr = typeof settings === 'string' ? settings : JSON.stringify(settings);

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {
      name,
      segment,
      active,
      settings: settingsStr
    },
    create: {
      slug,
      name,
      segment,
      active,
      settings: settingsStr
    }
  });

  // Invalida cache
  tenantCache.delete(`slug:${slug}`);
  tenantCache.delete(`id:${tenant.id}`);

  return parseTenantSettings(tenant);
}

async function listTenants() {
  const tenants = await prisma.tenant.findMany({
    include: { whatsappAccounts: true }
  });
  return tenants.map(parseTenantSettings);
}

function invalidateTenantCache(tenantIdOrSlug) {
  tenantCache.delete(`slug:${tenantIdOrSlug}`);
  tenantCache.delete(`id:${tenantIdOrSlug}`);
}

module.exports = {
  getTenantBySlug,
  getTenantByWhatsAppInstance,
  upsertTenant,
  listTenants,
  invalidateTenantCache
};
