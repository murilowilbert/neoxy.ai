import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  X,
  Radio,
  PlayCircle,
  MessageSquare,
  Clock
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface QuickReplyItem {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  triggerKeywords?: string | null;
  autoTrigger: boolean;
  triggerHandoff: boolean;
  usageCount: number;
  active: boolean;
}

export interface RadarItem {
  id: string;
  customerPhone: string;
  customerName: string;
  state: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'URGENT';
  sentimentReason?: string | null;
  waitMinutes: number;
  lastMessageRole?: string | null;
  lastMessageText: string;
  lastInteraction: string;
  priority: 'URGENT' | 'HIGH' | 'FOLLOW_UP';
  reason: string;
}

interface QuickRepliesTabProps {
  tenantSlug: string;
  quickReplies: QuickReplyItem[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

const VARIABLES = ['{{cliente}}', '{{empresa}}', '{{endereco}}', '{{instagram}}', '{{site}}'];

export const QuickRepliesTab: React.FC<QuickRepliesTabProps> = ({
  tenantSlug,
  quickReplies,
  onRefresh,
  onNotify
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shortcut: '/',
    title: '',
    content: '',
    category: 'ATENDIMENTO',
    triggerKeywords: '',
    autoTrigger: false,
    triggerHandoff: false
  });

  function openNew() {
    setEditingId(null);
    setForm({
      shortcut: '/',
      title: '',
      content: '',
      category: 'ATENDIMENTO',
      triggerKeywords: '',
      autoTrigger: false,
      triggerHandoff: false
    });
    setModalOpen(true);
  }

  function openEdit(qr: QuickReplyItem) {
    setEditingId(qr.id);
    setForm({
      shortcut: qr.shortcut,
      title: qr.title,
      content: qr.content,
      category: qr.category || 'ATENDIMENTO',
      triggerKeywords: qr.triggerKeywords || '',
      autoTrigger: qr.autoTrigger,
      triggerHandoff: qr.triggerHandoff
    });
    setModalOpen(true);
  }

  function insertVariable(v: string) {
    setForm((prev) => ({
      ...prev,
      content: `${prev.content}${prev.content.endsWith(' ') || !prev.content ? '' : ' '}${v}`
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/quick-replies`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingId || undefined,
          ...form
        })
      });
      setModalOpen(false);
      await onRefresh();
      onNotify('Resposta rápida / gatilho salvo com sucesso.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao salvar resposta rápida.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(qr: QuickReplyItem) {
    if (!window.confirm(`Remover atalho "${qr.shortcut}"?`)) return;
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/quick-replies/${qr.id}`, { method: 'DELETE' });
      await onRefresh();
      onNotify('Atalho removido.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao remover atalho.');
    }
  }

  function copyContent(text: string) {
    navigator.clipboard?.writeText(text);
    onNotify('Texto copiado para a área de transferência.');
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--nx-text)]">
            Respostas Rápidas (/atalho) & Gatilhos Automáticos
          </h2>
          <p className="text-xs text-[var(--nx-muted)]">
            Crie atalhos para a equipe usar no atendimento ou ative gatilhos por palavra-chave para resposta imediata no WhatsApp.
          </p>
        </div>

        <button type="button" onClick={openNew} className="nx-btn-primary px-4 py-2 text-xs shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Novo Atalho / Gatilho
        </button>
      </div>

      {quickReplies.length === 0 ? (
        <div className="bg-[var(--nx-surface)] border border-dashed border-[var(--nx-border-strong)] rounded-lg p-12 text-center text-xs text-[var(--nx-subtle)]">
          Nenhum atalho cadastrado. Crie respostas como <code>/pix</code> ou <code>/endereco</code>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickReplies.map((qr) => (
            <div
              key={qr.id}
              className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="tabular-data text-xs font-bold px-2.5 py-0.5 rounded bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]">
                      {qr.shortcut}
                    </span>
                    <span className="text-xs font-bold text-[var(--nx-text)]">{qr.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)] text-[var(--nx-muted)]">
                    {qr.category}
                  </span>
                </div>

                <p className="text-xs text-[var(--nx-text)] bg-[var(--nx-bg)] border border-[var(--nx-border)] rounded-md p-3 leading-relaxed whitespace-pre-wrap">
                  {qr.content}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {qr.autoTrigger ? (
                    <span className="px-2 py-0.5 rounded bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)] font-semibold">
                      Gatilho Automático Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]">
                      Uso Manual na Inbox
                    </span>
                  )}
                  {qr.triggerHandoff && (
                    <span className="px-2 py-0.5 rounded bg-[var(--nx-amber-bg)] text-[var(--nx-amber)] font-semibold">
                      Aciona Humano
                    </span>
                  )}
                  <span className="text-[var(--nx-subtle)] tabular-data ml-auto">
                    {qr.usageCount}x usado
                  </span>
                </div>

                {qr.triggerKeywords && (
                  <div className="text-[11px] text-[var(--nx-muted)]">
                    Palavras-chave: <span className="tabular-data text-[var(--nx-text)]">{qr.triggerKeywords}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--nx-border)]">
                <button
                  type="button"
                  onClick={() => copyContent(qr.content)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-[11px] text-[var(--nx-text)]"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(qr)}
                  className="p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-[var(--nx-muted)] hover:text-[var(--nx-text)]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(qr)}
                  className="p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-error)] text-[var(--nx-muted)] hover:text-[var(--nx-error)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen &&
        createPortal(
          <div className="nx-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="nx-modal-main p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--nx-border)]">
                <h3 className="text-base font-bold text-[var(--nx-text)]">
                  {editingId ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida / Gatilho'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded hover:bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="nx-field !mb-0">
                    <input
                      type="text"
                      placeholder=" "
                      value={form.shortcut}
                      onChange={(e) => setForm((p) => ({ ...p, shortcut: e.target.value }))}
                      required
                    />
                    <label>Atalho (ex: /pix)</label>
                  </div>
                  <div className="nx-field !mb-0">
                    <input
                      type="text"
                      placeholder=" "
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      required
                    />
                    <label>Título</label>
                  </div>
                  <div className="nx-field !mb-0">
                    <select
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      <option value="ATENDIMENTO">Atendimento</option>
                      <option value="VENDAS">Vendas</option>
                      <option value="FINANCEIRO">Financeiro</option>
                      <option value="POS_VENDA">Pós-venda</option>
                    </select>
                    <label>Categoria</label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[var(--nx-muted)] mr-1">Variáveis:</span>
                    {VARIABLES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] hover:border-[var(--nx-primary)] tabular-data text-[10px] text-[var(--nx-text)]"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="nx-field !mb-0">
                    <textarea
                      placeholder=" "
                      value={form.content}
                      onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                      required
                    />
                    <label>Mensagem da resposta rápida</label>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-[var(--nx-text)]">
                        Disparo automático por palavra-chave no WhatsApp
                      </div>
                      <div className="text-[11px] text-[var(--nx-muted)]">
                        Responde na hora sem consumir tokens da IA quando o cliente digitar um dos termos abaixo.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.autoTrigger}
                      onChange={(e) => setForm((p) => ({ ...p, autoTrigger: e.target.checked }))}
                      className="w-4 h-4 accent-[var(--nx-primary)]"
                    />
                  </label>

                  {form.autoTrigger && (
                    <>
                      <div className="nx-field !mb-0">
                        <input
                          type="text"
                          placeholder=" "
                          value={form.triggerKeywords}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, triggerKeywords: e.target.value }))
                          }
                        />
                        <label>Palavras-chave separadas por vírgula (ex: pix, endereco, urgente)</label>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[var(--nx-text)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.triggerHandoff}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, triggerHandoff: e.target.checked }))
                          }
                          className="accent-[var(--nx-primary)]"
                        />
                        Pausar IA e acionar atendente humano após disparar este gatilho
                      </label>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-md border border-[var(--nx-border-strong)] text-xs font-medium text-[var(--nx-text)]"
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="nx-btn-primary px-5 py-2 text-xs">
                    {saving ? 'Salvando...' : 'Salvar Atalho'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

interface FollowUpRadarTabProps {
  tenantSlug: string;
  radar: RadarItem[];
  onRefresh: () => Promise<void>;
  onOpenInbox: () => void;
  onNotify: (msg: string) => void;
}

export const FollowUpRadarTab: React.FC<FollowUpRadarTabProps> = ({
  tenantSlug,
  radar,
  onRefresh,
  onOpenInbox,
  onNotify
}) => {
  async function handleResumeAi(phone: string) {
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/inbox/handoff`, {
        method: 'POST',
        body: JSON.stringify({ customerPhone: phone, pauseForHuman: false })
      });
      await onRefresh();
      onNotify(`IA reativada para +${phone}.`);
    } catch (err: any) {
      onNotify(err.message || 'Erro ao retomar IA.');
    }
  }

  function formatWait(mins: number) {
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--nx-amber-bg)] text-[var(--nx-amber)] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--nx-text)]">
              Radar de Conversas & Follow-up
            </h2>
            <p className="text-xs text-[var(--nx-muted)]">
              Conversas aguardando atendente humano ou esfriando sem retorno para ninguém ficar sem resposta.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenInbox}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)]"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ir para Conversas ao Vivo
        </button>
      </div>

      {radar.length === 0 ? (
        <div className="bg-[var(--nx-surface)] border border-dashed border-[var(--nx-border-strong)] rounded-lg p-12 text-center text-xs text-[var(--nx-subtle)]">
          Nenhuma conversa pendente no radar no momento. Tudo em dia!
        </div>
      ) : (
        <div className="space-y-3">
          {radar.map((item) => {
            const isSentimentRed =
              item.sentiment === 'URGENT' || item.sentiment === 'FRUSTRATED';
            return (
            <div
              key={item.id}
              className={`bg-[var(--nx-surface)] border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSentimentRed
                  ? 'border-[var(--nx-error)] ring-1 ring-[var(--nx-error)]/30'
                  : 'border-[var(--nx-border)]'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[var(--nx-text)]">
                    {item.customerName}
                  </span>
                  <span className="tabular-data text-xs text-[var(--nx-muted)]">
                    +{item.customerPhone}
                  </span>
                  {isSentimentRed && (
                    <span className="px-2 py-0.5 rounded bg-[var(--nx-error)] text-white text-[10px] font-bold">
                      {item.sentiment === 'URGENT' ? 'Alerta Urgente' : 'Cliente Insatisfeito'}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.priority === 'URGENT'
                        ? 'bg-[var(--nx-error-bg)] text-[var(--nx-error)]'
                        : item.priority === 'HIGH'
                        ? 'bg-[var(--nx-amber-bg)] text-[var(--nx-amber)]'
                        : 'bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]'
                    }`}
                  >
                    {item.reason}
                  </span>
                </div>
                {item.lastMessageText && (
                  <p className="text-xs text-[var(--nx-muted)] truncate max-w-2xl">
                    Última mensagem: "{item.lastMessageText}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-xs text-[var(--nx-subtle)] tabular-data">
                  <Clock className="w-3.5 h-3.5" />
                  há {formatWait(item.waitMinutes)}
                </span>
                {item.state === 'HUMAN_HANDOFF' && (
                  <button
                    type="button"
                    onClick={() => handleResumeAi(item.customerPhone)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)] text-xs font-semibold hover:opacity-90"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Retomar IA
                  </button>
                )}
                <a
                  href={`https://wa.me/${item.customerPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="nx-btn-primary px-3 py-1.5 text-xs"
                >
                  Chamar WhatsApp
                </a>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
