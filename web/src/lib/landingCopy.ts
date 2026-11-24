import type { Language } from '../components/LanguageProvider';
import type { DriftWallItem } from '../components/reactbits/DriftWall';

export interface LandingFeature {
  id: 'agenda' | 'catalogo' | 'atendimento';
  headline: string;
  subhead: string;
  body: string;
  imageUrl: string;
  secondaryCta: string;
  primaryCta: string;
  demoEmail: string | null;
}

export interface LandingHighlight {
  iconKey: 'zap' | 'eye' | 'shield';
  title: string;
  body: string;
}

export interface LandingPlan {
  name: string;
  subhead: string;
  price: string;
  period: string;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
}

export interface LandingCopy {
  nav: {
    menu: string;
    close: string;
    login: string;
    signup: string;
    cards: {
      platformTitle: string;
      platformDesc: string;
      modules: string;
      agendaOs: string;
      catalogPdv: string;
      plansTitle: string;
      plansDesc: string;
      plansLink: string;
      faqLink: string;
      accessTitle: string;
      accessDesc: string;
      enterPanel: string;
      demoServices: string;
      demoRetail: string;
    };
  };
  hero: {
    badge: string;
    headlinePrefix: string;
    rotatingWords: string[];
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  wallItems: DriftWallItem[];
  featuresSection: {
    eyebrow: string;
    heading: string;
    cards: LandingFeature[];
    highlights: LandingHighlight[];
  };
  plansSection: {
    badge: string;
    heading: string;
    subtitle: string;
    currency: string;
    plans: LandingPlan[];
  };
  faqSection: {
    heading: string;
    items: { q: string; a: string }[];
  };
  footer: {
    demoServices: string;
    demoRetail: string;
    admin: string;
  };
}

const WALL_IMAGES = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
];

