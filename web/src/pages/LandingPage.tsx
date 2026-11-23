import React, { useState } from 'react';
import { ArrowUpRight, Calendar, Package, MessageSquare, Plus, Minus } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import NeoxyLogo from '../components/NeoxyLogo';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

const PLANS = [
  {
    name: 'Mensal',
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
    a: 'A Neoxy trabalha respondendo apenas clientes que iniciam contato ou aguardam retorno de serviço, sem disparos em massa não solicitados, preservando a reputação do seu número.'
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
    a: 'Chatbots tradicionais travam o cliente em fluxos de "digite 1 ou 2". A Neoxy entende texto, identifica fotos enviadas pelo cliente, consulta seu estoque real e registra agendamentos.'
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
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between transition-colors">
      {/* Navegação Minimalista */}
      <header className="w-full border-b border-[var(--nx-border)] bg-[var(--nx-surface)] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NeoxyLogo height={20} className="text-[var(--nx-text)]" />
            <span className="text-xs font-medium text-[var(--nx-subtle)] hidden sm:inline">
              .ai
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[var(--nx-muted)]">
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

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => onGoToLogin()}
              className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] transition-colors"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={onGoToRegister}
              className="nx-btn-primary px-4 py-2 text-xs"
            >
              Criar conta
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Aberto e Arejado */}
        <section className="max-w-6xl mx-auto w-full px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 animate-fade-up">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--nx-text)] leading-[1.08]">
              WhatsApp, agenda e estoque na mesma bancada.
            </h1>

            <p className="text-base text-[var(--nx-muted)] leading-relaxed max-w-lg">
              Para clínicas, oficinas, prestadores de serviços e comércios que querem responder clientes no WhatsApp sem perder o controle da operação.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onGoToRegister}
                className="nx-btn-primary px-6 py-3 text-sm"
              >
                Criar conta
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onGoToLogin()}
                className="px-6 py-3 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-sm font-medium text-[var(--nx-text)] transition-colors"
              >
                Entrar no painel
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 animate-fade-up">
            <div className="rounded-2xl overflow-hidden border border-[var(--nx-border)] bg-[var(--nx-surface)] shadow-sm aspect-[4/3]">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80"
                alt="Ambiente operacional moderno Neoxy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Faixa Minimalista de 3 Pilares */}
        <section id="recursos" className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]">
          <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-2.5">
              <Calendar className="w-5 h-5 text-[var(--nx-primary)]" />
              <h2 className="text-sm font-bold text-[var(--nx-text)]">
                Agenda & Ordens de Serviço
              </h2>
              <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                Preços por porte, equipe com comissões, vistoria de entrada e aviso de retirada no WhatsApp.
              </p>
            </div>

            <div className="space-y-2.5">
              <Package className="w-5 h-5 text-[var(--nx-primary)]" />
              <h2 className="text-sm font-bold text-[var(--nx-text)]">
                Catálogo & Integração PDV
              </h2>
              <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                Fotos, vídeos, importação por planilha Excel/CSV e sincronização direta de preços.
              </p>
            </div>

            <div className="space-y-2.5">
              <MessageSquare className="w-5 h-5 text-[var(--nx-primary)]" />
              <h2 className="text-sm font-bold text-[var(--nx-text)]">
                Atendimento Humanizado
              </h2>
              <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                Identificação de fotos enviadas pelo cliente, respostas naturais e pausa para humano em 1 clique.
              </p>
            </div>
          </div>
        </section>

        {/* Seção de Planos (Faixa Escura Contrastante) */}
        <section id="planos" className="bg-[#0F141C] text-white border-t border-[#1E293B]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="max-w-xl mb-12 space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Planos diretos ao ponto.
              </h2>
              <p className="text-sm text-slate-400">
                Valores ilustrativos para demonstração. Escolha o ciclo que melhor se adapta à rotina da sua empresa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-7 flex flex-col justify-between border transition-colors ${
                    plan.featured
                      ? 'bg-[#16202E] border-[#38BDF8]/50 shadow-lg'
                      : 'bg-[#141A23] border-[#253041]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h3 className="text-base font-bold text-white">{plan.name}</h3>
                      {plan.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0F4C81] text-white">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-xs text-slate-400">R$</span>
                      <span className="text-4xl font-bold tracking-tight tabular-data text-white">
                        {plan.price}
                      </span>
                      <span className="text-xs text-slate-400">{plan.period}</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      {plan.description}
                    </p>

                    <ul className="space-y-3 border-t border-[#253041] pt-6 mb-8">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-1.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={onGoToRegister}
                    className={`w-full py-3 px-4 rounded-lg text-xs font-semibold transition-colors ${
                      plan.featured
                        ? 'bg-[#0F4C81] hover:bg-[#135C9B] text-white'
                        : 'bg-[#1E293B] hover:bg-[#273549] text-white border border-[#334155]'
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
                      className="w-full py-5 flex items-center justify-between gap-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-[var(--nx-text)]">
                        {item.q}
                      </span>
                      <span className="text-[var(--nx-muted)] shrink-0">
                        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-5 pr-8 text-xs text-[var(--nx-muted)] leading-relaxed animate-fade-up">
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
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--nx-subtle)]">
          <div className="flex items-center gap-2">
            <NeoxyLogo height={14} className="text-[var(--nx-text)]" />
            <span>Neoxy.ai</span>
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
