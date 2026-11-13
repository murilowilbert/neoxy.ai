import React, { useState, useEffect, useId } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Scissors,
  Store,
  Briefcase,
  Layers,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiFetch, setToken } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  prefillEmail?: string;
  onSuccess: (authData: any) => void;
  onBackToLanding: () => void;
}

interface AuthSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  imageUrl: string;
}

const FALLBACK_SLIDES: AuthSlide[] = [
  {
    id: 'fallback-1',
    title: 'Agenda & Ordens de Serviço em 4 Etapas',
    subtitle: 'Do check-in na recepção ao aviso automático de Pronto para Retirada no WhatsApp.',
    badge: 'Destaque Serviços',
    imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fallback-2',
    title: 'Gestão de Equipe, Portes e Comissões',
    subtitle: 'Tabela de preços por porte ou complexidade com cálculo automático de repasse.',
    badge: 'Novo Recurso',
    imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fallback-3',
    title: 'Atendimento Humanizado 24h no WhatsApp',
    subtitle: 'Consulta de estoque, agendamento inteligente e transbordo humano em 1 clique.',
    badge: 'Plataforma Neoxy',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'
  }
];

const BUSINESS_PROFILES = [
  {
    type: 'SERVICES' as const,
    title: 'Serviços & Agenda',
    desc: 'Clínica, Pet, Estética, Oficina',
    segment: 'Clínica / Pet Shop / Estética / Serviços',
    icon: Scissors
  },
  {
    type: 'RETAIL' as const,
    title: 'Comércio & Varejo',
    desc: 'Ferragens, Lojas, Estoque',
    segment: 'Comércio & Materiais de Construção',
    icon: Store
  },
  {
    type: 'OFFICE' as const,
    title: 'Escritório & Contábil',
    desc: 'Boletos, Guias, Documentos',
    segment: 'Escritório Contábil / Consultoria',
    icon: Briefcase
  },
  {
    type: 'HYBRID' as const,
    title: 'Operação Completa',
    desc: 'Produtos + Serviços + Agenda',
    segment: 'Operação Mista (Varejo e Serviços)',
    icon: Layers
  }
];

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

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState(prefillEmail ? 'neoxy123' : '');
  const [showPass, setShowPass] = useState(false);

  // Campos de Registro
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState('Clínica / Pet Shop / Estética / Serviços');
  const [businessType, setBusinessType] = useState<'SERVICES' | 'RETAIL' | 'OFFICE' | 'HYBRID'>('SERVICES');

  // Carrossel de Imagens gerenciado pelo Super Admin
  const [slides, setSlides] = useState<AuthSlide[]>(FALLBACK_SLIDES);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Validação e Autocomplete
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/public/auth-slides')
      .then((res) => {
        if (Array.isArray(res.slides) && res.slides.length > 0) {
          setSlides(res.slides);
        }
      })
      .catch(() => {
        // Mantém fallback local silenciosamente
      });
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

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

  function handleSelectProfile(profile: (typeof BUSINESS_PROFILES)[number]) {
    setBusinessType(profile.type);
    setSegment(profile.segment);
  }

  const currentSlide = slides[activeSlideIdx % slides.length] || FALLBACK_SLIDES[0];
  const activeProfile = BUSINESS_PROFILES.find((p) => p.type === businessType) || BUSINESS_PROFILES[0];

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between px-4 py-3 sm:px-8 sm:py-5 transition-colors">
      {/* Topo discreto com Voltar e ThemeToggle */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between shrink-0 animate-fade-down">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para a página inicial
        </button>
        <ThemeToggle />
      </div>

      {/* Cartão Centralizado Amplo em 2 Colunas (Tela Única Sem Rolagem) */}
      <div className="max-w-5xl w-full mx-auto my-auto animate-fade-up">
        <div className="bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12 md:h-[580px]">
          {/* COLUNA ESQUERDA: Carrossel de Imagens / Promoções gerenciado pelo Admin */}
          <div className="md:col-span-6 relative min-h-[240px] md:h-full bg-[#0D1117] overflow-hidden flex flex-col justify-between">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === activeSlideIdx % slides.length ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(13,17,23,0.45) 0%, rgba(13,17,23,0.18) 45%, rgba(13,17,23,0.88) 100%)'
                  }}
                />
              </div>
            ))}

            {/* Marca no topo da vitrine */}
            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[var(--nx-primary)] text-white flex items-center justify-center font-bold text-xs shadow-md">
                  NX
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight text-white block leading-none">
                    Neoxy.ai
                  </span>
                  <span className="text-[11px] text-white/75">
                    Sistema Operacional de Atendimento
                  </span>
                </div>
              </div>

              {slides.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)
                    }
                    className="w-7 h-7 rounded-full bg-black/35 text-white/90 hover:bg-black/60 flex items-center justify-center transition-colors"
                    aria-label="Slide anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlideIdx((prev) => (prev + 1) % slides.length)}
                    className="w-7 h-7 rounded-full bg-black/35 text-white/90 hover:bg-black/60 flex items-center justify-center transition-colors"
                    aria-label="Próximo slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Legenda e Indicadores do Carrossel no rodapé da imagem */}
            <div className="relative z-10 p-6 space-y-3">
              {currentSlide.badge && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nx-primary)] text-white">
                  {currentSlide.badge}
                </span>
              )}
              <h2 className="text-xl font-bold text-white leading-snug">
                {currentSlide.title}
              </h2>
              {currentSlide.subtitle && (
                <p className="text-xs text-white/80 leading-relaxed max-w-md">
                  {currentSlide.subtitle}
                </p>
              )}

              {slides.length > 1 && (
                <div className="flex items-center gap-1.5 pt-1">
                  {slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSlideIdx(idx)}
                      aria-label={`Ir para slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === activeSlideIdx % slides.length
                          ? 'w-7 bg-white'
                          : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: Formulário de Login ou Cadastro em 2 Etapas (2x2 Quadrados) */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Cabeçalho com Abas Entrar | Criar conta */}
              <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--nx-border)]">
                <div>
                  <h1 className="text-xl font-bold text-[var(--nx-text)] leading-tight">
                    {mode === 'login'
                      ? 'Acesso ao painel'
                      : registerStep === 1
                      ? 'Qual é o seu ramo?'
                      : 'Dados do estabelecimento'}
                  </h1>
                  <p className="text-xs text-[var(--nx-muted)] mt-0.5">
                    {mode === 'login'
                      ? 'Entre com seu e-mail e senha corporativa.'
                      : registerStep === 1
                      ? 'Etapa 1 de 2: escolha o perfil para ativar os módulos.'
                      : 'Etapa 2 de 2: finalize o cadastro da sua conta.'}
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
                    className={`px-3 py-1.5 rounded font-medium transition-colors ${
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
                      setRegisterStep(1);
                      setError(null);
                      setTouched({});
                    }}
                    className={`px-3 py-1.5 rounded font-medium transition-colors ${
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
                <div className="nx-api-error mb-4 max-h-24 overflow-y-auto text-xs" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {/* MODO LOGIN */}
              {mode === 'login' && (
                <form onSubmit={handleSubmit} noValidate className="space-y-1">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="nx-btn-primary w-full py-3 px-4 text-sm mt-2"
                  >
                    {loading ? (
                      <>
                        <span className="nx-spinner" aria-hidden="true" />
                        Autenticando...
                      </>
                    ) : (
                      'Entrar no sistema'
                    )}
                  </button>
                </form>
              )}

              {/* MODO CRIAR CONTA — ETAPA 1: CAIXAS QUADRADAS 2x2 */}
              {mode === 'register' && registerStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {BUSINESS_PROFILES.map((profile) => {
                      const Icon = profile.icon;
                      const isActive = businessType === profile.type;
                      return (
                        <button
                          key={profile.type}
                          type="button"
                          onClick={() => handleSelectProfile(profile)}
                          className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between min-h-[128px] ${
                            isActive
                              ? 'border-[var(--nx-primary)] bg-[var(--nx-primary-soft)] shadow-sm'
                              : 'border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)]'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isActive
                                ? 'bg-[var(--nx-primary)] text-white'
                                : 'bg-[var(--nx-surface)] text-[var(--nx-primary)] border border-[var(--nx-border)]'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="mt-3">
                            <div className="text-sm font-bold text-[var(--nx-text)]">
                              {profile.title}
                            </div>
                            <div className="text-[11px] text-[var(--nx-muted)] mt-0.5 leading-snug">
                              {profile.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setRegisterStep(2)}
                    className="nx-btn-primary w-full py-3 px-4 text-sm"
                  >
                    Continuar com {activeProfile.title}
                  </button>
                </div>
              )}

              {/* MODO CRIAR CONTA / ETAPA 2: DADOS DA CONTA */}
              {mode === 'register' && registerStep === 2 && (
                <form onSubmit={handleSubmit} noValidate className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--nx-primary-soft)] border border-[var(--nx-border)] mb-3 text-xs">
                    <span className="font-semibold text-[var(--nx-primary)]">
                      Perfil: {activeProfile.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="font-medium text-[var(--nx-text)] hover:underline"
                    >
                      Alterar ramo
                    </button>
                  </div>

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

                  <div className="nx-field">
                    <input
                      id={passwordId}
                      type={showPass ? 'text' : 'password'}
                      placeholder=" "
                      autoComplete="new-password"
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
                    <label htmlFor={passwordId}>Crie uma senha (mín. 6 caracteres)</label>
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="nx-btn-primary w-full py-3 px-4 text-sm mt-1"
                  >
                    {loading ? (
                      <>
                        <span className="nx-spinner" aria-hidden="true" />
                        Criando ambiente...
                      </>
                    ) : (
                      'Criar conta e abrir painel'
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Rodapé da coluna direita: Atalhos rápidos de homologação no Login */}
            {mode === 'login' && (
              <div className="mt-5 pt-4 border-t border-[var(--nx-border)]">
                <div className="text-[11px] font-medium text-[var(--nx-muted)] mb-2">
                  Atalhos de homologação (senha: <code className="tabular-data font-semibold">neoxy123</code>):
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fillDemo('contato@petshopamigofiel.com.br')}
                    className="p-2 text-left rounded-md border border-[var(--nx-accent-border)] bg-[var(--nx-accent-bg)] hover:opacity-90 transition-opacity"
                  >
                    <div className="font-semibold text-[var(--nx-accent)] truncate">Clínica & Pet</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Serviços & Agenda</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('contato@ferragensmarlene.com.br')}
                    className="p-2 text-left rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                  >
                    <div className="font-semibold text-[var(--nx-text)] truncate">Ferragens Marlene</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Comércio & Estoque</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('contato@primecontabil.com.br')}
                    className="p-2 text-left rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                  >
                    <div className="font-semibold text-[var(--nx-text)] truncate">Prime Contábil</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Boletos & Guias</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('admin@neoxy.ai')}
                    className="p-2 text-left rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                  >
                    <div className="font-semibold text-[var(--nx-primary)] truncate">Super Admin</div>
                    <div className="text-[10px] text-[var(--nx-muted)] truncate">Banners & Módulos</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé discreto */}
      <div className="max-w-5xl w-full mx-auto text-center text-[11px] text-[var(--nx-subtle)] shrink-0">
        Sessão protegida via JWT / Isolamento Multi-Tenant ativo
      </div>
    </div>
  );
};
