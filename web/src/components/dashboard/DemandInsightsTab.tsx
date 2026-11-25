import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertCircle,
  Search,
  Package,
  Scissors,
  Plus,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface DemandOccurrence {
  customerPhone: string;
  customerName?: string;
  messageSnippet?: string;
  requestedAt?: string;
}

interface PopularItem {
  id: string;
  itemType: string;
  name: string;
  searchCount: number;
  lastRequested: string;
  imageUrl: string | null;
  category: string | null;
  sku: string | null;
  price: number | null;
}

interface OpportunityItem {
  id: string;
  itemType: string;
  name: string;
  searchCount: number;
  totalSearchCount?: number;
  occurrences: DemandOccurrence[];
  lastRequested: string;
}

interface DemandInsightsTabProps {
  tenantSlug: string;
  scope: 'products' | 'services';
  mode: 'popular' | 'opportunities';
  onQuickCreate: (itemName: string, scope: 'products' | 'services') => void;
  onOpenConversation: (phone: string) => void;
}

const PERIOD_OPTIONS = [
  { key: '7', label: 'Últimos 7 dias' },
  { key: '30', label: 'Últimos 30 dias' },
  { key: '90', label: 'Últimos 90 dias' },
  { key: 'all', label: 'Todo o período' }
];

function formatDateShort(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

export const DemandInsightsTab: React.FC<DemandInsightsTabProps> = ({
  tenantSlug,
  scope,
  mode,
  onQuickCreate,
  onOpenConversation
}) => {
  const [days, setDays] = useState<string>('30');
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 260);
    return () => clearTimeout(t);
  }, [query]);

  const loadInsights = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope,
        days,
        ...(debouncedQuery ? { q: debouncedQuery } : {})
      });
      const res = await apiFetch(`/api/tenants/${tenantSlug}/demand-insights?${params.toString()}`);
      if (res.insights) {
        setPopular(res.insights.popular || []);
        setOpportunities(res.insights.opportunities || []);
      }
    } catch {
      setPopular([]);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, scope, days, debouncedQuery]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const isProducts = scope === 'products';
  const isPopular = mode === 'popular';

  const items = isPopular ? popular : opportunities;
  const maxCount = Math.max(1, ...items.map((i) => i.searchCount || 1));

  const title = isPopular
    ? isProducts
      ? 'Produtos Mais Procurados'
      : 'Serviços Mais Procurados'
    : isProducts
    ? 'Oportunidades: Produtos ainda não oferecidos'
    : 'Oportunidades: Serviços ainda não oferecidos';

  const subtitle = isPopular
    ? isProducts
      ? 'Itens ativos do seu catálogo com maior volume de consulta no WhatsApp no período selecionado.'
      : 'Serviços ativos da sua grade mais buscados pelos clientes no WhatsApp no período selecionado.'
    : isProducts
    ? 'Produtos que os clientes pediram no WhatsApp e ainda não estão cadastrados no seu catálogo.'
    : 'Serviços solicitados no WhatsApp que sua empresa ainda não oferece ou ainda não cadastrou.';

  return (
    <div className="space-y-6 animate-fade-up" data-testid={`demand-insights-${scope}-${mode}`}>
      {/* Barra de Filtros: Busca + Período */}
      <div className="nx-spotlight-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="nx-icon-tile shrink-0">
              {isPopular ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[var(--nx-text)]">{title}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border border-[var(--nx-volt-border)] tabular-data">
                  {items.length} {items.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-[var(--nx-muted)] mt-0.5 leading-relaxed">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadInsights}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors shrink-0 self-start lg:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Controles de Pesquisa e Seletor de Período */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-[var(--nx-border)]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--nx-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isProducts
                  ? 'Pesquisar por nome, categoria ou código SKU...'
                  : 'Pesquisar por nome do serviço ou categoria...'
              }
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--nx-subtle)] mr-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>
            {PERIOD_OPTIONS.map((opt) => {
              const active = days === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDays(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                    active
                      ? 'bg-[var(--nx-primary)] text-[var(--nx-primary-fg)] border-transparent shadow-sm'
                      : 'bg-[var(--nx-bg)] text-[var(--nx-muted)] border-[var(--nx-border-strong)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Resultados */}
      <div className="nx-spotlight-card p-5 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-16 rounded-xl bg-[var(--nx-surface-alt)] animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl mx-auto bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] flex items-center justify-center text-[var(--nx-subtle)]">
              {isProducts ? <Package className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
            </div>
            <div className="text-sm font-bold text-[var(--nx-text)]">
              Nenhum registro encontrado neste período
            </div>
            <p className="text-xs text-[var(--nx-muted)] max-w-md mx-auto">
              {debouncedQuery
                ? `Não encontramos resultados para "${debouncedQuery}" nos ${PERIOD_OPTIONS.find((p) => p.key === days)?.label.toLowerCase()}.`
                : `Assim que clientes consultarem ${isProducts ? 'produtos' : 'serviços'} no WhatsApp, o ranking aparecerá automaticamente aqui.`}
            </p>
          </div>
        ) : isPopular ? (
          <div className="space-y-3.5">
            {(popular as PopularItem[]).map((item, idx) => {
              const pct = Math.max(6, Math.round(((item.searchCount || 1) / maxCount) * 100));
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[var(--nx-bg)] border border-[var(--nx-border)] hover:border-[var(--nx-border-strong)] transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[var(--nx-surface)] border border-[var(--nx-border)] flex items-center justify-center overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isProducts ? (
                        <Package className="w-5 h-5 text-[var(--nx-muted)]" />
                      ) : (
                        <Scissors className="w-5 h-5 text-[var(--nx-muted)]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-[var(--nx-subtle)] tabular-data">
                              #{idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[var(--nx-text)] truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-[var(--nx-muted)] mt-0.5">
                            {item.category && <span>{item.category}</span>}
                            {item.sku && <span className="font-mono text-[10.5px]">SKU: {item.sku}</span>}
                            {item.price !== null && item.price !== undefined && (
                              <span className="font-semibold text-[var(--nx-text)] tabular-data">
                                R$ {Number(item.price).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            <span className="text-[var(--nx-subtle)]">
                              Última consulta: {formatDateShort(item.lastRequested)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold tabular-data bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border border-[var(--nx-volt-border)] shrink-0">
                          {item.searchCount}x
                        </span>
                      </div>

                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-[var(--nx-surface-alt)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--nx-primary)] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {(opportunities as OpportunityItem[]).map((item) => {
              const pct = Math.max(8, Math.round(((item.searchCount || 1) / maxCount) * 100));
              const isOpen = expandedId === item.id;
              const occs = item.occurrences || [];

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--nx-bg)] border border-[var(--nx-border)] overflow-hidden transition-colors hover:border-[var(--nx-border-strong)]"
                >
                  <div className="p-3.5 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : item.id)}
                        className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-[var(--nx-muted)] shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[var(--nx-muted)] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-[var(--nx-text)] truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-[var(--nx-subtle)]">
                              ({occs.length} {occs.length === 1 ? 'conversa' : 'conversas'})
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--nx-subtle)] mt-0.5">
                            Último pedido: {formatDateShort(item.lastRequested)}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold tabular-data bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                          {item.searchCount}x
                        </span>
                        <button
                          type="button"
                          onClick={() => onQuickCreate(item.name, scope)}
                          className="nx-btn-primary px-3.5 py-1.5 text-[11.5px]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isProducts ? 'Cadastrar produto' : 'Cadastrar serviço'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--nx-surface-alt)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-[var(--nx-border)] bg-[var(--nx-surface)]/50 space-y-2">
                      {occs.length === 0 ? (
                        <p className="text-[11px] text-[var(--nx-muted)]">
                          Nenhuma mensagem detalhada salva para esta demanda ainda.
                        </p>
                      ) : (
                        occs.map((o, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)] flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[var(--nx-text)] truncate">
                                {o.customerName || o.customerPhone}
                              </div>
                              <p className="text-[11px] text-[var(--nx-muted)] truncate mt-0.5">
                                "{o.messageSnippet || item.name}"
                              </p>
                            </div>
                            {o.customerPhone && (
                              <button
                                type="button"
                                onClick={() => onOpenConversation(o.customerPhone)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-[11px] font-medium text-[var(--nx-text)] shrink-0"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Abrir chat
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
