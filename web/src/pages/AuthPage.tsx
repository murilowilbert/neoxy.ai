import React, { useState, useEffect, useId } from 'react';
import { ArrowLeft, AlertCircle, Scissors, Store, Briefcase, Eye, EyeOff } from 'lucide-react';
import { apiFetch, setToken } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  prefillEmail?: string;
  onSuccess: (authData: any) => void;
  onBackToLanding: () => void;
}

const EMAIL_DOMAINS = ['@gmail.com', '@outlook.com', '@hotmail.com', '@clinica.com.br', '@empresa.com.br'];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  prefillEmail = '',
  onSuccess,
  onBackToLanding
}) => {
  const emailId = useId();
  const passwordId = useId();
  const userNameId = useId();
  const companyNameId = useId();
  const segmentId = useId();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState(prefillEmail ? 'neoxy123' : '');
  const [showPass, setShowPass] = useState(false);

  // Campos de Registro
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState('Clínica / Pet Shop / Estética / Serviços');
  const [businessType, setBusinessType] = useState<'SERVICES' | 'RETAIL' | 'OFFICE'>('SERVICES');

  // Validação e Autocomplete
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      setPassword('neoxy123');
      setMode('login');
      setError(null);
    }
  }, [prefillEmail]);

  const atIndex = email.indexOf('@');
  const hasAt = atIndex >= 0;
  const localPart = hasAt ? email.slice(0, atIndex) : email;
  const typedDomain = hasAt ? email.slice(atIndex) : '';

  const emailSuggestions =
    localPart.length > 1 && !EMAIL_DOMAINS.some((d) => email.endsWith(d))
      ? EMAIL_DOMAINS.filter((d) => !hasAt || d.startsWith(typedDomain)).map((d) => localPart + d)
      : [];

  const fieldErrors: Record<string, string> = {};
  if (!email.trim()) {
    fieldErrors.email = 'E-mail é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Informe um e-mail corporativo válido';
  }
  if (!password) {
    fieldErrors.password = 'Senha é obrigatória';
  } else if (password.length < 6) {
    fieldErrors.password = 'Mínimo de 6 caracteres';
  }
  if (mode === 'register') {
    if (!userName.trim()) fieldErrors.userName = 'Informe o nome do responsável';
    if (!companyName.trim()) fieldErrors.companyName = 'Informe o nome do estabelecimento';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, userName: true, companyName: true });
    if (Object.keys(fieldErrors).length > 0) return;

    setError(null);
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
            segment,
            businessType
          })
        });
        setToken(res.token);
        onSuccess(res);
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setMode('login');
    setEmail(demoEmail);
    setPassword('neoxy123');
    setTouched({});
    setError(null);
  }

  function handleSelectBusinessType(type: 'SERVICES' | 'RETAIL' | 'OFFICE') {
    setBusinessType(type);
    if (type === 'SERVICES') setSegment('Clínica / Pet Shop / Estética / Serviços');
    if (type === 'RETAIL') setSegment('Comércio & Materiais de Construção');
    if (type === 'OFFICE') setSegment('Escritório Contábil / Consultoria');
  }

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between px-4 py-3 sm:px-6 sm:py-4 transition-colors">
      {/* Topo compacto com voltar e ThemeToggle */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between shrink-0 animate-fade-down">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para a página inicial
        </button>
        <ThemeToggle />
      </div>

      {/* Cartão Central em 2 Colunas (Tela Única Sem Rolagem) */}
      <div className="max-w-4xl w-full mx-auto my-auto animate-fade-up">
        <div className="bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] rounded-xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* COLUNA ESQUERDA: Marca + Atalhos de Homologação (Login) ou Seleção de Ramo (Criar Conta) */}
          <div className="md:col-span-5 bg-[var(--nx-surface-alt)] border-b md:border-b-0 md:border-r border-[var(--nx-border)] p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-md bg-[var(--nx-primary)] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                  NX
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight text-[var(--nx-text)] block leading-none">
                    Neoxy.ai
                  </span>
                  <span className="text-[11px] text-[var(--nx-subtle)]">
                    Sistema Operacional de Atendimento
                  </span>
                </div>
              </div>
              <p className="text-xs text-[var(--nx-muted)] leading-relaxed">
                {mode === 'login'
                  ? 'Acesse sua bancada para gerenciar agendamentos, ordens de serviço, equipe e atendimento no WhatsApp.'
                  : 'Escolha o perfil do estabelecimento para ativar automaticamente os módulos e regras ideais.'}
              </p>
            </div>

            {mode === 'login' ? (
              <div>
                <div className="text-[11px] font-medium text-[var(--nx-muted)] mb-2">
                  Atalhos de homologação (senha: <code className="tabular-data font-semibold">neoxy123</code>):
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fillDemo('contato@petshopamigofiel.com.br')}
                    className="p-2.5 text-left rounded-md border border-[var(--nx-accent-border)] bg-[var(--nx-accent-bg)] hover:opacity-90 transition-opacity"
                  >
                    <div className="font-semibold text-[var(--nx-accent)] truncate">Clínica & Pet</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Serviços & OS</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('contato@ferragensmarlene.com.br')}
                    className="p-2.5 text-left rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-bg)] transition-colors"
                  >
                    <div className="font-semibold text-[var(--nx-text)] truncate">Ferragens</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Varejo & Estoque</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('contato@primecontabil.com.br')}
                    className="p-2.5 text-left rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-bg)] transition-colors"
                  >
                    <div className="font-semibold text-[var(--nx-text)] truncate">Prime Contábil</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Boletos & Guias</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('admin@neoxy.ai')}
                    className="p-2.5 text-left rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-bg)] transition-colors"
                  >
                    <div className="font-semibold text-[var(--nx-primary)] truncate">Super Admin</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Feature Flags</div>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--nx-primary)] mb-2">
                  1. Selecione o ramo principal
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSelectBusinessType('SERVICES')}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      businessType === 'SERVICES'
                        ? 'border-[var(--nx-primary)] bg-[var(--nx-primary-soft)]'
                        : 'border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--nx-surface)] border border-[var(--nx-border)] flex items-center justify-center text-[var(--nx-primary)] shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--nx-text)]">Serviços & Agenda</div>
                      <div className="text-[11px] text-[var(--nx-muted)] truncate">
                        Clínica, Pet Shop, Estética, Oficina
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectBusinessType('RETAIL')}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      businessType === 'RETAIL'
                        ? 'border-[var(--nx-primary)] bg-[var(--nx-primary-soft)]'
                        : 'border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--nx-surface)] border border-[var(--nx-border)] flex items-center justify-center text-[var(--nx-primary)] shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--nx-text)]">Comércio & Varejo</div>
                      <div className="text-[11px] text-[var(--nx-muted)] truncate">
                        Ferragens, Lojas, Catálogo & Estoque
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectBusinessType('OFFICE')}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      businessType === 'OFFICE'
                        ? 'border-[var(--nx-primary)] bg-[var(--nx-primary-soft)]'
                        : 'border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--nx-surface)] border border-[var(--nx-border)] flex items-center justify-center text-[var(--nx-primary)] shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--nx-text)]">Escritório & Consultoria</div>
                      <div className="text-[11px] text-[var(--nx-muted)] truncate">
                        Contábil, Boletos & Documentos
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: Seletor de Modo + Formulário Compacto */}
          <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--nx-border)]">
              <div>
                <h1 className="text-lg font-bold text-[var(--nx-text)] leading-tight">
                  {mode === 'login' ? 'Acesso ao painel operacional' : 'Cadastrar estabelecimento'}
                </h1>
                <p className="text-xs text-[var(--nx-muted)] mt-0.5">
                  {mode === 'login'
                    ? 'Informe seu e-mail corporativo e senha para entrar.'
                    : 'Preencha os dados abaixo para criar sua conta.'}
                </p>
              </div>

              <div className="flex rounded-md border border-[var(--nx-border-strong)] p-0.5 bg-[var(--nx-bg)] text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setTouched({});
                  }}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    mode === 'login'
                      ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setTouched({});
                  }}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    mode === 'register'
                      ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  Criar conta
                </button>
              </div>
            </div>

            {error && (
              <div className="nx-api-error mb-3 max-h-24 overflow-y-auto text-xs" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-1">
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="nx-field">
                      <input
                        id={userNameId}
                        type="text"
                        placeholder=" "
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, userName: true }))}
                        className={touched.userName && fieldErrors.userName ? 'has-error' : ''}
                        disabled={loading}
                      />
                      <label htmlFor={userNameId}>Seu nome completo</label>
                      {touched.userName && fieldErrors.userName && (
                        <p className="nx-field-error">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {fieldErrors.userName}
                        </p>
                      )}
                    </div>

                    <div className="nx-field">
                      <input
                        id={companyNameId}
                        type="text"
                        placeholder=" "
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, companyName: true }))}
                        className={touched.companyName && fieldErrors.companyName ? 'has-error' : ''}
                        disabled={loading}
                      />
                      <label htmlFor={companyNameId}>Nome do estabelecimento</label>
                      {touched.companyName && fieldErrors.companyName && (
                        <p className="nx-field-error">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {fieldErrors.companyName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="nx-field">
                    <input
                      id={segmentId}
                      type="text"
                      placeholder=" "
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      disabled={loading}
                    />
                    <label htmlFor={segmentId}>Especialidade ou segmento</label>
                  </div>
                </>
              )}

              <div className={mode === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
                {/* Campo E-mail com Floating Label + Autocomplete de Domínios */}
                <div className="nx-field">
                  <input
                    id={emailId}
                    type="email"
                    placeholder=" "
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setShowEmailSuggestions(true);
                      setError(null);
                    }}
                    onFocus={() => setShowEmailSuggestions(true)}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, email: true }));
                      setTimeout(() => setShowEmailSuggestions(false), 150);
                    }}
                    className={touched.email && fieldErrors.email ? 'has-error' : ''}
                    disabled={loading}
                  />
                  <label htmlFor={emailId}>E-mail corporativo</label>

                  {showEmailSuggestions && emailSuggestions.length > 0 && (
                    <ul className="nx-email-suggestions">
                      {emailSuggestions.map((suggestion) => (
                        <li key={suggestion}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEmail(suggestion);
                              setShowEmailSuggestions(false);
                            }}
                          >
                            <span className="font-semibold text-[var(--nx-text)]">{localPart}</span>
                            <span className="text-[var(--nx-muted)]">{suggestion.slice(localPart.length)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {touched.email && fieldErrors.email && (
                    <p className="nx-field-error">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Campo Senha com Floating Label + Mostrar/Ocultar Senha */}
                <div className="nx-field">
                  <input
                    id={passwordId}
                    type={showPass ? 'text' : 'password'}
                    placeholder=" "
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    className={touched.password && fieldErrors.password ? 'has-error' : ''}
                    style={{ paddingRight: '42px' }}
                    disabled={loading}
                  />
                  <label htmlFor={passwordId}>Senha de acesso</label>
                  <button
                    type="button"
                    className="nx-field-suffix"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {touched.password && fieldErrors.password && (
                    <p className="nx-field-error">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="nx-btn-primary w-full py-2.5 px-4 text-sm mt-1"
              >
                {loading ? (
                  <>
                    <span className="nx-spinner" aria-hidden="true" />
                    Autenticando...
                  </>
                ) : mode === 'login' ? (
                  'Entrar no sistema'
                ) : (
                  'Criar conta e abrir painel'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Rodapé discreto */}
      <div className="max-w-4xl w-full mx-auto text-center text-[11px] text-[var(--nx-subtle)] shrink-0">
        Sessão protegida via JWT / Isolamento Multi-Tenant ativo
      </div>
    </div>
  );
};
