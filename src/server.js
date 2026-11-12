const express = require('express');
const cors = require('cors');
const { port, logger } = require('./config');
const webhookController = require('./modules/whatsapp/webhookController');
const tenantService = require('./modules/tenants/tenantService');
const messageQueueService = require('./modules/queue/messageQueueService');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Neoxy.ai',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Evolution API Webhook
app.post('/api/webhooks/whatsapp', (req, res) => {
  webhookController.handleEvolutionWebhook(req, res);
});

// Tenants API
app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await tenantService.listTenants();
    res.json({ success: true, count: tenants.length, tenants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tenants/:slug', async (req, res) => {
  try {
    const tenant = await tenantService.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant não encontrado' });
    }
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants', async (req, res) => {
  try {
    const tenant = await tenantService.upsertTenant(req.body);
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Test Chat Endpoint (Para testes ágeis sem WhatsApp)
app.post('/api/tenants/:slug/test-chat', async (req, res) => {
  try {
    const { slug } = req.params;
    const { message, customerPhone = '5551999999999', media } = req.body;

    const tenant = await tenantService.getTenantBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ success: false, error: `Tenant ${slug} não encontrado.` });
    }

    if (!message && !media) {
      return res.status(400).json({ success: false, error: 'Campo "message" obrigatório.' });
    }

    const aiResult = await messageQueueService.processQueueItemDirect({
      tenant,
      customerPhone,
      text: message,
      media
    });

    res.json({
      success: true,
      tenant: tenant.name,
      customerPhone,
      response: aiResult
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro no endpoint de test-chat');
    res.status(500).json({ success: false, error: err.message });
  }
});

function startServer() {
  return app.listen(port, () => {
    logger.info(`🚀 Neoxy.ai Server rodando na porta ${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
