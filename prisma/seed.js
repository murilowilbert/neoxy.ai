const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed completo da plataforma SaaS Neoxy.ai (Multi-Tenant + Feature Flags)...');

  const defaultPassHash = await bcrypt.hash('neoxy123', 10);

  // =========================================================================
  // 0. USUÁRIOS GLOBAIS E EMPRESARIAIS
  // =========================================================================
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@neoxy.ai' },
    update: { name: 'Murilo Wilbert (Super Admin)', role: 'SUPER_ADMIN', passwordHash: defaultPassHash },
    create: { name: 'Murilo Wilbert (Super Admin)', email: 'admin@neoxy.ai', role: 'SUPER_ADMIN', passwordHash: defaultPassHash }
  });

  const ferragensOwner = await prisma.user.upsert({
    where: { email: 'contato@ferragensmarlene.com.br' },
    update: { name: 'Gestor Ferragens Marlene', role: 'USER', passwordHash: defaultPassHash },
    create: { name: 'Gestor Ferragens Marlene', email: 'contato@ferragensmarlene.com.br', role: 'USER', passwordHash: defaultPassHash }
  });

  const petshopOwner = await prisma.user.upsert({
    where: { email: 'contato@petshopamigofiel.com.br' },
    update: { name: 'Gestor Pet Shop Amigo Fiel', role: 'USER', passwordHash: defaultPassHash },
    create: { name: 'Gestor Pet Shop Amigo Fiel', email: 'contato@petshopamigofiel.com.br', role: 'USER', passwordHash: defaultPassHash }
  });

  const officeOwner = await prisma.user.upsert({
    where: { email: 'contato@primecontabil.com.br' },
    update: { name: 'Dr. Ricardo — Prime Contábil', role: 'USER', passwordHash: defaultPassHash },
    create: { name: 'Dr. Ricardo — Prime Contábil', email: 'contato@primecontabil.com.br', role: 'USER', passwordHash: defaultPassHash }
  });

  // =========================================================================
  // 1. TENANT VAREJO: Ferragens Demo (Piloto Espelho Ferragem Marlene)
  // =========================================================================
  const ferragensSettings = {
    persona: {
      attendantName: 'Vendedor Balcão',
      tone: 'humano, prestativo, vendedor experiente de balcão, ágil e atencioso',
      botIdentity: 'atendente virtual que nunca se declara IA',
      forbiddenWords: ['sistema', 'robô', 'planilha', 'banco de dados', 'inteligência artificial'],
      allowedDiscounts: false,
      discountHandoffMessage: 'Sobre condições de desconto à vista, vou pedir para um dos nossos atendentes verificar as opções para você, só um segundo!'
    },
    storeInfo: {
      about: 'Loja tradicional focada em materiais hidráulicos, elétricos, ferramentas, tintas e reformas.',
      address: 'Rua Osvaldo Cruz, 417, Centro, Igrejinha - RS',
      deliveryPolicy: 'Infelizmente não possuímos tele-entrega no momento. O cliente precisa retirar no balcão da loja física.'
    },
    rules: {
      deliveryPolicy: 'Retirada exclusiva no balcão da loja física.',
      paymentMethods: 'PIX, Dinheiro, Cartão de Débito e Crédito em até 6x.',
      discountPolicy: 'Descontos apenas mediante avaliação presencial ou do gerente no balcão.'
    },
    businessHours: {
      timezone: 'America/Sao_Paulo',
      schedule: {
        '1': [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '19:00' }],
        '2': [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '19:00' }],
        '3': [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '19:00' }],
        '4': [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '19:00' }],
        '5': [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '19:00' }],
        '6': [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '17:30' }],
        '0': [] // Domingo fechado
      },
      exceptions: [
        { date: '2026-12-25', type: 'closed', reason: 'Feriado de Natal' },
        { date: '2026-01-01', type: 'closed', reason: 'Confraternização Universal' }
      ]
    },
    catalogSource: {
      type: 'google_sheets_csv',
      url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQrx6iAXiTOnLcp8kpL66zY0PGycvbZbai3qiNP8wqGLHMGhG3w4gMeRHXu8V4fsQ/pub?output=csv',
      syncIntervalMinutes: 10,
      hasPhotos: true,
      mapping: {
        code: 'Código',
        name: 'Produto',
        price: 'Preço de Venda',
        stock: 'Quantidade',
        category: 'Local'
      }
    },
    features: {
      automaticHandoffHours: 6,
      visionEnabled: true
    }
  };

  const ferragensTenant = await prisma.tenant.upsert({
    where: { slug: 'ferragens-demo' },
    update: {
      name: 'Ferragens Marlene (Piloto)',
      segment: 'construcao_e_ferragem',
      businessType: 'RETAIL',
      enabledModules: JSON.stringify(['stock', 'crm']),
      active: true,
      settings: JSON.stringify(ferragensSettings)
    },
    create: {
      slug: 'ferragens-demo',
      name: 'Ferragens Marlene (Piloto)',
      segment: 'construcao_e_ferragem',
      businessType: 'RETAIL',
      enabledModules: JSON.stringify(['stock', 'crm']),
      active: true,
      settings: JSON.stringify(ferragensSettings)
    }
  });

  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: ferragensOwner.id, tenantId: ferragensTenant.id } },
    update: { role: 'OWNER' },
    create: { userId: ferragensOwner.id, tenantId: ferragensTenant.id, role: 'OWNER' }
  });

  await prisma.tenantWhatsAppSession.upsert({
    where: { instanceName: 'ferragens_instance_01' },
    update: { tenantId: ferragensTenant.id },
    create: {
      tenantId: ferragensTenant.id,
      instanceName: 'ferragens_instance_01',
      status: 'CONNECTED',
      phoneNumber: '5551999999999'
    }
  });

  // Popula itens de amostra no banco para visualização imediata no painel da Ferragens
  await prisma.catalogItem.deleteMany({ where: { tenantId: ferragensTenant.id } });
  await prisma.catalogItem.createMany({
    data: [
      {
        tenantId: ferragensTenant.id,
        code: '7891234001',
        name: 'Ducha Elétrica Lorenzetti Advanced Multitemperaturas 220V 7500W',
        price: 159.90,
        stockQty: 14,
        category: 'Hidráulica e Chuveiros',
        brand: 'Lorenzetti'
      },
      {
        tenantId: ferragensTenant.id,
        code: '7891234002',
        name: 'Parafusadeira e Furadeira de Impacto Bosch GSB 18V-50 Bateria',
        price: 789.00,
        stockQty: 5,
        category: 'Ferramentas Elétricas',
        brand: 'Bosch'
      },
      {
        tenantId: ferragensTenant.id,
        code: '7891234003',
        name: 'Tinta Acrílica Fosca Suvinil Toque de Seda Branco Neve 18L',
        price: 429.90,
        stockQty: 9,
        category: 'Pintura e Tintas',
        brand: 'Suvinil'
      },
      {
        tenantId: ferragensTenant.id,
        code: '7891234004',
        name: 'Fechadura Digital Intelbras FR 101 Sobrepor com Senha',
        price: 399.00,
        stockQty: 7,
        category: 'Ferragens e Segurança',
        brand: 'Intelbras'
      },
      {
        tenantId: ferragensTenant.id,
        code: '7891234005',
        name: 'Massa Corrida PVA Coral Interior Balde 25kg',
        price: 84.50,
        stockQty: 22,
        category: 'Pintura e Tintas',
        brand: 'Coral'
      }
    ]
  });

  await prisma.missedDemand.upsert({
    where: { tenantId_productName: { tenantId: ferragensTenant.id, productName: 'Serra Mármore Makita 110V' } },
    update: { searchCount: 7 },
    create: { tenantId: ferragensTenant.id, productName: 'Serra Mármore Makita 110V', searchCount: 7 }
  });

  await prisma.missedDemand.upsert({
    where: { tenantId_productName: { tenantId: ferragensTenant.id, productName: 'Cimento Queimado Cinza Urbano 5kg' } },
    update: { searchCount: 4 },
    create: { tenantId: ferragensTenant.id, productName: 'Cimento Queimado Cinza Urbano 5kg', searchCount: 4 }
  });

  // =========================================================================
  // 2. TENANT SERVIÇOS & HÍBRIDO: Pet Shop Amigo Fiel
  // =========================================================================
  const petshopSettings = {
    persona: {
      attendantName: 'Carol (Consultora Pet)',
      tone: 'afetuoso com animais, alegre, consultor especializado em saúde, estética e nutrição pet',
      botIdentity: 'atendente carinhoso do Pet Shop Amigo Fiel',
      forbiddenWords: ['robô', 'sistema'],
      allowedDiscounts: true,
      discountHandoffMessage: 'Temos 5% de desconto no PIX para rações super premium!'
    },
    storeInfo: {
      about: 'Pet shop completo com clínica veterinária, banho & tosa humanizado, rações super premium e farmácia pet.',
      address: 'Av. Brasil, 1200, Centro',
      deliveryPolicy: 'Entregamos em até 2 horas na cidade! Tele-entrega gratuita acima de R$100 e Táxi Dog disponível.'
    },
    rules: {
      deliveryPolicy: 'Tele-entrega grátis acima de R$100. Táxi Dog sob agendamento.',
      paymentMethods: 'PIX (5% off), Cartão de Crédito em até 3x sem juros.',
      discountPolicy: '5% de desconto automático no PIX.'
    },
    businessHours: {
      timezone: 'America/Sao_Paulo',
      schedule: {
        '1': [{ start: '08:30', end: '19:00' }],
        '2': [{ start: '08:30', end: '19:00' }],
        '3': [{ start: '08:30', end: '19:00' }],
        '4': [{ start: '08:30', end: '19:00' }],
        '5': [{ start: '08:30', end: '19:00' }],
        '6': [{ start: '08:30', end: '18:00' }],
        '0': [{ start: '09:00', end: '13:00' }]
      },
      exceptions: []
    },
    catalogSource: {
      type: 'database'
    },
    features: {
      automaticHandoffHours: 4
    }
  };

  const petshopTenant = await prisma.tenant.upsert({
    where: { slug: 'petshop-demo' },
    update: {
      name: 'Pet Shop Amigo Fiel',
      segment: 'petshop_e_clinica',
      businessType: 'SERVICES',
      enabledModules: JSON.stringify(['stock', 'services', 'appointments', 'crm']),
      active: true,
      settings: JSON.stringify(petshopSettings)
    },
    create: {
      slug: 'petshop-demo',
      name: 'Pet Shop Amigo Fiel',
      segment: 'petshop_e_clinica',
      businessType: 'SERVICES',
      enabledModules: JSON.stringify(['stock', 'services', 'appointments', 'crm']),
      active: true,
      settings: JSON.stringify(petshopSettings)
    }
  });

  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: petshopOwner.id, tenantId: petshopTenant.id } },
    update: { role: 'OWNER' },
    create: { userId: petshopOwner.id, tenantId: petshopTenant.id, role: 'OWNER' }
  });

  await prisma.catalogItem.deleteMany({ where: { tenantId: petshopTenant.id } });
  await prisma.catalogItem.createMany({
    data: [
      {
        tenantId: petshopTenant.id,
        code: 'PET-001',
        name: 'Ração Premier Cães Adultos Frango 15kg',
        price: 249.90,
        stockQty: 20,
        category: 'Rações',
        brand: 'Premier'
      },
      {
        tenantId: petshopTenant.id,
        code: 'PET-002',
        name: 'Antipulgas e Carrapatos Simparic 10 a 20kg',
        price: 119.50,
        stockQty: 15,
        category: 'Medicamentos',
        brand: 'Zoetis'
      },
      {
        tenantId: petshopTenant.id,
        code: 'PET-003',
        name: 'Shampoo Hipoalergênico Pet Clean 500ml',
        price: 34.90,
        stockQty: 30,
        category: 'Higiene',
        brand: 'Pet Clean'
      }
    ]
  });

  await prisma.serviceItem.deleteMany({ where: { tenantId: petshopTenant.id } });
  const srvBanho = await prisma.serviceItem.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Banho & Tosa Higiênica (Porte Pequeno/Médio)',
      description: 'Banho morno com produtos hipoalergênicos, secagem, corte de unhas e limpeza de ouvidos.',
      durationMinutes: 60,
      price: 75.00,
      category: 'Estética Pet'
    }
  });
  const srvConsulta = await prisma.serviceItem.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Consulta Veterinária Clínica Geral',
      description: 'Avaliação clínica completa, check-up e carteira de vacinação.',
      durationMinutes: 45,
      price: 140.00,
      category: 'Veterinária'
    }
  });

  await prisma.appointment.deleteMany({ where: { tenantId: petshopTenant.id } });
  await prisma.appointment.createMany({
    data: [
      {
        tenantId: petshopTenant.id,
        serviceId: srvBanho.id,
        customerName: 'Juliana Mendes (Thor - Golden)',
        customerPhone: '5551998765432',
        scheduledAt: new Date(Date.now() + 3 * 3600 * 1000),
        status: 'CONFIRMED',
        notes: 'Cão dócil, usar shampoo neutro.'
      },
      {
        tenantId: petshopTenant.id,
        serviceId: srvConsulta.id,
        customerName: 'Carlos Eduardo (Luna - Poodle)',
        customerPhone: '5551991234567',
        scheduledAt: new Date(Date.now() + 26 * 3600 * 1000),
        status: 'CONFIRMED',
        notes: 'Reforço da vacina V10.'
      }
    ]
  });

  // =========================================================================
  // 3. TENANT ESCRITÓRIO: Prime Contabilidade & Consultoria
  // =========================================================================
  const officeSettings = {
    persona: {
      attendantName: 'Beatriz (Secretária Executiva)',
      tone: 'formal na medida certa, executivo, organizado, confiável e muito prestativo',
      botIdentity: 'secretária executiva do escritório Prime Contabilidade',
      forbiddenWords: ['robô', 'sistema', 'chatbot', 'inteligência artificial'],
      allowedDiscounts: false,
      discountHandoffMessage: 'Vou transferir sua solicitação diretamente para o sócio responsável analisar sua proposta de honorários.'
    },
    storeInfo: {
      about: 'Escritório especializado em contabilidade consultiva para empresas, folha de pagamento, fiscal, abertura de empresas e gestão financeira BPO.',
      address: 'Av. Paulista, 1000, Sala 1402 - Centro Empresarial',
      deliveryPolicy: 'Atendimento digital em todo o Brasil ou reuniões presenciais com hora marcada.'
    },
    rules: {
      deliveryPolicy: 'Envio de guias, boletos, DAS e holerites de forma 100% digital e segura.',
      paymentMethods: 'Boleto Bancário registrado, PIX Empresarial e Transferência.',
      discountPolicy: 'Honorários sob contrato personalizado.'
    },
    businessHours: {
      timezone: 'America/Sao_Paulo',
      schedule: {
        '1': [{ start: '08:30', end: '18:00' }],
        '2': [{ start: '08:30', end: '18:00' }],
        '3': [{ start: '08:30', end: '18:00' }],
        '4': [{ start: '08:30', end: '18:00' }],
        '5': [{ start: '08:30', end: '17:30' }],
        '6': [],
        '0': []
      },
      exceptions: []
    },
    catalogSource: {
      type: 'database'
    },
    features: {
      automaticHandoffHours: 8,
      visionEnabled: true
    }
  };

  const officeTenant = await prisma.tenant.upsert({
    where: { slug: 'escritorio-demo' },
    update: {
      name: 'Prime Contabilidade & Consultoria',
      segment: 'escritorio_contabil_juridico',
      businessType: 'OFFICE',
      enabledModules: JSON.stringify(['services', 'appointments', 'documents', 'crm']),
      active: true,
      settings: JSON.stringify(officeSettings)
    },
    create: {
      slug: 'escritorio-demo',
      name: 'Prime Contabilidade & Consultoria',
      segment: 'escritorio_contabil_juridico',
      businessType: 'OFFICE',
      enabledModules: JSON.stringify(['services', 'appointments', 'documents', 'crm']),
      active: true,
      settings: JSON.stringify(officeSettings)
    }
  });

  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: officeOwner.id, tenantId: officeTenant.id } },
    update: { role: 'OWNER' },
    create: { userId: officeOwner.id, tenantId: officeTenant.id, role: 'OWNER' }
  });

  await prisma.serviceItem.deleteMany({ where: { tenantId: officeTenant.id } });
  const srvReuniao = await prisma.serviceItem.create({
    data: {
      tenantId: officeTenant.id,
      name: 'Reunião de Planejamento Tributário / Abertura de CNPJ',
      description: 'Sessão estratégica com contador sênior (Presencial ou Google Meet).',
      durationMinutes: 60,
      price: 250.00,
      category: 'Consultoria'
    }
  });

  await prisma.appointment.deleteMany({ where: { tenantId: officeTenant.id } });
  await prisma.appointment.create({
    data: {
      tenantId: officeTenant.id,
      serviceId: srvReuniao.id,
      customerName: 'Roberto Almeida (TechSul Ltda)',
      customerPhone: '5511988887777',
      scheduledAt: new Date(Date.now() + 5 * 3600 * 1000),
      status: 'CONFIRMED',
      notes: 'Análise de migração do Simples Nacional para Lucro Presumido.'
    }
  });

  await prisma.documentSubmission.deleteMany({ where: { tenantId: officeTenant.id } });
  await prisma.documentSubmission.createMany({
    data: [
      {
        tenantId: officeTenant.id,
        title: 'Boleto Fornecedor Energia Elétrica - Matriz',
        docType: 'BOLETO',
        customerName: 'Roberto Almeida (TechSul Ltda)',
        customerPhone: '5511988887777',
        amount: 1485.40,
        dueDate: '2026-11-20',
        status: 'PENDING',
        aiSummary: 'Boleto recebido via WhatsApp. Identificado código de barras CPFL Energia, vencimento 20/11/2026, valor R$ 1.485,40.'
      },
      {
        tenantId: officeTenant.id,
        title: 'Nota Fiscal de Serviço #4092 - Conciliação',
        docType: 'NOTA_FISCAL',
        customerName: 'Mariana Costa (Clínica Vida)',
        customerPhone: '5511977776666',
        amount: 4200.00,
        dueDate: '2026-11-15',
        status: 'REVIEWED',
        aiSummary: 'NFS-e referente a serviços médicos prestados em Outubro. Encaminhado para apuração de ISS e DAS.'
      },
      {
        tenantId: officeTenant.id,
        title: 'Comprovante de Pagamento Guia DAS Outubro',
        docType: 'COMPROVANTE',
        customerName: 'Fernanda Lima (Boutique Flor)',
        customerPhone: '5511966665555',
        amount: 890.15,
        dueDate: '2026-11-10',
        status: 'PAID',
        aiSummary: 'Comprovante PIX Banco Itaú validado automaticamente pela IA. Guia baixada no controle fiscal.'
      }
    ]
  });

  console.log('✅ Seed completo finalizado com sucesso!');
  console.log('--------------------------------------------------');
  console.log('🔑 Credenciais de Acesso (Senha padrão: neoxy123):');
  console.log('1. Super Admin (vê todas as lojas e controla Feature Flags): admin@neoxy.ai');
  console.log('2. Comércio/Varejo (Ferragens Marlene): contato@ferragensmarlene.com.br');
  console.log('3. Serviços/Clínica (Pet Shop Amigo Fiel): contato@petshopamigofiel.com.br');
  console.log('4. Escritório/Contas (Prime Contabilidade): contato@primecontabil.com.br');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
