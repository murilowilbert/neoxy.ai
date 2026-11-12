const googleSheetsAdapter = require('./adapters/googleSheetsAdapter');
const databaseAdapter = require('./adapters/databaseAdapter');
const { logger } = require('../../config');

const STOP_WORDS = new Set([
  'voces', 'vocês', 'voce', 'você', 'tem', 'temos', 'têm', 'algum', 'alguma',
  'de', 'da', 'do', 'dos', 'das', 'um', 'uma', 'uns', 'umas', 'quais', 'qual',
  'o', 'a', 'os', 'as', 'e', 'ou', 'quero', 'queria', 'gostaria', 'saber', 'se',
  'por', 'favor', 'como', 'funciona', 'para', 'pra', 'pro', 'que', 'serve',
  'marca', 'marcas', 'modelo', 'modelos', 'ola', 'olá', 'bom', 'boa', 'dia',
  'tarde', 'noite', 'tudo', 'bem', 'certo', 'preciso', 'vende', 'vendem',
  'teria', 'comprar', 'preço', 'preco', 'valor', 'quanto', 'custa'
]);

function cleanSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  const tokens = query
    .toLowerCase()
    .replace(/[?,.!\n:;\-_/\\()]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  return tokens.join(' ');
}

class StockService {
  getAdapter(tenant) {
    const type = tenant.parsedSettings?.catalogSource?.type || 'google_sheets_csv';
    switch (type) {
      case 'database':
        return databaseAdapter;
      case 'google_sheets_csv':
      default:
        return googleSheetsAdapter;
    }
  }

  async searchProduct(tenant, query) {
    try {
      const adapter = this.getAdapter(tenant);
      const cleanedQuery = cleanSearchQuery(query);

      // 1. Busca com query limpa
      let results = [];
      if (cleanedQuery) {
        results = await adapter.search(tenant, cleanedQuery);
      }

      // 2. Fallback: se não achar nada, tenta a query bruta
      if ((!results || results.length === 0) && query) {
        results = await adapter.search(tenant, query);
      }

      // 3. Fallback inteligente: busca individual por palavras-chave principais
      if ((!results || results.length === 0) && cleanedQuery) {
        const keywords = cleanedQuery.split(/\s+/).filter(k => k.length >= 3);
        for (const kw of keywords) {
          const kwResults = await adapter.search(tenant, kw);
          if (kwResults && kwResults.length > 0) {
            results = kwResults;
            break;
          }
        }
      }

      return results || [];
    } catch (err) {
      logger.error({ err: err.message, tenantId: tenant.id, query }, 'Erro ao buscar produto no catálogo');
      return [];
    }
  }

  async refreshCache(tenant) {
    const adapter = this.getAdapter(tenant);
    return adapter.refreshCache(tenant);
  }
}

module.exports = new StockService();
