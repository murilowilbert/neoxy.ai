import React from 'react';
import { ArrowUpRight, Calendar, Package, MessageSquare } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToRegister
}) => {
  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between transition-colors">
      {/* Navegação Minimalista */}
      <header className="w-full border-b border-[var(--nx-border)] bg-[var(--nx-surface)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[var(--nx-primary)] text-white flex items-center justify-center font-bold text-xs">
              NX
            </div>
            <span className="font-bold text-base tracking-tight text-[var(--nx-text)]">
              Neoxy.ai
            </span>
          </div>

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

      {/* Hero Aberto e Arejado */}
      <main className="flex-1 flex flex-col justify-center">
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

          {/* Fotografia Limpa e Real */}
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
        <section className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]">
          <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
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
      </main>

      {/* Rodapé Limpo */}
      <footer className="border-t border-[var(--nx-border)] bg-[var(--nx-bg)]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--nx-subtle)]">
          <span>Neoxy.ai</span>
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
