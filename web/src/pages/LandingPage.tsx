import React, { useState } from 'react';
import {
  Store,
  Stethoscope,
  Briefcase,
  Clock,
  FileText,
  Calendar,
  PackageSearch,
  Lock,
  MessageSquare,
  Sliders
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

export function LandingPage({ onGoToLogin, onGoToRegister }: LandingPageProps) {
  const [activeNiche, setActiveNiche] = useState<'RETAIL' | 'SERVICES' | 'OFFICE'>('RETAIL');

  const nicheExamples = {
    RETAIL: {
      company: 'Ferragens Marlene — Igrejinha, RS',
      profileLabel: 'Comércio & Estoque',
      summary: 'Integra planilhas com milhares de itens (Google Sheets ou banco local), responde preços exatos em linguagem de balcão e separa mercadorias para retirada.',
      activeModules: ['Catálogo & Estoque (8.004 itens)', 'Leitura de Peças por Foto', 'Registro de Demanda Perdida', 'Transbordo para Balcão'],
      chatSample: [
        { role: 'client', time: '09:14', text: 'Bom dia, vocês têm ducha Lorenzetti 220V à pronta entrega?' },
        { role: 'bot', time: '09:14', text: 'Bom dia! Tudo bem? Temos sim. Aqui na loja trabalhamos com a *Ducha Elétrica Lorenzetti Advanced Multitemperaturas 220V* por *R$ 159,90*.' },
        { role: 'bot', time: '09:15', text: 'Quer que eu peça pro pessoal separar uma no balcão pra você passar retirar?' }
      ]
    },
    SERVICES: {
      company: 'Pet Shop Amigo Fiel — Centro',
      profileLabel: 'Serviços & Clínica',
      summary: 'Apresenta procedimentos com tempo de duração, consulta horários vagos na agenda do estabelecimento e confirma marcações sem intervenção manual.',
      activeModules: ['Catálogo de Procedimentos & Tempo', 'Agenda de Horários Integrada', 'Estoque de Produtos Pet', 'Pausa Automática para Veterinário'],
      chatSample: [
        { role: 'client', time: '14:20', text: 'Oi, queria marcar um banho e tosa pro meu Golden amanhã de tarde.' },
        { role: 'bot', time: '14:20', text: 'Olá! Claro, vamos agendar. O nosso *Banho & Tosa Higiênica* tem duração média de 60 minutos e custa *R$ 75,00*.' },
        { role: 'bot', time: '14:21', text: 'Para amanhã temos horário livre às *14:30* ou às *16:00*. Qual fica melhor para você?' }
      ]
    },
    OFFICE: {
      company: 'Prime Contabilidade & Consultoria',
      profileLabel: 'Escritório & Contas',
      summary: 'Recebe boletos, notas fiscais e comprovantes enviados pelos clientes no WhatsApp, extrai vencimento e valor automaticamente e organiza no painel financeiro.',
      activeModules: ['Protocolo de Boletos & Notas Fiscais', 'Extração de Vencimento e Valor', 'Agenda de Reuniões Executivas', 'Triagem Societária e Fiscal'],
      chatSample: [
        { role: 'client', time: '16:02', text: '[Arquivo enviado] Segue o boleto de energia elétrica da matriz para conciliação.' },
        { role: 'bot', time: '16:02', text: 'Recebido, Roberto! Identifiquei o *Boleto de Energia Elétrica* com vencimento em *20/11/2026* no valor de *R$ 1.485,40*.' },
        { role: 'bot', time: '16:03', text: 'Já protocolei no nosso controle financeiro para conferência e baixa. Precisa de mais alguma guia hoje?' }
      ]
    }
  };

  const currentNiche = nicheExamples[activeNiche];

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#111827] flex flex-col">
      {/* Top Header — Solid surface, crisp 1px border */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE2EA]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-7">
            <a href="#" className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-[#111827]">neoxy</span>
              <span className="text-xs font-semibold text-[#0F4C81] bg-[#0F4C81]/10 px-1.5 py-0.5 rounded">
                .ai
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm text-[#4B5563]">
              <a href="#operacao" className="hover:text-[#111827] transition-colors">Arquitetura operacional</a>
              <a href="#acesso-demo" className="hover:text-[#111827] transition-colors">Contas demonstrativas</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onGoToLogin()}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#EDF1F5] rounded transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={onGoToRegister}
              className="min-h-[40px] px-4 py-2 text-sm font-semibold bg-[#0F4C81] hover:bg-[#0B3961] text-white rounded transition-colors"
            >
              Cadastrar empresa
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section — Asymmetric 12-column Workbench Layout */}
      <section className="border-b border-[#DCE2EA] py-12 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Column (6 cols): Editorial Statement & Actions */}
            <div className="lg:col-span-6 space-y-6 pt-2">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#4B5563] bg-[#F6F8FA] border border-[#DCE2EA] px-3 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-[#166534]" />
                <span>Sistema multi-empresa para operação via WhatsApp</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111827] leading-[1.12]">
                Atendimento de balcão, agenda e contas que se adapta à realidade da sua empresa.
              </h1>

              <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed">
                Uma loja de ferragens precisa consultar 8.000 itens na planilha. Uma clínica precisa marcar horários. Um escritório contábil precisa receber boletos e notas fiscais. O Neoxy.ai libera exatamente as ferramentas que o seu ramo exige.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={onGoToRegister}
                  className="min-h-[46px] px-6 py-3 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm transition-colors"
                >
                  Criar conta para minha empresa
                </button>
                <a
                  href="#acesso-demo"
                  className="min-h-[46px] px-5 py-3 rounded bg-[#F6F8FA] hover:bg-[#EDF1F5] text-[#111827] border border-[#DCE2EA] font-medium text-sm transition-colors inline-flex items-center"
                >
                  Testar contas demonstrativas
                </a>
              </div>

              {/* Operational Facts Strip */}
              <div className="pt-6 border-t border-[#DCE2EA] grid grid-cols-3 gap-4">
                <div>
                  <div className="tabular-data text-xl font-bold text-[#111827]">4,5 seg</div>
                  <div className="text-xs text-[#4B5563] mt-0.5">Janela de agrupamento de mensagens</div>
                </div>
                <div>
                  <div className="tabular-data text-xl font-bold text-[#111827]">8.004</div>
                  <div className="text-xs text-[#4B5563] mt-0.5">Produtos indexados na loja piloto</div>
                </div>
                <div>
                  <div className="tabular-data text-xl font-bold text-[#111827]">Multi-Loja</div>
                  <div className="text-xs text-[#4B5563] mt-0.5">Isolamento de dados por empresa</div>
                </div>
              </div>
            </div>

            {/* Right Column (6 cols): Interactive Workbench Artifact */}
            <div className="lg:col-span-6 bg-white border border-[#C4CDD8] rounded overflow-hidden">
              {/* Niche Switcher Bar */}
              <div className="bg-[#EDF1F5] border-b border-[#DCE2EA] p-2 grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setActiveNiche('RETAIL')}
                  className={`min-h-[40px] px-3 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    activeNiche === 'RETAIL'
                      ? 'bg-white text-[#111827] border border-[#C4CDD8]'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Varejo & Estoque</span>
                </button>
                <button
                  onClick={() => setActiveNiche('SERVICES')}
                  className={`min-h-[40px] px-3 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    activeNiche === 'SERVICES'
                      ? 'bg-white text-[#111827] border border-[#C4CDD8]'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Serviços & Agenda</span>
                </button>
                <button
                  onClick={() => setActiveNiche('OFFICE')}
                  className={`min-h-[40px] px-3 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    activeNiche === 'OFFICE'
                      ? 'bg-white text-[#111827] border border-[#C4CDD8]'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Escritório & Contas</span>
                </button>
              </div>

              {/* Active Niche Header */}
              <div className="p-5 border-b border-[#DCE2EA] flex items-center justify-between bg-[#F6F8FA]">
                <div>
                  <div className="text-xs text-[#4B5563]">Estabelecimento em foco</div>
                  <div className="text-base font-bold text-[#111827]">{currentNiche.company}</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-[#0F4C81]/10 text-[#0F4C81] font-semibold">
                  {currentNiche.profileLabel}
                </span>
              </div>

              {/* Simulated Conversation Transcript */}
              <div className="p-5 space-y-3 bg-[#F6F8FA]/50">
                {currentNiche.chatSample.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded text-sm leading-relaxed border ${
                      msg.role === 'client'
                        ? 'bg-white border-[#DCE2EA] text-[#111827] mr-10'
                        : 'bg-[#EBF5EE] border-[#BBDAC4] text-[#112A1A] ml-10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#4B5563] mb-1">
                      <span className="font-semibold">
                        {msg.role === 'client' ? 'Cliente no WhatsApp' : 'Atendimento Neoxy.ai'}
                      </span>
                      <span className="tabular-data">{msg.time}</span>
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))}
              </div>

              {/* Enabled Modules Footer inside Artifact */}
              <div className="p-5 bg-white border-t border-[#DCE2EA]">
                <div className="text-xs font-semibold text-[#4B5563] mb-2.5">
                  Funções habilitadas automaticamente no painel para este perfil:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentNiche.activeModules.map((mod, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#111827] bg-[#F6F8FA] border border-[#DCE2EA] px-3 py-2 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#166534] shrink-0" />
                      <span>{mod}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Instant Demo Access Table / Ledger */}
      <section id="acesso-demo" className="py-16 border-b border-[#DCE2EA] bg-[#F6F8FA]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827]">
              Experimente os perfis de empresas configurados
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#4B5563]">
              Selecione qualquer uma das quatro contas abaixo para entrar no sistema e verificar como a barra lateral e as telas se adaptam a cada ramo de atividade.
            </p>
          </div>

          <div className="border border-[#C4CDD8] rounded divide-y divide-[#DCE2EA] bg-white">
            {/* Row 1: Super Admin */}
            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-[#0F4C81]" />
                  <h3 className="font-bold text-base text-[#111827]">Painel Master — Administração Global (Você)</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#0F4C81]/10 text-[#0F4C81] font-semibold">
                    SUPER_ADMIN
                  </span>
                </div>
                <p className="text-sm text-[#4B5563]">
                  Gerencia todas as empresas cadastradas e permite ligar ou desligar módulos (Estoque, Serviços, Agenda, Contas) individualmente para qualquer cliente.
                </p>
                <div className="text-xs text-[#6B7280]">Acesso: admin@neoxy.ai</div>
              </div>
              <button
                onClick={() => onGoToLogin('admin@neoxy.ai')}
                className="min-h-[42px] px-5 py-2.5 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm shrink-0 transition-colors"
              >
                Entrar como Administrador
              </button>
            </div>

            {/* Row 2: Ferragens Marlene */}
            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F6F8FA]/50">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <PackageSearch className="w-4 h-4 text-[#166534]" />
                  <h3 className="font-bold text-base text-[#111827]">Ferragens Marlene (Piloto)</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#166534]/10 text-[#166534] font-semibold">
                    VAREJO / ESTOQUE
                  </span>
                </div>
                <p className="text-sm text-[#4B5563]">
                  Painel voltado para comércio: cadastro de itens específicos, sincronização com planilha Google Sheets de 8.004 produtos e relatório de demandas perdidas.
                </p>
                <div className="text-xs text-[#6B7280]">Acesso: contato@ferragensmarlene.com.br</div>
              </div>
              <button
                onClick={() => onGoToLogin('contato@ferragensmarlene.com.br')}
                className="min-h-[42px] px-5 py-2.5 rounded bg-white hover:bg-[#EDF1F5] text-[#111827] border border-[#C4CDD8] font-semibold text-sm shrink-0 transition-colors"
              >
                Abrir painel Ferragens
              </button>
            </div>

            {/* Row 3: Pet Shop */}
            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#166534]" />
                  <h3 className="font-bold text-base text-[#111827]">Pet Shop Amigo Fiel</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#166534]/10 text-[#166534] font-semibold">
                    SERVIÇOS & AGENDA
                  </span>
                </div>
                <p className="text-sm text-[#4B5563]">
                  Habilita catálogo de serviços (Banho & Tosa, Consultas Veterinárias com tempo de duração), agenda de compromissos e produtos pet.
                </p>
                <div className="text-xs text-[#6B7280]">Acesso: contato@petshopamigofiel.com.br</div>
              </div>
              <button
                onClick={() => onGoToLogin('contato@petshopamigofiel.com.br')}
                className="min-h-[42px] px-5 py-2.5 rounded bg-white hover:bg-[#EDF1F5] text-[#111827] border border-[#C4CDD8] font-semibold text-sm shrink-0 transition-colors"
              >
                Abrir painel Pet Shop
              </button>
            </div>

            {/* Row 4: Escritório Contábil */}
            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F6F8FA]/50">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#166534]" />
                  <h3 className="font-bold text-base text-[#111827]">Prime Contabilidade & Consultoria</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#166534]/10 text-[#166534] font-semibold">
                    ESCRITÓRIO & CONTAS
                  </span>
                </div>
                <p className="text-sm text-[#4B5563]">
                  Habilita protocolo de boletos, contas a pagar, notas fiscais e comprovantes recebidos no WhatsApp, além de agenda de reuniões.
                </p>
                <div className="text-xs text-[#6B7280]">Acesso: contato@primecontabil.com.br</div>
              </div>
              <button
                onClick={() => onGoToLogin('contato@primecontabil.com.br')}
                className="min-h-[42px] px-5 py-2.5 rounded bg-white hover:bg-[#EDF1F5] text-[#111827] border border-[#C4CDD8] font-semibold text-sm shrink-0 transition-colors"
              >
                Abrir painel Escritório
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Technical Architecture & Operational Guarantees */}
      <section id="operacao" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl font-bold text-[#111827]">
              Engenharia pensada para operação real no dia a dia
            </h2>
            <p className="mt-2 text-sm text-[#4B5563]">
              Construído sobre Node.js, Evolution API v2, fila com janela de agrupamento e Gemini 2.5 Flash para manter custo de servidor baixo e resposta imediata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#C4CDD8] rounded bg-[#F6F8FA] divide-y md:divide-y-0 md:divide-x divide-[#DCE2EA]">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                <MessageSquare className="w-4 h-4 text-[#0F4C81]" />
                <span>Agrupamento de mensagens (Debounce)</span>
              </div>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Clientes no WhatsApp costumam mandar três ou quatro frases seguidas. O sistema aguarda 4,5 segundos, junta tudo em um único raciocínio e responde de uma só vez.
              </p>
            </div>

            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                <Clock className="w-4 h-4 text-[#0F4C81]" />
                <span>Horário comercial e feriados por loja</span>
              </div>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Cada empresa configura seu expediente de segunda a domingo e datas de feriado. A IA sabe se a loja está aberta ou fechada no exato minuto da conversa.
              </p>
            </div>

            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                <Sliders className="w-4 h-4 text-[#0F4C81]" />
                <span>Transbordo humano sem atrito</span>
              </div>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Quando o cliente pede desconto especial, encomenda ou quer fechar pedido no balcão, a IA transfere a conversa e fica em silêncio enquanto sua equipe atende.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto py-8 border-t border-[#DCE2EA] bg-[#F6F8FA]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4B5563]">
          <div>Neoxy.ai — Plataforma Multi-Tenant de Atendimento e Gestão Operacional</div>
          <div>Evolution API v2 + Gemini 2.5 Flash</div>
        </div>
      </footer>
    </div>
  );
}
