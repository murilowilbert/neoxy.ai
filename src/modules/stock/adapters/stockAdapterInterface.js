/**
 * Contrato base para adaptadores de estoque no Neoxy.ai
 */
class StockAdapterInterface {
  /**
   * Busca produtos no estoque do tenant com tolerância a erros ortográficos.
   * @param {Object} tenant Objeto do tenant com parsedSettings
   * @param {string} query Termo de busca
   * @returns {Promise<Array>} Lista de produtos padronizados
   */
  async search(tenant, query) {
    throw new Error('Método search() deve ser implementado pelo adaptador.');
  }

  /**
   * Força a atualização do cache do catálogo para o tenant especificado.
   * @param {Object} tenant
   */
  async refreshCache(tenant) {
    throw new Error('Método refreshCache() deve ser implementado pelo adaptador.');
  }
}

module.exports = StockAdapterInterface;
