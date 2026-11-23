const Fuse = require('fuse.js');
const prisma = require('../../../database/prisma');
const StockAdapterInterface = require('./stockAdapterInterface');
const crmExtensions = require('../../business/crmExtensionsService');
const { logger } = require('../../../config');

// Cache em memória de itens de banco por tenant
const tenantDbCaches = new Map();
const CACHE_TTL_MS = 30 * 1000;

class DatabaseStockAdapter extends StockAdapterInterface {
  async loadCatalog(tenant, forceRefresh = false) {
    const tenantId = tenant.id;
    const cached = tenantDbCaches.get(tenantId);
    if (!forceRefresh && cached && (Date.now() - cached.lastFetch < CACHE_TTL_MS)) {
      return cached;
    }

    const [items, services, activePromotions] = await Promise.all([
      prisma.catalogItem.findMany({ where: { tenantId } }),
      prisma.serviceItem.findMany({ where: { tenantId, active: true } }),
      crmExtensions.getActivePromotions(tenantId).catch(() => [])
    ]);

    const annotatedProducts = crmExtensions.annotateCatalogWithPromotions(items, activePromotions);
    const annotatedServices = crmExtensions.annotateServicesWithPromotions(services, activePromotions);

    const normalizedProducts = annotatedProducts.map(item => ({
      tipo: 'produto',
      código: item.code,
      'modelo/produto': item.name,
      preço: item.price ? `R$${item.price.toFixed(2).replace('.', ',')}` : '',
      ...(item.activePromotion
        ? {
            preço_promocional: `R$${item.effectivePrice.toFixed(2).replace('.', ',')}`,
            promoção_ativa: `${item.activePromotion.name} (${item.discountPct}% OFF)`
          }
        : {}),
      estoque: item.stockQty,
      categoria_geral: item.category || 'Geral',
      marca: item.brand || '',
      _temFoto: item.hasPhoto
    }));

    const normalizedServices = annotatedServices.map(srv => ({
      tipo: 'serviço',
      código: srv.sku || srv.id.slice(0, 8),
      'modelo/produto': srv.name,
      preço: srv.price ? `R$${srv.price.toFixed(2).replace('.', ',')}` : '',
      ...(srv.activePromotion
        ? {
            preço_promocional: `R$${srv.effectivePrice.toFixed(2).replace('.', ',')}`,
            promoção_ativa: `${srv.activePromotion.name} (${srv.discountPct}% OFF)`
          }
        : {}),
      duração_min: srv.durationMinutes,
      categoria_geral: srv.category || 'Serviços',
      marca: srv.brand || '',
      _temFoto: Boolean(srv.imageUrl)
    }));

    const normalizedItems = [...normalizedProducts, ...normalizedServices];

    const fuse = new Fuse(normalizedItems, {
      keys: [
        { name: 'modelo/produto', weight: 0.7 },
        { name: 'código', weight: 0.9 },
        { name: 'categoria_geral', weight: 0.55 },
        { name: 'marca', weight: 0.5 }
      ],
      threshold: 0.38
    });

    const entry = { data: normalizedItems, fuse, lastFetch: Date.now() };
    tenantDbCaches.set(tenantId, entry);
    return entry;
  }

  async search(tenant, query) {
    if (!query) return [];
    const { fuse } = await this.loadCatalog(tenant);
    if (!fuse) return [];

    const results = fuse.search(query, { limit: 15 });
    return results.map(r => ({ ...r.item, _relevancia: r.score }));
  }

  async refreshCache(tenant) {
    return this.loadCatalog(tenant, true);
  }
}

module.exports = new DatabaseStockAdapter();
