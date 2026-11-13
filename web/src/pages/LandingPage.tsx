import React, { useState } from 'react';
import {
  Store,
  Scissors,
  Briefcase,
  MessageSquare,
  Calendar,
  FileText,
  Package,
  Clock,
  Lock,
  Users,
  Terminal,
  QrCode
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

const USE_CASES = [
  {
    id: 'SERVICES',
    tabLabel: 'Serviços, Clínicas & Pet Shop',
    companyName: 'Clínica & Pet Shop Amigo Fiel',
    location: 'Porto Alegre, RS',
    icon: Scissors,
    modules: ['Grade de Serviços & Pacotes', 'Agenda de Horários por Profissional', 'Ordem de Serviço / Voucher QR', 'Lembretes Automáticos WhatsApp'],
    description:
      'Desenhado para prestadores de serviços, clínicas veterinárias, barbearias, estéticas e oficinas. O cliente consulta serviços, verifica janelas livres da equipe e já recebe o comprovante com código de validação.',
    transcript: [
      {
        sender: 'customer',
        time: '09:12',
        text: 'Oi! Queria agendar um banho medicinal + consulta dermatológica pro Thor (Golden, 32kg) amanhã de manhã.'
      },
      {
        sender: 'bot',
        time: '09:12',
        text: 'Bom dia! Para porte Grande (acima de 25kg), o Banho Medicinal (R$ 110,00) + Consulta Dermatológica (R$ 140,00) leva cerca de 1h45. Amanhã temos vaga às 09:00 ou às 10:30 com a Dra. Camila. Qual horário prefere?'
      },
      {
        sender: 'customer',
        time: '09:13',
        text: 'Pode ser às 09:00!'
      },
      {
        sender: 'bot',
        time: '09:13',
        text: 'Confirmado para amanhã às 09:00! Protocolo #OS-4892 gerado. Lembrete: trazer carteira de vacinação atualizada.'
      }
    ],
    systemPayload: {
      intent: 'BOOK_SERVICE_ORDER',
      service: 'Banho Medicinal + Consulta (Porte G)',
      professional: 'Dra. Camila',
      slot: 'Amanhã, 09:00 - 10:45',
      protocol: 'OS-4892',
      status: 'CONFIRMED'
    }
  },
  {
    id: 'RETAIL',
    tabLabel: 'Comércio & Materiais',
    companyName: 'Ferragens Marlene',
    location: 'Canoas, RS',
    icon: Store,
    modules: ['Catálogo & Estoque SKU', 'Cálculo de Orçamento', 'Regras de Entrega por Bairro', 'Pausa para Balconista'],
    description:
      'Para lojas de materiais de construção, autopeças e distribuidoras que recebem dezenas de cotações simultâneas no WhatsApp e precisam consultar saldo físico antes de confirmar o pedido.',
    transcript: [
      {
        sender: 'customer',
        time: '14:22',
        text: 'Boa tarde, vcs têm disco de corte fino 115mm pra inox e cimento CP-II 50kg?'
      },
      {
        sender: 'bot',
        time: '14:22',
        text: 'Boa tarde! Temos os dois em estoque: o Disco Flap/Corte Inox 115mm Norton sai a R$ 12,90 a unidade (85 em estoque) e o Cimento Votoran 50kg CP-II está R$ 38,90 o saco. Quantas unidades você precisa para eu fechar o valor?'
      },
      {
        sender: 'customer',
        time: '14:23',
        text: 'Separa 10 discos e 6 sacos de cimento. Entrega no bairro Mathias Velho?'
      },
      {
        sender: 'bot',
        time: '14:23',
        text: 'Fechado: 10x Disco Inox (R$ 129,00) + 6x Cimento 50kg (R$ 233,40) = R$ 362,40. Como passou de R$ 150,00, a entrega no Mathias Velho é gratuita na rota das 16h.'
      }
    ],
    systemPayload: {
      intent: 'QUOTE_AND_STOCK_CHECK',
      matchedSkus: ['FER-003 (qty: 10)', 'FER-001 (qty: 6)'],
      subtotalBRL: 362.40,
      deliveryFeeBRL: 0.00,
      handoffStatus: 'AUTO_RESOLVED'
    }
  },
  {
    id: 'OFFICE',
    tabLabel: 'Escritórios & Consultorias',
    companyName: 'Prime Contabilidade & Gestão',
    location: 'São Paulo, SP',
    icon: Briefcase,
    modules: ['Recebimento de Contas & PDF', 'Triagem Documental IA', 'Agenda de Reuniões', 'Encaminhamento por Setor'],
    description:
      'Para escritórios contábeis, advocacia, administradoras e clínicas médicas que recebem boletos, notas fiscais e comprovantes pelo WhatsApp e precisam indexar vencimentos sem perda de arquivos.',
    transcript: [
      {
        sender: 'customer',
        time: '11:04',
        text: '[Arquivo anexado: DAS_Outubro_PadariaCentral.pdf] Bom dia, segue a guia paga e o boleto do fornecedor para lançar.'
      },
      {
        sender: 'bot',
        time: '11:04',
        text: 'Bom dia, Sr. Roberto! Recebi o arquivo e já protocolei no setor Fiscal sob o código #DOC-9482 (Guia DAS + Boleto Fornecedor, R$ 1.420,50). Deseja agendar os 15 min de fechamento mensal com o contador?'
      }
    ],
    systemPayload: {
      intent: 'DOCUMENT_INGESTION',
      docType: 'GUIA_FISCAL_E_BOLETO',
      extractedAmountBRL: 1420.50,
      assignedDepartment: 'Fiscal / Contábil',
      status: 'PENDING_REVIEW'
    }
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin, onGoToRegister }) => {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const activeCase = USE_CASES[activeCaseIndex];

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] selection:bg-[var(--nx-primary)] selection:text-white transition-colors">
      {/* Barra superior institucional com ThemeToggle */}
      <header className="sticky top-0 z-30 bg-[var(--nx-surface)] border-b border-[var(--nx-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#topo" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[var(--nx-primary)] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
                NX
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-lg tracking-tight text-[var(--nx-text)]">Neoxy.ai</span>
                <span className="text-xs text-[var(--nx-subtle)] hidden sm:inline tabular-data">v2.5 / Operacional</span>
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--nx-muted)]">
              <a href="#arquitetura" className="hover:text-[var(--nx-text)] transition-colors">
                Módulos para Serviços & Comércio
              </a>
              <a href="#operacao" className="hover:text-[var(--nx-text)] transition-colors">
                Regras de expediente
              </a>
              <a href="#homologacao" className="hover:text-[var(--nx-text)] transition-colors">
                Ambientes de teste
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => onGoToLogin()}
              className="px-3.5 py-2 text-sm font-medium text-[var(--nx-text)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] border border-[var(--nx-border-strong)] rounded-md transition-colors"
            >
              Entrar no sistema
            </button>
            <button
              onClick={onGoToRegister}
              className="nx-btn-primary px-4 py-2 text-sm"
            >
              Cadastrar empresa
            </button>
          </div>
        </div>
      </header>

      {/* HERO WORKBENCH (Assimetria 6/6 com bancada operacional de Serviços na primeira dobra) */}
      <section id="topo" className="py-12 lg:py-20 border-b border-[var(--nx-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Coluna Esquerda: Proposta de Valor Direta */}
            <div className="lg:col-span-6 pt-2 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--nx-accent-bg)] border border-[var(--nx-accent-border)] text-xs font-medium text-[var(--nx-accent)] mb-5">
                <span className="w-2 h-2 rounded-full bg-[var(--nx-accent)]" />
                Foco em Prestadores de Serviços, Clínicas, Pet Shops e Comércio
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[var(--nx-text)] leading-[1.14] mb-5">
                Agendamento inteligente, ordem de serviço com QR Code e atendimento no WhatsApp.
              </h1>

              <p className="text-base sm:text-lg text-[var(--nx-muted)] leading-relaxed mb-8">
                Uma plataforma multi-empresa que adapta o painel ao seu ramo. Cadastre seus serviços com duração e preparo, receba agendamentos sem conflito de horário, emita comprovantes em PDF e assuma a conversa com um clique quando precisar.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
                <button
                  onClick={onGoToRegister}
                  className="nx-btn-primary px-5 py-3 text-sm font-semibold"
                >
                  Criar conta para meu negócio
                </button>
                <a
                  href="#homologacao"
                  className="px-5 py-3 bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-[var(--nx-text)] border border-[var(--nx-border-strong)] text-sm font-medium rounded-md transition-colors text-center"
                >
                  Testar clínica / loja demonstrativa
                </a>
              </div>

              {/* Faixa técnica de especificações operacionais */}
              <div className="grid grid-cols-3 border border-[var(--nx-border)] rounded-lg bg-[var(--nx-surface)] divide-x divide-[var(--nx-border)]">
                <div className="p-3.5">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Grade de agenda</div>
                  <div className="text-sm font-semibold text-[var(--nx-text)] tabular-data">Por serviço e duração</div>
                </div>
                <div className="p-3.5">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Modelos rápidos</div>
                  <div className="text-sm font-semibold text-[var(--nx-text)] tabular-data">Smart Chips + Gaveta</div>
                </div>
                <div className="p-3.5">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Validação no balcão</div>
                  <div className="text-sm font-semibold text-[var(--nx-text)] tabular-data">Protocolo & Voucher PDF</div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Bancada Interativa ao Vivo (Workbench) */}
            <div className="lg:col-span-6 animate-fade-up">
              <div className="bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] rounded-xl overflow-hidden shadow-sm">
                {/* Seletor de Ramo no topo do Workbench */}
                <div className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] px-3 pt-3 flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1">
                    {USE_CASES.map((uc, idx) => {
                      const Icon = uc.icon;
                      const isActive = idx === activeCaseIndex;
                      return (
                        <button
                          key={uc.id}
                          onClick={() => setActiveCaseIndex(idx)}
                          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md border-t border-x transition-colors whitespace-nowrap ${
                            isActive
                              ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] border-[var(--nx-border)] -mb-px pb-2.5'
                              : 'bg-transparent text-[var(--nx-muted)] border-transparent hover:text-[var(--nx-text)]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {uc.tabLabel}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-[var(--nx-subtle)] px-2 hidden sm:inline tabular-data">
                    Simulador ao vivo
                  </span>
                </div>

                {/* Cabeçalho da Empresa Selecionada */}
                <div className="px-4 py-3 border-b border-[var(--nx-border)] flex flex-wrap items-center justify-between gap-2 bg-[var(--nx-surface)]">
                  <div>
                    <div className="text-sm font-semibold text-[var(--nx-text)]">{activeCase.companyName}</div>
                    <div className="text-xs text-[var(--nx-subtle)]">{activeCase.location}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCase.modules.map((mod) => (
                      <span
                        key={mod}
                        className="px-2 py-0.5 text-[11px] font-medium bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)] rounded"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Transcrição real do atendimento no WhatsApp */}
                <div className="p-4 bg-[var(--nx-bg)] space-y-3 border-b border-[var(--nx-border)]">
                  {activeCase.transcript.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[88%] rounded-lg p-3 text-xs leading-relaxed ${
                        msg.sender === 'customer'
                          ? 'bg-[var(--nx-surface)] border border-[var(--nx-border)] text-[var(--nx-text)] self-start'
                          : 'bg-[var(--nx-primary)] text-white self-end ml-auto'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 opacity-75 text-[10px]">
                        <span>{msg.sender === 'customer' ? 'Cliente via WhatsApp' : `Atendimento / ${activeCase.companyName}`}</span>
                        <span className="tabular-data">{msg.time}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Registro estruturado gravado no banco SQLite */}
                <div className="p-4 bg-[var(--nx-surface)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--nx-muted)] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[var(--nx-subtle)]" />
                      Registro estruturado salvo automaticamente no painel
                    </span>
                    <button
                      onClick={() =>
                        onGoToLogin(
                          activeCase.id === 'SERVICES'
                            ? 'contato@petshopamigofiel.com.br'
                            : activeCase.id === 'RETAIL'
                            ? 'contato@ferragensmarlene.com.br'
                            : 'contato@primecontabil.com.br'
                        )
                      }
                      className="text-xs font-medium text-[var(--nx-primary)] hover:underline"
                    >
                      Abrir painel desta empresa
                    </button>
                  </div>
                  <pre className="p-3 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border)] text-[11px] text-[var(--nx-text)] overflow-x-auto leading-relaxed tabular-data">
                    {JSON.stringify(activeCase.systemPayload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE ARQUITETURA POR TIPO DE NEGÓCIO */}
      <section id="arquitetura" className="py-16 border-b border-[var(--nx-border)] bg-[var(--nx-surface)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--nx-text)] mb-3">
              Um sistema que se molda à rotina de serviços, clínicas ou comércio
            </h2>
            <p className="text-sm sm:text-base text-[var(--nx-muted)] leading-relaxed">
              Cada estabelecimento enxerga apenas as ferramentas que fazem sentido para a sua operação diária, com busca instantânea, filtros rápidos, modelos de instruções (*Smart Chips*) e emissão de comprovantes.
            </p>
          </div>

          <div className="border border-[var(--nx-border)] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] text-xs font-semibold text-[var(--nx-muted)]">
                  <th className="py-3.5 px-4">Módulo do Sistema</th>
                  <th className="py-3.5 px-4">Serviços & Clínicas (Pet Shop / Estética)</th>
                  <th className="py-3.5 px-4">Comércio & Varejo (Ferragens)</th>
                  <th className="py-3.5 px-4">Escritório & Consultoria (Contábil)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nx-border)] text-sm bg-[var(--nx-surface)]">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-[var(--nx-text)] flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-[var(--nx-subtle)]" />
                    Tabela de Serviços & Tempo de Execução
                  </td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (com Smart Chips de preparo)</td>
                  <td className="py-3.5 px-4 text-[var(--nx-subtle)]">Oculto por padrão</td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (Honorários / Consultorias)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-[var(--nx-text)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--nx-subtle)]" />
                    Agenda, Check-in & Ordem de Serviço PDF
                  </td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (Voucher QR + Status ao vivo)</td>
                  <td className="py-3.5 px-4 text-[var(--nx-subtle)]">Oculto por padrão</td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (Reuniões com clientes)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-[var(--nx-text)] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[var(--nx-subtle)]" />
                    Catálogo de Produtos & Saldo SKU
                  </td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (Rações, medicamentos e itens)</td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (Principal)</td>
                  <td className="py-3.5 px-4 text-[var(--nx-subtle)]">Oculto por padrão</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-[var(--nx-text)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--nx-subtle)]" />
                    Recebimento de Contas, Boletos & PDFs
                  </td>
                  <td className="py-3.5 px-4 text-[var(--nx-subtle)]">Opcional</td>
                  <td className="py-3.5 px-4 text-[var(--nx-subtle)]">Opcional</td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Ativo (Principal)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-[var(--nx-text)] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[var(--nx-subtle)]" />
                    Inbox WhatsApp & Pausa para Humano
                  </td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Incluso</td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Incluso</td>
                  <td className="py-3.5 px-4 text-[var(--nx-accent)] font-medium">Incluso</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE CONTROLE OPERACIONAL PARA SERVIÇOS E COMÉRCIO */}
      <section id="operacao" className="py-16 border-b border-[var(--nx-border)] bg-[var(--nx-bg)]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-bold text-[var(--nx-text)] mb-3">
                Ferramentas pensadas para quem atende com hora marcada
              </h2>
              <p className="text-sm text-[var(--nx-muted)] leading-relaxed">
                Trouxemos fluxos rápidos de clínicas e prestadores de serviços: modelos de orientação com 1 clique, validação de agendamento no balcão e controle de expediente.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="nx-card-interactive p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-text)] mb-2">
                  <QrCode className="w-4 h-4 text-[var(--nx-primary)]" />
                  Ordem de Serviço & Voucher com Validação
                </div>
                <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                  Cada agendamento gera um protocolo único que pode ser impresso em PDF ou validado na recepção no momento em que o cliente chega ao estabelecimento.
                </p>
              </div>

              <div className="nx-card-interactive p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-text)] mb-2">
                  <Clock className="w-4 h-4 text-[var(--nx-primary)]" />
                  Smart Chips & Gaveta de Instruções Rápidas
                </div>
                <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                  Adicione recomendações pré-atendimento (ex.: jejum, carteira de vacinação, tolerância de atraso ou sinal via PIX) com apenas um clique sem precisar redigitar.
                </p>
              </div>

              <div className="nx-card-interactive p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-text)] mb-2">
                  <Users className="w-4 h-4 text-[var(--nx-primary)]" />
                  Transbordo Imediato para Recepcionista
                </div>
                <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                  Quando o caso exige avaliação técnica ou negociação especial, sua equipe assume a conversa no WhatsApp e o assistente pausa automaticamente por 4 horas.
                </p>
              </div>

              <div className="nx-card-interactive p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-text)] mb-2">
                  <Lock className="w-4 h-4 text-[var(--nx-primary)]" />
                  Isolamento Multi-Tenant e Modo Claro/Escuro
                </div>
                <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                  Cada empresa opera em seu próprio espaço de dados com chave JWT dedicada e alternância instantânea entre modo diurno mineral e modo noturno de alto contraste.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AMBIENTES DE HOMOLOGAÇÃO PRONTOS PARA TESTE */}
      <section id="homologacao" className="py-16 bg-[var(--nx-surface)] border-b border-[var(--nx-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--nx-text)] mb-2">
                Ambientes de demonstração pré-configurados
              </h2>
              <p className="text-sm text-[var(--nx-muted)]">
                Clique em qualquer estabelecimento abaixo para abrir a tela de acesso já preenchida (senha padrão: <code className="px-1.5 py-0.5 bg-[var(--nx-surface-alt)] rounded text-[var(--nx-text)] font-medium">neoxy123</code>).
              </p>
            </div>
          </div>

          <div className="border border-[var(--nx-border)] rounded-lg divide-y divide-[var(--nx-border)] bg-[var(--nx-bg)]">
            {[
              {
                name: 'Pet Shop & Clínica Amigo Fiel (Foco em Serviços)',
                type: 'Perfil Serviços / Grade de Serviços + Agenda + Voucher QR + Estoque',
                email: 'contato@petshopamigofiel.com.br',
                highlight: true
              },
              {
                name: 'Ferragens Marlene',
                type: 'Perfil Varejo / Catálogo SKU + Orçamentos + Entregas',
                email: 'contato@ferragensmarlene.com.br',
                highlight: false
              },
              {
                name: 'Prime Contabilidade & Gestão',
                type: 'Perfil Escritório / Recebimento de Contas/Boletos + Agenda + Serviços',
                email: 'contato@primecontabil.com.br',
                highlight: false
              },
              {
                name: 'Console Super Admin (Neoxy.ai Master)',
                type: 'Controle Global / Liberação de Feature Flags para todos os clientes',
                email: 'admin@neoxy.ai',
                highlight: false
              }
            ].map((demo) => (
              <div
                key={demo.email}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--nx-surface)] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--nx-text)]">{demo.name}</span>
                    {demo.highlight && (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)] rounded">
                        Recomendado para testar Serviços
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--nx-muted)] mt-0.5">{demo.type}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[var(--nx-subtle)] tabular-data">{demo.email}</span>
                  <button
                    onClick={() => onGoToLogin(demo.email)}
                    className="px-3.5 py-1.5 bg-[var(--nx-surface)] hover:bg-[var(--nx-primary)] hover:text-white text-[var(--nx-text)] border border-[var(--nx-border-strong)] rounded-md text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Acessar painel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="py-8 bg-[var(--nx-bg)] text-xs text-[var(--nx-subtle)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--nx-text)]">Neoxy Tecnologia Operacional Ltda.</span>
            <span>|</span>
            <span className="tabular-data">CNPJ 48.921.034/0001-19</span>
          </div>
          <div className="tabular-data">
            Porto Alegre, RS | Plataforma Multi-Tenant v2.5
          </div>
        </div>
      </footer>
    </div>
  );
};
