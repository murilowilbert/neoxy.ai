const Fuse = require('fuse.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const StockAdapterInterface = require('./stockAdapterInterface');
const { logger } = require('../../../config');

// Cache em memória dos dados e índices Fuse por tenantId
// tenantId -> { data: Array, fuse: Fuse, lastFetch: number }
const tenantSheetCaches = new Map();
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function parseCSVRow(str) {
  const arr = [];
  let quote = false;
  let col = "";

  for (let c of str) {
    if (c === '"' && quote === false) { quote = true; continue; }
    if (c === '"' && quote === true) { quote = false; continue; }
    if (c === ',' && quote === false) { arr.push(col.trim()); col = ""; continue; }
    col += c;
  }
  arr.push(col.trim());
  return arr;
}

class GoogleSheetsStockAdapter extends StockAdapterInterface {
  async loadCatalog(tenant, forceRefresh = false) {
    const tenantId = tenant.id;
    const catalogConfig = tenant.parsedSettings?.catalogSource || {};
    const cacheTtl = (catalogConfig.syncIntervalMinutes || 10) * 60 * 1000;

    const cached = tenantSheetCaches.get(tenantId);
    if (!forceRefresh && cached && (Date.now() - cached.lastFetch < cacheTtl)) {
      return cached;
    }

    let csvText = null;

    // 1. Tenta buscar da URL do Google Sheets
    if (catalogConfig.url) {
      try {
        const response = await axios.get(catalogConfig.url, {
          timeout: 10000,
          responseType: 'text'
        });
        csvText = response.data;
      } catch (err) {
        logger.warn({ err: err.message, tenantId }, 'Falha ao baixar CSV do Google Sheets. Tentando fallback local se disponível.');
      }
    }

    // 2. Se falhar ou se for especificado caminho local
    if (!csvText && catalogConfig.fallbackFilePath) {
      if (fs.existsSync(catalogConfig.fallbackFilePath)) {
        csvText = fs.readFileSync(catalogConfig.fallbackFilePath, 'utf8');
      }
    }

    if (!csvText) {
      logger.error({ tenantId }, 'Nenhum dado de catálogo encontrado para o tenant.');
      return { data: [], fuse: null, lastFetch: Date.now() };
    }

    // Parse CSV
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length <= 1) {
      return { data: [], fuse: null, lastFetch: Date.now() };
    }

    // Detecta se a linha 0 é título (ex: "Posição de Estoque...") ou o cabeçalho real
    let headerLineIdx = 0;
    let headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    const hasCoreColumn = headers.some(h => h.includes('produto') || h.includes('código') || h.includes('codigo') || h.includes('name'));

    if (!hasCoreColumn && lines.length > 2) {
      const secondHeaders = parseCSVRow(lines[1]).map(h => h.toLowerCase().trim());
      if (secondHeaders.some(h => h.includes('produto') || h.includes('código') || h.includes('codigo') || h.includes('name'))) {
        headerLineIdx = 1;
        headers = secondHeaders;
      }
    }

    const mapping = catalogConfig.mapping || {};

    // Helper para achar coluna baseado no mapping ou fallback
    const findCol = (rowValues, keyOrAlias) => {
      const target = (mapping[keyOrAlias] || keyOrAlias || '').toLowerCase();
      const idx = headers.findIndex(h => h === target || h.includes(target));
      return idx >= 0 ? rowValues[idx] || '' : '';
    };

    const normalizedItems = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const rowValues = parseCSVRow(lines[i]);
      if (rowValues.length === 0) continue;


      const code = findCol(rowValues, 'code') || findCol(rowValues, 'código') || findCol(rowValues, 'codigo') || findCol(rowValues, 'ean');
      const name = findCol(rowValues, 'name') || findCol(rowValues, 'produto') || findCol(rowValues, 'modelo');
      const priceStr = findCol(rowValues, 'price') || findCol(rowValues, 'preço') || findCol(rowValues, 'preco');
      const stockStr = findCol(rowValues, 'stock') || findCol(rowValues, 'quantidade') || findCol(rowValues, 'estoque');
      const category = findCol(rowValues, 'category') || findCol(rowValues, 'categoria') || findCol(rowValues, 'local');
      const questions = findCol(rowValues, 'perguntas_recomendadas') || findCol(rowValues, 'perguntas recomendadas');
      const brand = findCol(rowValues, 'brand') || findCol(rowValues, 'marca');
      const power = findCol(rowValues, 'potencia') || findCol(rowValues, 'potência') || findCol(rowValues, 'voltagem');

      if (!name && !code) continue;

      // Sanitiza preço
      const cleanPrice = priceStr.replace(/[^\d,.-]/g, '').replace(',', '.');
      const cleanStock = stockStr.replace(/[^\d,.-]/g, '').replace(',', '.');

      normalizedItems.push({
        código: code.toString().trim(),
        'modelo/produto': name.trim(),
        preço: cleanPrice ? `R$${parseFloat(cleanPrice).toFixed(2).replace('.', ',')}` : '',
        estoque: parseFloat(cleanStock) || 0,
        categoria_geral: category.trim(),
        perguntas_recomendadas: questions ? questions.trim() : '',
        marca: brand ? brand.trim() : '',
        potência: power ? power.trim() : '',
        _temFoto: Boolean(code && catalogConfig.hasPhotos)
      });
    }

    // Configura Fuse.js para busca difusa ultrarrápida
    const fuseOptions = {
      keys: [
        { name: 'modelo/produto', weight: 0.7 },
        { name: 'código', weight: 0.9 },
        { name: 'categoria_geral', weight: 0.4 },
        { name: 'marca', weight: 0.5 }
      ],
      threshold: 0.4,
      distance: 100,
      ignoreLocation: true,
      minMatchCharLength: 2
    };

    const fuse = new Fuse(normalizedItems, fuseOptions);
    const cacheEntry = { data: normalizedItems, fuse, lastFetch: Date.now() };
    tenantSheetCaches.set(tenantId, cacheEntry);

    logger.info({ tenantId, count: normalizedItems.length }, 'Catálogo Google Sheets sincronizado com sucesso.');
    return cacheEntry;
  }

  async search(tenant, query) {
    if (!query || typeof query !== 'string') return [];
    const { fuse, data } = await this.loadCatalog(tenant);
    if (!fuse || data.length === 0) return [];

    const cleanQuery = query.toLowerCase().replace(/[?,.!\n]/g, ' ').trim();
    if (!cleanQuery) return [];

    const results = fuse.search(cleanQuery, { limit: 15 });
    return results.map(r => ({
      ...r.item,
      _relevancia: r.score
    }));
  }

  async refreshCache(tenant) {
    return this.loadCatalog(tenant, true);
  }
}

module.exports = new GoogleSheetsStockAdapter();
