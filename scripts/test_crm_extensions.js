const assert = require('assert');
const axios = require('axios');
const { app } = require('../src/server');
const tenantService = require('../src/modules/tenants/tenantService');
const promptFactory = require('../src/modules/ai/promptFactory');

async function run() {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;
  console.log(`🧪 Testando extensões CRM, Analytics, Promoções, Contatos e Horários em ${baseUrl}...`);

  try {
    // Login Ferragens Marlene
    const loginRes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'contato@ferragensmarlene.com.br',
      password: 'neoxy123'
    });
    const token = loginRes.data.token;
    assert(token, 'Token JWT deve ser retornado');
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // 1. Analytics Executivo (Mensagens/Dia, IA vs Humano, Top Procurados)
    const anRes = await axios.get(`${baseUrl}/api/tenants/ferragens-demo/analytics`, auth);
    const an = anRes.data.analytics;
    assert(an && an.messagesByHourToday.length === 24, 'Deve retornar 24 buckets horários');
    assert(an.messagesLast7Days.length === 7, 'Deve retornar 7 buckets diários');
    assert(typeof an.aiVsHuman.automationRatePct === 'number', 'Deve calcular taxa IA 100%');
    assert(an.topExistingDemands.length > 0, 'Deve listar itens procurados do catálogo');
    assert(an.topMissedDemands.length > 0, 'Deve listar itens procurados sem cadastro');
    console.log('✅ 1. Analytics Executivo (24h, 7d, IA vs Humano, Temos vs Não Temos) validado.');

    // 2. Contatos & Bloqueio Seletivo de IA
    const testPhone = '5551977776666';
    const createdContact = await axios.post(
      `${baseUrl}/api/tenants/ferragens-demo/contacts`,
      { phone: testPhone, name: 'Teste Bloqueio IA', tags: ['Família'], aiBlocked: true },
      auth
    );
    assert.strictEqual(createdContact.data.contact.aiBlocked, true);

    const blockedChatRes = await axios.post(
      `${baseUrl}/api/tenants/ferragens-demo/test-chat`,
      { message: 'Oi, tem ducha?', customerPhone: testPhone },
      auth
    );
    assert.strictEqual(
      blockedChatRes.data.response.blockedByContactFilter,
      true,
      'Contato bloqueado não deve receber resposta da IA'
    );

    // Desbloqueia e remove contato de teste
    await axios.patch(
      `${baseUrl}/api/tenants/ferragens-demo/contacts/${testPhone}/ai-block`,
      { aiBlocked: false },
      auth
    );
    await axios.delete(
      `${baseUrl}/api/tenants/ferragens-demo/contacts/${createdContact.data.contact.id}`,
      auth
    );
    console.log('✅ 2. Filtro de Contatos & Bloqueio de IA impediu resposta automática conforme esperado.');

    // 3. Sincronização de Contatos
    const syncRes = await axios.post(`${baseUrl}/api/tenants/ferragens-demo/contacts/sync`, {}, auth);
    assert(syncRes.data.success && syncRes.data.total >= 4, 'Sync de contatos deve consolidar lista');
    console.log(`✅ 3. Sincronização de contatos WhatsApp validada (${syncRes.data.total} contatos).`);

    // 4. Promoções (Percentual & Preço Fixo Manual) + Reflexo no Catálogo
    const catBefore = await axios.get(`${baseUrl}/api/tenants/ferragens-demo/catalog`, auth);
    const firstItem = catBefore.data.items[0];
    assert(firstItem, 'Catálogo deve ter ao menos 1 item');

    const fixedPromoPrice = Number((firstItem.price * 0.5).toFixed(2));
    const promoRes = await axios.post(
      `${baseUrl}/api/tenants/ferragens-demo/promotions`,
      {
        name: 'Teste Promoção Manual',
        discountType: 'FIXED_PRICE',
        discountValue: fixedPromoPrice,
        scope: 'PRODUCTS',
        targetItemIds: [firstItem.id],
        active: true
      },
      auth
    );
    const promoId = promoRes.data.promotion.id;

    const catAfter = await axios.get(`${baseUrl}/api/tenants/ferragens-demo/catalog`, auth);
    const updatedItem = catAfter.data.items.find((i) => i.id === firstItem.id);
    assert.strictEqual(updatedItem.effectivePrice, fixedPromoPrice, 'Preço promocional fixo deve aplicar no catálogo');
    assert(updatedItem.discountPct >= 49, 'Percentual de desconto calculado automaticamente');

    await axios.delete(`${baseUrl}/api/tenants/ferragens-demo/promotions/${promoId}`, auth);
    console.log('✅ 4. Promoções dinâmicas (preço manual e %) refletem no catálogo e no bot.');

    // 5. Respostas Rápidas & Gatilho Automático por Palavra-chave
    const qrRes = await axios.post(
      `${baseUrl}/api/tenants/ferragens-demo/quick-replies`,
      {
        shortcut: '/teste-gatilho',
        title: 'Gatilho Teste Automático',
        content: 'Olá! Somos a {{empresa}} na {{endereco}}.',
        category: 'ATENDIMENTO',
        triggerKeywords: 'palavra_magica_teste_99',
        autoTrigger: true,
        triggerHandoff: false
      },
      auth
    );
    const qrId = qrRes.data.quickReply.id;

    const triggerChatRes = await axios.post(
      `${baseUrl}/api/tenants/ferragens-demo/test-chat`,
      { message: 'Quero saber sobre palavra_magica_teste_99', customerPhone: '5551966665555' },
      auth
    );
    assert.strictEqual(triggerChatRes.data.response.quickReplyTriggered, '/teste-gatilho');
    assert(
      triggerChatRes.data.response.replyText.includes('Ferragens Marlene'),
      'Variável {{empresa}} deve ser interpolada automaticamente'
    );

    await axios.delete(`${baseUrl}/api/tenants/ferragens-demo/quick-replies/${qrId}`, auth);
    console.log('✅ 5. Respostas Rápidas (/atalho) + Gatilho Automático com variáveis validados.');

    // 6. Radar de Follow-up
    const radarRes = await axios.get(`${baseUrl}/api/tenants/ferragens-demo/radar`, auth);
    assert(Array.isArray(radarRes.data.radar), 'Radar deve retornar lista de conversas');
    console.log(`✅ 6. Radar de Follow-up validado (${radarRes.data.radar.length} alertas ativos).`);

    // 7. Feriados Nacionais do Brasil (BrasilAPI + Calculadora Local)
    const holRes = await axios.get(`${baseUrl}/api/system/holidays/2026`, auth);
    assert(holRes.data.holidays.length >= 12, 'Deve retornar feriados nacionais de 2026');
    assert(
      holRes.data.holidays.some((h) => h.date === '2026-12-25'),
      'Natal 2026 deve constar na lista'
    );
    console.log(`✅ 7. Feriados Nacionais do Brasil (${holRes.data.source}, ${holRes.data.holidays.length} datas) validados.`);

    // 8. Horários, Redes Sociais & Datas Especiais injetados no Prompt do Bot
    const currentTenant = await tenantService.getTenantBySlug('ferragens-demo');
    const updatedStoreInfo = {
      ...(currentTenant.parsedSettings.storeInfo || {}),
      socialLinks: {
        instagram: '@ferragensmarlene',
        facebook: 'https://facebook.com/ferragensmarlene'
      },
      mapsUrl: 'https://maps.app.goo.gl/ferragensmarlene'
    };
    await axios.put(
      `${baseUrl}/api/tenants/ferragens-demo/settings`,
      { settings: { storeInfo: updatedStoreInfo } },
      auth
    );
    const refreshedTenant = await tenantService.getTenantBySlug('ferragens-demo');
    const sysPrompt = promptFactory.buildSystemPrompt(refreshedTenant);
    assert(sysPrompt.includes('@ferragensmarlene'), 'Instagram deve constar no prompt do bot');
    assert(sysPrompt.includes('maps.app.goo.gl/ferragensmarlene'), 'Google Maps deve constar no prompt');
    assert(sysPrompt.includes('Feriado de Natal'), 'Feriados programados devem constar no prompt');
    console.log('✅ 8. Perfil (Local, Redes Sociais, Horários & Feriados) injetado no prompt da IA.');

    // 9. Verificação Crítica: Ferragens Marlene busca APENAS itens cadastrados no banco (nunca planilha externa!)
    const stockService = require('../src/modules/stock/stockService');
    const aiService = require('../src/modules/ai/aiService');
    const hidraulicaMatches = await stockService.searchProduct(refreshedTenant, 'gostaria de material hidraulico');
    assert(
      !hidraulicaMatches.some((item) => String(item['modelo/produto'] || '').includes('Mecanismo de Entrada')),
      'Bot NUNCA pode retornar item externo não cadastrado (ex: Mecanismo Astra)'
    );
    assert(
      hidraulicaMatches.every((item) => item.tipo === 'produto' || item.tipo === 'serviço'),
      'Todos os itens retornados devem vir estritamente do banco de dados local'
    );
    const parsedMissed = aiService.parseModelResponse(
      'Vou verificar com a equipe! [HANDOFF] [MISSED_DEMAND:Torneira Gourmet Inox]'
    );
    assert.strictEqual(parsedMissed.text, 'Vou verificar com a equipe!');
    assert.deepStrictEqual(parsedMissed.missedDemands, ['Torneira Gourmet Inox']);
    console.log('✅ 9. Guardrail Zero-Invenção + extração oculta de [MISSED_DEMAND] validados.');

    // 10. Oportunidades (MissedDemand) retornando conversas vinculadas (occurrences)
    const serraDemand = an.topMissedDemands.find((m) => m.name.includes('Serra'));
    assert(serraDemand && Array.isArray(serraDemand.occurrences) && serraDemand.occurrences.length >= 1, 'Oportunidade deve listar conversas vinculadas');
    console.log('✅ 10. Oportunidades expansíveis com conversas vinculadas validadas.');

    // 11. Contatos com avatarUrl e pushName para seletor visual
    const ctRes = await axios.get(`${baseUrl}/api/tenants/ferragens-demo/contacts`, auth);
    assert(ctRes.data.contacts.some((c) => c.avatarUrl && c.pushName), 'Contatos devem retornar foto de perfil e pushName');
    console.log('✅ 11. Contatos visuais (foto de perfil + pushName) validados.');

    // 12. Promoções aplicadas a SERVIÇOS (Desentupidora Guri)
    const guriLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'contato@desentupidoraguri.com.br',
      password: 'neoxy123'
    });
    const guriAuth = { headers: { Authorization: `Bearer ${guriLogin.data.token}` } };
    const guriSrvBefore = await axios.get(`${baseUrl}/api/tenants/desentupidora-guri/services`, guriAuth);
    const firstSrv = guriSrvBefore.data.services[0];
    assert(firstSrv, 'Desentupidora Guri deve possuir serviços');

    const srvPromo = await axios.post(
      `${baseUrl}/api/tenants/desentupidora-guri/promotions`,
      {
        name: 'Promoção Teste Serviço 20% OFF',
        appliesTo: 'SERVICES',
        discountType: 'PERCENT',
        discountValue: 20,
        scope: 'PRODUCTS',
        targetServiceIds: [firstSrv.id],
        active: true
      },
      guriAuth
    );
    const guriSrvAfter = await axios.get(`${baseUrl}/api/tenants/desentupidora-guri/services`, guriAuth);
    const updatedSrv = guriSrvAfter.data.services.find((s) => s.id === firstSrv.id);
    assert.strictEqual(updatedSrv.discountPct, 20, 'Desconto de 20% deve refletir no serviço');
    assert.strictEqual(updatedSrv.effectivePrice, Number((firstSrv.price * 0.8).toFixed(2)));
    await axios.delete(`${baseUrl}/api/tenants/desentupidora-guri/promotions/${srvPromo.data.promotion.id}`, guriAuth);
    console.log('✅ 12. Promoções aplicadas a Serviços (Desentupidora Guri) validadas.');

    console.log('\n🎉 TODOS OS 12 TESTES DAS EXTENSÕES CRM PASSARAM COM SUCESSO!');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('❌ Falha nos testes:', err.response?.data || err.message || err);
  process.exit(1);
});
