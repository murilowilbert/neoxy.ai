import React, { useState } from 'react';
import {
  Bot,
  MessageSquare,
  Store,
  Stethoscope,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Clock,
  FileText,
  Calendar,
  PackageSearch,
  Lock
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

export function LandingPage({ onGoToLogin, onGoToRegister }: LandingPageProps) {
  const [activeNiche, setActiveNiche] = useState<'RETAIL' | 'SERVICES' | 'OFFICE'>('RETAIL');

  const nicheExamples = {
    RETAIL: {
      badge: 'Varejo, Ferragens & Materiais de Construção',
      title: 'Consulta de 8.000+ itens em segundos e identificação de peças por foto',
      description: 'Ideal para lojas como a Ferragens Marlene: o cliente manda foto de um reparo ou pergunta por uma ducha, a IA consulta a planilha ou banco em tempo real, responde em linguagem de balcão e separa o pedido.',
      modules: ['Catálogo de Produtos & Preços', 'Sincronização Google Sheets / CSV', 'Visão Computacional de Peças', 'Relatório de Demanda Perdida'],
      chatSample: [
        { role: 'client', text: 'Bom dia! Vocês têm ducha Lorenzetti 220V?' },
        { role: 'bot', text: 'Bom dia! Tudo bem? Temos sim! Aqui na loja trabalhamos com a *Ducha Elétrica Lorenzetti Advanced Multitemperaturas 220V* por *R$ 159,90* à vista.' },
        { role: 'bot', text: 'Quer que eu já peça pro pessoal separar uma no balcão pra você retirar?' }
      ]
    },
    SERVICES: {
      badge: 'Clínicas, Pet Shops, Estética & Salões',
      title: 'Catálogo de serviços com duração e agendamento automático pelo WhatsApp',
      description: 'Ideal para Pet Shops, Clínicas e Barbearias: a IA apresenta os serviços, tira dúvidas sobre procedimentos, consulta a agenda do estabelecimento e confirma o horário do cliente 24h por dia.',
      modules: ['Catálogo de Serviços & Duração', 'Agenda Inteligente Integrada', 'Confirmação e Lembretes', 'Venda Casada de Produtos'],
      chatSample: [
        { role: 'client', text: 'Oi! Queria marcar um banho e tosa pro meu Golden amanhã à tarde.' },
        { role: 'bot', text: 'Olá! Que alegria atender você e seu Golden! 🐾 O nosso *Banho & Tosa Higiênica* tem duração média de 60 min.' },
        { role: 'bot', text: 'Para amanhã temos horário livre às *14:30* ou às *16:00*. Qual fica melhor para vocês?' }
      ]
    },
    OFFICE: {
      badge: 'Escritórios Contábeis, Jurídicos & Consultorias',
      title: 'Recebimento inteligente de contas/boletos, triagem e marcação de reuniões',
      description: 'Ideal para escritórios: quando o cliente envia um boleto, nota fiscal ou comprovante no WhatsApp, a IA lê o documento, extrai vencimento e valor, organiza no painel financeiro e agenda reuniões.',
      modules: ['Recebimento de Boletos & Notas Fiscais', 'Leitura Automática por IA (Valor/Vencimento)', 'Agendamento de Reuniões', 'Triagem por Setor (Fiscal/RH/Societário)'],
      chatSample: [
        { role: 'client', text: '[Foto de Boleto] Segue a conta de energia da matriz para conciliação.' },
        { role: 'bot', text: 'Perfeito, Roberto! Recebi o *Boleto de Energia Elétrica* com vencimento em *20/11/2026* no valor de *R$ 1.485,40*.' },
        { role: 'bot', text: 'Já protocolei no nosso setor financeiro para baixa e conciliação. Precisa de mais alguma guia hoje?' }
      ]
    }
  };

  const currentNiche = nicheExamples[activeNiche];

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-100 flex flex-col">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0D1117]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">neoxy<span className="text-emerald-400">.ai</span></span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Multi-Tenant SaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#nichos" className="hover:text-emerald-400 transition-colors">Para cada Negócio</a>
            <a href="#arquitetura" className="hover:text-emerald-400 transition-colors">Arquitetura Plástica</a>
            <a href="#demo-logins" className="hover:text-emerald-400 transition-colors">Acesso Rápido Demo</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onGoToLogin()}
              className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/70 transition-all"
            >
              Entrar no Sistema
            </button>
            <button
              onClick={onGoToRegister}
              className="min-h-[44px] px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              Criar Conta Empresa
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              IA Ultra-Humanizada ("Zero-Robô") + Painel Adaptativo por Ramo de Atividade
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Um único cérebro no WhatsApp que se molda ao{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                seu tipo de negócio
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              De lojas de ferragens com 8.000 itens no estoque a clínicas com agendamento ou escritórios que recebem boletos e documentos. O <strong>Neoxy.ai</strong> libera automaticamente as ferramentas certas para cada empresa.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onGoToRegister}
                className="min-h-[48px] px-7 py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 text-base"
              >
                Cadastrar Meu Estabelecimento
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#demo-logins"
                className="min-h-[48px] px-7 py-3.5 rounded-xl font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-100 border border-slate-700 transition-all flex items-center gap-2 text-base"
              >
                Testar Perfis Prontos (1 Clique)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Niche Selector */}
      <section id="nichos" className="py-16 lg:py-24 bg-[#161B22]/50 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white">Interface Plástica: Módulos sob Medida</h2>
            <p className="mt-3 text-slate-400">
              Clique em cada perfil abaixo para ver como a plataforma adapta o menu, o banco de dados e o comportamento da IA:
            </p>
          </div>

          {/* Niche Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            <button
              onClick={() => setActiveNiche('RETAIL')}
              className={`min-h-[56px] p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                activeNiche === 'RETAIL'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className={`w-6 h-6 ${activeNiche === 'RETAIL' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-sm">Comércio & Varejo</div>
                <div className="text-xs opacity-75">Ex: Ferragens Marlene</div>
              </div>
            </button>

            <button
              onClick={() => setActiveNiche('SERVICES')}
              className={`min-h-[56px] p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                activeNiche === 'SERVICES'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className={`w-6 h-6 ${activeNiche === 'SERVICES' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-sm">Serviços & Clínicas</div>
                <div className="text-xs opacity-75">Ex: Pet Shop Amigo Fiel</div>
              </div>
            </button>

            <button
              onClick={() => setActiveNiche('OFFICE')}
              className={`min-h-[56px] p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                activeNiche === 'OFFICE'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className={`w-6 h-6 ${activeNiche === 'OFFICE' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-sm">Escritórios & Contábil</div>
                <div className="text-xs opacity-75">Ex: Prime Contabilidade</div>
              </div>
            </button>
          </div>

          {/* Niche Showcase Card */}
          <div className="bg-[#0D1117] border border-slate-800 rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentNiche.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                {currentNiche.title}
              </h3>
              <p className="text-slate-300 leading-relaxed">
                {currentNiche.description}
              </p>

              <div className="pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Módulos Liberados Automaticamente no Painel:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentNiche.modules.map((mod, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 rounded-lg text-sm text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{mod}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulated WhatsApp Preview */}
            <div className="lg:col-span-5 bg-[#161B22] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">Simulação WhatsApp — Zero-Robô</span>
                </div>
                <span className="text-[11px] text-slate-400">Debounce 4.5s Ativo</span>
              </div>
              <div className="space-y-3">
                {currentNiche.chatSample.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'client'
                        ? 'bg-slate-800 text-slate-200 mr-8 rounded-tl-none'
                        : 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-100 ml-8 rounded-tr-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instant Demo Credentials Section */}
      <section id="demo-logins" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white">Experimente Agora com 1 Clique</h2>
          <p className="mt-3 text-slate-400">
            Já deixamos 4 contas pré-configuradas no banco de dados para você entrar e ver como a interface muda para cada realidade:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Super Admin */}
          <div className="bg-[#161B22] border border-emerald-500/40 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300">
                  SUPER ADMIN
                </span>
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Painel Master (Você)</h3>
              <p className="text-sm text-slate-400 mt-2">
                Visão global de todas as empresas. Libere ou bloqueie módulos (Estoque, Agenda, Contas) em tempo real para qualquer cliente.
              </p>
            </div>
            <button
              onClick={() => onGoToLogin('admin@neoxy.ai')}
              className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
            >
              Entrar como Super Admin
            </button>
          </div>

          {/* Card 2: Ferragens Marlene */}
          <div className="bg-[#161B22] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-500/20 text-amber-300">
                  PERFIL COMÉRCIO
                </span>
                <PackageSearch className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Ferragens Marlene</h3>
              <p className="text-sm text-slate-400 mt-2">
                Painel focado em Catálogo de Produtos, sincronização com planilha Google Sheets (8.004 itens), estoque e demandas perdidas.
              </p>
            </div>
            <button
              onClick={() => onGoToLogin('contato@ferragensmarlene.com.br')}
              className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              Entrar como Ferragens
            </button>
          </div>

          {/* Card 3: Pet Shop */}
          <div className="bg-[#161B22] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 text-xs font-bold rounded bg-cyan-500/20 text-cyan-300">
                  PERFIL SERVIÇOS
                </span>
                <Calendar className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Pet Shop Amigo Fiel</h3>
              <p className="text-sm text-slate-400 mt-2">
                Habilita Catálogo de Serviços (Banho & Tosa, Consultas) + Agenda de Horários + Produtos Pet.
              </p>
            </div>
            <button
              onClick={() => onGoToLogin('contato@petshopamigofiel.com.br')}
              className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              Entrar como Pet Shop
            </button>
          </div>

          {/* Card 4: Escritório Contábil */}
          <div className="bg-[#161B22] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 text-xs font-bold rounded bg-purple-500/20 text-purple-300">
                  PERFIL ESCRITÓRIO
                </span>
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Prime Contabilidade</h3>
              <p className="text-sm text-slate-400 mt-2">
                Habilita Recebimento de Contas/Boletos e Notas Fiscais pelo WhatsApp + Agenda de Reuniões Executivas.
              </p>
            </div>
            <button
              onClick={() => onGoToLogin('contato@primecontabil.com.br')}
              className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              Entrar como Escritório
            </button>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section id="arquitetura" className="py-16 border-t border-slate-800/60 bg-[#161B22]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#0D1117] border border-slate-800">
            <Zap className="w-7 h-7 text-emerald-400 mb-3" />
            <h4 className="font-bold text-white text-lg">Alta Concorrência & Debounce</h4>
            <p className="text-sm text-slate-400 mt-2">
              Agrupa rajadas de mensagens picadas do cliente em uma janela inteligente de 4.5s antes de acionar o Gemini 2.5 Flash.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#0D1117] border border-slate-800">
            <Clock className="w-7 h-7 text-emerald-400 mb-3" />
            <h4 className="font-bold text-white text-lg">Horários & Feriados por Loja</h4>
            <p className="text-sm text-slate-400 mt-2">
              Cálculo automático de fuso horário, intervalos de almoço e feriados locais. O bot sabe exatamente se a loja está aberta ou fechada.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#0D1117] border border-slate-800">
            <ShieldCheck className="w-7 h-7 text-emerald-400 mb-3" />
            <h4 className="font-bold text-white text-lg">Isolamento Multi-Tenant</h4>
            <p className="text-sm text-slate-400 mt-2">
              Cada empresa possui seu próprio catálogo, sessão da Evolution API, regras de desconto e módulos liberados sob medida.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-auto py-8 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Neoxy.ai SaaS Platform © 2026 — Arquitetura Multi-Tenant Escalável com Gemini 2.5 Flash & Evolution API
      </footer>
    </div>
  );
}
