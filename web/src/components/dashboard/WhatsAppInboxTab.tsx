import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  ThumbsUp,
  PlayCircle,
  PauseCircle,
  Send,
  Search,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { QuickReplyItem } from './QuickRepliesAndRadarTab';

interface WhatsAppInboxTabProps {
  sessions: any[];
  quickReplies: QuickReplyItem[];
  highlightedPhone: string | null;
  onClearHighlight: () => void;
  inboxReplyDrafts: Record<string, string>;
  onChangeDraft: (phone: string, text: string) => void;
  sendingInboxPhone: string | null;
  onSendReply: (phone: string) => void;
  onToggleHandoff: (phone: string, pauseForHuman: boolean) => void;
  onSendLocation: (phone: string) => void;
  onSendReview: (phone: string) => void;
}

function getInitials(name?: string | null, phone?: string) {
  const clean = String(name || '').trim();
  if (clean && !/^\+?\d+$/.test(clean)) {
    const parts = clean.split(/\s+/).filter(Boolean);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : clean.slice(0, 2).toUpperCase();
  }
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return digits.slice(-2) || 'WA';
}

function formatWaTime(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function renderWhatsAppText(text: string) {
  const safe = String(text || '');
  const tokens = safe.split(/(\*[^*\n]+\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return (
        <strong key={i} className="font-semibold">
          {tok.slice(1, -1)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

export const WhatsAppInboxTab: React.FC<WhatsAppInboxTabProps> = ({
  sessions,
  quickReplies,
  highlightedPhone,
  onClearHighlight,
  inboxReplyDrafts,
  onChangeDraft,
  sendingInboxPhone,
  onSendReply,
  onToggleHandoff,
  onSendLocation,
  onSendReview
}) => {
  const [search, setSearch] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  // Ao abrir via "Ver conversa" em Oportunidades, expande automaticamente aquela conversa
  useEffect(() => {
    if (!highlightedPhone) return;
    const match = sessions.find((s) => s.customerPhone === highlightedPhone);
    if (match) {
      setCollapsedIds((prev) => ({ ...prev, [match.id]: false }));
    }
  }, [highlightedPhone, sessions]);

  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...sessions]
      .filter((s) => {
        if (!q) return true;
        return (
          String(s.customerName || '').toLowerCase().includes(q) ||
          String(s.pushName || '').toLowerCase().includes(q) ||
          String(s.customerPhone || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (highlightedPhone && a.customerPhone === highlightedPhone) return -1;
        if (highlightedPhone && b.customerPhone === highlightedPhone) return 1;
        const score = (x: any) =>
          x.sentiment === 'URGENT' ? 2 : x.sentiment === 'FRUSTRATED' ? 1 : 0;
        return score(b) - score(a);
      });
  }, [sessions, search, highlightedPhone]);

  const allCollapsed =
    sortedAndFiltered.length > 0 &&
    sortedAndFiltered.every((s) => Boolean(collapsedIds[s.id]));

  function toggleOne(id: string) {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll() {
    const nextVal = !allCollapsed;
    const map: Record<string, boolean> = {};
    for (const s of sortedAndFiltered) {
      map[s.id] = nextVal;
    }
    setCollapsedIds(map);
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Barra superior da Inbox */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--nx-text)]">
            Conversas Ativas no WhatsApp
          </h2>
          <p className="text-xs text-[var(--nx-muted)]">
            Acompanhe atendimentos no padrão visual do WhatsApp, minimize conversas ou assuma manualmente.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--nx-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome ou número..."
              className="pl-8 pr-3 py-1.5 w-52 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
            />
          </div>

          {sortedAndFiltered.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)] transition-colors"
            >
              {allCollapsed ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[var(--nx-primary)]" />
                  Expandir todas
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[var(--nx-primary)]" />
                  Minimizar todas
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {highlightedPhone && (
        <div className="px-4 py-2.5 rounded-lg bg-[var(--nx-primary-soft)] border border-[var(--nx-primary)]/40 flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--nx-text)]">
            Exibindo conversa destacada de{' '}
            <strong className="tabular-data">+{highlightedPhone}</strong>
          </span>
          <button
            type="button"
            onClick={onClearHighlight}
            className="text-[var(--nx-primary)] font-semibold hover:underline"
          >
            Limpar destaque
          </button>
        </div>
      )}

      {sortedAndFiltered.length === 0 ? (
        <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-xl p-10 text-center text-xs text-[var(--nx-subtle)]">
          Nenhuma conversa encontrada. Use o simulador na aba Resumo ou aguarde mensagens no WhatsApp.
        </div>
      ) : (
        <div className="space-y-3.5">
          {sortedAndFiltered.map((session) => {
            const isPaused = session.state === 'HUMAN_HANDOFF';
            const isSentimentRed =
              session.sentiment === 'URGENT' || session.sentiment === 'FRUSTRATED';
            const isHighlighted = Boolean(
              highlightedPhone && session.customerPhone === highlightedPhone
            );
            const isCollapsed = Boolean(collapsedIds[session.id]);
            const displayName =
              session.customerName || session.pushName || `Cliente +${session.customerPhone}`;
            const msgs: any[] = Array.isArray(session.messages) ? session.messages : [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

            return (
              <div
                key={session.id}
                className={`rounded-xl border overflow-hidden transition-shadow ${
                  isSentimentRed
                    ? 'border-[var(--nx-error)] ring-2 ring-[var(--nx-error)]/25'
                    : isHighlighted
                    ? 'border-[var(--nx-primary)] ring-2 ring-[var(--nx-primary-ring)]'
                    : 'border-[var(--nx-border-strong)] shadow-sm'
                }`}
              >
                {/* Cabeçalho Estilo WhatsApp Web (clicável para minimizar/expandir) */}
                <div className="nx-wa-header px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleOne(session.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                    title={isCollapsed ? 'Expandir conversa' : 'Minimizar conversa'}
                  >
                    {/* Foto de Perfil do Contato do WhatsApp */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-black/10 bg-[#00A884]/15 flex items-center justify-center">
                      {session.avatarUrl ? (
                        <img
                          src={session.avatarUrl}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-[#008069] dark:text-[#25D366]">
                          {getInitials(displayName, session.customerPhone)}
                        </span>
                      )}
                      <span
                        className={`w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#202C33] ${
                          isSentimentRed
                            ? 'bg-red-500'
                            : isPaused
                            ? 'bg-amber-500'
                            : 'bg-[#25D366]'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--nx-text)] truncate">
                          {displayName}
                        </span>
                        <span className="text-[11px] text-[var(--nx-muted)] tabular-data">
                          +{session.customerPhone}
                        </span>
                        {isSentimentRed && (
                          <span
                            className="px-2 py-0.5 rounded bg-[var(--nx-error)] text-white text-[10px] font-bold"
                            title={session.sentimentReason || undefined}
                          >
                            {session.sentiment === 'URGENT'
                              ? 'Alerta Urgente'
                              : 'Cliente Insatisfeito'}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                            isPaused
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-[#25D366]/15 text-[#008069] dark:text-[#25D366]'
                          }`}
                        >
                          {isPaused ? 'Atendimento Humano' : 'IA Ativa'}
                        </span>
                      </div>

                      {isCollapsed && lastMsg && (
                        <div className="text-xs text-[var(--nx-muted)] truncate mt-0.5 max-w-2xl">
                          <span className="font-medium">
                            {lastMsg.role === 'user'
                              ? 'Cliente: '
                              : lastMsg.role === 'human_agent'
                              ? 'Você: '
                              : 'IA: '}
                          </span>
                          {lastMsg.content}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Ações Rápidas + Botão Minimizar/Expandir */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {!isCollapsed && (
                      <>
                        <button
                          type="button"
                          onClick={() => onSendLocation(session.customerPhone)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[#00A884] text-xs font-medium text-[var(--nx-text)] transition-colors"
                          title="Enviar Pin de Localização clicável no mapa"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#008069] dark:text-[#25D366]" />
                          Enviar Pin
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendReview(session.customerPhone)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[#00A884] text-xs font-medium text-[var(--nx-text)] transition-colors"
                          title="Enviar link de avaliação Google Meu Negócio / Enquete"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          Pedir Avaliação
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleHandoff(session.customerPhone, !isPaused)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isPaused
                          ? 'bg-[#00A884] hover:bg-[#008F6F] text-white'
                          : 'bg-[var(--nx-primary)] hover:bg-[var(--nx-primary-hover)] text-[var(--nx-primary-fg)]'
                      }`}
                    >
                      {isPaused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          Devolver para IA
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          Assumir conversa
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOne(session.id)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] text-xs text-[var(--nx-muted)] hover:text-[var(--nx-text)] transition-colors"
                      title={isCollapsed ? 'Expandir conversa' : 'Minimizar conversa'}
                    >
                      {isCollapsed ? (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span className="hidden sm:inline">Abrir</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span className="hidden sm:inline">Minimizar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Corpo da Conversa (oculto quando minimizado) */}
                {!isCollapsed && (
                  <>
                    <div className="nx-wa-canvas px-4 py-4 space-y-2.5 max-h-80 overflow-y-auto">
                      {msgs.length === 0 ? (
                        <div className="text-center text-xs nx-wa-meta py-6">
                          Nenhuma mensagem nesta conversa ainda.
                        </div>
                      ) : (
                        msgs.map((m: any) => {
                          const isUser = m.role === 'user';
                          const isHuman = m.role === 'human_agent';
                          const bubbleClass = isUser
                            ? 'nx-wa-bubble-in mr-auto'
                            : isHuman
                            ? 'nx-wa-bubble-human ml-auto'
                            : 'nx-wa-bubble-out ml-auto';

                          return (
                            <div
                              key={m.id}
                              className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                            >
                              <div className={`${bubbleClass} px-3.5 py-2 max-w-[82%] text-[13px] leading-relaxed`}>
                                <div className="flex items-center justify-between gap-3 mb-0.5">
                                  <span
                                    className={`text-[10.5px] font-bold ${
                                      isUser
                                        ? 'text-[#008069] dark:text-[#25D366]'
                                        : isHuman
                                        ? 'text-[#075E54] dark:text-[#53BDEB]'
                                        : 'text-[#075E54] dark:text-[#A7F3D0]'
                                    }`}
                                  >
                                    {isUser
                                      ? displayName
                                      : isHuman
                                      ? 'Você (Atendente)'
                                      : 'IA NEO'}
                                  </span>
                                </div>

                                <div className="whitespace-pre-wrap break-words">
                                  {renderWhatsAppText(m.content)}
                                </div>

                                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] nx-wa-meta tabular-data">
                                  <span>{formatWaTime(m.createdAt)}</span>
                                  {!isUser && (
                                    <span
                                      className="font-bold text-[#53BDEB] tracking-tighter"
                                      aria-label="Entregue"
                                    >
                                      ✓✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Barra de Resposta Estilo WhatsApp + Atalhos Rápidos */}
                    <div className="nx-wa-composer px-4 py-3 space-y-2">
                      {quickReplies.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {quickReplies.slice(0, 6).map((qr) => (
                            <button
                              key={qr.id}
                              type="button"
                              onClick={() => onChangeDraft(session.customerPhone, qr.content)}
                              className="px-2.5 py-0.5 rounded-full bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] hover:border-[#00A884] tabular-data text-[10.5px] text-[var(--nx-text)] transition-colors"
                              title={qr.title}
                            >
                              {qr.shortcut}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inboxReplyDrafts[session.customerPhone] || ''}
                          onChange={(e) => onChangeDraft(session.customerPhone, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              onSendReply(session.customerPhone);
                            }
                          }}
                          placeholder="Digite uma mensagem ou clique em um /atalho acima..."
                          className="flex-1 px-4 py-2 rounded-full bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[#00A884]"
                        />
                        <button
                          type="button"
                          disabled={sendingInboxPhone === session.customerPhone}
                          onClick={() => onSendReply(session.customerPhone)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-xs font-semibold shrink-0 transition-colors disabled:opacity-60"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Enviar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WhatsAppInboxTab;
