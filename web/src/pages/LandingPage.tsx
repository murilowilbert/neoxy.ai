import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Package,
  MessageSquare,
  Plus,
  Minus,
  Check,
  Zap,
  Eye,
  ShieldCheck
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import NeoxyLogo from '../components/NeoxyLogo';
import { useTheme } from '../components/ThemeProvider';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import CardNav, { type CardNavItem } from '../components/reactbits/CardNav';
import DriftWall, { type DriftWallItem } from '../components/reactbits/DriftWall';
import GradientBlinds from '../components/reactbits/GradientBlinds';
import RotatingText from '../components/reactbits/RotatingText';
import StarBorder from '../components/reactbits/StarBorder';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

const HERO_WALL_ITEMS: DriftWallItem[] = [
  {
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80',
    title: 'Escritório moderno NEO'
  },
  {
    image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=700&q=80',
    title: 'Atendimento e vendas'
  },
  {
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=700&q=80',
    title: 'Estoque e catálogo sincronizado'
  },
  {
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80',
    title: 'Equipe operacional conectada'
  },
  {
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80',
    title: 'Clínicas e consultórios'
  },
  {
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80',
    title: 'Oficinas e assistência técnica'
  },
  {
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=700&q=80',
    title: 'Pet shop e banho e tosa'
  },
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=700&q=80',
    title: 'PDV e balcão inteligente'
  },
  {
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=700&q=80',
    title: 'Ferragens e construção'
  },
  {
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=700&q=80',
    title: 'Gestão comercial em tempo real'
  },
  {
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=700&q=80',
    title: 'Reuniões e agendamentos'
  },
  {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80',
    title: 'Métricas e desempenho'
  }
];

const FEATURE_CARDS = [
  {
    id: 'agenda',
    icon: Calendar,
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
    icon: Package,
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
    icon: MessageSquare,
    headline: 'WhatsApp com IA',
    subhead: 'Atendimento natural e visão de fotos',
    body: 'Identifica fotos e áudios enviados pelo cliente, responde em tom humano e permite pausa para equipe em 1 clique.',
    imageUrl:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
    secondaryCta: 'Ver planos',
    primaryCta: 'Criar conta',
    demoEmail: null
  }
];

const PLANS = [
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
];

