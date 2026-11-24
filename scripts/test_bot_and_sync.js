/**
 * Suite completa de testes do Atendente IA (Bot) e da Central de Sincronização WhatsApp (NEO).
 * Executa:
 *   1. Testes unitários de regras do Bot (horários/feriados com timezone, tags ocultas, catálogo,
 *      promoções, faixas de preço por porte, anti-ban, resolução de mídia {{COD:...}}).
 *   2. Testes de integração ponta a ponta contra o servidor Express + Prisma SQLite:
 *      Quick Replies, Bloqueio de IA por contato, Pausa/Handoff humano, Webhooks Evolution
 *      (CONNECTION_UPDATE, QRCODE_UPDATED, grupos), e todo o ciclo de Sincronização WhatsApp
 *      (QR Code, Pairing Code 8 dígitos, Conexão, Mensagem de Teste, Preferências, Desconectar, Redefinir).
 */

const assert = require('assert');
const prisma = require('../src/database/prisma');
const promptFactory = require('../src/modules/ai/promptFactory');
const aiService = require('../src/modules/ai/aiService');
const stockService = require('../src/modules/stock/stockService');
const antiBanService = require('../src/modules/whatsapp/antiBanService');
const messageQueueService = require('../src/modules/queue/messageQueueService');
const tenantService = require('../src/modules/tenants/tenantService');
const crmExtensions = require('../src/modules/business/crmExtensionsService');
const chatSessionService = require('../src/modules/chat/chatSessionService');

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ↳ ${err.stack || err.message}`);
  }
}

async function httpJson(path, { method = 'GET', token = null, body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('\n===============================================================');
  console.log(' 🤖 NEO — TESTES DO ATENDENTE IA (BOT) & SINCRONIZAÇÃO WHATSAPP');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // BLOCO 1: REGRAS DE NEGÓCIO, HORÁRIOS, TAGS & CATÁLOGO DO BOT
  // -------------------------------------------------------------------------
  console.log('📦 Bloco 1: Motor de IA, Prompts, Catálogo, Promoções e Anti-Ban');

  await runTest('promptFactory: horários, timezone local e feriados próximos formatados', async () => {
    const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const in6Days = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const fmtIso = (d) => d.toISOString().slice(0, 10);
    const fmtBr = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

    const mockTenant = {
      name: 'Loja Teste Timezone',
      parsedSettings: {
        persona: { attendantName: 'Luna', tone: 'objetivo' },
        rules: {
          deliveryPolicy: 'Entregamos em até 2h na cidade.',
          paymentMethods: 'PIX, Cartão em 3x e Dinheiro.'
        },
        businessHours: {
          timezone: 'America/Sao_Paulo',
          schedule: {
            '0': [],
            '1': [{ start: '08:00', end: '18:00' }],
            '2': [{ start: '08:00', end: '18:00' }],
            '3': [{ start: '08:00', end: '18:00' }],
            '4': [{ start: '08:00', end: '18:00' }],
            '5': [{ start: '08:00', end: '18:00' }],
            '6': [{ start: '09:00', end: '12:00' }]
          },
          exceptions: [
            {
              date: fmtIso(in5Days),
              type: 'closed',
              reason: 'Feriado Municipal Teste',
              returnDate: fmtIso(in6Days)
            }
          ]
        }
      }
    };

    const sysPrompt = promptFactory.buildSystemPrompt(mockTenant);
    assert.ok(sysPrompt.includes('Luna'), 'Prompt deve incluir nome do atendente');
    assert.ok(sysPrompt.includes('Entregamos em até 2h'), 'Prompt deve incluir política de entrega');
    assert.ok(sysPrompt.includes('Feriado Municipal Teste'), 'Prompt deve listar feriados próximos');
    assert.ok(
      sysPrompt.includes(fmtIso(in6Days)) || sysPrompt.includes(fmtBr(in6Days)),
      'Prompt deve informar data de retorno'
    );
  });

  await runTest('aiService.parseModelResponse: extrai e limpa TODAS as tags ocultas e mídias', async () => {
    const raw =
      'Oi! Temos sim a Furadeira Bosch por R$ 349,90 {{COD:FER-001}} {{COD:FER-002}} ' +
      '[SENTIMENT:FRUSTRATED] [REACT:👍] [SEND_LOCATION] [SEND_VCARD] [SEND_REVIEW] ' +
      '[POLL:Qual o melhor horário?|Manhã|Tarde] ' +
      '[DOC_EXTRACT:{"docType":"COMPROVANTE","title":"PIX Furadeira","amount":349.9,"dueDate":"2026-12-01","summary":"Pago"}] ' +
      '[MISSED_DEMAND:Serra circular 220v] [HANDOFF]';

    const parsed = aiService.parseModelResponse(raw);
    assert.strictEqual(parsed.isHandoff, true);
    assert.strictEqual(parsed.isNoResponse, false);
    assert.strictEqual(parsed.sentiment, 'FRUSTRATED');
    assert.strictEqual(parsed.reactionEmoji, '👍');
    assert.strictEqual(parsed.sendLocation, true);
    assert.strictEqual(parsed.sendVcard, true);
    assert.strictEqual(parsed.sendReview, true);
    assert.deepStrictEqual(parsed.poll, {
      name: 'Qual o melhor horário?',
      values: ['Manhã', 'Tarde']
    });
    assert.deepStrictEqual(parsed.docExtract, {
      docType: 'COMPROVANTE',
      title: 'PIX Furadeira',
      amount: 349.9,
      dueDate: '2026-12-01',
      summary: 'Pago'
    });
    assert.deepStrictEqual(parsed.missedDemands, ['Serra circular 220v']);
    assert.deepStrictEqual(parsed.photoCodes, ['FER-001', 'FER-002']);
    assert.ok(!parsed.text.includes('[HANDOFF]'), 'Tag [HANDOFF] não pode vazar');
    assert.ok(!parsed.text.includes('{{COD:'), 'Tag {{COD:...}} não pode vazar');
    assert.ok(!parsed.text.includes('[POLL:'), 'Tag [POLL:] não pode vazar');
    assert.ok(!parsed.text.includes('[DOC_EXTRACT:'), 'Tag [DOC_EXTRACT:] não pode vazar');
    assert.ok(parsed.text.includes('Furadeira Bosch'), 'Texto útil deve ser preservado');

    const silent = aiService.parseModelResponse('[NO_RESPONSE]');
    assert.strictEqual(silent.isNoResponse, true);
    assert.strictEqual(silent.text, '');
  });

  await runTest('stockService & databaseAdapter: busca produtos com descrição, preço e promoção (ferragens-demo)', async () => {
    const ferragens = await tenantService.getTenantBySlug('ferragens-demo');
    assert.ok(ferragens, 'Tenant ferragens-demo deve existir');

    const results = await stockService.searchProduct(ferragens, 'furadeira');
    assert.ok(Array.isArray(results) && results.length > 0, 'Deve retornar itens do catálogo');
    assert.ok(results[0]['modelo/produto'] && results[0]['preço'], 'Item deve conter modelo/produto e preço');
    assert.ok(results[0]['código'], 'Item deve conter código SKU');
  });

  await runTest('stockService & databaseAdapter: busca serviços com faixas de preço por porte (petshop-demo)', async () => {
    const petshop = await tenantService.getTenantBySlug('petshop-demo');
    assert.ok(petshop, 'Tenant petshop-demo deve existir');

    const results = await stockService.searchProduct(petshop, 'banho tosa');
    assert.ok(Array.isArray(results) && results.length > 0, 'Deve retornar serviços cadastrados');
    const foundBanho = results.some((r) =>
      String(r['modelo/produto'] || '').toLowerCase().includes('banho')
    );
    assert.strictEqual(foundBanho, true, 'Deve localizar serviço de Banho/Tosa');
  });

  await runTest('messageQueueService.resolveCatalogMedia: resolve {{COD:...}} para URLs reais de mídia', async () => {
    const ferragens = await tenantService.getTenantBySlug('ferragens-demo');
    const sampleItem = await prisma.catalogItem.findFirst({ where: { tenantId: ferragens.id } });
    assert.ok(sampleItem, 'Deve existir ao menos 1 item de catálogo');

    const originalImg = sampleItem.imageUrl;
    const testImg = 'https://cdn.neo.test/item-demo.jpg';
    await prisma.catalogItem.update({
      where: { id: sampleItem.id },
      data: { imageUrl: testImg }
    });

    try {
      const resolved = await messageQueueService.resolveCatalogMedia(ferragens.id, [
        sampleItem.code,
        'CODIGO-INEXISTENTE-999'
      ]);
      assert.strictEqual(resolved.length, 1);
      assert.strictEqual(resolved[0].code, sampleItem.code);
      assert.strictEqual(resolved[0].url, testImg);
      assert.strictEqual(resolved[0].mediaType, 'image');
    } finally {
      await prisma.catalogItem.update({
        where: { id: sampleItem.id },
        data: { imageUrl: originalImg }
      });
    }
  });

  await runTest('antiBanService: delays humanizados e rate limiting dentro dos limites seguros', async () => {
    const ferragens = await tenantService.getTenantBySlug('ferragens-demo');
    const delayShort = antiBanService.computeTypingDelayMs('Oi!', ferragens);
    const delayLong = antiBanService.computeTypingDelayMs(
      'Claro! Temos a furadeira de impacto Bosch 650W em estoque por R$ 349,90 com parcelamento em até 3x sem juros.',
      ferragens
    );
    assert.ok(delayShort >= 900 && delayShort <= 6700);
    assert.ok(delayLong >= 1100 && delayLong <= 6700);

    const rl = await antiBanService.enforceRateLimit(ferragens);
    assert.strictEqual(rl.throttled, false);
    assert.ok(rl.remaining >= 0);
  });

  // -------------------------------------------------------------------------
  // BLOCO 2: INTEGRAÇÃO HTTP — PIPELINE DO BOT (TEST-CHAT, PAUSA, BLOQUEIO IA, QUICK REPLY)
  // -------------------------------------------------------------------------
  console.log('\n💬 Bloco 2: Integração do Atendente IA (Quick Reply, Bloqueio IA, Pausa Humana, Pipeline)');

  let adminToken = null;
  await runTest('Auth API: login admin@neoxy.ai retorna JWT válido', async () => {
    const { status, data } = await httpJson('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@neoxy.ai', password: 'neoxy123' }
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    adminToken = data.token;
  });

  const testPhone = '5551991112233';
  const ferragens = await tenantService.getTenantBySlug('ferragens-demo');

  await runTest('Quick Reply Auto-Trigger: bot responde instantaneamente palavra-chave cadastrada', async () => {
    const qr = await crmExtensions.upsertQuickReply(ferragens.id, {
      title: 'Teste Pix Automático',
      shortcut: '/pixteste',
      triggerKeywords: 'chavepixteste',
      content: 'Nossa chave PIX oficial é CNPJ 12.345.678/0001-90!',
      autoTrigger: true
    });

    try {
      const { status, data } = await httpJson('/api/tenants/ferragens-demo/test-chat', {
        method: 'POST',
        token: adminToken,
        body: { customerPhone: testPhone, message: 'Oi, qual a chavepixteste?' }
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.response.quickReplyTriggered, '/pixteste');
      assert.ok(data.response.text.includes('12.345.678/0001-90'));
    } finally {
      await crmExtensions.deleteQuickReply(ferragens.id, qr.id).catch(() => {});
    }
  });

  await runTest('Bloqueio de IA por Contato: telefone bloqueado não recebe resposta automática', async () => {
    await httpJson(`/api/tenants/ferragens-demo/contacts/${testPhone}/ai-block`, {
      method: 'PATCH',
      token: adminToken,
      body: { aiBlocked: true }
    });

    try {
      const { status, data } = await httpJson('/api/tenants/ferragens-demo/test-chat', {
        method: 'POST',
        token: adminToken,
        body: { customerPhone: testPhone, message: 'Olá, gostaria de um orçamento' }
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.response.blockedByContactFilter, true);
      assert.strictEqual(data.response.isNoResponse, true);
    } finally {
      await httpJson(`/api/tenants/ferragens-demo/contacts/${testPhone}/ai-block`, {
        method: 'PATCH',
        token: adminToken,
        body: { aiBlocked: false }
      });
    }
  });

  await runTest('Pausa para Humano (Handoff): sessão pausada impede interferência do bot até retomada', async () => {
    const pauseRes = await httpJson('/api/tenants/ferragens-demo/inbox/handoff', {
      method: 'POST',
      token: adminToken,
      body: { customerPhone: testPhone, pauseForHuman: true }
    });
    assert.strictEqual(pauseRes.status, 200);

    try {
      const simRes = await httpJson('/api/tenants/ferragens-demo/test-chat', {
        method: 'POST',
        token: adminToken,
        body: { customerPhone: testPhone, message: 'Ainda estou aguardando o atendente humano' }
      });
      assert.strictEqual(simRes.status, 200);
      assert.strictEqual(simRes.data.response.pausedByHuman, true);
      assert.strictEqual(simRes.data.response.isNoResponse, true);
    } finally {
      const resumeRes = await httpJson('/api/tenants/ferragens-demo/inbox/handoff', {
        method: 'POST',
        token: adminToken,
        body: { customerPhone: testPhone, pauseForHuman: false }
      });
      assert.strictEqual(resumeRes.status, 200);
    }
  });

  await runTest('Pipeline completo IA (processQueueItemDirect): sentimento, demanda perdida, mídia e handoff', async () => {
    const sampleItem = await prisma.catalogItem.findFirst({ where: { tenantId: ferragens.id } });
    const origImg = sampleItem?.imageUrl || null;
    if (sampleItem) {
      await prisma.catalogItem.update({
        where: { id: sampleItem.id },
        data: { imageUrl: 'https://cdn.neo.test/furadeira.jpg' }
      });
    }

    const origGenerate = aiService.generateResponse.bind(aiService);
    aiService.generateResponse = async () =>
      aiService.parseModelResponse(
        `Encontrei a oferta! {{COD:${sampleItem ? sampleItem.code : 'TEST'}}} ` +
          '[SENTIMENT:FRUSTRATED] [MISSED_DEMAND:Compressor 50L Teste] [SEND_LOCATION] [HANDOFF]'
      );

    try {
      const res = await messageQueueService.processQueueItemDirect({
        tenant: ferragens,
        customerPhone: testPhone,
        text: 'Quero compressor 50L urgente, já esperei demais!'
      });

      assert.strictEqual(res.isHandoff, true, 'Handoff deve ser acionado');
      assert.strictEqual(res.sentiment, 'FRUSTRATED', 'Sentimento FRUSTRATED deve ser detectado');
      assert.deepStrictEqual(res.missedDemands, ['Compressor 50L Teste'], 'Demanda perdida deve ser extraída');
      assert.strictEqual(res.sendLocation, true, 'Envio de localização deve ser detectado');
      assert.ok(!res.text.includes('[HANDOFF]'), 'Tag oculta não deve aparecer na resposta');
      if (sampleItem) {
        assert.strictEqual(res.resolvedMedia.length, 1, 'Mídia do item deve ser resolvida');
        assert.strictEqual(res.resolvedMedia[0].url, 'https://cdn.neo.test/furadeira.jpg');
      }

      const session = await prisma.chatSession.findUnique({
        where: { tenantId_customerPhone: { tenantId: ferragens.id, customerPhone: testPhone } }
      });
      assert.strictEqual(session.state, 'HUMAN_HANDOFF');
      const stateData = JSON.parse(session.stateData || '{}');
      assert.strictEqual(stateData.sentiment, 'FRUSTRATED');

      // Limpeza do dado de teste
      await chatSessionService.resumeSession(ferragens.id, testPhone);
      await prisma.missedDemand.deleteMany({
        where: { tenantId: ferragens.id, productName: 'Compressor 50L Teste' }
      }).catch(() => {});
    } finally {
      aiService.generateResponse = origGenerate;
      if (sampleItem) {
        await prisma.catalogItem.update({
          where: { id: sampleItem.id },
          data: { imageUrl: origImg }
        });
      }
    }
  });

  // -------------------------------------------------------------------------
  // BLOCO 3: CENTRAL DE SINCRONIZAÇÃO WHATSAPP & WEBHOOKS EVOLUTION
  // -------------------------------------------------------------------------
  console.log('\n📱 Bloco 3: Sincronização WhatsApp (QR Code, Pairing, Status, Reset, Webhooks)');

  const syncSlug = 'ferragens-demo';

  await runTest('GET /whatsapp/status: retorna estrutura completa (status, gateway, preferences, health)', async () => {
    const { status, data } = await httpJson(`/api/tenants/${syncSlug}/whatsapp/status`, {
      token: adminToken
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.whatsapp.instanceName);
    assert.ok(data.whatsapp.gateway && data.whatsapp.gateway.webhookUrl.includes('/api/webhooks/whatsapp'));
    assert.strictEqual(typeof data.whatsapp.preferences.ignoreGroups, 'boolean');
    assert.strictEqual(typeof data.whatsapp.health.totalSessions, 'number');
  });

  await runTest('POST /whatsapp/connect (mode=qr): gera QR Code PNG escaneável com TTL', async () => {
    const { status, data } = await httpJson(`/api/tenants/${syncSlug}/whatsapp/connect`, {
      method: 'POST',
      token: adminToken,
      body: { mode: 'qr' }
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.whatsapp.status, 'QRCODE');
    assert.strictEqual(data.whatsapp.isConnected, false);
    assert.ok(data.whatsapp.qr && data.whatsapp.qr.base64.startsWith('data:image/png;base64,'));
    assert.ok(data.whatsapp.qr.ttlSeconds > 0 && data.whatsapp.qr.ttlSeconds <= 45);
  });

  await runTest('POST /whatsapp/connect (mode=pairing): gera código de pareamento de 8 dígitos', async () => {
    const { status, data } = await httpJson(`/api/tenants/${syncSlug}/whatsapp/connect`, {
      method: 'POST',
      token: adminToken,
      body: { mode: 'pairing', phoneNumber: '5551998887766' }
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.whatsapp.status, 'QRCODE');
    assert.ok(data.whatsapp.pairingCode && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(data.whatsapp.pairingCode.code));
    assert.strictEqual(data.whatsapp.pairingCode.phone, '5551998887766');
  });

  await runTest('POST /whatsapp/confirm-demo: conclui pareamento e marca sessão como CONNECTED', async () => {
    const { status, data } = await httpJson(`/api/tenants/${syncSlug}/whatsapp/confirm-demo`, {
      method: 'POST',
      token: adminToken,
      body: { phoneNumber: '5551998887766', profileName: 'Ferragens Marlene Oficial' }
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.whatsapp.status, 'CONNECTED');
    assert.strictEqual(data.whatsapp.isConnected, true);
    assert.strictEqual(data.whatsapp.phoneNumber, '5551998887766');
    assert.strictEqual(data.whatsapp.profileName, 'Ferragens Marlene Oficial');
    assert.strictEqual(data.whatsapp.qr, null);
  });

  await runTest('POST /whatsapp/test-message: entrega teste quando conectado e valida número inválido', async () => {
    const okRes = await httpJson(`/api/tenants/${syncSlug}/whatsapp/test-message`, {
      method: 'POST',
      token: adminToken,
      body: { phone: '5551998887766', text: 'Ping de verificação NEO' }
    });
    assert.strictEqual(okRes.status, 200);
    assert.strictEqual(okRes.data.result.delivered, true);

    const badRes = await httpJson(`/api/tenants/${syncSlug}/whatsapp/test-message`, {
      method: 'POST',
      token: adminToken,
      body: { phone: '123' }
    });
    assert.strictEqual(badRes.status, 400);
  });

  await runTest('PUT /whatsapp/config: persiste preferências de sincronização e proteção', async () => {
    const { status, data } = await httpJson(`/api/tenants/${syncSlug}/whatsapp/config`, {
      method: 'PUT',
      token: adminToken,
      body: {
        preferences: {
          ignoreGroups: true,
          rejectCalls: true,
          alwaysOnline: true,
          readReceipts: false
        }
      }
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.whatsapp.preferences.alwaysOnline, true);
    assert.strictEqual(data.whatsapp.preferences.readReceipts, false);

    // Reverte para padrão limpo
    await httpJson(`/api/tenants/${syncSlug}/whatsapp/config`, {
      method: 'PUT',
      token: adminToken,
      body: {
        preferences: {
          alwaysOnline: false,
          readReceipts: true
        }
      }
    });
  });

  await runTest('Webhook Evolution: CONNECTION_UPDATE, QRCODE_UPDATED e filtro de grupos @g.us', async () => {
    const statusRes = await httpJson(`/api/tenants/${syncSlug}/whatsapp/status`, { token: adminToken });
    const instance = statusRes.data.whatsapp.instanceName;

    // 1. Webhook desconecta
    const closeWh = await httpJson('/api/webhooks/whatsapp', {
      method: 'POST',
      body: { event: 'connection.update', instance, data: { state: 'close' } }
    });
    assert.strictEqual(closeWh.status, 200);
    assert.strictEqual(closeWh.data.received, true);
    await sleep(200);

    const afterClose = await httpJson(`/api/tenants/${syncSlug}/whatsapp/status`, { token: adminToken });
    assert.strictEqual(afterClose.data.whatsapp.status, 'DISCONNECTED');

    // 2. Webhook envia novo QR Code
    const qrWh = await httpJson('/api/webhooks/whatsapp', {
      method: 'POST',
      body: { event: 'qrcode.updated', instance, data: { qrcode: { code: '2@webhook-qr-payload-test' } } }
    });
    assert.strictEqual(qrWh.status, 200);
    assert.strictEqual(qrWh.data.received, true);
    await sleep(200);

    const afterQr = await httpJson(`/api/tenants/${syncSlug}/whatsapp/status`, { token: adminToken });
    assert.ok(afterQr.data.whatsapp.qr?.base64?.startsWith('data:image/png;base64,'));

    // 3. Webhook conecta novamente
    const openWh = await httpJson('/api/webhooks/whatsapp', {
      method: 'POST',
      body: {
        event: 'connection.update',
        instance,
        data: { state: 'open', wuid: '5551987654321@s.whatsapp.net', profileName: 'Webhook Live' }
      }
    });
    assert.strictEqual(openWh.status, 200);
    await sleep(200);

    const afterOpen = await httpJson(`/api/tenants/${syncSlug}/whatsapp/status`, { token: adminToken });
    assert.strictEqual(afterOpen.data.whatsapp.status, 'CONNECTED');
    assert.strictEqual(afterOpen.data.whatsapp.phoneNumber, '5551987654321');

    // 4. Mensagem de grupo (@g.us) deve ser ignorada silenciosamente sem criar sessão
    const groupJid = '120363000999888@g.us';
    const grpWh = await httpJson('/api/webhooks/whatsapp', {
      method: 'POST',
      body: {
        event: 'messages.upsert',
        instance,
        data: {
          key: { remoteJid: groupJid, fromMe: false, id: 'GRP-TEST-01' },
          message: { conversation: 'Mensagem de grupo de teste' }
        }
      }
    });
    assert.strictEqual(grpWh.status, 200);
    await sleep(200);
    const groupSession = await prisma.chatSession.findUnique({
      where: { tenantId_customerPhone: { tenantId: ferragens.id, customerPhone: '120363000999888' } }
    });
    assert.strictEqual(groupSession, null, 'Mensagem de grupo @g.us não deve criar sessão de bot');
  });

  await runTest('POST /whatsapp/disconnect e POST /whatsapp/reset preservam histórico e regeneram QR', async () => {
    const discRes = await httpJson(`/api/tenants/${syncSlug}/whatsapp/disconnect`, {
      method: 'POST',
      token: adminToken
    });
    assert.strictEqual(discRes.status, 200);
    assert.strictEqual(discRes.data.whatsapp.status, 'DISCONNECTED');
    assert.strictEqual(discRes.data.whatsapp.isConnected, false);

    const resetRes = await httpJson(`/api/tenants/${syncSlug}/whatsapp/reset`, {
      method: 'POST',
      token: adminToken
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.whatsapp.status, 'QRCODE');
    assert.strictEqual(resetRes.data.whatsapp.phoneNumber, null);
    assert.ok(resetRes.data.whatsapp.qr?.base64?.startsWith('data:image/png;base64,'));

    // Deixa desconectado limpo após os testes
    await httpJson(`/api/tenants/${syncSlug}/whatsapp/disconnect`, {
      method: 'POST',
      token: adminToken
    });
  });

  // Limpa sessão e contato de teste
  await prisma.chatMessage.deleteMany({ where: { tenantId: ferragens.id, customerPhone: testPhone } }).catch(() => {});
  await prisma.chatSession.deleteMany({ where: { tenantId: ferragens.id, customerPhone: testPhone } }).catch(() => {});
  await prisma.whatsAppContact.deleteMany({ where: { tenantId: ferragens.id, phone: testPhone } }).catch(() => {});

  console.log('\n===============================================================');
  console.log(` RESULTADO FINAL: ${passed} passaram | ${failed} falharam`);
  console.log('===============================================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Erro fatal na suíte:', err);
  await prisma.$disconnect();
  process.exit(1);
});
