const assert = require('assert');
const { app } = require('../src/server');

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`🧪 Iniciando testes de integração em ${baseUrl}...`);

  try {
    // 1. Healthcheck
    const healthRes = await fetch(`${baseUrl}/health`).then(r => r.json());
    assert.strictEqual(healthRes.status, 'healthy');
    console.log('✅ 1. Healthcheck funcionando.');

    // 2. Login como Ferragens Marlene (RETAIL)
    const loginRetail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'contato@ferragensmarlene.com.br', password: 'neoxy123' })
    }).then(r => r.json());

    assert.strictEqual(loginRetail.success, true);
    assert.strictEqual(loginRetail.tenants[0].slug, 'ferragens-demo');
    assert(loginRetail.tenants[0].parsedModules.includes('stock'));
    console.log('✅ 2. Login do perfil Varejo (Ferragens Marlene) validado.');

    // 3. Testar acesso ao catálogo permitido para Ferragens
    const catalogRes = await fetch(`${baseUrl}/api/tenants/ferragens-demo/catalog`, {
      headers: { Authorization: `Bearer ${loginRetail.token}` }
    }).then(r => r.json());
    assert.strictEqual(catalogRes.success, true);
    assert(catalogRes.items.length >= 5);
    console.log(`✅ 3. Catálogo de Produtos da Ferragens retornado (${catalogRes.items.length} itens).`);

    // 4. Testar bloqueio de módulo não liberado (Ferragens tentando acessar módulo de documentos de Escritório)
    const blockedDocRes = await fetch(`${baseUrl}/api/tenants/ferragens-demo/documents`, {
      headers: { Authorization: `Bearer ${loginRetail.token}` }
    });
    assert.strictEqual(blockedDocRes.status, 403);
    console.log('✅ 4. Feature Flag bloqueou com sucesso módulo "documents" não habilitado para Ferragens.');

    // 5. Testar isolamento Multi-Tenant (Ferragens tentando acessar dados do Escritório Contábil)
    const crossTenantRes = await fetch(`${baseUrl}/api/tenants/escritorio-demo/metrics`, {
      headers: { Authorization: `Bearer ${loginRetail.token}` }
    });
    assert.strictEqual(crossTenantRes.status, 403);
    console.log('✅ 5. Isolamento Multi-Tenant bloqueou acesso cruzado entre empresas.');

    // 6. Login como Escritório Contábil (OFFICE) e leitura de Contas/Boletos
    const loginOffice = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'contato@primecontabil.com.br', password: 'neoxy123' })
    }).then(r => r.json());

    const officeDocs = await fetch(`${baseUrl}/api/tenants/escritorio-demo/documents`, {
      headers: { Authorization: `Bearer ${loginOffice.token}` }
    }).then(r => r.json());
    assert.strictEqual(officeDocs.success, true);
    assert(officeDocs.documents.length >= 3);
    console.log(`✅ 6. Módulo de Contas & Boletos do Escritório funcionando (${officeDocs.documents.length} documentos).`);

    // 7. Login como Super Admin e verificação de todos os estabelecimentos
    const loginAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@neoxy.ai', password: 'neoxy123' })
    }).then(r => r.json());
    assert.strictEqual(loginAdmin.user.role, 'SUPER_ADMIN');
    assert(loginAdmin.tenants.length >= 3);
    console.log(`✅ 7. Super Admin autenticado com acesso aos ${loginAdmin.tenants.length} estabelecimentos.`);

    // 8. Verificar entrega do Frontend SPA (Landing Page / index.html)
    const htmlRes = await fetch(`${baseUrl}/`).then(r => r.text());
    assert(htmlRes.includes('<div id="root"></div>'));
    console.log('✅ 8. Servidor entregando Landing Page & SPA React na raiz.');

    console.log('\n🎉 TODOS OS 8 TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
