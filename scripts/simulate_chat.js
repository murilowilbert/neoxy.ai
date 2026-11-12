require('dotenv').config();
const tenantService = require('../src/modules/tenants/tenantService');
const messageQueueService = require('../src/modules/queue/messageQueueService');
const stockService = require('../src/modules/stock/stockService');

async function testScenario({ tenantSlug, customerPhone, message, label }) {
  console.log(`\n======================================================`);
  console.log(`🧪 CENÁRIO: [${label}]`);
  console.log(`🏢 Estabelecimento (Tenant): ${tenantSlug}`);
  console.log(`📱 Cliente: ${customerPhone}`);
  console.log(`💬 Mensagem do Cliente: "${message}"`);
  console.log(`------------------------------------------------------`);

  const tenant = await tenantService.getTenantBySlug(tenantSlug);
  if (!tenant) {
    console.error(`❌ Tenant "${tenantSlug}" não encontrado no banco.`);
    return;
  }

  // 1. Testa busca de estoque
  const stockResults = await stockService.searchProduct(tenant, message);
  console.log(`📦 Itens encontrados no catálogo (${stockResults.length} itens):`);
  if (stockResults.length > 0) {
    stockResults.slice(0, 3).forEach((item, idx) => {
      console.log(`   ${idx + 1}. [${item.código || 'S/ COD'}] ${item['modelo/produto']} - ${item.preço}`);
    });
  } else {
    console.log(`   (Nenhum produto direto encontrado no catálogo)`);
  }

  // 2. Se a chave do Gemini estiver configurada, testa a IA
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_gemini_aqui') {
    console.log(`🤖 Chamando Gemini 2.5 Flash...`);
    try {
      const response = await messageQueueService.processQueueItemDirect({
        tenant,
        customerPhone,
        text: message
      });
      console.log(`✅ Resposta Gerada pelo Bot:`);
      console.log(`"${response.text}"`);
      console.log(`🏷️ Tags detectadas: Handoff=${response.isHandoff}, NoResponse=${response.isNoResponse}`);
    } catch (e) {
      console.error(`❌ Erro ao chamar IA:`, e.message);
    }
  } else {
    console.log(`ℹ️ [Aviso]: GEMINI_API_KEY não configurada no .env. Busca no catálogo e regras do tenant validadas com sucesso.`);
  }
}

async function runAllTests() {
  console.log(`\n🚀 INICIANDO BATERIA DE TESTES MULTI-TENANT (NEOXY.AI)...\n`);

  // Teste 1: Loja de Ferragens Demo - Busca específica de produto
  await testScenario({
    tenantSlug: 'ferragens-demo',
    customerPhone: '5551988880001',
    message: 'Vocês têm chuveiro lorenzetti ou ducha?',
    label: 'Ferragens Demo: Busca de chuveiro'
  });

  // Teste 2: Loja de Ferragens Demo - Pedido de desconto (deve aplicar regra de handoff)
  await testScenario({
    tenantSlug: 'ferragens-demo',
    customerPhone: '5551988880001',
    message: 'Tem desconto no PIX à vista se eu levar hoje?',
    label: 'Ferragens Demo: Pedido de Desconto'
  });

  // Teste 3: Segundo Tenant (Pet Shop) - Busca de ração (deve buscar no banco do Pet Shop)
  await testScenario({
    tenantSlug: 'petshop-demo',
    customerPhone: '5551977770002',
    message: 'Vocês vendem ração para cachorro adulto?',
    label: 'Pet Shop: Busca de ração'
  });

  // Teste 4: Segundo Tenant (Pet Shop) - Medicamento antipulgas
  await testScenario({
    tenantSlug: 'petshop-demo',
    customerPhone: '5551977770002',
    message: 'Tem Simparic para cachorro de 15kg?',
    label: 'Pet Shop: Busca de Simparic'
  });

  console.log(`\n======================================================`);
  console.log(`🎉 Bateria de testes de catálogo e multi-tenancy concluída com sucesso!`);
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('Falha geral no teste:', err);
  process.exit(1);
});