const FAQS = [
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
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToRegister
}) => {
  const { theme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const navItems = useMemo<CardNavItem[]>(
    () => [
      {
        label: 'Plataforma',
        description: 'WhatsApp com IA, agenda operacional e estoque sincronizado.',
        links: [
          { label: 'Módulos integrados', href: '#recursos' },
          { label: 'Agenda & OS', href: '#recursos' },
          { label: 'Catálogo & PDV', href: '#recursos' }
        ]
      },
      {
        label: 'Planos & Ajuda',
        description: 'Ciclos transparentes sem letras miúdas e dúvidas respondidas.',
        links: [
          { label: 'Planos NEO', href: '#planos' },
          { label: 'Dúvidas frequentes', href: '#duvidas' }
        ]
      },
      {
        label: 'Acessar agora',
        description: 'Explore o painel real com dados de demonstração ou sua conta.',
        links: [
          { label: 'Entrar no painel', onClick: () => onGoToLogin() },
          { label: 'Demo Serviços', onClick: () => onGoToLogin('contato@desentupidoraguri.com.br') },
          { label: 'Demo Comércio', onClick: () => onGoToLogin('contato@ferragensmarlene.com.br') }
        ]
      }
    ],
    [onGoToLogin]
  );

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between transition-colors relative overflow-x-clip">
      {/* Navbar Flutuante Centralizada com Abertura em Cards (CardNav + Liquid Glass NEO) */}
      <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
        <CardNav
          theme={theme}
          surface="glass"
          maxWidth={1120}
          cardHeight={156}
          speed={1.45}
          menuOpenText="Menu"
          menuCloseText="Fechar"
          logo={<NeoxyLogo variant="lockup" height={17} />}
          logoAlt="NEO"
          logoHref="#"
          items={navItems}
          cta={{
            label: 'Criar conta',
            onClick: onGoToRegister
          }}
          rightSlot={
            <>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => onGoToLogin()}
                className="hidden sm:inline-flex items-center px-3.5 h-10 rounded-full text-[13.5px] font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]/70 transition-colors"
              >
                Entrar
              </button>
            </>
          }
        />
      </div>

      <main className="flex-1">
        {/* Hero Aberto e Arejado com DriftWall 3D + Fade Superior Suave Próximo à Navbar */}
        <section className="relative pt-24 sm:pt-28 pb-16 sm:pb-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-[-10%] w-[520px] h-[520px] rounded-full blur-3xl opacity-70"
            style={{ background: 'var(--nx-volt-aura)' }}
          />

          <div className="relative max-w-6xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <AnimatedContent
              trigger="mount"
              distance={26}
              duration={0.58}
              stagger={0.06}
              className="lg:col-span-6 space-y-6 pt-6 lg:pt-8"
            >
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full nx-volt-badge text-xs shadow-sm">
                <NeoxyLogo variant="cube" height={15} tone="black" />
                <span>Plataforma operacional com IA no WhatsApp</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--nx-text)] leading-[1.12]">
                WhatsApp, agenda e
                <span className="block my-2">
                  <RotatingText
                    texts={['estoque', 'serviços', 'vendas', 'clientes', 'equipe']}
                    rotationInterval={2400}
                    staggerDuration={0.025}
                    className="px-3.5 py-0.5 rounded-2xl nx-volt-badge !font-bold !text-4xl sm:!text-5xl tracking-tight leading-[1.12] shadow-sm"
                  />
                </span>
                na mesma bancada.
              </h1>

              <p className="text-base text-[var(--nx-muted)] leading-relaxed max-w-lg">
                Para clínicas, oficinas, prestadores de serviços e comércios que querem responder clientes no WhatsApp sem perder o controle da operação.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="nx-btn-primary px-7 py-3.5 text-base"
                >
                  Criar conta
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGoToLogin()}
                  className="nx-btn-secondary px-7 py-3.5 text-base"
                >
                  Entrar no painel
                </button>
              </div>
            </AnimatedContent>

            <AnimatedContent
              trigger="mount"
              distance={22}
              delay={0.08}
              duration={0.65}
              className="lg:col-span-6 relative lg:-mt-10"
            >
              <div className="relative h-[360px] sm:h-[460px] lg:h-[560px] w-full overflow-clip lg:overflow-x-visible lg:overflow-y-clip">
                <DriftWall
                  items={HERO_WALL_ITEMS}
                  columns={3}
                  tileWidth={148}
                  tileHeight={106}
                  gap={14}
                  radius={14}
                  tilt={11}
                  turn={-8}
                  perspective={1200}
                  depth={76}
                  speed={30}
                  direction="up"
                  variance={0.42}
                  parallax={0.48}
                  lift={42}
                  fade={0.58}
                  dim={theme === 'dark' ? 0.68 : 0.88}
                  overlayColor={theme === 'dark' ? '#050506' : '#FFFFFF'}
                />
              </div>
            </AnimatedContent>
          </div>
        </section>

        {/* Seção de 3 Pilares com Cards Estruturados + Animação Fluida no Scroll */}
        <section id="recursos" className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]/60">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <AnimatedContent distance={26} duration={0.55} className="max-w-2xl mb-12 space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nx-volt-ink)]">
                <span className="w-2 h-2 rounded-full bg-[#D4FF00] ring-2 ring-[#BDFE01]/40" />
                Módulos integrados
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--nx-text)]">
                Tudo conectado em cartões claros e fáceis de operar.
              </h2>
            </AnimatedContent>

            <AnimatedContent
              distance={32}
              duration={0.58}
              stagger={0.07}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {FEATURE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.id}
                    className="nx-card-interactive group p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 rounded-xl overflow-hidden bg-[var(--nx-surface-alt)] ring-1 ring-inset ring-black/10 dark:ring-white/10 mb-5">
                        <img
                          src={card.imageUrl}
                          alt={card.headline}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                        <div className="absolute top-3 left-3 nx-icon-tile nx-icon-tile--sm nx-icon-tile--dark !backdrop-blur-md">
                          <Icon className="w-4 h-4 text-[#D4FF00]" />
                        </div>
                      </div>

                      <h3 className="nx-card-headline">{card.headline}</h3>
                      <p className="nx-card-subhead mt-1">{card.subhead}</p>
                      <p className="nx-card-body mt-3">{card.body}</p>
                    </div>

                    <div className="flex items-center gap-2.5 pt-6">
                      <button
                        type="button"
                        onClick={() =>
                          card.demoEmail
                            ? onGoToLogin(card.demoEmail)
                            : document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })
                        }
                        className="nx-btn-secondary nx-card-btn-label px-4 py-2.5 flex-1"
                      >
                        {card.secondaryCta}
                      </button>
                      <button
                        type="button"
                        onClick={onGoToRegister}
                        className="nx-btn-primary nx-card-btn-label px-4 py-2.5 flex-1"
                      >
                        {card.primaryCta}
                      </button>
                    </div>
                  </article>
                );
              })}
            </AnimatedContent>

            {/* Faixa de Destaques — Cartões com Luz Superior, Borda Especular & Spotlight no Cursor */}
            <AnimatedContent
              distance={28}
              duration={0.55}
              stagger={0.06}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
            >
              {[
                {
                  icon: Zap,
                  title: 'Respostas instantâneas',
                  body: 'Seu cliente recebe retorno em segundos no WhatsApp com preço real, disponibilidade e link de agendamento.'
                },
                {
                  icon: Eye,
                  title: 'Leitura de fotos, áudios e PDFs',
                  body: 'A IA identifica peças em fotos enviadas, entende mensagens de voz e extrai dados de comprovantes.'
                },
                {
                  icon: ShieldCheck,
                  title: 'Assuma em 1 clique',
                  body: 'Pause a IA em qualquer conversa instantaneamente para conduzir negociações sensíveis com sua equipe.'
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="nx-card-interactive p-6 flex flex-col gap-5">
                    <div className="nx-icon-tile">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-[20px] leading-snug font-bold tracking-tight text-[var(--nx-text)]">
                        {item.title}
                      </h3>
                      <p className="text-[14px] leading-relaxed text-[var(--nx-muted)]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </AnimatedContent>
          </div>
        </section>

        {/* Seção de Planos — Preto Real (#050506) + GradientBlinds WebGL2 + StarBorder no Hover */}
        <section id="planos" className="bg-[#050506] text-white border-t border-[#1D1D21] relative overflow-hidden">
          <GradientBlinds
            gradientColors={['#0B0B0E', '#2B3606', '#8DB300', '#D4FF00']}
            lightColor="#F0FF8A"
            angle={18}
            noise={0.2}
            blindCount={18}
            blindMinWidth={56}
            spotlightRadius={0.62}
            spotlightSoftness={1.1}
            spotlightOpacity={0.96}
            shine={0.55}
            relief={0.55}
            glow={0.7}
            sway={0.32}
            speed={0.85}
            hoverTilt={0.65}
            clickEffect="ripple"
            idle="drift"
            mixBlendMode="screen"
            lightMode={false}
            style={{ opacity: 0.78 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(5,5,6,0.74) 0%, rgba(5,5,6,0.38) 45%, rgba(5,5,6,0.84) 100%)'
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
            <AnimatedContent
              distance={26}
              duration={0.55}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
            >
              <div className="max-w-xl space-y-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#D4FF00] backdrop-blur-md">
                  <NeoxyLogo variant="cube" height={14} tone="white" />
                  <span>Planos NEO</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Planos diretos ao ponto.
                </h2>
                <p className="text-base text-zinc-300/90">
                  Valores ilustrativos para demonstração. Escolha o ciclo que melhor se adapta à rotina da sua empresa.
                </p>
              </div>
              <NeoxyLogo variant="wordmark" height={20} tone="white" className="opacity-35 hidden sm:inline-block" />
            </AnimatedContent>

            <AnimatedContent
              distance={32}
              duration={0.58}
              stagger={0.07}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
            >
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`nx-spotlight-card nx-spotlight-card--dark p-7 flex flex-col justify-between !backdrop-blur-md ${
                    plan.featured
                      ? '!border-[#D4FF00]/60 shadow-[0_0_42px_rgba(212,255,0,0.14)]'
                      : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-[24px] leading-tight font-bold text-white">
                          {plan.name}
                        </h3>
                        <p className="text-[16px] font-medium text-zinc-400 mt-0.5">
                          {plan.subhead}
                        </p>
                      </div>
                      {plan.badge && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold nx-volt-badge shrink-0">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 my-5">
                      <span className="text-sm text-zinc-400">R$</span>
                      <span
                        className={`text-4xl font-bold tracking-tight tabular-data ${
                          plan.featured ? 'text-[#D4FF00]' : 'text-white'
                        }`}
                      >
                        {plan.price}
                      </span>
                      <span className="text-sm text-zinc-400">{plan.period}</span>
                    </div>

                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-6">
                      {plan.description}
                    </p>

                    <ul className="space-y-3 border-t border-white/10 pt-6 mb-8">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-[14px] text-zinc-200">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              plan.featured
                                ? 'bg-[#D4FF00]/15 text-[#D4FF00]'
                                : 'bg-white/10 text-zinc-300'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <StarBorder
                    as="button"
                    type="button"
                    onClick={onGoToRegister}
                    hover="reveal"
                    theme="dark"
                    radius={999}
                    stars={2}
                    duration={plan.featured ? 3.1 : 3.6}
                    thickness={plan.featured ? 2 : 1.5}
                    glow={plan.featured ? 0.85 : 0.72}
                    sparkle={true}
                    clickPulse={true}
                    color={plan.featured ? '#FFFFFF' : '#D4FF00'}
                    trailColor={plan.featured ? '#D4FF00' : '#BDFE01'}
                    backgroundColor={
                      plan.featured
                        ? 'linear-gradient(135deg, #FFFD65 0%, #DBFF02 42%, #BDFE01 74%, #FFEA02 100%)'
                        : '#16161C'
                    }
                    textColor={plan.featured ? '#09090B' : '#FFFFFF'}
                    borderColor={plan.featured ? 'rgba(9, 9, 11, 0.16)' : 'rgba(255, 255, 255, 0.14)'}
                    className={`w-full py-3.5 px-5 text-[16px] font-semibold ${
                      plan.featured
                        ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_22px_rgba(189,254,1,0.30)]'
                        : 'hover:bg-[#1E1E26]'
                    }`}
                  >
                    {plan.cta}
                  </StarBorder>
                </div>
              ))}
            </AnimatedContent>
          </div>
        </section>

        {/* Seção de Dúvidas Frequentes (FAQ Acordeão) */}
        <section id="duvidas" className="bg-[var(--nx-bg)] border-t border-[var(--nx-border)]">
          <div className="max-w-3xl mx-auto px-6 py-20">
            <AnimatedContent distance={32} duration={0.7}>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--nx-text)] text-center mb-10">
                Dúvidas frequentes
              </h2>

              <div className="divide-y divide-[var(--nx-border)] border-t border-b border-[var(--nx-border)]">
                {FAQS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={item.q}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full py-5 flex items-center justify-between gap-4 text-left group"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base font-semibold text-[var(--nx-text)] group-hover:text-[var(--nx-volt-ink)] transition-colors">
                          {item.q}
                        </span>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isOpen
                              ? 'bg-[var(--nx-volt)] text-[#09090B]'
                              : 'bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]'
                          }`}
                        >
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="pb-5 pr-8 text-[14px] text-[var(--nx-muted)] leading-relaxed animate-fade-up">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AnimatedContent>
          </div>
        </section>
      </main>

      {/* Rodapé Limpo */}
      <footer className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]">
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--nx-subtle)]">
          <div className="flex items-center gap-3">
            <NeoxyLogo variant="lockup" height={14} />
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onGoToLogin('contato@desentupidoraguri.com.br')}
              className="hover:text-[var(--nx-text)] transition-colors"
            >
              Demo Serviços
            </button>
            <button
              type="button"
              onClick={() => onGoToLogin('contato@ferragensmarlene.com.br')}
              className="hover:text-[var(--nx-text)] transition-colors"
            >
              Demo Comércio
            </button>
            <button
              type="button"
              onClick={() => onGoToLogin('admin@neoxy.ai')}
              className="hover:text-[var(--nx-text)] transition-colors"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
