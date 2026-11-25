import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Unplug,
  Send,
  Copy,
  Check,
  Sliders,
  Server,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  ArrowRight,
  Clock,
  X
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface WhatsAppSyncPreferences {
  autoReconnect: boolean;
  ignoreGroups: boolean;
  rejectCalls: boolean;
  alwaysOnline: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  syncContactsOnConnect: boolean;
}

export interface WhatsAppSyncStatus {
  status: 'CONNECTED' | 'QRCODE' | 'CONNECTING' | 'DISCONNECTED' | string;
  isConnected: boolean;
  instanceName: string;
  phoneNumber: string | null;
  profileName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  gateway: {
    mode: 'evolution' | 'sandbox';
    reachable: boolean;
    latencyMs: number | null;
    baseUrl: string;
    hasCustomCredentials: boolean;
    webhookUrl: string;
  };
  qr: {
    base64: string;
    expiresAt: string;
    ttlSeconds: number;
  } | null;
  pairingCode: {
    code: string;
    phone: string | null;
    expiresAt: string;
    ttlSeconds: number;
  } | null;
  preferences: WhatsAppSyncPreferences;
  health: {
    totalContacts: number;
    totalSessions: number;
    messagesLast24h: number;
    antiBanActive: boolean;
  };
}

interface WhatsAppNotSyncedBannerProps {
  status: WhatsAppSyncStatus | null;
  onGoToSync: () => void;
  compact?: boolean;
}

