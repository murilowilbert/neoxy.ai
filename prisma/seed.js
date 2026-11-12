const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de estabelecimentos (Multi-Tenant)...');

  // 1. Tenant de Teste Espelho (Ferragens Demo)
  const ferragensSettings = {
    persona: {
      tone: 'humano, prestativo, vendedor experiente de balcão, ágil e atencioso',
      botIdentity: 'atendente virtual que nunca se declara IA',
      forbiddenWords: ['sistema', 'robô', 'planilha', 'banco de dados', 'inteligência artificial'],
      allowedDiscounts: false,
      discountHandoffMessage: 'Sobre condições de desconto à vista, vou pedir para um dos nossos atendentes verificar as opções para você, só um segundo!'
    },
    storeInfo: {
      about: 'Loja tradicional focada em materiais hidráulicos, elétricos, ferramentas e reformas.',
      address: 'Rua Osvaldo Cruz, 417, Centro, Igrejinha',
      deliveryPolicy: 'Infelizmente não possuímos tele-entrega no momento. O cliente precisa retirar no balcão da loja física.'
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
        { date: '2026-01-01', type: 'closed', reason: 'Ano Novo' }
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
      name: 'Ferragens Demo (Piloto)',
      segment: 'construcao_e_ferragem',
      active: true,
      settings: JSON.stringify(ferragensSettings)
    },
    create: {
      slug: 'ferragens-demo',
      name: 'Ferragens Demo (Piloto)',
      segment: 'construcao_e_ferragem',
      active: true,
      settings: JSON.stringify(ferragensSettings)
    }
  });

  // Vincula instância WhatsApp para o ferragens-demo
  await prisma.tenantWhatsAppSession.upsert({
    where: { instanceName: 'ferragens_instance_01' },
    update: { tenantId: ferragensTenant.id },
    create: {
      tenantId: ferragensTenant.id,
      instanceName: 'ferragens_instance_01',
      status: 'DISCONNECTED',
      phoneNumber: '5551999999999'
    }
  });

  // 2. Segundo Tenant para demonstrar o Multi-Tenant (Pet Shop Amigo Fiel)
  const petshopSettings = {
    persona: {
      tone: 'afetuoso com animais, alegre, consultor especializado em saúde e nutrição pet',
      botIdentity: 'atendente carinhoso do Pet Shop Amigo Fiel',
      forbiddenWords: ['robô', 'sistema'],
      allowedDiscounts: true,
      discountHandoffMessage: 'Temos 5% de desconto no PIX!'
    },
    storeInfo: {
      about: 'Pet shop completo com rações super premium, brinquedos e banho & tosa.',
      address: 'Av. Brasil, 1200, Centro',
      deliveryPolicy: 'Entregamos em até 2 horas na cidade! Tele-entrega gratuita acima de R$100.'
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
        '0': [{ start: '09:00', end: '13:00' }] // Aberto no domingo de manhã
      }
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
      segment: 'petshop',
      active: true,
      settings: JSON.stringify(petshopSettings)
    },
    create: {
      slug: 'petshop-demo',
      name: 'Pet Shop Amigo Fiel',
      segment: 'petshop',
      active: true,
      settings: JSON.stringify(petshopSettings)
    }
  });

  // Popula itens de catálogo para o Petshop
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

  console.log('✅ Seed finalizado com sucesso!');
  console.log(`- Tenant 1: ${ferragensTenant.name} (slug: ${ferragensTenant.slug})`);
  console.log(`- Tenant 2: ${petshopTenant.name} (slug: ${petshopTenant.slug})`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
