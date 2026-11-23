import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Ban,
  UserCheck,
  Trash2,
  Edit3,
  Download,
  Tag,
  X
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface WhatsAppContactItem {
  id: string;
  phone: string;
  name?: string | null;
  pushName?: string | null;
  aiBlocked: boolean;
  tags: string[];
  notes?: string | null;
  source: string;
  lastMessageAt?: string | null;
}

interface WhatsAppContactsTabProps {
  tenantSlug: string;
  contacts: WhatsAppContactItem[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

const SUGGESTED_TAGS = ['VIP', 'Fornecedor', 'Família', 'Orçamento', 'Lead Quente', 'Equipe'];

export const WhatsAppContactsTab: React.FC<WhatsAppContactsTabProps> = ({
  tenantSlug,
  contacts,
  onRefresh,
  onNotify
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    name: '',
    tags: [] as string[],
    customTag: '',
    notes: '',
    aiBlocked: false
  });
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter((c) => {
    if (filter === 'blocked' && !c.aiBlocked) return false;
    if (filter === 'allowed' && c.aiBlocked) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(c.phone).toLowerCase().includes(q) ||
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.pushName || '').toLowerCase().includes(q) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      String(c.notes || '').toLowerCase().includes(q)
    );
  });

  const blockedCount = contacts.filter((c) => c.aiBlocked).length;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await apiFetch(`/api/tenants/${tenantSlug}/contacts/sync`, { method: 'POST' });
      await onRefresh();
      onNotify(
        `Sincronização concluída: ${res.total} contatos (${res.syncedFromEvolution || 0} via WhatsApp).`
      );
    } catch (err: any) {
      onNotify(err.message || 'Erro ao sincronizar contatos.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleBlock(contact: WhatsAppContactItem) {
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/contacts/${contact.phone}/ai-block`, {
        method: 'PATCH',
        body: JSON.stringify({ aiBlocked: !contact.aiBlocked })
      });
      await onRefresh();
      onNotify(
        !contact.aiBlocked
          ? `IA bloqueada para ${contact.name || contact.phone}.`
          : `IA liberada novamente para ${contact.name || contact.phone}.`
      );
    } catch (err: any) {
      onNotify(err.message || 'Falha ao alterar bloqueio.');
    }
  }

  function openNewContact() {
    setForm({ phone: '', name: '', tags: [], customTag: '', notes: '', aiBlocked: false });
    setModalOpen(true);
  }

  function openEditContact(c: WhatsAppContactItem) {
    setForm({
      phone: c.phone,
      name: c.name || c.pushName || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      customTag: '',
      notes: c.notes || '',
      aiBlocked: c.aiBlocked
    });
    setModalOpen(true);
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
    }));
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) return;
    setSaving(true);
    try {
      const finalTags = [...form.tags];
      if (form.customTag.trim() && !finalTags.includes(form.customTag.trim())) {
        finalTags.push(form.customTag.trim());
      }
      await apiFetch(`/api/tenants/${tenantSlug}/contacts`, {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone,
          name: form.name,
          tags: finalTags,
          notes: form.notes,
          aiBlocked: form.aiBlocked
        })
      });
      setModalOpen(false);
      await onRefresh();
      onNotify('Contato salvo com sucesso.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao salvar contato.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact: WhatsAppContactItem) {
    if (!window.confirm(`Remover contato ${contact.name || contact.phone}?`)) return;
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/contacts/${contact.id}`, { method: 'DELETE' });
      await onRefresh();
      onNotify('Contato removido.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao remover contato.');
    }
  }

  function handleExportCsv() {
    const header = 'Telefone,Nome,IA Bloqueada,Etiquetas,Anotacoes\n';
    const rows = contacts
      .map(
        (c) =>
          `"${c.phone}","${(c.name || c.pushName || '').replace(/"/g, '""')}","${
            c.aiBlocked ? 'SIM' : 'NAO'
          }","${(c.tags || []).join('; ')}","${(c.notes || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos-${tenantSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Barra de Ferramentas */}
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[var(--nx-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone ou etiqueta..."
              className="w-full pl-9 pr-3 py-2 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
            />
          </div>

          <div className="flex rounded-md border border-[var(--nx-border-strong)] p-0.5 bg-[var(--nx-bg)] text-xs">
            {[
              { key: 'all' as const, label: `Todos (${contacts.length})` },
              { key: 'allowed' as const, label: `IA Ativa (${contacts.length - blockedCount})` },
              { key: 'blocked' as const, label: `IA Bloqueada (${blockedCount})` }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                    : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar WhatsApp
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={openNewContact}
            className="nx-btn-primary px-4 py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Tabela de Contatos com Controle de Bloqueio de IA */}
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--nx-border)] bg-[var(--nx-surface-alt)] text-[var(--nx-muted)] text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Contato</th>
                <th className="py-3 px-4 font-semibold">Número WhatsApp</th>
                <th className="py-3 px-4 font-semibold">Etiquetas</th>
                <th className="py-3 px-4 font-semibold">Filtro da IA</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--nx-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[var(--nx-subtle)]">
                    Nenhum contato encontrado neste filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-[var(--nx-surface-alt)]/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--nx-text)]">
                        {contact.name || contact.pushName || 'Sem nome'}
                      </div>
                      {contact.notes && (
                        <div className="text-[11px] text-[var(--nx-muted)] truncate max-w-xs">
                          {contact.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-data text-[var(--nx-text)]">
                      +{contact.phone}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(contact.tags || []).length === 0 ? (
                          <span className="text-[var(--nx-subtle)]">-</span>
                        ) : (
                          contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-[10px] font-medium text-[var(--nx-text)]"
                            >
                              <Tag className="w-2.5 h-2.5 text-[var(--nx-primary)]" />
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleBlock(contact)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                          contact.aiBlocked
                            ? 'bg-[var(--nx-error-bg)] text-[var(--nx-error)] border-[var(--nx-error)]/40 hover:opacity-90'
                            : 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border-[var(--nx-accent-border)] hover:opacity-90'
                        }`}
                        title={
                          contact.aiBlocked
                            ? 'Clique para voltar a permitir respostas da IA'
                            : 'Clique para bloquear a IA de responder este contato'
                        }
                      >
                        {contact.aiBlocked ? (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            IA Bloqueada
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            IA Responde
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditContact(contact)}
                          className="p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-[var(--nx-muted)] hover:text-[var(--nx-text)]"
                          title="Editar contato"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(contact)}
                          className="p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-error)] text-[var(--nx-muted)] hover:text-[var(--nx-error)]"
                          title="Remover contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Contato */}
      {modalOpen && (
        <div className="nx-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="nx-modal-main p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--nx-border)]">
              <h3 className="text-base font-bold text-[var(--nx-text)]">
                Contato & Filtro de Resposta IA
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="nx-field">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    required
                  />
                  <label>WhatsApp com DDI/DDD (ex: 5551999998888)</label>
                </div>

                <div className="nx-field">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <label>Nome do contato</label>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--nx-subtle)] mb-2">
                  Etiquetas rápidas
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUGGESTED_TAGS.map((tag) => {
                    const active = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`nx-smart-chip ${active ? 'active' : ''}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={form.customTag}
                  onChange={(e) => setForm((p) => ({ ...p, customTag: e.target.value }))}
                  placeholder="Adicionar etiqueta personalizada (opcional)"
                  className="w-full px-3 py-2 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>

              <div className="nx-field">
                <textarea
                  placeholder=" "
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <label>Observações internas (CRM)</label>
              </div>

              <label className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[var(--nx-text)]">
                    Bloquear respostas automáticas da IA para este número
                  </div>
                  <div className="text-[11px] text-[var(--nx-muted)]">
                    Ideal para familiares, fornecedores, sócios ou clientes que só você responde.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.aiBlocked}
                  onChange={(e) => setForm((p) => ({ ...p, aiBlocked: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--nx-primary)]"
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--nx-border-strong)] text-xs font-medium text-[var(--nx-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="nx-btn-primary px-5 py-2 text-xs"
                >
                  {saving ? 'Salvando...' : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppContactsTab;