export const LANDING_COPY: Record<Language, LandingCopy> = {
  pt: {
    nav: {
      menu: 'Menu',
      close: 'Fechar',
      login: 'Entrar',
      signup: 'Criar conta',
      cards: {
        platformTitle: 'Plataforma',
        platformDesc: 'WhatsApp com IA, agenda operacional e estoque sincronizado.',
        modules: 'Módulos integrados',
        agendaOs: 'Agenda & OS',
        catalogPdv: 'Catálogo & PDV',
        plansTitle: 'Planos & Ajuda',
        plansDesc: 'Ciclos transparentes sem letras miúdas e dúvidas respondidas.',
        plansLink: 'Planos NEO',
        faqLink: 'Dúvidas frequentes',
        accessTitle: 'Acessar agora',
        accessDesc: 'Explore o painel real com dados de demonstração ou sua conta.',
        enterPanel: 'Entrar no painel',
        demoServices: 'Demo Serviços',
        demoRetail: 'Demo Comércio'
      }
    },
    hero: {
      badge: 'Plataforma operacional com IA no WhatsApp',
      headlinePrefix: 'A IA que transforma seu WhatsApp em',
      rotatingWords: [
        'vendas 24h.',
        'agenda cheia.',
        'estoque vivo.',
        'atendimento ágil.',
        'gestão sem caos.'
      ],
      subtitle:
        'Para clínicas, oficinas, prestadores de serviços e comércios que querem responder clientes em segundos sem perder o controle da operação.',
      primaryCta: 'Criar conta',
      secondaryCta: 'Entrar no painel'
    },
    wallItems: [
      {
        image: WALL_IMAGES[0],
        badge: 'Atendimento 24h',
        title: 'Escritórios & Consultorias',
        subtitle: 'Triagem automática, envio de guias e leitura de PDFs no WhatsApp.'
      },
      {
        image: WALL_IMAGES[1],
        badge: 'Vendas no balcão',
        title: 'Comércio & Varejo',
        subtitle: 'Consulta preços em tempo real e envia fotos de produtos ao cliente.'
      },
      {
        image: WALL_IMAGES[2],
        badge: 'Estoque vivo',
        title: 'Catálogo & PDV Integrado',
        subtitle: 'Importação via Excel/CSV e sincronização direta com seu estoque.'
      },
      {
        image: WALL_IMAGES[3],
        badge: 'Pausa em 1 clique',
        title: 'Equipe & Transbordo',
        subtitle: 'Assuma qualquer conversa sensível instantaneamente sem perder histórico.'
      },
      {
        image: WALL_IMAGES[4],
        badge: 'Agenda IA',
        title: 'Clínicas & Consultórios',
        subtitle: 'Marcação automática de horários, lembretes e retornos recorrentes.'
      },
      {
        image: WALL_IMAGES[5],
        badge: 'OS em 4 etapas',
        title: 'Oficinas & Assistência',
        subtitle: 'Vistoria de entrada, orçamento aprovado e aviso de retirada pronto.'
      },
      {
        image: WALL_IMAGES[6],
        badge: 'Preço por porte',
        title: 'Pet Shop & Banho e Tosa',
        subtitle: 'Tabela por porte, comissões da equipe e alerta automático no WhatsApp.'
      },
      {
        image: WALL_IMAGES[7],
        badge: 'Visão de fotos',
        title: 'Balcão Inteligente',
        subtitle: 'Identifica peças por foto e confere comprovantes PIX automaticamente.'
      },
      {
        image: WALL_IMAGES[8],
        badge: 'Busca por SKU',
        title: 'Ferragens & Construção',
        subtitle: 'Orçamentos instantâneos por nome, marca, código de barras ou áudio.'
      },
      {
        image: WALL_IMAGES[9],
        badge: 'Radar de retorno',
        title: 'Follow-up Automático',
        subtitle: 'Reativa clientes no momento ideal para recompra ou manutenção.'
      },
      {
        image: WALL_IMAGES[10],
        badge: 'Comissões',
        title: 'Gestão de Profissionais',
        subtitle: 'Agenda individual por técnico e cálculo automático de repasses.'
      },
      {
        image: WALL_IMAGES[11],
        badge: 'Telemetria real',
        title: 'Métricas de Autonomia',
        subtitle: 'Acompanhe taxa de resolução da IA e demandas sem cadastro ao vivo.'
      }
    ],
    featuresSection: {
      eyebrow: 'Módulos integrados',
      heading: 'Tudo conectado em cartões claros e fáceis de operar.',
      cards: [
        {
          id: 'agenda',
          headline: 'Agenda & OS',
          subhead: 'Controle operacional em 4 etapas',
          body: 'Preços por porte, equipe com comissões, vistoria de entrada e aviso automático de retirada no WhatsApp.',
          imageUrl:
            'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'Ver demo',
          primaryCta: 'Testar agora',
          demoEmail: 'contato@desentupidoraguri.com.br'
        },
        {
          id: 'catalogo',
          headline: 'Catálogo & PDV',
          subhead: 'Estoque vivo conectado à IA',
          body: 'Envie fotos e vídeos no WhatsApp, importe planilhas Excel ou CSV e mantenha preços sincronizados com seu PDV.',
          imageUrl:
            'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'Ver demo',
          primaryCta: 'Testar agora',
          demoEmail: 'contato@ferragensmarlene.com.br'
        },
        {
          id: 'atendimento',
          headline: 'WhatsApp com IA',
          subhead: 'Atendimento natural e visão de fotos',
          body: 'Identifica fotos e áudios enviados pelo cliente, responde em tom humano e permite pausa para equipe em 1 clique.',
          imageUrl:
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'Ver planos',
          primaryCta: 'Criar conta',
          demoEmail: null
        }
      ],
      highlights: [
        {
          iconKey: 'zap',
          title: 'Respostas instantâneas',
          body: 'Seu cliente recebe retorno em segundos no WhatsApp com preço real, disponibilidade e link de agendamento.'
        },
        {
          iconKey: 'eye',
          title: 'Leitura de fotos, áudios e PDFs',
          body: 'A IA identifica peças em fotos enviadas, entende mensagens de voz e extrai dados de comprovantes.'
        },
        {
          iconKey: 'shield',
          title: 'Assuma em 1 clique',
          body: 'Pause a IA em qualquer conversa instantaneamente para conduzir negociações sensíveis com sua equipe.'
        }
      ]
    },
    plansSection: {
      badge: 'Planos NEO',
      heading: 'Planos diretos ao ponto.',
      subtitle: 'Valores ilustrativos para demonstração. Escolha o ciclo que melhor se adapta à rotina da sua empresa.',
      currency: 'R$',
      plans: [
        {
          name: 'Mensal',
          subhead: 'Flexibilidade total para começar',
          price: '297',
          period: '/mês',
          description: 'Para testar no dia a dia da operação sem compromisso de longo prazo.',
          features: [
            'WhatsApp com IA e visão de fotos',
            'Agenda, Ordens de Serviço e Catálogo',
            'Importação de estoque em CSV e Excel',
            'Pausa para atendimento humano em 1 clique',
            'Cancelamento livre a qualquer momento'
          ],
          cta: 'Começar no Mensal',
          featured: false
        },
        {
          name: 'Semestral',
          subhead: 'Previsibilidade e economia real',
          price: '247',
          period: '/mês',
          description: 'Equilíbrio entre economia e previsibilidade para empresas em crescimento.',
          features: [
            'Tudo do plano Mensal incluso',
            'Sincronização de preços com API PDV',
            'Equipe, comissões e preços por porte',
            'Suporte prioritário na configuração',
            'Economia de R$ 300 no semestre'
          ],
          cta: 'Escolher Semestral',
          featured: false
        },
        {
          name: 'Anual',
          subhead: 'Máximo retorno operacional',
          price: '197',
          period: '/mês',
          badge: 'Mais escolhido',
          description: 'Melhor custo-benefício para operar o WhatsApp e a bancada o ano todo.',
          features: [
            'Tudo do plano Semestral incluso',
            'Onboarding assistido para sua equipe',
            'Envio de fotos e vídeos do catálogo no bot',
            'Ciclos de retorno automático de clientes',
            'Economia de R$ 1.200 no ano'
          ],
          cta: 'Garantir plano Anual',
          featured: true
        }
      ]
    },
    faqSection: {
      heading: 'Dúvidas frequentes',
      items: [
        {
          q: 'Meu WhatsApp pode ser bloqueado?',
          a: 'A NEO trabalha respondendo apenas clientes que iniciam contato ou aguardam retorno de serviço, sem disparos em massa não solicitados, preservando a reputação do seu número.'
        },
        {
          q: 'Vou perder meu número ou meus contatos?',
          a: 'Não. Você conecta o seu número comercial atual e mantém todo o histórico, agenda de contatos e conversas intactos.'
        },
        {
          q: 'E se a IA responder errado?',
          a: 'Você define as regras, preços, estoque e serviços diretamente no painel. A qualquer momento, basta clicar em Pausar IA na conversa para assumir o atendimento humano.'
        },
        {
          q: 'Meus clientes preferem falar com gente.',
          a: 'A conversa é configurada em tom natural e direto, sem menus numéricos engessados. Quando o assunto exige negociação ou decisão sensível, o atendimento passa para a sua equipe.'
        },
        {
          q: 'Já tenho um chatbot. Qual a diferença?',
          a: 'Chatbots tradicionais travam o cliente em fluxos de "digite 1 ou 2". A NEO entende texto, identifica fotos enviadas pelo cliente, consulta seu estoque real e registra agendamentos.'
        },
        {
          q: 'Funciona para o meu segmento?',
          a: 'Sim. Os módulos são ativáveis por perfil (Serviços, Comércio, Escritório ou Operação Completa), e você pode ligar ou desligar cada função quando quiser.'
        },
        {
          q: 'Tem fidelidade?',
          a: 'No plano Mensal não há fidelidade. Nos planos Semestral e Anual você garante desconto progressivo no valor mensal.'
        }
      ]
    },
    footer: {
      demoServices: 'Demo Serviços',
      demoRetail: 'Demo Comércio',
      admin: 'Admin'
    }
  },

  en: {
    nav: {
      menu: 'Menu',
      close: 'Close',
      login: 'Sign in',
      signup: 'Get started',
      cards: {
        platformTitle: 'Platform',
        platformDesc: 'AI-powered WhatsApp, scheduling, and live inventory in one hub.',
        modules: 'Integrated modules',
        agendaOs: 'Schedule & Work Orders',
        catalogPdv: 'Catalog & POS',
        plansTitle: 'Plans & Help',
        plansDesc: 'Transparent billing cycles and answers to common questions.',
        plansLink: 'NEO Plans',
        faqLink: 'FAQ',
        accessTitle: 'Try it now',
        accessDesc: 'Explore the live operational dashboard with demo data or your account.',
        enterPanel: 'Sign in to dashboard',
        demoServices: 'Services Demo',
        demoRetail: 'Retail Demo'
      }
    },
    hero: {
      badge: 'AI operational platform for WhatsApp',
      headlinePrefix: 'AI that turns your WhatsApp into',
      rotatingWords: [
        '24/7 sales.',
        'booked schedules.',
        'live inventory.',
        'instant replies.',
        'effortless ops.'
      ],
      subtitle:
        'Built for clinics, workshops, service teams, and retail stores that want to reply in seconds while keeping full control of daily operations.',
      primaryCta: 'Create account',
      secondaryCta: 'Open dashboard'
    },
    wallItems: [
      {
        image: WALL_IMAGES[0],
        badge: '24/7 Support',
        title: 'Offices & Consulting',
        subtitle: 'Automated intake, billing PDFs, and document reading right on WhatsApp.'
      },
      {
        image: WALL_IMAGES[1],
        badge: 'Counter Sales',
        title: 'Retail & Stores',
        subtitle: 'Checks real-time pricing and sends product photos automatically.'
      },
      {
        image: WALL_IMAGES[2],
        badge: 'Live Stock',
        title: 'Catalog & POS Sync',
        subtitle: 'Import Excel/CSV spreadsheets and keep your inventory synced live.'
      },
      {
        image: WALL_IMAGES[3],
        badge: '1-Click Handoff',
        title: 'Team Collaboration',
        subtitle: 'Pause AI on any sensitive chat instantly without losing context.'
      },
      {
        image: WALL_IMAGES[4],
        badge: 'AI Booking',
        title: 'Clinics & Practices',
        subtitle: 'Automated appointment scheduling, reminders, and recall cycles.'
      },
      {
        image: WALL_IMAGES[5],
        badge: '4-Step Orders',
        title: 'Workshops & Repair',
        subtitle: 'Intake inspection, quote approval, and ready-for-pickup alerts.'
      },
      {
        image: WALL_IMAGES[6],
        badge: 'Size Pricing',
        title: 'Pet Care & Grooming',
        subtitle: 'Tiered pricing by size, staff commissions, and instant pickup notices.'
      },
      {
        image: WALL_IMAGES[7],
        badge: 'Photo Vision',
        title: 'Smart Front Desk',
        subtitle: 'Recognizes parts from customer photos and verifies payment slips.'
      },
      {
        image: WALL_IMAGES[8],
        badge: 'SKU Lookup',
        title: 'Hardware & Supply',
        subtitle: 'Instant quotes by item name, brand, barcode, or voice note.'
      },
      {
        image: WALL_IMAGES[9],
        badge: 'Recall Radar',
        title: 'Automated Follow-up',
        subtitle: 'Re-engages customers at the exact right time for reorder or service.'
      },
      {
        image: WALL_IMAGES[10],
        badge: 'Commissions',
        title: 'Staff Management',
        subtitle: 'Individual technician calendars with automated commission tracking.'
      },
      {
        image: WALL_IMAGES[11],
        badge: 'Live Telemetry',
        title: 'Autonomy Analytics',
        subtitle: 'Track AI resolution rates and unmet product demand in real time.'
      }
    ],
    featuresSection: {
      eyebrow: 'Integrated modules',
      heading: 'Everything connected in clear, easy-to-run cards.',
      cards: [
        {
          id: 'agenda',
          headline: 'Schedule & Orders',
          subhead: '4-step operational control',
          body: 'Tiered pricing, staff commissions, intake inspection, and automated WhatsApp pickup alerts.',
          imageUrl:
            'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'View demo',
          primaryCta: 'Try now',
          demoEmail: 'contato@desentupidoraguri.com.br'
        },
        {
          id: 'catalogo',
          headline: 'Catalog & POS',
          subhead: 'Live inventory connected to AI',
          body: 'Send product photos and videos on WhatsApp, import Excel/CSV sheets, and sync pricing with your POS.',
          imageUrl:
            'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'View demo',
          primaryCta: 'Try now',
          demoEmail: 'contato@ferragensmarlene.com.br'
        },
        {
          id: 'atendimento',
          headline: 'WhatsApp with AI',
          subhead: 'Natural replies & photo vision',
          body: 'Understands photos and voice notes sent by customers, replies naturally, and hands off to staff in 1 click.',
          imageUrl:
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'See plans',
          primaryCta: 'Create account',
          demoEmail: null
        }
      ],
      highlights: [
        {
          iconKey: 'zap',
          title: 'Instant replies',
          body: 'Customers get real pricing, live availability, and booking confirmation on WhatsApp in seconds.'
        },
        {
          iconKey: 'eye',
          title: 'Reads photos, voice & PDFs',
          body: 'AI identifies items in photos, transcribes voice messages, and extracts payment receipt details.'
        },
        {
          iconKey: 'shield',
          title: 'Take over in 1 click',
          body: 'Pause AI on any conversation immediately so your team can handle sensitive negotiations.'
        }
      ]
    },
    plansSection: {
      badge: 'NEO Plans',
      heading: 'Straightforward pricing.',
      subtitle: 'Illustrative demo pricing. Pick the billing cycle that best matches your business pace.',
      currency: 'US$',
      plans: [
        {
          name: 'Monthly',
          subhead: 'Full flexibility to start',
          price: '59',
          period: '/mo',
          description: 'Test NEO across your daily workflow with zero long-term lock-in.',
          features: [
            'WhatsApp AI with photo & voice vision',
            'Schedule, Work Orders & Catalog',
            'CSV and Excel inventory import',
            '1-click pause for human handoff',
            'Cancel freely at any time'
          ],
          cta: 'Start Monthly',
          featured: false
        },
        {
          name: 'Semi-Annual',
          subhead: 'Predictability and real savings',
          price: '49',
          period: '/mo',
          description: 'The right balance of savings and reliability for growing operations.',
          features: [
            'Everything in Monthly included',
            'POS API live price synchronization',
            'Team schedules, commissions & tiers',
            'Priority onboarding support',
            'Save US$ 60 every 6 months'
          ],
          cta: 'Choose Semi-Annual',
          featured: false
        },
        {
          name: 'Annual',
          subhead: 'Maximum operational return',
          price: '39',
          period: '/mo',
          badge: 'Most popular',
          description: 'Best value to run your WhatsApp desk and operations all year round.',
          features: [
            'Everything in Semi-Annual included',
            'Guided team onboarding',
            'Catalog photos & videos in bot chats',
            'Automated customer recall cycles',
            'Save US$ 240 per year'
          ],
          cta: 'Lock in Annual',
          featured: true
        }
      ]
    },
    faqSection: {
      heading: 'Frequently asked questions',
      items: [
        {
          q: 'Could my WhatsApp number get blocked?',
          a: 'NEO only replies to customers who initiate contact or await service updates—never unsolicited bulk blasts—keeping your business number healthy.'
        },
        {
          q: 'Will I lose my number or chat history?',
          a: 'No. You connect your existing business number while preserving all contacts, history, and ongoing conversations.'
        },
        {
          q: 'What if the AI gives a wrong answer?',
          a: 'You control rules, prices, stock, and services right inside the dashboard. Click Pause AI at any time to step in seamlessly.'
        },
        {
          q: 'My customers prefer talking to real people.',
          a: 'Replies are configured in a natural, human tone with zero rigid "press 1 or 2" menus. Sensitive topics route directly to your team.'
        },
        {
          q: 'I already have a chatbot. What is different?',
          a: 'Legacy bots trap customers in rigid numbered trees. NEO understands free text, photos, and audio while checking live stock and booking slots.'
        },
        {
          q: 'Does it work for my industry?',
          a: 'Yes. Modules toggle by profile (Services, Retail, Office, or Full Operation) so you can turn each capability on or off anytime.'
        },
        {
          q: 'Is there a contract lock-in?',
          a: 'Monthly has zero lock-in. Semi-Annual and Annual cycles reward your commitment with progressive discounts.'
        }
      ]
    },
    footer: {
      demoServices: 'Services Demo',
      demoRetail: 'Retail Demo',
      admin: 'Admin'
    }
  },

  es: {
    nav: {
      menu: 'Menú',
      close: 'Cerrar',
      login: 'Entrar',
      signup: 'Crear cuenta',
      cards: {
        platformTitle: 'Plataforma',
        platformDesc: 'WhatsApp con IA, agenda operativa e inventario sincronizado.',
        modules: 'Módulos integrados',
        agendaOs: 'Agenda y Órdenes',
        catalogPdv: 'Catálogo y POS',
        plansTitle: 'Planes y Ayuda',
        plansDesc: 'Ciclos transparentes sin letra pequeña y respuestas rápidas.',
        plansLink: 'Planes NEO',
        faqLink: 'Preguntas frecuentes',
        accessTitle: 'Acceder ahora',
        accessDesc: 'Explora el panel real con datos de demostración o tu cuenta.',
        enterPanel: 'Entrar al panel',
        demoServices: 'Demo Servicios',
        demoRetail: 'Demo Comercio'
      }
    },
    hero: {
      badge: 'Plataforma operativa con IA en WhatsApp',
      headlinePrefix: 'La IA que convierte tu WhatsApp en',
      rotatingWords: [
        'ventas 24/7.',
        'agenda llena.',
        'stock en vivo.',
        'atención ágil.',
        'control total.'
      ],
      subtitle:
        'Para clínicas, talleres, equipos de servicios y comercios que quieren responder en segundos sin perder el control de la operación.',
      primaryCta: 'Crear cuenta',
      secondaryCta: 'Entrar al panel'
    },
    wallItems: [
      {
        image: WALL_IMAGES[0],
        badge: 'Atención 24h',
        title: 'Oficinas y Consultoría',
        subtitle: 'Clasificación automática, envío de recibos y lectura de PDFs.'
      },
      {
        image: WALL_IMAGES[1],
        badge: 'Ventas en tienda',
        title: 'Comercio y Retail',
        subtitle: 'Consulta precios en vivo y envía fotos de productos al instante.'
      },
      {
        image: WALL_IMAGES[2],
        badge: 'Stock en vivo',
        title: 'Catálogo y POS',
        subtitle: 'Importa hojas Excel/CSV y mantén tu inventario sincronizado.'
      },
      {
        image: WALL_IMAGES[3],
        badge: 'Pausa en 1 clic',
        title: 'Equipo Conectado',
        subtitle: 'Toma el control de cualquier chat al instante sin perder contexto.'
      },
      {
        image: WALL_IMAGES[4],
        badge: 'Agenda IA',
        title: 'Clínicas y Consultorios',
        subtitle: 'Reserva automática de turnos, recordatorios y retornos.'
      },
      {
        image: WALL_IMAGES[5],
        badge: 'OS en 4 etapas',
        title: 'Talleres y Asistencia',
        subtitle: 'Inspección de entrada, presupuesto y aviso automático de retiro.'
      },
      {
        image: WALL_IMAGES[6],
        badge: 'Precio por talla',
        title: 'Veterinarias y Pet Shop',
        subtitle: 'Tarifas por tamaño, comisiones del equipo y avisos por WhatsApp.'
      },
      {
        image: WALL_IMAGES[7],
        badge: 'Visión de fotos',
        title: 'Mostrador Inteligente',
        subtitle: 'Identifica repuestos por foto y lee comprobantes de pago.'
      },
      {
        image: WALL_IMAGES[8],
        badge: 'Búsqueda SKU',
        title: 'Ferretería y Construcción',
        subtitle: 'Cotizaciones al instante por nombre, marca, código o audio.'
      },
      {
        image: WALL_IMAGES[9],
        badge: 'Radar de retorno',
        title: 'Seguimiento Automático',
        subtitle: 'Reactiva clientes en el momento ideal para recompra o servicio.'
      },
      {
        image: WALL_IMAGES[10],
        badge: 'Comisiones',
        title: 'Gestión de Equipo',
        subtitle: 'Agenda por especialista con cálculo automático de comisiones.'
      },
      {
        image: WALL_IMAGES[11],
        badge: 'Telemetría real',
        title: 'Métricas de Autonomía',
        subtitle: 'Monitorea la tasa de resolución de la IA y demandas en tiempo real.'
      }
    ],
    featuresSection: {
      eyebrow: 'Módulos integrados',
      heading: 'Todo conectado en tarjetas claras y fáciles de operar.',
      cards: [
        {
          id: 'agenda',
          headline: 'Agenda y Órdenes',
          subhead: 'Control operativo en 4 etapas',
          body: 'Tarifas por tamaño, equipo con comisiones, inspección de entrada y aviso automático de retiro por WhatsApp.',
          imageUrl:
            'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'Ver demo',
          primaryCta: 'Probar ahora',
          demoEmail: 'contato@desentupidoraguri.com.br'
        },
        {
          id: 'catalogo',
          headline: 'Catálogo y POS',
          subhead: 'Stock en vivo conectado a la IA',
          body: 'Envía fotos y videos en WhatsApp, importa planillas Excel o CSV y sincroniza precios con tu POS.',
          imageUrl:
            'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'Ver demo',
          primaryCta: 'Probar ahora',
          demoEmail: 'contato@ferragensmarlene.com.br'
        },
        {
          id: 'atendimento',
          headline: 'WhatsApp con IA',
          subhead: 'Atención natural y visión de fotos',
          body: 'Identifica fotos y audios enviados por el cliente, responde con tono humano y cede al equipo en 1 clic.',
          imageUrl:
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
          secondaryCta: 'Ver planes',
          primaryCta: 'Crear cuenta',
          demoEmail: null
        }
      ],
      highlights: [
        {
          iconKey: 'zap',
          title: 'Respuestas instantáneas',
          body: 'Tu cliente recibe precio real, disponibilidad y reserva por WhatsApp en cuestión de segundos.'
        },
        {
          iconKey: 'eye',
          title: 'Lectura de fotos, audios y PDFs',
          body: 'La IA reconoce piezas en fotos, entiende mensajes de voz y extrae datos de comprobantes.'
        },
        {
          iconKey: 'shield',
          title: 'Asume en 1 clic',
          body: 'Pausa la IA en cualquier conversación al instante para llevar negociaciones delicadas con tu equipo.'
        }
      ]
    },
    plansSection: {
      badge: 'Planes NEO',
      heading: 'Planes claros y directos.',
      subtitle: 'Valores ilustrativos para demostración. Elige el ciclo que mejor se adapte a tu negocio.',
      currency: 'US$',
      plans: [
        {
          name: 'Mensual',
          subhead: 'Flexibilidad total para empezar',
          price: '59',
          period: '/mes',
          description: 'Para probar en la rutina diaria sin compromisos a largo plazo.',
          features: [
            'WhatsApp con IA y visión de fotos',
            'Agenda, Órdenes de Servicio y Catálogo',
            'Importación de stock en CSV y Excel',
            'Pausa para atención humana en 1 clic',
            'Cancelación libre en cualquier momento'
          ],
          cta: 'Empezar Mensual',
          featured: false
        },
        {
          name: 'Semestral',
          subhead: 'Previsibilidad y ahorro real',
          price: '49',
          period: '/mes',
          description: 'Equilibrio entre ahorro y estabilidad para empresas en crecimiento.',
          features: [
            'Todo lo del plan Mensual incluido',
            'Sincronización de precios con API POS',
            'Equipo, comisiones y tarifas por tamaño',
            'Soporte prioritario en configuración',
            'Ahorro de US$ 60 cada semestre'
          ],
          cta: 'Elegir Semestral',
          featured: false
        },
        {
          name: 'Anual',
          subhead: 'Máximo retorno operativo',
          price: '39',
          period: '/mes',
          badge: 'Más elegido',
          description: 'Mejor relación costo-beneficio para operar WhatsApp y tu negocio todo el año.',
          features: [
            'Todo lo del plan Semestral incluido',
            'Onboarding asistido para tu equipo',
            'Envío de fotos y videos del catálogo en el bot',
            'Ciclos automáticos de retorno de clientes',
            'Ahorro de US$ 240 al año'
          ],
          cta: 'Asegurar plan Anual',
          featured: true
        }
      ]
    },
    faqSection: {
      heading: 'Preguntas frecuentes',
      items: [
        {
          q: '¿Mi WhatsApp puede ser bloqueado?',
          a: 'NEO solo responde a clientes que inician contacto o esperan avisos de servicio, sin envíos masivos no solicitados, cuidando la reputación de tu número.'
        },
        {
          q: '¿Perderé mi número o mis contactos?',
          a: 'No. Conectas tu número comercial actual y conservas todo tu historial, contactos y chats intactos.'
        },
        {
          q: '¿Y si la IA responde mal?',
          a: 'Tú defines reglas, precios, stock y servicios en el panel. En cualquier momento haces clic en Pausar IA para atender personalmente.'
        },
        {
          q: 'Mis clientes prefieren hablar con personas.',
          a: 'La conversación usa un tono natural y directo, sin menús rígidos de "marca 1 o 2". Los temas delicados pasan rápido a tu equipo.'
        },
        {
          q: 'Ya tengo un chatbot. ¿Cuál es la diferencia?',
          a: 'Los bots clásicos encierran al cliente en menús numéricos. NEO entiende texto, fotos y audios, consulta stock real y agenda turnos.'
        },
        {
          q: '¿Funciona para mi rubro?',
          a: 'Sí. Los módulos se activan por perfil (Servicios, Comercio, Oficina u Operación Completa) y puedes prender o apagar cada función.'
        },
        {
          q: '¿Tiene permanencia mínima?',
          a: 'El plan Mensual no tiene permanencia. Los planes Semestral y Anual ofrecen descuentos progresivos.'
        }
      ]
    },
    footer: {
      demoServices: 'Demo Servicios',
      demoRetail: 'Demo Comercio',
      admin: 'Admin'
    }
  }
};
