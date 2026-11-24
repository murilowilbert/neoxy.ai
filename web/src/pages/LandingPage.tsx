import React, { useState } from 'react';
import { ArrowUpRight, Calendar, Package, MessageSquare, Plus, Minus, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import NeoxyLogo from '../components/NeoxyLogo';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between transition-colors relative overflow-x-clip">
      {/* Navegação Flutuante Fixa com Apple Liquid Glass (Descolada do topo e das laterais) */}
      <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
        <header className="max-w-6xl mx-auto nx-liquid-glass rounded-2xl sm:rounded-full pl-5 sm:pl-6 pr-3 h-16 flex items-center justify-between pointer-events-auto">
          <a
            href="#"
            className="flex items-center group"
            aria-label="NEO"
          >
            <NeoxyLogo variant="lockup" height={17} />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--nx-muted)]">
            <a href="#recursos" className="hover:text-[var(--nx-text)] transition-colors">
              Recursos
            </a>
            <a href="#planos" className="hover:text-[var(--nx-text)] transition-colors">
              Planos
            </a>
            <a href="#duvidas" className="hover:text-[var(--nx-text)] transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => onGoToLogin()}
              className="px-4 py-2 rounded-full text-sm font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]/70 transition-colors"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={onGoToRegister}
              className="nx-btn-primary px-5 py-2.5 text-sm"
            >
              Criar conta
            </button>
          </div>
        </header>
      </div>

      <main className="flex-1">
        {/* Hero Aberto e Arejado com Aura NEO Volt Sutil */}
        <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-[-10%] w-[520px] h-[520px] rounded-full blur-3xl opacity-75"
            style={{ background: 'var(--nx-volt-aura)' }}
          />

          <div className="relative max-w-6xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full nx-volt-badge text-xs shadow-sm">
                <NeoxyLogo variant="cube" height={15} tone="black" />
                <span>Plataforma operacional com IA no WhatsApp</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--nx-text)] leading-[1.06]">
                WhatsApp, agenda e estoque na mesma bancada.
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
            </div>

            <div className="lg:col-span-6 animate-fade-up">
              <div className="relative rounded-3xl p-3 border border-[var(--nx-border)] bg-[var(--nx-surface)] shadow-xl">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0A0A0B]">
                  <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80"
                    alt="Ambiente operacional moderno NEO"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(5,5,6,0.12) 0%, rgba(5,5,6,0.05) 45%, rgba(5,5,6,0.72) 100%)'
                    }}
                  />

                  {/* Selo flutuante Liquid Glass sobre a imagem do Hero */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 bg-black/55 backdrop-blur-xl border border-white/15 text-white">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#0A0A0B] border border-white/15">
                        <NeoxyLogo variant="cube" height={22} tone="white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          Atendimento inteligente 24h
                        </div>
                        <div className="text-xs text-white/75 truncate">
                          Visão de fotos, estoque ao vivo e agenda conectada
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D4FF00] text-[#09090B] shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#09090B]" />
                      Ativo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção de 3 Pilares com Cards Estruturados (Hierarquia 24px / 16px / 14px / 16px) */}
        <section id="recursos" className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]/60">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="max-w-2xl mb-12 space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nx-volt-ink)]">
                <span className="w-2 h-2 rounded-full bg-[#D4FF00] ring-2 ring-[#BDFE01]/40" />
                Módulos integrados
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--nx-text)]">
                Tudo conectado em cartões claros e fáceis de operar.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.id}
                    className="nx-card-interactive p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Mídia arredondada interna (padrão visual Imagem 5) */}
                      <div className="relative h-44 rounded-xl overflow-hidden bg-[var(--nx-surface-alt)] mb-5">
                        <img
                          src={card.imageUrl}
                          alt={card.headline}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-[#0A0A0B]/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-[#D4FF00]">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Hierarquia Tipográfica exata: 24px Headline -> 16px Subhead -> 14px Body */}
                      <h3 className="nx-card-headline">{card.headline}</h3>
                      <p className="nx-card-subhead mt-1">{card.subhead}</p>
                      <p className="nx-card-body mt-3">{card.body}</p>
                    </div>

                    {/* Botões-pílula balanceados (16px label) */}
                    <div className="flex items-center gap-2.5 pt-6">
                      <button
                        type="button"
                        onClick={() =>
                          card.demoEmail ? onGoToLogin(card.demoEmail) : document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })
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
            </div>
          </div>
        </section>

        {/* Seção de Planos — Preto Real (#050506) + Destaque NEO Volt */}
        <section id="planos" className="bg-[#050506] text-white border-t border-[#1D1D21] relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[780px] h-[280px] rounded-full blur-3xl opacity-20"
            style={{
              background:
                'radial-gradient(ellipse at center, #D4FF00 0%, #BDFE01 40%, transparent 72%)'
            }}
          />

          <div className="relative max-w-6xl mx-auto px-6 py-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
              <div className="max-w-xl space-y-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#D4FF00]">
                  <NeoxyLogo variant="cube" height={14} tone="white" />
                  <span>Planos NEO</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Planos diretos ao ponto.
                </h2>
                <p className="text-base text-zinc-400">
                  Valores ilustrativos para demonstração. Escolha o ciclo que melhor se adapta à rotina da sua empresa.
                </p>
              </div>
              <NeoxyLogo variant="wordmark" height={20} tone="white" className="opacity-30 hidden sm:inline-block" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-7 flex flex-col justify-between border transition-all ${
                    plan.featured
                      ? 'bg-[#111113] border-[#D4FF00]/70 shadow-[0_0_40px_rgba(212,255,0,0.12)]'
                      : 'bg-[#0C0C0E] border-[#222226] hover:border-[#34343B]'
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

                    <ul className="space-y-3 border-t border-[#222226] pt-6 mb-8">
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

                  <button
                    type="button"
                    onClick={onGoToRegister}
                    className={`w-full py-3.5 px-5 rounded-full text-[16px] font-semibold transition-all ${
                      plan.featured
                        ? 'nx-btn-primary'
                        : 'bg-[#18181B] hover:bg-[#232328] text-white border border-[#2E2E35]'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Seção de Dúvidas Frequentes (FAQ Acordeão) */}
        <section id="duvidas" className="bg-[var(--nx-bg)] border-t border-[var(--nx-border)]">
          <div className="max-w-3xl mx-auto px-6 py-20">
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
