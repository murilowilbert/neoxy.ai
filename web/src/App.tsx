import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ThemeProvider } from './components/ThemeProvider';
import { apiFetch, getToken, setToken } from './lib/api';

export function App() {
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
      const res = await apiFetch('/api/auth/me');
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
    <ThemeProvider>
      {initializing ? (
        <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-muted)] flex items-center justify-center text-sm font-medium">
          Carregando ambiente operacional Neoxy.ai...
        </div>
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
    </ThemeProvider>
  );
}
