import React, { useState, useEffect } from 'react';
import { Bot, ArrowLeft, Lock, Mail, Building2, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch, setToken } from '../lib/api';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  prefillEmail?: string;
  onSuccess: (authData: any) => void;
  onBackToLanding: () => void;
}

export function AuthPage({
  initialMode = 'login',
  prefillEmail = '',
  onSuccess,
  onBackToLanding
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState(prefillEmail || 'admin@neoxy.ai');
  const [password, setPassword] = useState('neoxy123');
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState('');
  const [businessType, setBusinessType] = useState<'RETAIL' | 'SERVICES' | 'OFFICE' | 'HYBRID'>('RETAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      setPassword('neoxy123');
      setMode('login');
    }
  }, [prefillEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setToken(res.token);
        onSuccess(res);
      } else {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            userName,
            email,
            password,
            companyName,
            segment: segment || businessType.toLowerCase(),
            businessType
          })
        });
        setToken(res.token);
        onSuccess(res);
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  }

  function quickFill(demoEmail: string) {
    setMode('login');
    setEmail(demoEmail);
    setPassword('neoxy123');
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onBackToLanding}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para a página inicial
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              {mode === 'login' ? 'Acessar Painel Neoxy.ai' : 'Criar Conta Empresarial'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Entre para gerenciar seu atendimento, estoque, agenda ou documentos.'
                : 'Configure sua empresa e libere os módulos ideais para o seu negócio.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#161B22] border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-8">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0D1117] rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`min-h-[40px] text-sm font-semibold rounded-lg transition-all ${
                mode === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Já tenho conta
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`min-h-[40px] text-sm font-semibold rounded-lg transition-all ${
                mode === 'register' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cadastrar Empresa
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-sm text-red-300">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Seu Nome Completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Ex: Murilo Wilbert"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#0D1117] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Nome do Estabelecimento / Empresa
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Ex: Ótica Visão Clara ou Clínica Sorriso"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#0D1117] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Perfil de Negócio (Define os Módulos do Sistema)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'RETAIL', label: 'Comércio & Estoque', desc: 'Produtos, Planilha, Preços' },
                      { id: 'SERVICES', label: 'Serviços & Agenda', desc: 'Serviços, Horários, Clínica' },
                      { id: 'OFFICE', label: 'Escritório & Contas', desc: 'Boletos, Docs, Reuniões' },
                      { id: 'HYBRID', label: 'Completo (Híbrido)', desc: 'Todos os Módulos Ativos' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setBusinessType(type.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          businessType === type.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-[#0D1117] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          {type.label}
                          {businessType === type.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[11px] opacity-75 mt-0.5">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#0D1117] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#0D1117] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              {loading
                ? 'Autenticando...'
                : mode === 'login'
                ? 'Entrar no Sistema'
                : 'Criar Minha Conta e Acessar Painel'}
            </button>
          </form>

          {/* Quick Demo Logins */}
          {mode === 'login' && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-3">
                ⚡ Preenchimento Rápido de Demonstração (Senha: <code className="text-emerald-400">neoxy123</code>):
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('admin@neoxy.ai')}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-[#0D1117] hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-left"
                >
                  👑 Super Admin (Master)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('contato@ferragensmarlene.com.br')}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-[#0D1117] hover:bg-slate-800 border border-slate-800 text-slate-300 text-left"
                >
                  🛠️ Ferragens Marlene
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('contato@petshopamigofiel.com.br')}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-[#0D1117] hover:bg-slate-800 border border-slate-800 text-slate-300 text-left"
                >
                  🐾 Pet Shop (Serviços)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('contato@primecontabil.com.br')}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-[#0D1117] hover:bg-slate-800 border border-slate-800 text-slate-300 text-left"
                >
                  📄 Escritório Contábil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
