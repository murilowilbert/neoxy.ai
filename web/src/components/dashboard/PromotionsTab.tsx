import React, { useState } from 'react';
import { Plus, Percent, Tag, Trash2, Edit3, X, PauseCircle, PlayCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface PromotionItem {
  id: string;
  name: string;
  description?: string | null;
  discountType: 'PERCENT' | 'FIXED_PRICE';
  discountValue: number;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCTS';
  targetCategory?: string | null;
  targetItemIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  affectedCount?: number;
  sampleItems?: Array<{
    id: string;
    name: string;
    originalPrice: number;
    promoPrice: number;
  }>;
}

interface PromotionsTabProps {
  tenantSlug: string;
  promotions: PromotionItem[];
  catalog: any[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const PromotionsTab: React.FC<PromotionsTabProps> = ({
  tenantSlug,
  promotions,
  catalog,
  onRefresh,
  onNotify
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED_PRICE',
    discountValue: '10',
    scope: 'ALL' as 'ALL' | 'CATEGORY' | 'PRODUCTS',
    targetCategory: '',
    targetItemIds: [] as string[],
    startsAt: '',
    endsAt: '',
    active: true
  });

  const categories = Array.from(
    new Set(catalog.map((it) => it.category || 'Geral').filter(Boolean))
  ).sort();

  function openCreate(defaultMode: 'PERCENT' | 'FIXED_PRICE' = 'PERCENT') {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      discountType: defaultMode,
      discountValue: defaultMode === 'PERCENT' ? '10' : '',
      scope: defaultMode === 'FIXED_PRICE' ? 'PRODUCTS' : 'ALL',
      targetCategory: categories[0] || '',
      targetItemIds: [],
      startsAt: '',
      endsAt: '',
      active: true
    });
    setModalOpen(true);
  }

  function openEdit(promo: PromotionItem) {
    setEditingId(promo.id);
    setForm({
      name: promo.name,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      scope: promo.scope,
      targetCategory: promo.targetCategory || categories[0] || '',
      targetItemIds: Array.isArray(promo.targetItemIds) ? promo.targetItemIds : [],
      startsAt: promo.startsAt ? String(promo.startsAt).slice(0, 10) : '',
      endsAt: promo.endsAt ? String(promo.endsAt).slice(0, 10) : '',
      active: promo.active
    });
    setModalOpen(true);
  }

  function toggleProductSelection(itemId: string) {
    setForm((prev) => ({
      ...prev,
      targetItemIds: prev.targetItemIds.includes(itemId)
        ? prev.targetItemIds.filter((id) => id !== itemId)
        : [...prev.targetItemIds, itemId]
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/promotions`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingId || undefined,
          name: form.name,
          description: form.description,
          discountType: form.discountType,
          discountValue: Number(String(form.discountValue).replace(',', '.')),
          scope: form.scope,
          targetCategory: form.scope === 'CATEGORY' ? form.targetCategory : null,
          targetItemIds: form.scope === 'PRODUCTS' ? form.targetItemIds : [],
          startsAt: form.startsAt ? `${form.startsAt}T00:00:00` : null,
          endsAt: form.endsAt ? `${form.endsAt}T23:59:59` : null,
          active: form.active
        })
      });
      setModalOpen(false);
      await onRefresh();
      onNotify('Promoção salva e aplicada automaticamente ao catálogo e WhatsApp.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao salvar promoção.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(promo: PromotionItem) {
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/promotions/${promo.id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !promo.active })
      });
      await onRefresh();
      onNotify(!promo.active ? 'Promoção ativada.' : 'Promoção pausada.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao atualizar promoção.');
    }
  }

  async function handleDelete(promo: PromotionItem) {
    if (!window.confirm(`Excluir promoção "${promo.name}"?`)) return;
    try {
      await apiFetch(`/api/tenants/${tenantSlug}/promotions/${promo.id}`, { method: 'DELETE' });
      await onRefresh();
      onNotify('Promoção excluída.');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao excluir promoção.');
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Cabeçalho e Ações Rápidas */}
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--nx-text)]">
            Promoções & Precificação Dinâmica
          </h2>
          <p className="text-xs text-[var(--nx-muted)]">
            Aplique descontos percentuais gerais/por categoria ou preços manuais em produtos específicos. O bot do WhatsApp divulga os valores automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openCreate('PERCENT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)] transition-colors"
          >
            <Percent className="w-3.5 h-3.5 text-[var(--nx-primary)]" />
            Desconto % Geral
          </button>
          <button
            type="button"
            onClick={() => openCreate('FIXED_PRICE')}
            className="nx-btn-primary px-4 py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Preço Manual em Produto
          </button>
        </div>
      </div>

      {/* Lista de Promoções */}
      {promotions.length === 0 ? (
        <div className="bg-[var(--nx-surface)] border border-dashed border-[var(--nx-border-strong)] rounded-lg p-12 text-center space-y-2">
          <Tag className="w-7 h-7 text-[var(--nx-subtle)] mx-auto" />
          <div className="text-sm font-semibold text-[var(--nx-text)]">
            Nenhuma promoção cadastrada
          </div>
          <p className="text-xs text-[var(--nx-muted)]">
            Crie uma campanha percentual ou defina um preço promocional fixo em itens selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`bg-[var(--nx-surface)] border rounded-lg p-5 flex flex-col justify-between gap-4 ${
                promo.active ? 'border-[var(--nx-border-strong)]' : 'border-[var(--nx-border)] opacity-70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[var(--nx-text)]">{promo.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          promo.active
                            ? 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)]'
                            : 'bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]'
                        }`}
                      >
                        {promo.active ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-[var(--nx-muted)] mt-1">{promo.description}</p>
                    )}
                  </div>

                  <div className="px-3 py-1.5 rounded-md bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] font-bold text-sm tabular-data shrink-0">
                    {promo.discountType === 'PERCENT'
                      ? `-${promo.discountValue}%`
                      : `R$ ${Number(promo.discountValue).toFixed(2).replace('.', ',')}`}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-[var(--nx-muted)]">
                  <span className="px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                    Escopo:{' '}
                    <strong className="text-[var(--nx-text)]">
                      {promo.scope === 'ALL'
                        ? 'Todo o catálogo'
                        : promo.scope === 'CATEGORY'
                        ? `Categoria: ${promo.targetCategory}`
                        : `${promo.targetItemIds.length} produto(s) selecionado(s)`}
                    </strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)] tabular-data">
                    {promo.affectedCount ?? 0} itens atingidos
                  </span>
                  {promo.endsAt && (
                    <span className="px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)] tabular-data">
                      Até {new Date(promo.endsAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {/* Preview de preços calculados */}
                {promo.sampleItems && promo.sampleItems.length > 0 && (
                  <div className="pt-2 border-t border-[var(--nx-border)] space-y-1.5">
                    {promo.sampleItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[var(--nx-text)] truncate">{it.name}</span>
                        <span className="tabular-data shrink-0">
                          <span className="line-through text-[var(--nx-subtle)] mr-1.5">
                            R$ {it.originalPrice.toFixed(2).replace('.', ',')}
                          </span>
                          <strong className="text-[var(--nx-accent)]">
                            R$ {it.promoPrice.toFixed(2).replace('.', ',')}
                          </strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--nx-border)]">
                <button
                  type="button"
                  onClick={() => handleToggle(promo)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)]"
                >
                  {promo.active ? (
                    <>
                      <PauseCircle className="w-4 h-4 text-[var(--nx-amber)]" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 text-[var(--nx-accent)]" />
                      Ativar
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(promo)}
                    className="p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-[var(--nx-muted)] hover:text-[var(--nx-text)]"
                    title="Editar promoção"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo)}
                    className="p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-error)] text-[var(--nx-muted)] hover:text-[var(--nx-error)]"
                    title="Excluir promoção"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Promoção */}
      {modalOpen && (
        <div className="nx-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="nx-modal-main nx-modal-main--wide p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--nx-border)]">
              <h3 className="text-base font-bold text-[var(--nx-text)]">
                {editingId ? 'Editar Promoção' : 'Nova Promoção de Catálogo'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="nx-field">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  <label>Nome da campanha (ex: Semana da Pintura)</label>
                </div>

                <div className="nx-field">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                  <label>Descrição curta (opcional)</label>
                </div>
              </div>

              {/* Tipo de Desconto & Escopo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="nx-field">
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        discountType: e.target.value as 'PERCENT' | 'FIXED_PRICE'
                      }))
                    }
                  >
                    <option value="PERCENT">Porcentagem (% OFF)</option>
                    <option value="FIXED_PRICE">Preço Manual Fixo (R$)</option>
                  </select>
                  <label>Regra de preço</label>
                </div>

                <div className="nx-field">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder=" "
                    value={form.discountValue}
                    onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                    required
                  />
                  <label>
                    {form.discountType === 'PERCENT' ? 'Desconto (%)' : 'Preço promocional (R$)'}
                  </label>
                </div>

                <div className="nx-field">
                  <select
                    value={form.scope}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        scope: e.target.value as 'ALL' | 'CATEGORY' | 'PRODUCTS'
                      }))
                    }
                  >
                    <option value="PRODUCTS">Produtos específicos</option>
                    <option value="CATEGORY">Por categoria</option>
                    <option value="ALL">Todo o catálogo</option>
                  </select>
                  <label>Aplicar em</label>
                </div>
              </div>

              {form.scope === 'CATEGORY' && (
                <div className="nx-field">
                  <select
                    value={form.targetCategory}
                    onChange={(e) => setForm((p) => ({ ...p, targetCategory: e.target.value }))}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <label>Categoria alvo</label>
                </div>
              )}

              {form.scope === 'PRODUCTS' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--nx-subtle)]">
                    Selecione os produtos ({form.targetItemIds.length} selecionado(s))
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-[var(--nx-border-strong)] rounded-lg divide-y divide-[var(--nx-border)] bg-[var(--nx-bg)]">
                    {catalog.map((item) => {
                      const checked = form.targetItemIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs cursor-pointer hover:bg-[var(--nx-surface-alt)]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProductSelection(item.id)}
                              className="accent-[var(--nx-primary)]"
                            />
                            <span className="truncate font-medium text-[var(--nx-text)]">
                              {item.name}
                            </span>
                          </div>
                          <span className="tabular-data text-[var(--nx-muted)] shrink-0">
                            R$ {Number(item.price || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vigência opcional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="nx-field">
                  <input
                    type="date"
                    placeholder=" "
                    value={form.startsAt}
                    onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  />
                  <label>Início (opcional)</label>
                </div>
                <div className="nx-field">
                  <input
                    type="date"
                    placeholder=" "
                    value={form.endsAt}
                    onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  />
                  <label>Término (opcional)</label>
                </div>
              </div>

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
                  {saving ? 'Salvando...' : 'Salvar Promoção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsTab;
