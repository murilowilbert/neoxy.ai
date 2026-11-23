const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { port, logger } = require('./config');
const webhookController = require('./modules/whatsapp/webhookController');
const tenantService = require('./modules/tenants/tenantService');
const messageQueueService = require('./modules/queue/messageQueueService');
const authService = require('./modules/auth/authService');
const {
  requireAuth,
  requireSuperAdmin,
  requireTenantAccess,
  requireModule
} = require('./modules/auth/authMiddleware');
const businessModuleService = require('./modules/business/businessModuleService');
const crmExtensionsService = require('./modules/business/crmExtensionsService');
const holidaysService = require('./modules/business/holidaysService');

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// =========================================================================
// 1. HEALTH & WEBHOOKS PÚBLICOS
// =========================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Neoxy.ai SaaS Platform',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/webhooks/whatsapp', (req, res) => {
  webhookController.handleEvolutionWebhook(req, res);
});

// =========================================================================
// 2. AUTENTICAÇÃO & ONBOARDING DE EMPRESAS
// =========================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Informe e-mail e senha.' });
    }
    const result = await authService.login(email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { userName, email, password, companyName, slug, segment, businessType } = req.body;
    if (!userName || !email || !password || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Preencha todos os campos obrigatórios (nome, e-mail, senha e nome da empresa).'
      });
    }
    const result = await authService.registerCompany({
      userName,
      email,
      password,
      companyName,
      slug,
      segment,
      businessType
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const session = await authService.getCurrentSession(req.user.id);
    res.json({ success: true, ...session });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 3. ROTAS DE ESTABELECIMENTOS (TENANTS) & CONFIGURAÇÕES
// =========================================================================
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
      return res.status(404).json({ success: false, error: 'Estabelecimento não encontrado' });
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

app.put('/api/tenants/:slug/settings', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { settings, name, segment, businessType, enabledModules, active } = req.body;
    const updated = await tenantService.updateTenantSettings(
      req.params.slug,
      settings || {},
      { name, segment, businessType, enabledModules, active }
    );
    res.json({ success: true, tenant: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 4. PAINEL SUPER ADMIN (CONTROLE GLOBAL DE FEATURE FLAGS E PERFIS)
// =========================================================================
app.patch('/api/admin/tenants/:slug/modules', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { businessType, enabledModules, active } = req.body;
    const updated = await tenantService.updateTenantSettings(
      req.params.slug,
      {},
      { businessType, enabledModules, active }
    );
    res.json({ success: true, tenant: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Carrossel de Banners da Tela de Login/Cadastro (Público para leitura, Super Admin para edição)
const prismaClient = require('./database/prisma');

app.get('/api/public/auth-slides', async (req, res) => {
  try {
    const slides = await prismaClient.authSlide.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    res.json({ success: true, slides });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/auth-slides', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const slides = await prismaClient.authSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    res.json({ success: true, slides });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/auth-slides', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id, title, subtitle, badge, imageUrl, sortOrder, active } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, error: 'Título e URL da imagem são obrigatórios.' });
    }
    const data = {
      title: String(title).trim(),
      subtitle: subtitle ? String(subtitle).trim() : null,
      badge: badge ? String(badge).trim() : null,
      imageUrl: String(imageUrl).trim(),
      sortOrder: Number(sortOrder || 0),
      active: active !== undefined ? Boolean(active) : true
    };
    const slide = id
      ? await prismaClient.authSlide.update({ where: { id }, data })
      : await prismaClient.authSlide.create({ data });
    res.json({ success: true, slide });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/auth-slides/:slideId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await prismaClient.authSlide.delete({ where: { id: req.params.slideId } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 5. DASHBOARD METRICS & INBOX AO VIVO (UNIVERSAIS)
// =========================================================================
app.get('/api/tenants/:slug/metrics', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const metrics = await businessModuleService.getTenantMetrics(req.tenant.id);
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tenants/:slug/inbox', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const sessions = await businessModuleService.listChatSessionsWithLastMessage(req.tenant.id);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/inbox/handoff', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { customerPhone, pauseForHuman } = req.body;
    const session = await businessModuleService.toggleHumanHandoff(
      req.tenant.id,
      customerPhone,
      Boolean(pauseForHuman)
    );
    res.json({ success: true, session });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Envio de resposta humana / resposta rápida diretamente pela Inbox
app.post('/api/tenants/:slug/inbox/reply', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { customerPhone, text } = req.body || {};
    if (!customerPhone || !String(text || '').trim()) {
      return res.status(400).json({ success: false, error: 'Informe o telefone e o texto da resposta.' });
    }
    const chatSessionService = require('./modules/chat/chatSessionService');
    const evolutionClient = require('./modules/whatsapp/evolutionClient');

    const msg = await chatSessionService.appendMessage({
      tenantId: req.tenant.id,
      customerPhone,
      role: 'human_agent',
      content: String(text).trim()
    });

    const instanceName = req.tenant.whatsappAccounts?.[0]?.instanceName;
    if (instanceName) {
      await evolutionClient.sendTextMessage(instanceName, customerPhone, String(text).trim());
    }

    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Analytics Executivo (Gráficos Mensagens/Dia, IA vs Humano, Top Procurados)
app.get('/api/tenants/:slug/analytics', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const analytics = await crmExtensionsService.getTenantAnalytics(req.tenant.id);
    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Contatos WhatsApp & Filtro de Bloqueio de IA
app.get('/api/tenants/:slug/contacts', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const contacts = await crmExtensionsService.listContacts(
      req.tenant.id,
      req.query.q || '',
      req.query.filter || 'all'
    );
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/contacts', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const contact = await crmExtensionsService.upsertContact(req.tenant.id, req.body || {});
    res.json({ success: true, contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.patch('/api/tenants/:slug/contacts/:phone/ai-block', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const contact = await crmExtensionsService.toggleContactAiBlock(
      req.tenant.id,
      req.params.phone,
      Boolean(req.body?.aiBlocked)
    );
    res.json({ success: true, contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/contacts/sync', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const result = await crmExtensionsService.syncContactsFromWhatsApp(req.tenant);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/contacts/:contactId', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    await crmExtensionsService.deleteContact(req.tenant.id, req.params.contactId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Promoções & Ofertas de Catálogo (Preço Manual ou % Geral / por Categoria)
app.get('/api/tenants/:slug/promotions', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const promotions = await crmExtensionsService.listPromotions(req.tenant.id);
    res.json({ success: true, promotions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/promotions', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const promotion = await crmExtensionsService.upsertPromotion(req.tenant.id, req.body || {});
    res.json({ success: true, promotion });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.patch('/api/tenants/:slug/promotions/:promoId/toggle', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const promotion = await crmExtensionsService.togglePromotion(
      req.tenant.id,
      req.params.promoId,
      Boolean(req.body?.active)
    );
    res.json({ success: true, promotion });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/promotions/:promoId', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    await crmExtensionsService.deletePromotion(req.tenant.id, req.params.promoId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Respostas Rápidas (/atalho) & Gatilhos Automáticos (Inspirado em Chatwoot & Whatomate)
app.get('/api/tenants/:slug/quick-replies', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const quickReplies = await crmExtensionsService.listQuickReplies(req.tenant.id);
    res.json({ success: true, quickReplies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/quick-replies', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const quickReply = await crmExtensionsService.upsertQuickReply(req.tenant.id, req.body || {});
    res.json({ success: true, quickReply });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/quick-replies/:replyId', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    await crmExtensionsService.deleteQuickReply(req.tenant.id, req.params.replyId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Radar de Follow-up & Conversas Esfriadas (Inspirado em DeskcommCRM)
app.get('/api/tenants/:slug/radar', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const radar = await crmExtensionsService.getFollowUpRadar(req.tenant.id);
    res.json({ success: true, radar });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Importador de Feriados Nacionais do Brasil (BrasilAPI + Calculadora Local)
app.get('/api/system/holidays/:year', requireAuth, async (req, res) => {
  try {
    const result = await holidaysService.getBrazilHolidays(req.params.year);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 6. MÓDULOS DINÂMICOS POR TIPO DE ESTABELECIMENTO (FEATURE FLAGS)
// =========================================================================

// A. Módulo de Catálogo & Estoque (stock)
app.get('/api/tenants/:slug/catalog', requireAuth, requireTenantAccess, requireModule('stock'), async (req, res) => {
  try {
    const items = await businessModuleService.listCatalogItems(req.tenant.id, req.query.q, req.query.limit);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/catalog', requireAuth, requireTenantAccess, requireModule('stock'), async (req, res) => {
  try {
    const item = await businessModuleService.upsertCatalogItem(req.tenant.id, req.body);
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Upload de Planilha de Estoque (CSV / XLSX de outro sistema / PDV)
app.post('/api/tenants/:slug/catalog/import', requireAuth, requireTenantAccess, requireModule('stock'), async (req, res) => {
  try {
    const result = await businessModuleService.importCatalogItems(req.tenant.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Botão "Atualizar Preços" (Puxa de provedor PDV / ERP / Planilha externa configurada)
app.post('/api/tenants/:slug/catalog/sync-prices', requireAuth, requireTenantAccess, requireModule('stock'), async (req, res) => {
  try {
    const currentSettings = req.tenant.settings || {};
    const savedPdv = currentSettings.pdvSync || {};
    const providerUrl = req.body.providerUrl !== undefined ? req.body.providerUrl : savedPdv.providerUrl;
    const apiKey = req.body.apiKey !== undefined ? req.body.apiKey : savedPdv.apiKey;

    if (req.body.saveConfig) {
      await tenantService.updateTenantSettings(req.params.slug, {
        ...currentSettings,
        pdvSync: {
          ...savedPdv,
          providerUrl: providerUrl || '',
          apiKey: apiKey || '',
          lastSyncedAt: new Date().toISOString()
        }
      });
    }

    const result = await businessModuleService.syncCatalogPrices(req.tenant.id, {
      providerUrl,
      apiKey,
      items: req.body.items
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// API Própria Neoxy v1 para PDVs / ERPs externos empurrarem atualizações de preço e estoque
app.post('/api/v1/tenants/:slug/catalog/sync', async (req, res) => {
  try {
    const tenant = await tenantService.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Estabelecimento não encontrado.' });
    }
    const providedKey = req.headers['x-api-key'] || req.query.apiKey || '';
    const expectedKey =
      tenant.parsedSettings?.pdvSync?.apiKey ||
      process.env.NEOXY_WEBHOOK_SECRET ||
      'neoxy-super-secret';

    if (providedKey !== expectedKey) {
      return res.status(401).json({ success: false, error: 'Chave x-api-key inválida para sincronização PDV.' });
    }

    const result = await businessModuleService.syncCatalogPrices(tenant.id, {
      items: Array.isArray(req.body) ? req.body : req.body.items || []
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/catalog/:itemId', requireAuth, requireTenantAccess, requireModule('stock'), async (req, res) => {
  try {
    await businessModuleService.deleteCatalogItem(req.tenant.id, req.params.itemId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// B. Módulo de Serviços (services)
app.get('/api/tenants/:slug/services', requireAuth, requireTenantAccess, requireModule('services'), async (req, res) => {
  try {
    const services = await businessModuleService.listServices(req.tenant.id);
    res.json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/services', requireAuth, requireTenantAccess, requireModule('services'), async (req, res) => {
  try {
    const service = await businessModuleService.createOrUpdateService(req.tenant.id, req.body);
    res.json({ success: true, service });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/services/:serviceId', requireAuth, requireTenantAccess, requireModule('services'), async (req, res) => {
  try {
    await businessModuleService.deleteService(req.tenant.id, req.params.serviceId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// B2. Grade de Profissionais / Recursos e Comissões (services)
app.get('/api/tenants/:slug/professionals', requireAuth, requireTenantAccess, requireModule('services'), async (req, res) => {
  try {
    const professionals = await businessModuleService.listProfessionals(req.tenant.id);
    res.json({ success: true, professionals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/professionals', requireAuth, requireTenantAccess, requireModule('services'), async (req, res) => {
  try {
    const professional = await businessModuleService.createOrUpdateProfessional(req.tenant.id, req.body);
    res.json({ success: true, professional });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/professionals/:professionalId', requireAuth, requireTenantAccess, requireModule('services'), async (req, res) => {
  try {
    await businessModuleService.deleteProfessional(req.tenant.id, req.params.professionalId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// C. Módulo de Agenda & Horários (appointments)
app.get('/api/tenants/:slug/appointments', requireAuth, requireTenantAccess, requireModule('appointments'), async (req, res) => {
  try {
    const appointments = await businessModuleService.listAppointments(req.tenant.id);
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/appointments', requireAuth, requireTenantAccess, requireModule('appointments'), async (req, res) => {
  try {
    const appointment = await businessModuleService.createOrUpdateAppointment(req.tenant.id, req.body);
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/appointments/:appointmentId', requireAuth, requireTenantAccess, requireModule('appointments'), async (req, res) => {
  try {
    await businessModuleService.deleteAppointment(req.tenant.id, req.params.appointmentId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// D. Módulo de Recebimento de Contas & Documentos (documents)
app.get('/api/tenants/:slug/documents', requireAuth, requireTenantAccess, requireModule('documents'), async (req, res) => {
  try {
    const documents = await businessModuleService.listDocuments(req.tenant.id);
    res.json({ success: true, documents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tenants/:slug/documents', requireAuth, requireTenantAccess, requireModule('documents'), async (req, res) => {
  try {
    const document = await businessModuleService.createOrUpdateDocument(req.tenant.id, req.body);
    res.json({ success: true, document });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tenants/:slug/documents/:documentId', requireAuth, requireTenantAccess, requireModule('documents'), async (req, res) => {
  try {
    await businessModuleService.deleteDocument(req.tenant.id, req.params.documentId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 7. SIMULADOR DE TESTE DE CHAT (HTTP)
// =========================================================================
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

// =========================================================================
// 7B. UPLOAD DE MÍDIAS (FOTOS ATÉ 5MB / VÍDEOS ATÉ 15MB)
// =========================================================================
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.post('/api/tenants/:slug/media/upload', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { fileName = 'arquivo', mimeType = '', fileBase64 = '' } = req.body || {};
    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
    }

    const match = String(fileBase64).match(/^data:([^;]+);base64,(.+)$/);
    const resolvedMime = (match ? match[1] : mimeType).toLowerCase();
    const rawB64 = match ? match[2] : String(fileBase64);
    const buffer = Buffer.from(rawB64, 'base64');

    const isVideo = resolvedMime.startsWith('video/');
    const isImage = resolvedMime.startsWith('image/');
    if (!isImage && !isVideo) {
      return res.status(400).json({
        success: false,
        error: 'Formato não suportado. Envie uma imagem (JPG/PNG/WebP) ou vídeo (MP4/WebM).'
      });
    }

    const maxBytes = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(400).json({
        success: false,
        error: isVideo
          ? 'Vídeo excede o limite máximo de 15 MB.'
          : 'Imagem excede o limite máximo de 5 MB.'
      });
    }

    const extFromName = path.extname(String(fileName)).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    const fallbackExt = isVideo ? '.mp4' : '.jpg';
    const safeExt = extFromName && extFromName.length <= 5 ? extFromName : fallbackExt;
    const safeFileName = `${req.tenant.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${safeExt}`;

    fs.writeFileSync(path.join(uploadsDir, safeFileName), buffer);

    res.json({
      success: true,
      url: `/uploads/${safeFileName}`,
      mediaType: isVideo ? 'video' : 'image',
      sizeBytes: buffer.length
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 7B. CONFIGURAÇÃO DA CHAVE API GEMINI (IA & VISÃO DE FOTOS)
// =========================================================================
app.get('/api/system/ai-key/status', requireAuth, (req, res) => {
  const raw = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  const configured = Boolean(raw && raw !== 'sua-chave-gemini-aqui' && raw.length >= 10);
  const masked = configured ? `${raw.slice(0, 6)}...${raw.slice(-4)}` : '';
  res.json({ success: true, configured, masked });
});

app.post('/api/system/ai-key', requireAuth, (req, res) => {
  try {
    const apiKey = String(req.body?.apiKey || '').trim();
    if (!apiKey || apiKey.length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Informe uma chave válida do Google Gemini (começa com AIza...).'
      });
    }

    process.env.GEMINI_API_KEY = apiKey;

    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (/^GEMINI_API_KEY=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY="${apiKey}"`);
    } else {
      const separator = envContent.length > 0 && !envContent.endsWith('\n') ? '\n' : '';
      envContent = `${envContent}${separator}GEMINI_API_KEY="${apiKey}"\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    const masked = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
    logger.info({ masked }, 'GEMINI_API_KEY atualizada via painel');
    res.json({ success: true, configured: true, masked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 8. SERVIR FRONTEND WEB (LANDING PAGE + LOGIN + DASHBOARD ADAPTATIVO)
// =========================================================================
const webDistPath = path.join(__dirname, '..', 'web', 'dist');
const publicPath = path.join(__dirname, '..', 'public');

if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
}
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Fallback SPA para rotas do frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  const distIndex = path.join(webDistPath, 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  const publicIndex = path.join(publicPath, 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  res.status(404).json({ error: 'Frontend não encontrado.' });
});

const { ensureDatabaseReady } = require('./database/bootstrap');

function startServer() {
  return app.listen(port, () => {
    logger.info(`🚀 Neoxy.ai Platform Server rodando em http://localhost:${port}`);
  });
}

if (require.main === module) {
  ensureDatabaseReady()
    .then(() => startServer())
    .catch((err) => {
      logger.error({ err }, 'Falha ao inicializar banco de dados');
      process.exit(1);
    });
}

module.exports = { app, startServer };
