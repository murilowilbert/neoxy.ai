import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Users
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import JellyRadio from '../reactbits/JellyRadio';

export interface WhatsAppContactItem {
  id: string;
  phone: string;
  name?: string | null;
  pushName?: string | null;
  avatarUrl?: string | null;
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

function getInitials(name?: string | null, phone?: string) {
  const clean = String(name || '').trim();
  if (clean) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }
  return String(phone || '??').slice(-2);
}

const ContactAvatar: React.FC<{ contact: Pick<WhatsAppContactItem, 'name' | 'pushName' | 'avatarUrl' | 'phone'>; size?: 'sm' | 'md' }> = ({
  contact,
  size = 'md'
}) => {
  const [imgError, setImgError] = useState(false);
  const dim = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-xs';
  const displayName = contact.name || contact.pushName;

  if (contact.avatarUrl && !imgError) {
    return (
      <img
        src={contact.avatarUrl}
        alt={displayName || contact.phone}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover border border-[var(--nx-border-strong)] shrink-0 bg-[var(--nx-surface-alt)]`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] border border-[var(--nx-border)] flex items-center justify-center font-bold shrink-0`}
    >
      {getInitials(displayName, contact.phone)}
    </div>
  );
};

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
  const [modalMode, setModalMode] = useState<'picker' | 'manual'>('picker');
  const [pickerSearch, setPickerSearch] = useState('');
  const [form, setForm] = useState({
    phone: '',
    name: '',
    pushName: '',
    avatarUrl: '',
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

  const pickerContacts = contacts.filter((c) => {
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return (
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.pushName || '').toLowerCase().includes(q) ||
      String(c.phone).toLowerCase().includes(q)
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
          ? `IA bloqueada para ${contact.name || contact.pushName || contact.phone}.`
          : `IA liberada novamente para ${contact.name || contact.pushName || contact.phone}.`
      );
    } catch (err: any) {
      onNotify(err.message || 'Falha ao alterar bloqueio.');
    }
  }

  function openNewContact() {
    setForm({
      phone: '',
      name: '',
      pushName: '',
      avatarUrl: '',
      tags: [],
      customTag: '',
      notes: '',
      aiBlocked: true
    });
    setPickerSearch('');
    setModalMode(contacts.length > 0 ? 'picker' : 'manual');
    setModalOpen(true);
  }

  function openEditContact(c: WhatsAppContactItem) {
    setForm({
      phone: c.phone,
      name: c.name || c.pushName || '',
      pushName: c.pushName || '',
      avatarUrl: c.avatarUrl || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      customTag: '',
      notes: c.notes || '',
      aiBlocked: c.aiBlocked
    });
    setModalMode('manual');
    setModalOpen(true);
  }

  function selectFromPicker(c: WhatsAppContactItem) {
    setForm({
      phone: c.phone,
      name: c.name || c.pushName || '',
      pushName: c.pushName || '',
      avatarUrl: c.avatarUrl || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      customTag: '',
      notes: c.notes || '',
      aiBlocked: !c.aiBlocked
    });
    setModalMode('manual');
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
          pushName: form.pushName || undefined,
          avatarUrl: form.avatarUrl || undefined,
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
    const header = 'Telefone,Nome,UsuarioWhatsApp,IA Bloqueada,Etiquetas,Anotacoes\n';
    const rows = contacts
      .map(
        (c) =>
          `"${c.phone}","${(c.name || '').replace(/"/g, '""')}","${(c.pushName || '').replace(
            /"/g,
            '""'
          )}","${c.aiBlocked ? 'SIM' : 'NAO'}","${(c.tags || []).join('; ')}","${(
            c.notes || ''
          ).replace(/"/g, '""')}"`
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
    <div className="space-y-6 animate-fade-up">
      {/* Barra de Ferramentas */}
      <div className="nx-spotlight-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[var(--nx-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, usuário do WhatsApp ou etiqueta..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
            />
          </div>

          <JellyRadio
            ariaLabel="Filtrar contatos por status da IA"
            size="sm"
            radius={10}
            gap={5}
            swell={0.08}
            barge={3}
            shrink={0.02}
            value={filter}
            onChange={(val) => setFilter(val as 'all' | 'allowed' | 'blocked')}
            items={[
              { value: 'all', label: `Todos (${contacts.length})` },
              { value: 'allowed', label: `IA Ativa (${contacts.length - blockedCount})` },
              { value: 'blocked', label: `IA Bloqueada (${blockedCount})` }
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar WhatsApp
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors"
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
            Selecionar / Novo Contato
          </button>
        </div>
      </div>

      {/* Lista Visual de Contatos com Foto de Perfil + Nome + Usuário */}
      <div className="nx-spotlight-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--nx-border)] bg-[var(--nx-surface-alt)] text-[var(--nx-muted)] text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Contato (Foto & Perfil)</th>
                <th className="py-3 px-4 font-semibold">Etiquetas</th>
                <th className="py-3 px-4 font-semibold">Filtro da IA</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--nx-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[var(--nx-subtle)]">
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
                      <div className="flex items-center gap-3">
                        <ContactAvatar contact={contact} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[var(--nx-text)] text-xs">
                              {contact.name || contact.pushName || 'Contato WhatsApp'}
                            </span>
                            {contact.pushName && contact.pushName !== contact.name && (
                              <span className="text-[11px] text-[var(--nx-muted)]">
                                (~{contact.pushName})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--nx-subtle)] tabular-data">
                            +{contact.phone}
                            {contact.notes ? ` / ${contact.notes}` : ''}
                          </div>
                        </div>
                      </div>
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
                            ? 'Clique para liberar a IA para este contato'
                            : 'Clique para impedir a IA de responder este contato'
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

      {/* Modal Portaled ao body (sempre centralizado na tela inteira!) */}
      {modalOpen &&
        createPortal(
          <div className="nx-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div
              className="nx-modal-main nx-modal-main--wide p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--nx-border)]">
                <div>
                  <h3 className="text-base font-bold text-[var(--nx-text)]">
                    Contatos do WhatsApp & Filtro da IA
                  </h3>
                  <p className="text-xs text-[var(--nx-muted)]">
                    Escolha visualmente pela foto e nome do contato ou cadastre um número manualmente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded hover:bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Alternador Visual WhatsApp vs Número Manual */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex rounded-md border border-[var(--nx-border-strong)] p-0.5 bg-[var(--nx-bg)] text-xs">
                  <button
                    type="button"
                    onClick={() => setModalMode('picker')}
                    className={`px-3.5 py-1.5 rounded font-medium transition-colors inline-flex items-center gap-1.5 ${
                      modalMode === 'picker'
                        ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                        : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Escolher do WhatsApp (Foto & Nome)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('manual')}
                    className={`px-3.5 py-1.5 rounded font-medium transition-colors ${
                      modalMode === 'manual'
                        ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                        : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                    }`}
                  >
                    Digitar número manualmente
                  </button>
                </div>

                {modalMode === 'picker' && (
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Atualizar fotos e nomes
                  </button>
                )}
              </div>

              {modalMode === 'picker' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[var(--nx-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Pesquisar contato pelo nome ou usuário do WhatsApp..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                    {pickerContacts.length === 0 ? (
                      <div className="col-span-2 py-10 text-center text-xs text-[var(--nx-subtle)] border border-dashed border-[var(--nx-border)] rounded-lg">
                        Nenhum contato sincronizado encontrado. Clique em "Atualizar fotos e nomes" ou use "Digitar número manualmente".
                      </div>
                    ) : (
                      pickerContacts.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                            c.aiBlocked
                              ? 'border-[var(--nx-error)]/40 bg-[var(--nx-error-bg)]/40'
                              : 'border-[var(--nx-border)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectFromPicker(c)}
                            className="flex items-center gap-3 min-w-0 text-left flex-1"
                            title="Clique para editar etiquetas, notas ou bloqueio"
                          >
                            <ContactAvatar contact={c} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--nx-text)] truncate">
                                {c.name || c.pushName || 'Sem nome'}
                              </div>
                              {c.pushName && c.pushName !== c.name && (
                                <div className="text-[11px] text-[var(--nx-muted)] truncate">
                                  ~{c.pushName}
                                </div>
                              )}
                              <div className="text-[10px] text-[var(--nx-subtle)] tabular-data">
                                +{c.phone}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBlock(c)}
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border shrink-0 transition-colors ${
                              c.aiBlocked
                                ? 'bg-[var(--nx-error)] text-white border-[var(--nx-error)]'
                                : 'bg-[var(--nx-surface)] text-[var(--nx-text)] border-[var(--nx-border-strong)] hover:border-[var(--nx-error)] hover:text-[var(--nx-error)]'
                            }`}
                          >
                            {c.aiBlocked ? 'Bloqueado' : 'Bloquear IA'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-[var(--nx-border)]">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="nx-btn-primary px-5 py-2 text-xs"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="nx-field !mb-0">
                      <input
                        type="text"
                        placeholder=" "
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        required
                      />
                      <label>WhatsApp com DDI/DDD (ex: 5551999998888)</label>
                    </div>

                    <div className="nx-field !mb-0">
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

                  <div className="nx-field !mb-0">
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
                    <button type="submit" disabled={saving} className="nx-btn-primary px-5 py-2 text-xs">
                      {saving ? 'Salvando...' : 'Salvar Contato'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default WhatsAppContactsTab;
