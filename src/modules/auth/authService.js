const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../database/prisma');
const tenantService = require('../tenants/tenantService');

const JWT_SECRET = process.env.JWT_SECRET || 'neoxy-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function login(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        include: { tenant: true }
      }
    }
  });

  if (!user) {
    throw new Error('E-mail ou senha inválidos.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('E-mail ou senha inválidos.');
  }

  let tenants = [];
  if (user.role === 'SUPER_ADMIN') {
    tenants = await tenantService.listTenants();
  } else {
    tenants = user.memberships.map(m => ({
      ...tenantService.parseTenantSettings(m.tenant),
      memberRole: m.role
    }));
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    tenants
  };
}

async function registerCompany({
  userName,
  email,
  password,
  companyName,
  slug,
  segment = 'geral',
  businessType = 'RETAIL'
}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new Error('Este e-mail já está cadastrado.');
  }

  const cleanSlug = (slug || companyName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existingTenant) {
    throw new Error(`O identificador "${cleanSlug}" já está em uso por outra empresa.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const enabledModules = tenantService.BUSINESS_TYPE_PRESETS[businessType] || ['stock'];

  const defaultSettings = {
    persona: {
      attendantName: 'Atendente Virtual',
      tone: 'humanizado, prestativo, ágil e natural',
      greetingStyle: 'Amigável e direto ao ponto',
      forbiddenWords: ['robô', 'inteligência artificial', 'assistente virtual', 'sistema']
    },
    businessHours: {
      timezone: 'America/Sao_Paulo',
      schedule: {
        '1': [{ start: '08:00', end: '18:00' }],
        '2': [{ start: '08:00', end: '18:00' }],
        '3': [{ start: '08:00', end: '18:00' }],
        '4': [{ start: '08:00', end: '18:00' }],
        '5': [{ start: '08:00', end: '18:00' }],
        '6': [{ start: '08:00', end: '12:00' }]
      },
      exceptions: []
    },
    rules: {
      deliveryPolicy: 'Consulte taxas de entrega para sua região.',
      paymentMethods: 'PIX, Cartão de Crédito/Débito e Dinheiro.',
      discountPolicy: 'Descontos especiais apenas mediante aprovação da gerência.'
    },
    stockConfig: {
      adapter: 'database'
    }
  };

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: userName,
        email: normalizedEmail,
        passwordHash,
        role: 'USER'
      }
    });

    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug: cleanSlug,
        segment,
        businessType,
        enabledModules: JSON.stringify(enabledModules),
        settings: JSON.stringify(defaultSettings)
      }
    });

    await tx.tenantMember.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER'
      }
    });

    return { user, tenant };
  });

  const token = generateToken(result.user);
  const parsedTenant = tenantService.parseTenantSettings(result.tenant);

  return {
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role
    },
    tenants: [parsedTenant]
  };
}

async function getCurrentSession(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { tenant: true }
      }
    }
  });

  if (!user) throw new Error('Usuário não encontrado');

  let tenants = [];
  if (user.role === 'SUPER_ADMIN') {
    tenants = await tenantService.listTenants();
  } else {
    tenants = user.memberships.map(m => ({
      ...tenantService.parseTenantSettings(m.tenant),
      memberRole: m.role
    }));
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    tenants
  };
}

module.exports = {
  login,
  registerCompany,
  getCurrentSession,
  verifyToken,
  generateToken
};
