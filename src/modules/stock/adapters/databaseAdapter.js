const Fuse = require('fuse.js');
const prisma = require('../../../database/prisma');
const StockAdapterInterface = require('./stockAdapterInterface');
const { logger } = require('../../../config');

// Cache em memória de itens de banco por tenant
const tenantDbCaches = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

class DatabaseStockAdapter extends StockAdapterInterface {
  async loadCatalog(tenant, forceRefresh = false) {
    const tenantId = tenant.id;
    const cached = tenantDbCaches.get(tenantId);
    if (!forceRefresh && cached && (Date.now() - cached.lastFetch < CACHE_TTL_MS)) {
      return cached;
    }

    const items = await prisma.catalogItem.findMany({
      where: { tenantId }
    });

    const normalizedItems = items.map(item => ({
      código: item.code,
      'modelo/produto': item.name,
      preço: item.price ? `R$${item.price.toFixed(2).replace('.', ',')}` : '',
      estoque: item.stockQty,
      categoria_geral: item.category || 'Geral',
      marca: item.brand || '',
      _temFoto: item.hasPhoto
    }));

    const fuse = new Fuse(normalizedItems, {
      keys: [
        { name: 'modelo/produto', weight: 0.7 },
        { name: 'código', weight: 0.9 },
        { name: 'categoria_geral', weight: 0.4 },
        { name: 'marca', weight: 0.5 }
      ],
      threshold: 0.4
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
