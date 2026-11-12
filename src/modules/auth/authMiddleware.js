const authService = require('./authService');
const tenantService = require('../tenants/tenantService');
const prisma = require('../../database/prisma');

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Autenticação necessária.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada.' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Acesso restrito ao administrador global da plataforma.'
    });
  }
  next();
}

async function requireTenantAccess(req, res, next) {
  try {
    const slug = req.params.slug || req.body.slug || req.query.slug;
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Identificador do estabelecimento (slug) não informado.' });
    }

    const tenant = await tenantService.getTenantBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Estabelecimento não encontrado.' });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      req.tenant = tenant;
      return next();
    }

    const membership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId: tenant.id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para acessar este estabelecimento.'
      });
    }

    req.tenant = tenant;
    req.memberRole = membership.role;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function requireModule(moduleName) {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({ success: false, error: 'Contexto do estabelecimento não carregado.' });
    }

    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const enabledModules = req.tenant.parsedModules || [];
    if (!enabledModules.includes(moduleName)) {
      return res.status(403).json({
        success: false,
        error: `O módulo "${moduleName}" não está habilitado para o perfil deste estabelecimento.`
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireSuperAdmin,
  requireTenantAccess,
  requireModule
};
