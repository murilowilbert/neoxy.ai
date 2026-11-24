import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Percent,
  Tag,
  Trash2,
  Edit3,
  X,
  PauseCircle,
  PlayCircle,
  Search,
  Filter,
  Package,
  Scissors
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { NumberField } from '../NumberField';
import { CustomSelect } from '../CustomSelect';

export interface PromotionItem {
  id: string;
  name: string;
  description?: string | null;
  appliesTo: 'PRODUCTS' | 'SERVICES' | 'BOTH';
  discountType: 'PERCENT' | 'FIXED_PRICE';
  discountValue: number;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCTS';
  targetCategory?: string | null;
  targetItemIds: string[];
  targetServiceIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  affectedCount?: number;
  sampleItems?: Array<{
    id: string;
    kind?: 'PRODUCT' | 'SERVICE';
    name: string;
    originalPrice: number;
    promoPrice: number;
  }>;
}

interface PromotionsTabProps {
  tenantSlug: string;
  promotions: PromotionItem[];
  catalog: any[];
  services: any[];
  enabledModules: string[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const PromotionsTab: React.FC<PromotionsTabProps> = ({
  tenantSlug,
  promotions,
  catalog,
  services,
  enabledModules,
  onRefresh,
  onNotify
}) => {
  const hasStock = enabledModules.includes('stock') || catalog.length > 0;
  const hasServices = enabledModules.includes('services') || services.length > 0;
  const defaultAppliesTo: 'PRODUCTS' | 'SERVICES' | 'BOTH' =
    hasStock && hasServices ? 'BOTH' : hasServices ? 'SERVICES' : 'PRODUCTS';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pesquisa e filtro dentro do modal (mesmo padrão do Catálogo)
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('ALL');
  const [pickerKind, setPickerKind] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  const [form, setForm] = useState({
    name: '',
    description: '',
    appliesTo: defaultAppliesTo,
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED_PRICE',
    discountValue: '10',
    scope: 'ALL' as 'ALL' | 'CATEGORY' | 'PRODUCTS',
    targetCategory: '',
    targetItemIds: [] as string[],
    targetServiceIds: [] as string[],
    startsAt: '',
    endsAt: '',
    active: true
  });

  // Pool unificado de Produtos + Serviços conforme appliesTo
  const selectablePool = useMemo(() => {
    const prodList =
      form.appliesTo === 'PRODUCTS' || form.appliesTo === 'BOTH'
        ? catalog.map((it) => ({
            id: it.id,
            kind: 'PRODUCT' as const,
            code: it.code || '',
            name: it.name || '',
            brand: it.brand || '',
            category: it.category || 'Geral',
            price: Number(it.price || 0),
            imageUrl: it.imageUrl || null
          }))
        : [];
    const srvList =
      form.appliesTo === 'SERVICES' || form.appliesTo === 'BOTH'
        ? services.map((sv) => ({
            id: sv.id,
            kind: 'SERVICE' as const,
            code: sv.sku || '',
            name: sv.name || '',
            brand: sv.brand || '',
            category: sv.category || 'Serviços',
            price: Number(sv.price || 0),
            imageUrl: sv.imageUrl || null
          }))
        : [];
    return [...prodList, ...srvList];
  }, [catalog, services, form.appliesTo]);

  const categories = useMemo(
    () => Array.from(new Set(selectablePool.map((it) => it.category).filter(Boolean))).sort(),
    [selectablePool]
  );

  const filteredPool = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return selectablePool.filter((item) => {
      if (pickerKind !== 'ALL' && item.kind !== pickerKind) return false;
      if (pickerCategory !== 'ALL' && item.category !== pickerCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [selectablePool, pickerSearch, pickerCategory, pickerKind]);

  function previewPromoPrice(basePrice: number) {
    const val = Number(String(form.discountValue || 0).replace(',', '.'));
    if (!Number.isFinite(val) || val <= 0 || basePrice <= 0) return basePrice;
    if (form.discountType === 'FIXED_PRICE') {
      return val < basePrice ? val : basePrice;
    }
    const pct = Math.min(95, Math.max(0, val));
    return Number((basePrice * (1 - pct / 100)).toFixed(2));
  }

  function openCreate(defaultMode: 'PERCENT' | 'FIXED_PRICE' = 'PERCENT') {
    setEditingId(null);
    setPickerSearch('');
    setPickerCategory('ALL');
    setPickerKind('ALL');
    setForm({
      name: '',
      description: '',
      appliesTo: defaultAppliesTo,
      discountType: defaultMode,
      discountValue: defaultMode === 'PERCENT' ? '10' : '',
      scope: defaultMode === 'FIXED_PRICE' ? 'PRODUCTS' : 'ALL',
      targetCategory: categories[0] || '',
      targetItemIds: [],
      targetServiceIds: [],
      startsAt: '',
      endsAt: '',
      active: true
    });
    setModalOpen(true);
  }

  function openEdit(promo: PromotionItem) {
    setEditingId(promo.id);
    setPickerSearch('');
    setPickerCategory('ALL');
    setPickerKind('ALL');
    setForm({
      name: promo.name,
      description: promo.description || '',
      appliesTo: promo.appliesTo || 'PRODUCTS',
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      scope: promo.scope,
      targetCategory: promo.targetCategory || categories[0] || '',
      targetItemIds: Array.isArray(promo.targetItemIds) ? promo.targetItemIds : [],
      targetServiceIds: Array.isArray(promo.targetServiceIds) ? promo.targetServiceIds : [],
      startsAt: promo.startsAt ? String(promo.startsAt).slice(0, 10) : '',
      endsAt: promo.endsAt ? String(promo.endsAt).slice(0, 10) : '',
      active: promo.active
    });
    setModalOpen(true);
  }

  function toggleSelection(item: { id: string; kind: 'PRODUCT' | 'SERVICE' }) {
    if (item.kind === 'PRODUCT') {
      setForm((prev) => ({
        ...prev,
        targetItemIds: prev.targetItemIds.includes(item.id)
          ? prev.targetItemIds.filter((id) => id !== item.id)
          : [...prev.targetItemIds, item.id]
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        targetServiceIds: prev.targetServiceIds.includes(item.id)
          ? prev.targetServiceIds.filter((id) => id !== item.id)
          : [...prev.targetServiceIds, item.id]
      }));
    }
  }

  function selectAllFiltered() {
    const prodIds = new Set(form.targetItemIds);
    const srvIds = new Set(form.targetServiceIds);
    for (const it of filteredPool) {
      if (it.kind === 'PRODUCT') prodIds.add(it.id);
      else srvIds.add(it.id);
    }
    setForm((prev) => ({
      ...prev,
      targetItemIds: Array.from(prodIds),
      targetServiceIds: Array.from(srvIds)
    }));
  }

  function clearAllSelected() {
    setForm((prev) => ({ ...prev, targetItemIds: [], targetServiceIds: [] }));
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
          appliesTo: form.appliesTo,
          discountType: form.discountType,
          discountValue: Number(String(form.discountValue).replace(',', '.')),
          scope: form.scope,
          targetCategory: form.scope === 'CATEGORY' ? form.targetCategory : null,
          targetItemIds: form.scope === 'PRODUCTS' ? form.targetItemIds : [],
          targetServiceIds: form.scope === 'PRODUCTS' ? form.targetServiceIds : [],
          startsAt: form.startsAt ? `${form.startsAt}T00:00:00` : null,
          endsAt: form.endsAt ? `${form.endsAt}T23:59:59` : null,
          active: form.active
        })
      });
      setModalOpen(false);
      await onRefresh();
      onNotify('Promoção salva e aplicada automaticamente aos preços e ao bot do WhatsApp.');
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

  const totalSelectedCount = form.targetItemIds.length + form.targetServiceIds.length;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Cabeçalho e Ações Rápidas */}
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--nx-text)]">
            Promoções & Ofertas (Produtos e Serviços)
          </h2>
          <p className="text-xs text-[var(--nx-muted)]">
            Aplique descontos percentuais gerais/por categoria ou preços manuais em produtos e serviços específicos. O bot divulga os valores automaticamente.
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
            Preço Manual em Item / Serviço
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
            Crie uma campanha percentual ou defina um preço promocional fixo em produtos ou serviços selecionados.
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--nx-bg)] border border-[var(--nx-border)] text-[var(--nx-muted)]">
                        {promo.appliesTo === 'SERVICES'
                          ? 'Serviços'
                          : promo.appliesTo === 'BOTH'
                          ? 'Produtos + Serviços'
                          : 'Produtos'}
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
                        ? 'Todos os itens'
                        : promo.scope === 'CATEGORY'
                        ? `Categoria: ${promo.targetCategory}`
                        : `${(promo.targetItemIds?.length || 0) + (promo.targetServiceIds?.length || 0)} item(ns) selecionado(s)`}
                    </strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)] tabular-data">
                    {promo.affectedCount ?? 0} atingido(s)
                  </span>
                  {promo.endsAt && (
                    <span className="px-2 py-0.5 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)] tabular-data">
                      Até {new Date(promo.endsAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {promo.sampleItems && promo.sampleItems.length > 0 && (
                  <div className="pt-2 border-t border-[var(--nx-border)] space-y-1.5">
                    {promo.sampleItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[var(--nx-text)] truncate inline-flex items-center gap-1.5">
                          {it.kind === 'SERVICE' ? (
                            <Scissors className="w-3 h-3 text-[var(--nx-primary)] shrink-0" />
                          ) : (
                            <Package className="w-3 h-3 text-[var(--nx-muted)] shrink-0" />
                          )}
                          <span className="truncate">{it.name}</span>
                        </span>
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

      {/* Modal Criar / Editar Promoção via Portal no body (centralização perfeita!) */}
      {modalOpen &&
        createPortal(
          <div className="nx-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div
              className="nx-modal-main nx-modal-main--wide p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--nx-border)]">
                <div>
                  <h3 className="text-base font-bold text-[var(--nx-text)]">
                    {editingId ? 'Editar Promoção' : 'Nova Promoção de Produtos / Serviços'}
                  </h3>
                  <p className="text-xs text-[var(--nx-muted)]">
                    Pesquise e filtre produtos ou serviços como no catálogo para montar sua oferta rapidamente.
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

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="nx-field !mb-0">
                    <input
                      type="text"
                      placeholder=" "
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                    <label>Nome da campanha (ex: Semana da Pintura / Oferta Hidrojateamento)</label>
                  </div>

                  <div className="nx-field !mb-0">
                    <input
                      type="text"
                      placeholder=" "
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                    <label>Descrição curta (opcional)</label>
                  </div>
                </div>

                {/* Alvo (Produtos / Serviços), Tipo de Desconto & Escopo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <CustomSelect
                    label="Válido para"
                    value={form.appliesTo}
                    onChange={(val) =>
                      setForm((p) => ({
                        ...p,
                        appliesTo: val as 'PRODUCTS' | 'SERVICES' | 'BOTH'
                      }))
                    }
                    options={[
                      ...(hasStock ? [{ value: 'PRODUCTS', label: 'Produtos' }] : []),
                      ...(hasServices ? [{ value: 'SERVICES', label: 'Serviços' }] : []),
                      ...(hasStock && hasServices
                        ? [{ value: 'BOTH', label: 'Produtos + Serviços' }]
                        : [])
                    ]}
                    className="!mb-0"
                  />

                  <CustomSelect
                    label="Regra de preço"
                    value={form.discountType}
                    onChange={(val) =>
                      setForm((p) => ({
                        ...p,
                        discountType: val as 'PERCENT' | 'FIXED_PRICE'
                      }))
                    }
                    options={[
                      { value: 'PERCENT', label: 'Porcentagem (%)' },
                      { value: 'FIXED_PRICE', label: 'Preço Fixo (R$)' }
                    ]}
                    className="!mb-0"
                  />

                  <NumberField
                    label={form.discountType === 'PERCENT' ? 'Desconto (%)' : 'Preço promocional (R$)'}
                    value={form.discountValue}
                    onChange={(val) => setForm((p) => ({ ...p, discountValue: val }))}
                    step={form.discountType === 'PERCENT' ? 1 : 0.5}
                    min={0.01}
                    required
                    className="!mb-0"
                  />

                  <CustomSelect
                    label="Aplicar em"
                    value={form.scope}
                    onChange={(val) =>
                      setForm((p) => ({
                        ...p,
                        scope: val as 'ALL' | 'CATEGORY' | 'PRODUCTS'
                      }))
                    }
                    options={[
                      { value: 'PRODUCTS', label: 'Itens específicos' },
                      { value: 'CATEGORY', label: 'Por categoria' },
                      { value: 'ALL', label: 'Todos' }
                    ]}
                    className="!mb-0"
                  />
                </div>

                {form.scope === 'CATEGORY' && (
                  <CustomSelect
                    label="Categoria alvo"
                    value={form.targetCategory}
                    onChange={(val) => setForm((p) => ({ ...p, targetCategory: val }))}
                    options={categories.map((cat) => ({ value: cat, label: cat }))}
                    className="!mb-0"
                  />
                )}

                {form.scope === 'PRODUCTS' && (
                  <div className="space-y-2.5 p-3.5 rounded-lg border border-[var(--nx-border)] bg-[var(--nx-bg)]">
                    {/* Barra de Busca e Filtro (padrão Catálogo) */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-[var(--nx-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Pesquisar por nome, SKU, marca ou categoria..."
                          className="w-full pl-8 pr-3 py-2 rounded-md bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                        />
                      </div>

                      <CustomSelect
                        variant="compact"
                        value={pickerCategory}
                        onChange={(val) => setPickerCategory(val)}
                        options={[
                          { value: 'ALL', label: 'Todas categorias' },
                          ...categories.map((c) => ({ value: c, label: c }))
                        ]}
                      />

                      {form.appliesTo === 'BOTH' && (
                        <CustomSelect
                          variant="compact"
                          value={pickerKind}
                          onChange={(val) =>
                            setPickerKind(val as 'ALL' | 'PRODUCT' | 'SERVICE')
                          }
                          options={[
                            { value: 'ALL', label: 'Produtos & Serviços' },
                            { value: 'PRODUCT', label: 'Só Produtos' },
                            { value: 'SERVICE', label: 'Só Serviços' }
                          ]}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--nx-muted)]">
                      <span>
                        <strong className="text-[var(--nx-text)] tabular-data">
                          {totalSelectedCount}
                        </strong>{' '}
                        selecionado(s) de {selectablePool.length}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className="text-[var(--nx-primary)] font-semibold hover:underline"
                        >
                          Selecionar filtrados ({filteredPool.length})
                        </button>
                        {totalSelectedCount > 0 && (
                          <button
                            type="button"
                            onClick={clearAllSelected}
                            className="text-[var(--nx-muted)] hover:text-[var(--nx-error)]"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-[var(--nx-border-strong)] rounded-lg divide-y divide-[var(--nx-border)] bg-[var(--nx-surface)]">
                      {filteredPool.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[var(--nx-subtle)]">
                          Nenhum produto ou serviço encontrado com este filtro.
                        </div>
                      ) : (
                        filteredPool.map((item) => {
                          const checked =
                            item.kind === 'PRODUCT'
                              ? form.targetItemIds.includes(item.id)
                              : form.targetServiceIds.includes(item.id);
                          const newPrice = previewPromoPrice(item.price);
                          const hasDiscount = newPrice < item.price;

                          return (
                            <label
                              key={`${item.kind}-${item.id}`}
                              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                                checked ? 'bg-[var(--nx-primary-soft)]/50' : 'hover:bg-[var(--nx-surface-alt)]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSelection(item)}
                                  className="accent-[var(--nx-primary)] shrink-0"
                                />
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-8 h-8 rounded object-cover border border-[var(--nx-border)] shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-[var(--nx-bg)] border border-[var(--nx-border)] flex items-center justify-center text-[var(--nx-subtle)] shrink-0">
                                    {item.kind === 'SERVICE' ? (
                                      <Scissors className="w-3.5 h-3.5" />
                                    ) : (
                                      <Package className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-[var(--nx-text)] truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--nx-muted)] flex items-center gap-2">
                                    <span>{item.kind === 'SERVICE' ? 'Serviço' : 'Produto'}</span>
                                    <span>/ {item.category}</span>
                                    {item.code && <span className="tabular-data">/ {item.code}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right tabular-data shrink-0">
                                {checked && hasDiscount ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-[var(--nx-accent)]">
                                      R$ {newPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] line-through text-[var(--nx-subtle)]">
                                      R$ {item.price.toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[var(--nx-muted)]">
                                    R$ {item.price.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Vigência opcional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="nx-field !mb-0">
                    <input
                      type="date"
                      placeholder=" "
                      value={form.startsAt}
                      onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                    />
                    <label>Início (opcional)</label>
                  </div>
                  <div className="nx-field !mb-0">
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
                  <button type="submit" disabled={saving} className="nx-btn-primary px-5 py-2 text-xs">
                    {saving ? 'Salvando...' : 'Salvar Promoção'}
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

export default PromotionsTab;