export const WhatsAppNotSyncedBanner: React.FC<WhatsAppNotSyncedBannerProps> = ({
  status,
  onGoToSync,
  compact = false
}) => {
  if (!status || status.isConnected) return null;

  const isWaitingQr = status.status === 'QRCODE' || status.status === 'CONNECTING';

  return (
    <div
      className={`nx-spotlight-card relative overflow-hidden border-[var(--nx-volt-border)] ${
        compact ? 'px-4 py-3.5 mb-5' : 'px-5 py-4 mb-6'
      }`}
      data-testid="whatsapp-not-synced-banner"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="nx-icon-tile shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border border-[var(--nx-volt-border)]">
            {isWaitingQr ? (
              <QrCode className="w-5 h-5 animate-pulse" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--nx-text)]">
                {isWaitingQr
                  ? 'Aguardando leitura do QR Code do WhatsApp'
                  : 'WhatsApp ainda não foi sincronizado'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {isWaitingQr ? 'Pareamento pendente' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-[var(--nx-muted)] mt-0.5 leading-relaxed">
              {isWaitingQr
                ? 'Abra o WhatsApp no celular e escaneie o QR Code na aba de sincronização para ativar o atendente NEO 24h.'
                : 'Conecte seu número via QR Code ou código de pareamento para que o atendente NEO responda clientes automaticamente.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToSync}
          data-testid="banner-sync-whatsapp-btn"
          className="nx-btn-primary px-4 py-2.5 text-xs shrink-0 inline-flex items-center justify-center gap-2"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{isWaitingQr ? 'Ver QR Code' : 'Sincronizar WhatsApp'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface WhatsAppSyncTabProps {
  tenant: any;
  initialStatus: WhatsAppSyncStatus | null;
  onStatusChange: (status: WhatsAppSyncStatus) => void;
  onNotify: (msg: string) => void;
}

function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return 'Não vinculado';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return `+${digits}`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

export const WhatsAppSyncTab: React.FC<WhatsAppSyncTabProps> = ({
  tenant,
  initialStatus,
  onStatusChange,
  onNotify
}) => {
  const [status, setStatus] = useState<WhatsAppSyncStatus | null>(initialStatus);
  const [loading, setLoading] = useState(!initialStatus);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [pairMode, setPairMode] = useState<'qr' | 'pairing'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [countdown, setCountdown] = useState<number>(0);

  // Mensagem de teste
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any | null>(null);

  // Confirmação de redefinição
  const [confirmReset, setConfirmReset] = useState(false);

  // Preferências locais
  const [prefs, setPrefs] = useState<WhatsAppSyncPreferences>(
    initialStatus?.preferences || {
      autoReconnect: true,
      ignoreGroups: true,
      rejectCalls: true,
      alwaysOnline: false,
      readReceipts: true,
      typingIndicator: true,
      syncContactsOnConnect: true
    }
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Gateway avançado (Evolution API)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [gatewayApiKey, setGatewayApiKey] = useState('');
  const [instanceNameInput, setInstanceNameInput] = useState('');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savingGateway, setSavingGateway] = useState(false);

  // Copiar feedbacks
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const applyStatus = useCallback(
    (next: WhatsAppSyncStatus) => {
      setStatus(next);
      onStatusChange(next);
      setPrefs(next.preferences);
      setInstanceNameInput((prev) => prev || next.instanceName);
      setWebhookUrlInput((prev) => prev || next.gateway.webhookUrl);
      if (next.qr?.ttlSeconds) {
        setCountdown(next.qr.ttlSeconds);
      } else if (next.pairingCode?.ttlSeconds) {
        setCountdown(next.pairingCode.ttlSeconds);
      } else {
        setCountdown(0);
      }
    },
    [onStatusChange]
  );

  const fetchStatus = useCallback(
    async (silent = false) => {
      if (!tenant?.slug) return;
      if (!silent) setLoading(true);
      try {
        const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/status`);
        if (res.whatsapp) {
          applyStatus(res.whatsapp);
        }
      } catch (err: any) {
        if (!silent) onNotify(`Erro ao consultar sincronização: ${err.message}`);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tenant?.slug, applyStatus, onNotify]
  );

  useEffect(() => {
    setGatewayUrl('');
    setGatewayApiKey('');
    setInstanceNameInput('');
    setWebhookUrlInput('');
    setConfirmReset(false);
    setLastTestResult(null);
    fetchStatus(false);
  }, [tenant?.slug]);

  // Contador regressivo de expiração do QR / Pairing Code
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown > 0]);

  // Polling automático a cada 3s enquanto aguarda leitura do QR / Pareamento
  useEffect(() => {
    if (!status || status.isConnected) return;
    if (status.status !== 'QRCODE' && status.status !== 'CONNECTING') return;

    const poller = setInterval(() => {
      fetchStatus(true);
    }, 3000);
    return () => clearInterval(poller);
  }, [status?.status, status?.isConnected, fetchStatus]);

  async function handleStartSync(mode: 'qr' | 'pairing' = pairMode) {
    if (!tenant?.slug) return;
    if (mode === 'pairing' && pairingPhone.replace(/\D/g, '').length < 10) {
      onNotify('Informe o número de WhatsApp com DDD (ex: 5551999999999) para gerar o código.');
      return;
    }
    setActionLoading('connect');
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/connect`, {
        method: 'POST',
        body: JSON.stringify({
          mode,
          phoneNumber: mode === 'pairing' ? pairingPhone : ''
        })
      });
      if (res.whatsapp) {
        applyStatus(res.whatsapp);
        onNotify(
          mode === 'pairing'
            ? 'Código de pareamento de 8 dígitos gerado!'
            : 'QR Code atualizado! Escaneie com o WhatsApp do seu celular.'
        );
      }
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSimulateScan() {
    if (!tenant?.slug) return;
    setActionLoading('simulate');
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/confirm-demo`, {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: pairingPhone || tenant?.parsedSettings?.storeInfo?.phone || '5551999990001',
          profileName: tenant.name
        })
      });
      if (res.whatsapp) {
        applyStatus(res.whatsapp);
        onNotify('WhatsApp sincronizado com sucesso! Seu atendente NEO está ativo.');
      }
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisconnect() {
    if (!tenant?.slug) return;
    setActionLoading('disconnect');
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/disconnect`, {
        method: 'POST'
      });
      if (res.whatsapp) {
        applyStatus(res.whatsapp);
        onNotify('WhatsApp desconectado. Histórico e contatos foram preservados.');
      }
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetSync() {
    if (!tenant?.slug) return;
    setActionLoading('reset');
    setConfirmReset(false);
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/reset`, {
        method: 'POST'
      });
      if (res.whatsapp) {
        setPairMode('qr');
        applyStatus(res.whatsapp);
        onNotify('Sincronização redefinida! Novo QR Code limpo gerado.');
      }
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTogglePreference(key: keyof WhatsAppSyncPreferences) {
    if (!tenant?.slug) return;
    const nextPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(nextPrefs);
    setSavingPrefs(true);
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/config`, {
        method: 'PUT',
        body: JSON.stringify({ preferences: nextPrefs })
      });
      if (res.whatsapp) {
        applyStatus(res.whatsapp);
      }
      onNotify('Preferência de sincronização salva.');
    } catch (err: any) {
      setPrefs(prefs);
      onNotify(err.message);
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleSaveGateway(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.slug) return;
    setSavingGateway(true);
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/config`, {
        method: 'PUT',
        body: JSON.stringify({
          instanceName: instanceNameInput.trim(),
          gatewayUrl: gatewayUrl.trim() || undefined,
          gatewayApiKey: gatewayApiKey.trim() || undefined,
          webhookUrl: webhookUrlInput.trim()
        })
      });
      if (res.whatsapp) {
        applyStatus(res.whatsapp);
      }
      onNotify('Configurações do gateway WhatsApp atualizadas.');
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setSavingGateway(false);
    }
  }

  async function handleSendTestMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.slug) return;
    if (testPhone.replace(/\D/g, '').length < 10) {
      onNotify('Informe um número de destino válido com DDD.');
      return;
    }
    setSendingTest(true);
    try {
      const res = await apiFetch(`/api/tenants/${tenant.slug}/whatsapp/test-message`, {
        method: 'POST',
        body: JSON.stringify({
          phone: testPhone,
          text: testText
        })
      });
      setLastTestResult(res.result);
      onNotify(
        res.result?.mode === 'evolution'
          ? 'Mensagem de teste enviada pelo WhatsApp conectado!'
          : 'Mensagem de teste validada em modo Sandbox local!'
      );
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setSendingTest(false);
    }
  }

  function handleCopy(value: string, key: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    onNotify('Copiado para a área de transferência.');
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const isConnected = Boolean(status?.isConnected);
  const isWaitingQr = status?.status === 'QRCODE' || status?.status === 'CONNECTING';
  const progressPct = Math.max(0, Math.min(100, Math.round((countdown / 45) * 100)));

  const preferenceItems: Array<{
    key: keyof WhatsAppSyncPreferences;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'autoReconnect',
      title: 'Reconexão automática',
      desc: 'Restaura a sessão em segundo plano caso haja oscilação de rede ou reinício do servidor.',
      icon: <RefreshCw className="w-4 h-4" />
    },
    {
      key: 'syncContactsOnConnect',
      title: 'Sincronizar contatos ao conectar',
      desc: 'Importa automaticamente clientes para a aba Contatos & Filtro IA logo após parear.',
      icon: <Sparkles className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-6 animate-fade-up" data-testid="whatsapp-sync-tab">
      {/* Cabeçalho enxuto da Central de Sincronização (apenas barra superior de status) */}
      <div className="nx-spotlight-card p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={`nx-icon-tile shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : isWaitingQr
                  ? 'bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border-[var(--nx-volt-border)]'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/25'
              }`}
            >
              {isConnected ? (
                <Wifi className="w-6 h-6" />
              ) : isWaitingQr ? (
                <QrCode className="w-6 h-6" />
              ) : (
                <WifiOff className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Sincronização do WhatsApp
                </h2>
                <span
                  data-testid="sync-status-badge"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                      : isWaitingQr
                      ? 'bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border-[var(--nx-volt-border)]'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-500'
                        : isWaitingQr
                        ? 'bg-[var(--nx-volt-ink)] animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                  {isConnected
                    ? 'Sincronizado e Online'
                    : isWaitingQr
                    ? 'Aguardando leitura do QR Code'
                    : 'WhatsApp ainda não sincronizado'}
                </span>

                {status?.gateway && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--nx-surface-alt)] text-[var(--nx-muted)] border border-[var(--nx-border)]">
                    <Server className="w-3 h-3" />
                    {status.gateway.mode === 'evolution'
                      ? `Evolution API${status.gateway.latencyMs ? ` · ${status.gateway.latencyMs}ms` : ''}`
                      : 'Modo Sandbox Local'}
                  </span>
                )}
              </div>

              <p className="text-xs text-[var(--nx-muted)] mt-1 leading-relaxed">
                Conecte o WhatsApp comercial da <strong className="text-[var(--nx-text)]">{tenant?.name}</strong> com QR Code ou código de pareamento de 8 dígitos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchStatus(false)}
              disabled={loading || Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Status
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={Boolean(actionLoading)}
                data-testid="btn-disconnect-whatsapp"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-300 transition-colors disabled:opacity-50"
              >
                <Unplug className="w-3.5 h-3.5" />
                {actionLoading === 'disconnect' ? 'Desconectando...' : 'Desconectar'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={Boolean(actionLoading)}
              data-testid="btn-reset-sync-open"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-300 text-xs font-medium text-[var(--nx-text)] transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === 'reset' ? 'animate-spin' : ''}`} />
              Redefinir Sincronização
            </button>
          </div>
        </div>
      </div>

      {/* Modal NEO de Confirmação: Redefinir Sincronização (via Portal em tela cheia) */}
      {confirmReset &&
        createPortal(
          <div
            className="nx-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmReset(false);
            }}
          >
            <div
              className="nx-spotlight-card w-full max-w-md p-6 rounded-2xl shadow-2xl animate-fade-up"
              role="dialog"
              aria-modal="true"
              data-testid="modal-confirm-reset-sync"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="nx-icon-tile nx-icon-tile--sm bg-amber-500/15 text-amber-500 border-amber-500/30">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--nx-text)]">
                      Redefinir sincronização
                    </h3>
                    <p className="text-[11px] text-[var(--nx-muted)]">
                      Sessão atual será encerrada e um novo QR Code será gerado.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="p-1.5 rounded-full text-[var(--nx-subtle)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--nx-muted)] leading-relaxed mb-6">
                Tem certeza que deseja redefinir a sincronização de{' '}
                <strong className="text-[var(--nx-text)]">"{tenant?.name}"</strong>? Isso limpa as credenciais vinculadas no gateway e gera um novo QR Code limpo. Suas conversas e contatos no NEO serão preservados.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[var(--nx-text)] border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetSync}
                  data-testid="btn-confirm-reset-sync"
                  className="nx-btn-primary px-5 py-2 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Confirmar e gerar novo QR
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Grid Principal: Pareamento (Esquerda) + Preferências & Testes (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA (5 cols): QR CODE / PAIRING CODE / CONEXÃO ATIVA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="nx-spotlight-card p-5 sm:p-6">
            {isConnected ? (
              <div className="space-y-5" data-testid="sync-connected-panel">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--nx-text)]">
                      Dispositivo conectado com sucesso
                    </h3>
                    <p className="text-xs text-[var(--nx-muted)]">
                      O atendente NEO está escutando novas mensagens em tempo real.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--nx-bg)] border border-[var(--nx-border)] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--nx-muted)]">Perfil comercial</span>
                    <span className="font-semibold text-[var(--nx-text)] truncate">
                      {status?.profileName || tenant?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--nx-muted)]">Número WhatsApp</span>
                    <span className="font-semibold text-[var(--nx-text)] tabular-data">
                      {formatPhoneDisplay(status?.phoneNumber)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--nx-muted)]">Conectado em</span>
                    <span className="font-medium text-[var(--nx-text)] tabular-data">
                      {formatDateTime(status?.connectedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--nx-muted)]">Contatos sincronizados</span>
                    <span className="font-semibold text-[var(--nx-text)] tabular-data">
                      {status?.health?.totalContacts ?? 0}
                    </span>
                  </div>
                </div>

                {/* Enviar Mensagem de Teste */}
                <form onSubmit={handleSendTestMessage} className="space-y-3 pt-2 border-t border-[var(--nx-border)]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--nx-volt-ink)]" />
                    <span className="text-xs font-bold text-[var(--nx-text)]">
                      Testar envio de mensagem
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--nx-muted)]">
                    Envie um disparo de verificação para confirmar que a comunicação de saída está saudável.
                  </p>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Número com DDD (ex: 5551999999999)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                  />
                  <input
                    type="text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Mensagem opcional (deixe vazio para texto padrão NEO)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                  />
                  <button
                    type="submit"
                    disabled={sendingTest}
                    data-testid="btn-send-test-message"
                    className="nx-btn-primary w-full py-2.5 text-xs justify-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingTest ? 'Enviando teste...' : 'Enviar mensagem de teste'}
                  </button>

                  {lastTestResult && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-700 dark:text-emerald-300">
                      Entrega confirmada ({lastTestResult.mode === 'evolution' ? 'WhatsApp real' : 'Sandbox local'}) para{' '}
                      <strong className="tabular-data">{formatPhoneDisplay(lastTestResult.phone)}</strong> às{' '}
                      {formatDateTime(lastTestResult.sentAt)}.
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="space-y-5" data-testid="sync-pairing-panel">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--nx-text)]">
                      Parear WhatsApp
                    </h3>
                    <p className="text-[11px] text-[var(--nx-muted)]">
                      Escolha entre escanear o QR Code ou digitar o código de 8 dígitos no celular.
                    </p>
                  </div>
                </div>

                {/* Alternador de modo: QR Code vs Código de Pareamento */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                  <button
                    type="button"
                    onClick={() => setPairMode('qr')}
                    data-testid="mode-qr-btn"
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      pairMode === 'qr'
                        ? 'bg-[var(--nx-primary)] text-[var(--nx-primary-fg)] shadow-sm'
                        : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairMode('pairing')}
                    data-testid="mode-pairing-btn"
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      pairMode === 'pairing'
                        ? 'bg-[var(--nx-primary)] text-[var(--nx-primary-fg)] shadow-sm'
                        : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Código 8 dígitos
                  </button>
                </div>

                {pairMode === 'qr' ? (
                  <div className="flex flex-col items-center text-center space-y-4">
                    {status?.qr?.base64 ? (
                      <>
                        <div className="relative p-3.5 rounded-2xl bg-white border-2 border-[var(--nx-volt-border)] shadow-lg">
                          <img
                            src={status.qr.base64}
                            alt="QR Code de sincronização WhatsApp NEO"
                            data-testid="whatsapp-qr-image"
                            className="w-56 h-56 sm:w-60 sm:h-60 object-contain rounded-lg"
                          />
                        </div>

                        {/* Barra de contagem regressiva de 45s */}
                        <div className="w-full max-w-[260px] space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-[var(--nx-muted)] tabular-data">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expira em {countdown}s
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartSync('qr')}
                              disabled={Boolean(actionLoading)}
                              className="text-[var(--nx-volt-ink)] hover:underline font-semibold"
                            >
                              Gerar novo QR
                            </button>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[var(--nx-surface-alt)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${progressPct}%`,
                                background: 'var(--nx-volt-gradient, #D4FF00)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Botão de simulação quando estiver em Modo Sandbox Local */}
                        {status?.gateway?.mode === 'sandbox' && (
                          <div className="w-full p-3.5 rounded-xl bg-[var(--nx-volt-surface)] border border-[var(--nx-volt-border)] space-y-2.5 text-left">
                            <div className="text-[11px] text-[var(--nx-text)] leading-relaxed">
                              <strong className="text-[var(--nx-volt-ink)]">Modo Sandbox Local ativo:</strong> nenhuma Evolution API externa respondeu em{' '}
                              <code className="text-[10.5px] font-mono">{status.gateway.baseUrl}</code>. Você pode testar toda a experiência simulando a leitura abaixo ou configurar sua Evolution API na seção avançada.
                            </div>
                            <button
                              type="button"
                              onClick={handleSimulateScan}
                              disabled={Boolean(actionLoading)}
                              data-testid="btn-simulate-qr-scan"
                              className="nx-btn-primary w-full py-2 text-xs justify-center"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {actionLoading === 'simulate'
                                ? 'Conectando...'
                                : 'Simular leitura do QR Code'}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full py-8 px-4 rounded-2xl border border-dashed border-[var(--nx-border-strong)] bg-[var(--nx-bg)] flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--nx-volt-surface)] border border-[var(--nx-volt-border)] flex items-center justify-center text-[var(--nx-volt-ink)]">
                          <QrCode className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--nx-text)]">
                            Pronto para sincronizar
                          </div>
                          <p className="text-xs text-[var(--nx-muted)] mt-1 max-w-xs">
                            Clique no botão abaixo para gerar um QR Code seguro e conectar o WhatsApp da sua empresa em segundos.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartSync('qr')}
                          disabled={Boolean(actionLoading)}
                          data-testid="btn-start-sync-qr"
                          className="nx-btn-primary px-5 py-2.5 text-xs mt-1"
                        >
                          <QrCode className="w-4 h-4" />
                          {actionLoading === 'connect'
                            ? 'Gerando QR Code...'
                            : 'Iniciar Sincronização (Gerar QR Code)'}
                        </button>
                      </div>
                    )}

                    {/* Passo a passo */}
                    <ol className="w-full text-left space-y-2 pt-3 border-t border-[var(--nx-border)] text-xs text-[var(--nx-muted)]">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] text-[10.5px] font-bold text-[var(--nx-text)] flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>Abra o <strong>WhatsApp</strong> ou <strong>WhatsApp Business</strong> no celular.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] text-[10.5px] font-bold text-[var(--nx-text)] flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span>Toque em <strong>Mais opções (⋮)</strong> ou <strong>Configurações</strong> → <strong>Dispositivos conectados</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] text-[10.5px] font-bold text-[var(--nx-text)] flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span>Toque em <strong>Conectar dispositivo</strong> e aponte a câmera para o QR Code acima.</span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[var(--nx-text)]">
                        Número do WhatsApp com DDI e DDD
                      </label>
                      <input
                        type="text"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        placeholder="Ex: 5551999999999"
                        data-testid="pairing-phone-input"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)] tabular-data"
                      />
                      <button
                        type="button"
                        onClick={() => handleStartSync('pairing')}
                        disabled={Boolean(actionLoading)}
                        data-testid="btn-generate-pairing-code"
                        className="nx-btn-primary w-full py-2.5 text-xs justify-center"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        {actionLoading === 'connect'
                          ? 'Gerando código...'
                          : 'Gerar código de pareamento'}
                      </button>
                    </div>

                    {status?.pairingCode?.code && (
                      <div className="p-4 rounded-2xl bg-[var(--nx-bg)] border border-[var(--nx-volt-border)] text-center space-y-3">
                        <div className="text-[11px] font-medium text-[var(--nx-muted)]">
                          Digite este código no WhatsApp do celular
                        </div>
                        <div
                          data-testid="pairing-code-display"
                          className="text-2xl font-extrabold tracking-[0.22em] font-mono text-[var(--nx-text)] select-all"
                        >
                          {status.pairingCode.code}
                        </div>
                        <div className="flex items-center justify-center gap-3 text-[11px]">
                          <span className="text-[var(--nx-muted)] tabular-data">
                            Expira em {countdown}s
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(status.pairingCode!.code, 'pairing')}
                            className="inline-flex items-center gap-1 font-semibold text-[var(--nx-volt-ink)] hover:underline"
                          >
                            {copiedKey === 'pairing' ? (
                              <>
                                <Check className="w-3 h-3" /> Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copiar código
                              </>
                            )}
                          </button>
                        </div>

                        {status?.gateway?.mode === 'sandbox' && (
                          <button
                            type="button"
                            onClick={handleSimulateScan}
                            disabled={Boolean(actionLoading)}
                            className="nx-btn-primary w-full py-2 text-xs justify-center mt-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Simular confirmação do código
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-[var(--nx-muted)] leading-relaxed">
                      No WhatsApp do celular, vá em <strong>Dispositivos conectados → Conectar dispositivo → Conectar com número de telefone</strong> e digite o código exibido acima.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (7 cols): PREFERÊNCIAS DE SINCRONIZAÇÃO + GATEWAY EVOLUTION */}
        <div className="lg:col-span-7 space-y-6">
          {/* Preferências de comportamento e proteção da sessão */}
          <div className="nx-spotlight-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="nx-icon-tile nx-icon-tile--sm">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--nx-text)]">
                    Preferências de Sincronização & Proteção
                  </h3>
                  <p className="text-xs text-[var(--nx-muted)]">
                    Recursos avançados para manter a estabilidade do chip e evitar bloqueios.
                  </p>
                </div>
              </div>
              {savingPrefs && (
                <span className="text-[11px] text-[var(--nx-muted)]">Salvando...</span>
              )}
            </div>

            <div className="divide-y divide-[var(--nx-border)]">
              {preferenceItems.map((item) => {
                const checked = Boolean(prefs[item.key]);
                return (
                  <div
                    key={item.key}
                    className="py-3.5 first:pt-1 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] flex items-center justify-center text-[var(--nx-muted)] shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--nx-text)]">
                          {item.title}
                        </div>
                        <p className="text-[11px] text-[var(--nx-muted)] leading-relaxed mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={item.title}
                      onClick={() => handleTogglePreference(item.key)}
                      className="nx-checkbox shrink-0"
                    >
                      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagnóstico de Webhook & Configuração Avançada Evolution API */}
          <div className="nx-spotlight-card p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="nx-icon-tile nx-icon-tile--sm">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--nx-text)]">
                    Gateway Evolution API & Webhook
                  </h3>
                  <p className="text-xs text-[var(--nx-muted)]">
                    Endereço do webhook para receber eventos e credenciais opcionais de servidor dedicado.
                  </p>
                </div>
              </div>
              {advancedOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--nx-muted)] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--nx-muted)] shrink-0" />
              )}
            </button>

            {/* Webhook URL sempre visível para cópia rápida */}
            <div className="p-3 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--nx-subtle)]">
                  URL de Webhook NEO
                </div>
                <div className="text-xs font-mono text-[var(--nx-text)] truncate mt-0.5">
                  {status?.gateway?.webhookUrl || `${window.location.origin}/api/webhooks/whatsapp`}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    status?.gateway?.webhookUrl || `${window.location.origin}/api/webhooks/whatsapp`,
                    'webhook'
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-[11px] font-medium text-[var(--nx-text)] shrink-0"
              >
                {copiedKey === 'webhook' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </>
                )}
              </button>
            </div>

            {advancedOpen && (
              <form onSubmit={handleSaveGateway} className="space-y-3 pt-2 border-t border-[var(--nx-border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                      Nome da Instância
                    </label>
                    <input
                      type="text"
                      value={instanceNameInput}
                      onChange={(e) => setInstanceNameInput(e.target.value)}
                      placeholder={`neo-${tenant?.slug}`}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs font-mono text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                      URL Evolution API (opcional)
                    </label>
                    <input
                      type="url"
                      value={gatewayUrl}
                      onChange={(e) => setGatewayUrl(e.target.value)}
                      placeholder={status?.gateway?.baseUrl || 'http://localhost:8080'}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs font-mono text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                      API Key do Gateway (opcional)
                    </label>
                    <input
                      type="password"
                      value={gatewayApiKey}
                      onChange={(e) => setGatewayApiKey(e.target.value)}
                      placeholder={
                        status?.gateway?.hasCustomCredentials
                          ? '•••••••••••• (configurada)'
                          : 'Usa chave padrão do servidor'
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs font-mono text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                      Webhook personalizado (opcional)
                    </label>
                    <input
                      type="url"
                      value={webhookUrlInput}
                      onChange={(e) => setWebhookUrlInput(e.target.value)}
                      placeholder={`${window.location.origin}/api/webhooks/whatsapp`}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs font-mono text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingGateway}
                    className="nx-btn-primary px-4 py-2 text-xs"
                  >
                    {savingGateway ? 'Salvando...' : 'Salvar configurações do Gateway'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
