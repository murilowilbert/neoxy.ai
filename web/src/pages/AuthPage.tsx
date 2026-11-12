import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Mail, Building2, User, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F6F8FA] text-[#111827] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <button
          onClick={onBackToLanding}
          className="min-h-[40px] inline-flex items-center gap-2 text-sm text-[#4B5563] hover:text-[#111827] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a apresentação</span>
        </button>

        <div className="mb-6">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold tracking-tight text-[#111827]">neoxy</span>
            <span className="text-xs font-semibold text-[#0F4C81] bg-[#0F4C81]/10 px-1.5 py-0.5 rounded">
              .ai
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">
            {mode === 'login' ? 'Entrar no painel operacional' : 'Cadastrar nova empresa'}
          </h1>
          <p className="text-sm text-[#4B5563] mt-1">
            {mode === 'login'
              ? 'Gerencie horários, catálogo, agenda, documentos e conversas do WhatsApp.'
              : 'Escolha o ramo da empresa para habilitar os módulos correspondentes.'}
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white border border-[#C4CDD8] p-6 sm:p-8 rounded">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EDF1F5] rounded border border-[#DCE2EA] mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`min-h-[38px] text-sm font-semibold rounded transition-colors ${
                mode === 'login'
                  ? 'bg-white text-[#111827] border border-[#C4CDD8]'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Acessar conta existente
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`min-h-[38px] text-sm font-semibold rounded transition-colors ${
                mode === 'register'
                  ? 'bg-white text-[#111827] border border-[#C4CDD8]'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Criar conta empresarial
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">
                    Nome do responsável
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Ex: Murilo Wilbert"
                      className="w-full min-h-[42px] pl-10 pr-4 py-2 bg-[#F6F8FA] border border-[#C4CDD8] rounded text-sm text-[#111827] focus:outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">
                    Nome comercial do estabelecimento
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Ex: Ferragens Central ou Clínica Vida"
                      className="w-full min-h-[42px] pl-10 pr-4 py-2 bg-[#F6F8FA] border border-[#C4CDD8] rounded text-sm text-[#111827] focus:outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">
                    Perfil de operação (define os módulos do painel)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'RETAIL', label: 'Comércio & Estoque', desc: 'Produtos, planilha e preços' },
                      { id: 'SERVICES', label: 'Serviços & Agenda', desc: 'Procedimentos e horários' },
                      { id: 'OFFICE', label: 'Escritório & Contas', desc: 'Boletos, notas e reuniões' },
                      { id: 'HYBRID', label: 'Operação Completa', desc: 'Todos os módulos habilitados' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setBusinessType(type.id as any)}
                        className={`p-3 rounded border text-left transition-colors ${
                          businessType === type.id
                            ? 'bg-[#0F4C81]/10 border-[#0F4C81] text-[#111827]'
                            : 'bg-[#F6F8FA] border-[#DCE2EA] text-[#4B5563] hover:text-[#111827]'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{type.label}</span>
                          {businessType === type.id && <span className="w-2 h-2 rounded-full bg-[#0F4C81]" />}
                        </div>
                        <div className="text-[11px] text-[#4B5563] mt-0.5">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">
                E-mail de acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="w-full min-h-[42px] pl-10 pr-4 py-2 bg-[#F6F8FA] border border-[#C4CDD8] rounded text-sm text-[#111827] focus:outline-none focus:border-[#0F4C81]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[42px] pl-10 pr-4 py-2 bg-[#F6F8FA] border border-[#C4CDD8] rounded text-sm text-[#111827] focus:outline-none focus:border-[#0F4C81]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded bg-[#0F4C81] hover:bg-[#0B3961] disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {loading
                ? 'Validando credenciais...'
                : mode === 'login'
                ? 'Entrar no painel'
                : 'Concluir cadastro e abrir painel'}
            </button>
          </form>

          {/* Quick Demo Credentials List */}
          {mode === 'login' && (
            <div className="mt-6 pt-6 border-t border-[#DCE2EA]">
              <div className="text-xs font-medium text-[#4B5563] mb-3">
                Contas demonstrativas pré-configuradas (senha padrão: <strong className="text-[#111827]">neoxy123</strong>):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('admin@neoxy.ai')}
                  className="px-3 py-2 text-xs rounded border border-[#C4CDD8] bg-[#F6F8FA] hover:bg-[#EDF1F5] text-left transition-colors"
                >
                  <div className="font-bold text-[#111827]">Painel Master (Super Admin)</div>
                  <div className="text-[11px] text-[#4B5563]">admin@neoxy.ai</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('contato@ferragensmarlene.com.br')}
                  className="px-3 py-2 text-xs rounded border border-[#DCE2EA] bg-[#F6F8FA] hover:bg-[#EDF1F5] text-left transition-colors"
                >
                  <div className="font-bold text-[#111827]">Ferragens Marlene (Varejo)</div>
                  <div className="text-[11px] text-[#4B5563]">contato@ferragensmarlene.com.br</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('contato@petshopamigofiel.com.br')}
                  className="px-3 py-2 text-xs rounded border border-[#DCE2EA] bg-[#F6F8FA] hover:bg-[#EDF1F5] text-left transition-colors"
                >
                  <div className="font-bold text-[#111827]">Pet Shop Amigo Fiel (Serviços)</div>
                  <div className="text-[11px] text-[#4B5563]">contato@petshopamigofiel.com.br</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('contato@primecontabil.com.br')}
                  className="px-3 py-2 text-xs rounded border border-[#DCE2EA] bg-[#F6F8FA] hover:bg-[#EDF1F5] text-left transition-colors"
                >
                  <div className="font-bold text-[#111827]">Prime Contabilidade (Escritório)</div>
                  <div className="text-[11px] text-[#4B5563]">contato@primecontabil.com.br</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
