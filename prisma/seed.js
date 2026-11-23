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
      type: 'database',
      hasPhotos: true
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
    update: {
      searchCount: 7,
      occurrences: JSON.stringify([
        {
          customerPhone: '5551991112233',
          customerName: 'Carlos Pedreiro',
          messageSnippet: 'Vocês têm Serra Mármore Makita 110V pronta entrega? Preciso para amanhã cedo na obra.',
          requestedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        },
        {
          customerPhone: '5551994445566',
          customerName: 'Construtora Horizonte',
          messageSnippet: 'Qual o valor da Serra Mármore Makita 110V ou Bosch para 3 unidades?',
          requestedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
        }
      ])
    },
    create: {
      tenantId: ferragensTenant.id,
      productName: 'Serra Mármore Makita 110V',
      searchCount: 7,
      occurrences: JSON.stringify([
        {
          customerPhone: '5551991112233',
          customerName: 'Carlos Pedreiro',
          messageSnippet: 'Vocês têm Serra Mármore Makita 110V pronta entrega? Preciso para amanhã cedo na obra.',
          requestedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        },
        {
          customerPhone: '5551994445566',
          customerName: 'Construtora Horizonte',
          messageSnippet: 'Qual o valor da Serra Mármore Makita 110V ou Bosch para 3 unidades?',
          requestedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
        }
      ])
    }
  });

  await prisma.missedDemand.upsert({
    where: { tenantId_productName: { tenantId: ferragensTenant.id, productName: 'Cimento Queimado Cinza Urbano 5kg' } },
    update: {
      searchCount: 4,
      occurrences: JSON.stringify([
        {
          customerPhone: '5551997778899',
          customerName: 'Juliana Arquiteta',
          messageSnippet: 'Boa tarde! Vocês trabalham com Cimento Queimado pronto cor Cinza Urbano lata 5kg?',
          requestedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
        }
      ])
    },
    create: {
      tenantId: ferragensTenant.id,
      productName: 'Cimento Queimado Cinza Urbano 5kg',
      searchCount: 4,
      occurrences: JSON.stringify([
        {
          customerPhone: '5551997778899',
          customerName: 'Juliana Arquiteta',
          messageSnippet: 'Boa tarde! Vocês trabalham com Cimento Queimado pronto cor Cinza Urbano lata 5kg?',
          requestedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
        }
      ])
    }
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

  await prisma.professional.deleteMany({ where: { tenantId: petshopTenant.id } });
  const profCamila = await prisma.professional.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Dra. Camila Rocha',
      role: 'Médica Veterinária (CRMV-RS 14890)',
      specialty: 'Clínica Geral & Dermatologia',
      commissionPct: 35.0,
      phone: '5551997711223',
      active: true
    }
  });
  const profLucas = await prisma.professional.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Lucas Martins',
      role: 'Esteticista & Tosador Sênior',
      specialty: 'Tosa na Tesoura & Desembolo Técnico',
      commissionPct: 25.0,
      phone: '5551996622334',
      active: true
    }
  });
  const profBox = await prisma.professional.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Bianca Oliveira (Box 01)',
      role: 'Banhista & Terapia Capilar Pet',
      specialty: 'Banhos Medicinais e Ozonioterapia',
      commissionPct: 20.0,
      phone: '5551995533445',
      active: true
    }
  });

  await prisma.serviceItem.deleteMany({ where: { tenantId: petshopTenant.id } });
  const srvBanho = await prisma.serviceItem.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Banho & Tosa Higiênica',
      description: 'Banho morno com produtos hipoalergênicos, secagem, corte de unhas e limpeza de ouvidos. Obrigatório apresentar carteira de vacinação atualizada (V8/V10 e Antirrábica) no check-in.',
      durationMinutes: 60,
      price: 75.00,
      category: 'Estética & Banho',
      returnCycleDays: 15,
      variants: JSON.stringify([
        { label: 'Porte P (até 10kg)', durationMinutes: 45, price: 55.00 },
        { label: 'Porte M (10 a 25kg)', durationMinutes: 60, price: 75.00 },
        { label: 'Porte G (acima de 25kg)', durationMinutes: 90, price: 110.00 }
      ])
    }
  });
  const srvConsulta = await prisma.serviceItem.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Consulta Veterinária Clínica Geral',
      description: 'Avaliação clínica completa, ausculta, aferição de temperatura e revisão de carteira vacinal.',
      durationMinutes: 45,
      price: 140.00,
      category: 'Clínica Veterinária',
      returnCycleDays: 30,
      variants: JSON.stringify([
        { label: 'Consulta Clínica Padrão', durationMinutes: 45, price: 140.00 },
        { label: 'Consulta Dermatológica + Raspado', durationMinutes: 60, price: 190.00 }
      ])
    }
  });
  const srvVacina = await prisma.serviceItem.create({
    data: {
      tenantId: petshopTenant.id,
      name: 'Protocolo Vacinal Importado (V10 / Antirrábica)',
      description: 'Aplicação de vacina importada com avaliação prévia de score corporal e registro no cartão.',
      durationMinutes: 30,
      price: 115.00,
      category: 'Imunização & Preventivos',
      returnCycleDays: 21,
      variants: JSON.stringify([
        { label: 'Dose V10 Importada', durationMinutes: 30, price: 115.00 },
        { label: 'Combo V10 + Antirrábica', durationMinutes: 35, price: 185.00 }
      ])
    }
  });

  await prisma.appointment.deleteMany({ where: { tenantId: petshopTenant.id } });
  await prisma.appointment.createMany({
    data: [
      {
        tenantId: petshopTenant.id,
        serviceId: srvBanho.id,
        professionalId: profLucas.id,
        customerName: 'Juliana Mendes (Thor - Golden 32kg)',
        customerPhone: '5551998765432',
        scheduledAt: new Date(Date.now() + 2 * 3600 * 1000),
        status: 'IN_PROGRESS',
        variantLabel: 'Porte G (acima de 25kg)',
        agreedPrice: 110.00,
        agreedDuration: 90,
        checkinChecklist: JSON.stringify([
          'Carteira de vacinação conferida',
          'Pertences entregues (guia/coleira)',
          'Sem ectoparasitas aparentes',
          'Pelagem com nós leves (desembolo autorizado)'
        ]),
        returnDueAt: new Date(Date.now() + 15 * 24 * 3600 * 1000),
        notes: 'Cão dócil, usar shampoo neutro hipoalergênico. Deixou guia azul na recepção.'
      },
      {
        tenantId: petshopTenant.id,
        serviceId: srvBanho.id,
        professionalId: profBox.id,
        customerName: 'Marcos Vinícius (Mel - Shih Tzu 6kg)',
        customerPhone: '5551997654321',
        scheduledAt: new Date(Date.now() - 1 * 3600 * 1000),
        status: 'READY_FOR_PICKUP',
        variantLabel: 'Porte P (até 10kg)',
        agreedPrice: 55.00,
        agreedDuration: 45,
        checkinChecklist: JSON.stringify([
          'Carteira de vacinação conferida',
          'Sem ectoparasitas aparentes',
          'Perfume hipoalergênico autorizado'
        ]),
        returnDueAt: new Date(Date.now() + 15 * 24 * 3600 * 1000),
        notes: 'Finalizado com lacinho verde. Aguardando tutor retirar no Box 01.'
      },
      {
        tenantId: petshopTenant.id,
        serviceId: srvConsulta.id,
        professionalId: profCamila.id,
        customerName: 'Carlos Eduardo (Luna - Poodle 8kg)',
        customerPhone: '5551991234567',
        scheduledAt: new Date(Date.now() + 20 * 3600 * 1000),
        status: 'CONFIRMED',
        variantLabel: 'Consulta Dermatológica + Raspado',
        agreedPrice: 190.00,
        agreedDuration: 60,
        checkinChecklist: JSON.stringify([
          'Carteira de vacinação conferida'
        ]),
        returnDueAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        notes: 'Prurido nas orelhas há 4 dias. Recomendado jejum leve.'
      },
      {
        tenantId: petshopTenant.id,
        serviceId: srvBanho.id,
        professionalId: profLucas.id,
        customerName: 'Fernanda Lima (Bento - Bulldog Francês 13kg)',
        customerPhone: '5551993344556',
        scheduledAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        status: 'COMPLETED',
        variantLabel: 'Porte M (10 a 25kg)',
        agreedPrice: 75.00,
        agreedDuration: 60,
        checkinChecklist: JSON.stringify([
          'Carteira de vacinação conferida',
          'Sem ectoparasitas aparentes'
        ]),
        returnDueAt: new Date(Date.now() - 6 * 3600 * 1000),
        returnNotified: false,
        notes: 'Ciclo quinzenal de banho medicinal vencendo hoje.'
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

  // =========================================================================
  // 5. BANNERS DO CARROSSEL DA TELA DE LOGIN / CADASTRO (GERENCIÁVEL PELO ADMIN)
  // =========================================================================
  await prisma.authSlide.deleteMany({});
  await prisma.authSlide.createMany({
    data: [
      {
        title: 'Agenda & Ordens de Serviço em 4 Etapas',
        subtitle: 'Do check-in na recepção ao aviso automático de Pronto para Retirada no WhatsApp.',
        badge: 'Destaque Serviços',
        imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 1,
        active: true
      },
      {
        title: 'Gestão de Equipe, Portes e Comissões',
        subtitle: 'Tabela de preços por porte ou complexidade com cálculo automático de repasse.',
        badge: 'Novo Recurso',
        imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 2,
        active: true
      },
      {
        title: 'Atendimento Humanizado 24h no WhatsApp',
        subtitle: 'Consulta de estoque, agendamento inteligente e transbordo humano em 1 clique.',
        badge: 'Plataforma Neoxy',
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 3,
        active: true
      }
    ]
  });

  // =========================================================================
  // 6. TENANT DE TESTE: DESENTUPIDORA GURI (SERVIÇOS 24H & HIDROJATEAMENTO)
  // =========================================================================
  const guriOwner = await prisma.user.upsert({
    where: { email: 'contato@desentupidoraguri.com.br' },
    update: { name: 'Desentupidora Guri', role: 'USER', passwordHash: defaultPassHash },
    create: { name: 'Desentupidora Guri', email: 'contato@desentupidoraguri.com.br', role: 'USER', passwordHash: defaultPassHash }
  });

  const guriSettings = {
    persona: {
      attendantName: 'Equipe Desentupidora Guri',
      tone: 'ágil, claro, técnico e prestativo para emergências 24h',
      botIdentity: 'central de atendimento e despacho técnico',
      forbiddenWords: ['sistema', 'robô', 'inteligência artificial']
    },
    businessHours: {
      timezone: 'America/Sao_Paulo',
      schedule: {
        '0': [{ start: '00:00', end: '23:59' }],
        '1': [{ start: '00:00', end: '23:59' }],
        '2': [{ start: '00:00', end: '23:59' }],
        '3': [{ start: '00:00', end: '23:59' }],
        '4': [{ start: '00:00', end: '23:59' }],
        '5': [{ start: '00:00', end: '23:59' }],
        '6': [{ start: '00:00', end: '23:59' }]
      },
      exceptions: []
    },
    rules: {
      deliveryPolicy: 'Atendimento emergencial em até 40 minutos com visita técnica e orçamento sem compromisso.',
      paymentMethods: 'PIX, Cartão de Crédito em até 6x, Débito e Boleto para condomínios/empresas.'
    }
  };

  const guriTenant = await prisma.tenant.upsert({
    where: { slug: 'desentupidora-guri' },
    update: {
      name: 'Desentupidora Guri',
      segment: 'Desentupimento 24h, Hidrojateamento & Caça-Vazamentos',
      businessType: 'SERVICES',
      enabledModules: JSON.stringify(['services', 'appointments', 'crm']),
      settings: JSON.stringify(guriSettings),
      active: true
    },
    create: {
      slug: 'desentupidora-guri',
      name: 'Desentupidora Guri',
      segment: 'Desentupimento 24h, Hidrojateamento & Caça-Vazamentos',
      businessType: 'SERVICES',
      enabledModules: JSON.stringify(['services', 'appointments', 'crm']),
      settings: JSON.stringify(guriSettings),
      active: true
    }
  });

  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: guriOwner.id, tenantId: guriTenant.id } },
    update: { role: 'OWNER' },
    create: { userId: guriOwner.id, tenantId: guriTenant.id, role: 'OWNER' }
  });
  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: superAdmin.id, tenantId: guriTenant.id } },
    update: { role: 'OWNER' },
    create: { userId: superAdmin.id, tenantId: guriTenant.id, role: 'OWNER' }
  });

  await prisma.appointment.deleteMany({ where: { tenantId: guriTenant.id } });
  await prisma.serviceItem.deleteMany({ where: { tenantId: guriTenant.id } });
  await prisma.professional.deleteMany({ where: { tenantId: guriTenant.id } });

  const guriTech1 = await prisma.professional.create({
    data: {
      tenantId: guriTenant.id,
      name: 'Equipe Móvel 01 (Carlos Guri)',
      role: 'Técnico Hidráulico Sênior',
      specialty: 'Desentupimento Roto-Rooter & Caça-Vazamento',
      commissionPct: 30,
      phone: '5551991001100'
    }
  });
  const guriTech2 = await prisma.professional.create({
    data: {
      tenantId: guriTenant.id,
      name: 'Caminhão Hidrojato 02',
      role: 'Unidade Pesada',
      specialty: 'Hidrojateamento Alta Pressão & Limpa Fossa',
      commissionPct: 25,
      phone: '5551991002200'
    }
  });

  const guriSrv1 = await prisma.serviceItem.create({
    data: {
      tenantId: guriTenant.id,
      sku: 'GURI-DES-01',
      name: 'Desentupimento de Pia, Ralo ou Vaso Sanitário',
      unit: 'serviço',
      brand: 'Máquina K-500 / Roto-Rooter',
      description: 'Desobstrução limpa sem quebrar piso ou azulejo, com garantia de 90 dias.',
      durationMinutes: 45,
      price: 180.00,
      category: 'Desentupimento Residencial',
      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
      returnCycleDays: 180,
      variants: JSON.stringify([
        { label: 'Residencial Simples (até 5m)', durationMinutes: 40, price: 180 },
        { label: 'Tubulação Longa (5 a 15m)', durationMinutes: 70, price: 290 },
        { label: 'Comercial / Condomínio', durationMinutes: 90, price: 420 }
      ])
    }
  });

  const guriSrv2 = await prisma.serviceItem.create({
    data: {
      tenantId: guriTenant.id,
      sku: 'GURI-HIDRO-02',
      name: 'Hidrojateamento de Alta Pressão & Caixa de Gordura',
      unit: 'serviço',
      brand: 'Caminhão Combinado Alta Pressão',
      description: 'Remoção completa de gordura solidificada e raízes em redes de esgoto e pluviais.',
      durationMinutes: 90,
      price: 450.00,
      category: 'Hidrojateamento & Limpeza',
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80',
      returnCycleDays: 90,
      variants: JSON.stringify([
        { label: 'Caixa de Gordura Residencial', durationMinutes: 60, price: 320 },
        { label: 'Rede Pluvial / Condomínio', durationMinutes: 120, price: 680 }
      ])
    }
  });

  await prisma.appointment.create({
    data: {
      tenantId: guriTenant.id,
      serviceId: guriSrv1.id,
      professionalId: guriTech1.id,
      customerName: 'Condomínio Residencial Bela Vista',
      customerPhone: '5551988223344',
      scheduledAt: new Date(Date.now() + 2 * 3600 * 1000),
      status: 'CONFIRMED',
      variantLabel: 'Comercial / Condomínio',
      agreedPrice: 420,
      agreedDuration: 90,
      checkinChecklist: JSON.stringify(['Acesso à caixa de inspeção liberado', 'Orçamento aprovado pelo síndico']),
      notes: 'Prumada da cozinha bloco B com escoamento lento.'
    }
  });

  await prisma.appointment.create({
    data: {
      tenantId: guriTenant.id,
      serviceId: guriSrv2.id,
      professionalId: guriTech2.id,
      customerName: 'Restaurante Sabor do Sul',
      customerPhone: '5551988556677',
      scheduledAt: new Date(Date.now() - 92 * 24 * 3600 * 1000),
      status: 'COMPLETED',
      variantLabel: 'Caixa de Gordura Residencial',
      agreedPrice: 320,
      agreedDuration: 60,
      returnDueAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      returnNotified: false,
      notes: 'Limpeza preventiva trimestral de caixa de gordura.'
    }
  });

  // =========================================================================
  // 7. SEED DE ANALYTICS, CONTATOS (FILTRO IA), PROMOÇÕES & RESPOSTAS RÁPIDAS
  // =========================================================================
  const now = new Date();
  const makeDate = (daysAgo, hour, minute = 15) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute, 0, 0);
    return d;
  };

  // Contatos & Filtro IA (Ferragens Marlene)
  const ferragensContacts = [
    {
      phone: '5551991112233',
      name: 'Carlos Pedreiro',
      pushName: 'Carlos Obras & Reformas',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      tags: ['VIP', 'Obra'],
      aiBlocked: false,
      notes: 'Cliente recorrente de materiais hidráulicos.'
    },
    {
      phone: '5551992223344',
      name: 'Fornecedor Suvinil Sul',
      pushName: 'Representante Suvinil RS',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80',
      tags: ['Fornecedor'],
      aiBlocked: true,
      notes: 'Bloqueado para IA — negociação direta com gerência.'
    },
    {
      phone: '5551993334455',
      name: 'Marlene (Pessoal / Família)',
      pushName: 'Marlene',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
      tags: ['Família'],
      aiBlocked: true,
      notes: 'Número pessoal da diretoria.'
    },
    {
      phone: '5551994445566',
      name: 'Construtora Horizonte',
      pushName: 'Compras Horizonte',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
      tags: ['Orçamento', 'Lead Quente'],
      aiBlocked: false,
      notes: 'Pediu cotação de tintas e fechaduras.'
    }
  ];

  for (const c of ferragensContacts) {
    await prisma.whatsAppContact.upsert({
      where: { tenantId_phone: { tenantId: ferragensTenant.id, phone: c.phone } },
      update: {
        name: c.name,
        pushName: c.pushName,
        avatarUrl: c.avatarUrl,
        tags: JSON.stringify(c.tags),
        aiBlocked: c.aiBlocked,
        notes: c.notes,
        lastMessageAt: now
      },
      create: {
        tenantId: ferragensTenant.id,
        phone: c.phone,
        name: c.name,
        pushName: c.pushName,
        avatarUrl: c.avatarUrl,
        tags: JSON.stringify(c.tags),
        aiBlocked: c.aiBlocked,
        notes: c.notes,
        source: 'whatsapp',
        lastMessageAt: now
      }
    });
  }

  // Demandas procuradas (Em Catálogo) para Ferragens Marlene & Desentupidora Guri
  const ferragensDemands = [
    { itemType: 'PRODUCT', itemName: 'Ducha Elétrica Lorenzetti Advanced 220V', searchCount: 19 },
    { itemType: 'PRODUCT', itemName: 'Tinta Acrílica Fosca Suvinil 18L', searchCount: 14 },
    { itemType: 'PRODUCT', itemName: 'Parafusadeira Bosch GSB 18V-50', searchCount: 11 },
    { itemType: 'PRODUCT', itemName: 'Fechadura Digital Intelbras FR 101', searchCount: 8 }
  ];
  for (const d of ferragensDemands) {
    await prisma.demandTracker.upsert({
      where: {
        tenantId_itemType_itemName: {
          tenantId: ferragensTenant.id,
          itemType: d.itemType,
          itemName: d.itemName
        }
      },
      update: { searchCount: d.searchCount },
      create: { tenantId: ferragensTenant.id, ...d }
    });
  }

  const guriDemands = [
    { itemType: 'SERVICE', itemName: 'Desentupimento de Pia e Ralo', searchCount: 24 },
    { itemType: 'SERVICE', itemName: 'Hidrojateamento & Caixa de Gordura', searchCount: 16 }
  ];
  for (const d of guriDemands) {
    await prisma.demandTracker.upsert({
      where: {
        tenantId_itemType_itemName: {
          tenantId: guriTenant.id,
          itemType: d.itemType,
          itemName: d.itemName
        }
      },
      update: { searchCount: d.searchCount },
      create: { tenantId: guriTenant.id, ...d }
    });
  }

  await prisma.missedDemand.upsert({
    where: { tenantId_productName: { tenantId: guriTenant.id, productName: 'Caça-Vazamento com Geofone' } },
    update: { searchCount: 9 },
    create: { tenantId: guriTenant.id, productName: 'Caça-Vazamento com Geofone', searchCount: 9 }
  });

  // Promoções de exemplo na Ferragens Marlene
  const existingPromoCount = await prisma.promotion.count({ where: { tenantId: ferragensTenant.id } });
  if (existingPromoCount === 0) {
    const duchaItem = await prisma.catalogItem.findFirst({
      where: { tenantId: ferragensTenant.id, code: '7891234001' }
    });
    await prisma.promotion.create({
      data: {
        tenantId: ferragensTenant.id,
        name: 'Semana da Pintura — 12% OFF',
        description: 'Desconto automático em toda linha de tintas e massa corrida.',
        discountType: 'PERCENT',
        discountValue: 12,
        scope: 'CATEGORY',
        targetCategory: 'Pintura e Tintas',
        active: true
      }
    });
    if (duchaItem) {
      await prisma.promotion.create({
        data: {
          tenantId: ferragensTenant.id,
          name: 'Oferta Relâmpago Ducha Lorenzetti',
          description: 'Preço promocional fixo no balcão e WhatsApp.',
          discountType: 'FIXED_PRICE',
          discountValue: 139.9,
          scope: 'PRODUCTS',
          targetItemIds: JSON.stringify([duchaItem.id]),
          active: true
        }
      });
    }
  }

  // Respostas Rápidas & Gatilhos Automáticos (Ferragens + Guri)
  const defaultQuickReplies = [
    {
      tenantId: ferragensTenant.id,
      shortcut: '/endereco',
      title: 'Endereço e Retirada',
      content: 'Olá {{cliente}}! Estamos na {{endereco}}. Retirada direto no balcão sem filas.',
      category: 'ATENDIMENTO',
      triggerKeywords: 'onde fica, qual o endereco, localizacao, endereco da loja',
      autoTrigger: true,
      triggerHandoff: false
    },
    {
      tenantId: ferragensTenant.id,
      shortcut: '/pix',
      title: 'Pagamento PIX',
      content: 'Aceitamos PIX, dinheiro e cartões em até 6x na {{empresa}}. Quer que eu separe seu pedido?',
      category: 'FINANCEIRO',
      triggerKeywords: 'chave pix, aceita pix, forma de pagamento',
      autoTrigger: false,
      triggerHandoff: false
    },
    {
      tenantId: guriTenant.id,
      shortcut: '/emergencia',
      title: 'Plantão Emergência 24h',
      content: 'Olá {{cliente}}! Nosso plantão 24h da {{empresa}} já recebeu seu chamado. Me envie seu bairro e o ponto entupido para passarmos o orçamento imediato.',
      category: 'ATENDIMENTO',
      triggerKeywords: 'urgente, emergencia, alagando, transbordando',
      autoTrigger: true,
      triggerHandoff: true
    }
  ];

  for (const qr of defaultQuickReplies) {
    await prisma.quickReply.upsert({
      where: { tenantId_shortcut: { tenantId: qr.tenantId, shortcut: qr.shortcut } },
      update: qr,
      create: qr
    });
  }

  // Histórico de mensagens nos últimos 7 dias + hoje para alimentar gráficos reais do Resumo
  const ferragensMsgCount = await prisma.chatMessage.count({ where: { tenantId: ferragensTenant.id } });
  if (ferragensMsgCount < 10) {
    const sampleSessions = [
      { phone: '5551991112233', name: 'Carlos Pedreiro', state: 'IDLE', daysAgo: 0, hour: 9, human: false },
      { phone: '5551994445566', name: 'Construtora Horizonte', state: 'HUMAN_HANDOFF', daysAgo: 0, hour: 10, human: true },
      { phone: '5551995556677', name: 'Ana Paula Reforma', state: 'IDLE', daysAgo: 0, hour: 11, human: false },
      { phone: '5551996667788', name: 'Marcos Eletricista', state: 'IDLE', daysAgo: 1, hour: 14, human: false },
      { phone: '5551997778899', name: 'Juliana Arquiteta', state: 'HUMAN_HANDOFF', daysAgo: 2, hour: 16, human: true },
      { phone: '5551998889900', name: 'Pedro Pinturas', state: 'IDLE', daysAgo: 3, hour: 10, human: false },
      { phone: '5551990001122', name: 'Lucas Serralheria', state: 'IDLE', daysAgo: 4, hour: 15, human: false }
    ];

    for (const s of sampleSessions) {
      const ts = makeDate(s.daysAgo, Math.min(s.hour, now.getHours()), 10);
      await prisma.chatSession.upsert({
        where: { tenantId_customerPhone: { tenantId: ferragensTenant.id, customerPhone: s.phone } },
        update: { customerName: s.name, state: s.state, lastInteraction: ts },
        create: {
          tenantId: ferragensTenant.id,
          customerPhone: s.phone,
          customerName: s.name,
          state: s.state,
          pausedUntil: s.human ? new Date(Date.now() + 3 * 3600 * 1000) : null,
          lastInteraction: ts
        }
      });

      await prisma.chatMessage.createMany({
        data: [
          {
            tenantId: ferragensTenant.id,
            customerPhone: s.phone,
            role: 'user',
            content: 'Olá, vocês têm ducha elétrica Lorenzetti 220V ou tinta Suvinil?',
            createdAt: ts
          },
          {
            tenantId: ferragensTenant.id,
            customerPhone: s.phone,
            role: 'model',
            content: 'Olá! Temos sim a Ducha Elétrica Lorenzetti 220V e a Tinta Suvinil 18L em oferta hoje!',
            metadata: JSON.stringify({ isHandoff: s.human }),
            createdAt: new Date(ts.getTime() + 60000)
          },
          ...(s.human
            ? [
                {
                  tenantId: ferragensTenant.id,
                  customerPhone: s.phone,
                  role: 'human_agent',
                  content: 'Olá! Aqui é o gerente, já preparei o orçamento fechado para sua obra.',
                  createdAt: new Date(ts.getTime() + 180000)
                }
              ]
            : [])
        ]
      });
    }
  }

  console.log('✅ Seed completo finalizado com sucesso!');
  console.log('--------------------------------------------------');
  console.log('🔑 Credenciais de Acesso (Senha padrão: neoxy123):');
  console.log('1. Super Admin (vê todas as lojas e controla Feature Flags): admin@neoxy.ai');
  console.log('2. Comércio/Varejo (Ferragens Marlene): contato@ferragensmarlene.com.br');
  console.log('3. Serviços/Clínica (Pet Shop Amigo Fiel): contato@petshopamigofiel.com.br');
  console.log('4. Escritório/Contas (Prime Contabilidade): contato@primecontabil.com.br');
  console.log('5. Serviços 24h (Desentupidora Guri): contato@desentupidoraguri.com.br');
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
