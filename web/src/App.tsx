import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ThemeProvider } from './components/ThemeProvider';
import { LanguageProvider } from './components/LanguageProvider';
import { AppBootSkeleton } from './components/Skeleton';
import { NeoTooltipLayer } from './components/NeoTooltipLayer';
import { useCardSpotlight } from './hooks/useCardSpotlight';
import { apiFetch, getToken, setToken } from './lib/api';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Erro inesperado na interface.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Neoxy UI ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] rounded-xl p-6 space-y-4 shadow-sm">
            <h1 className="text-base font-bold text-[var(--nx-error)]">
              Ocorreu um erro ao renderizar a tela
            </h1>
            <p className="text-xs text-[var(--nx-muted)] break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setToken(null);
                window.location.reload();
              }}
              className="nx-btn-primary w-full py-2.5 text-xs"
            >
              Limpar sessão e recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  useCardSpotlight();
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard'>('landing');
  const [prefillEmail, setPrefillEmail] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [initializing, setInitializing] = useState(true);

  async function restoreSession() {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    try {
      const res = await apiFetch('/api/auth/me', { timeoutMs: 4000 });
      setUser(res.user);
      setTenants(res.tenants || []);
      setView('dashboard');
    } catch {
      setToken(null);
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <NeoTooltipLayer />
        <AppErrorBoundary>
          {initializing ? (
            <AppBootSkeleton />
          ) : view === 'dashboard' && user ? (
            <DashboardPage
              user={user}
              tenants={tenants}
              onLogout={() => {
                setUser(null);
                setTenants([]);
                setView('landing');
              }}
              onRefreshSession={restoreSession}
            />
          ) : view === 'login' || view === 'register' ? (
            <AuthPage
              initialMode={view === 'register' ? 'register' : 'login'}
              prefillEmail={prefillEmail}
              onSuccess={(authData) => {
                setUser(authData.user);
                setTenants(authData.tenants || []);
                setView('dashboard');
              }}
              onBackToLanding={() => setView('landing')}
            />
          ) : (
            <LandingPage
              onGoToLogin={(email) => {
                setPrefillEmail(email || '');
                setView('login');
              }}
              onGoToRegister={() => {
                setPrefillEmail('');
                setView('register');
              }}
            />
          )}
        </AppErrorBoundary>
      </ThemeProvider>
    </LanguageProvider>
  );
}
