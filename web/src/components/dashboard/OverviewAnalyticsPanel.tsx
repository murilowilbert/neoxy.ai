import React, { useState } from 'react';
import {
  MessageSquare,
  Activity,
  Users,
  Tag,
  Plus,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface HourBucket {
  hour: number;
  label: string;
  received: number;
  aiReplies: number;
  humanReplies: number;
}

interface DayBucket {
  date: string;
  label: string;
  shortLabel: string;
  received: number;
  aiReplies: number;
  humanReplies: number;
}

export interface DemandOccurrence {
  customerPhone: string;
  customerName?: string;
  messageSnippet?: string;
  requestedAt?: string;
}

interface DemandItem {
  id: string;
  itemType: string;
  name: string;
  searchCount: number;
  inCatalog: boolean;
  occurrences?: DemandOccurrence[];
}

export interface TenantAnalytics {
  messagesToday: {
    received: number;
    aiReplies: number;
    humanReplies: number;
    total: number;
  };
  messagesByHourToday: HourBucket[];
  messagesLast7Days: DayBucket[];
  aiVsHuman: {
    totalConversations: number;
    aiOnlySessions: number;
    humanIntervenedSessions: number;
    automationRatePct: number;
    aiMessagesTotal: number;
    humanMessagesTotal: number;
    userMessagesTotal: number;
  };
  topExistingDemands: DemandItem[];
  topMissedDemands: DemandItem[];
  activePromotionsCount: number;
  blockedContactsCount: number;
  totalContactsCount: number;
  coldConversationsCount: number;
}

interface OverviewAnalyticsPanelProps {
  analytics: TenantAnalytics | null;
  metrics: any;
  enabledModules: string[];
  onQuickCreateFromDemand: (name: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenConversation?: (customerPhone: string) => void;
}

export const OverviewAnalyticsPanel: React.FC<OverviewAnalyticsPanelProps> = ({
  analytics,
  metrics,
  enabledModules,
  onQuickCreateFromDemand,
  onNavigateTab,
  onOpenConversation
}) => {
  const [chartRange, setChartRange] = useState<'today' | '7d'>('today');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [expandedMissedId, setExpandedMissedId] = useState<string | null>(null);

  const aiVsHuman = analytics?.aiVsHuman || {
    totalConversations: metrics?.activeSessions || 0,
    aiOnlySessions: Math.max(0, (metrics?.activeSessions || 0) - (metrics?.handoffSessions || 0)),
    humanIntervenedSessions: metrics?.handoffSessions || 0,
    automationRatePct: 100,
    aiMessagesTotal: 0,
    humanMessagesTotal: 0,
    userMessagesTotal: 0
  };

  const series =
    chartRange === 'today'
      ? (analytics?.messagesByHourToday || []).filter((_, idx) => idx >= 7 && idx <= 22)
      : analytics?.messagesLast7Days || [];

  const maxBarValue = Math.max(
    4,
    ...series.map((b) => Math.max(b.received, b.aiReplies + b.humanReplies))
  );

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const aiRatio =
    aiVsHuman.totalConversations > 0
      ? aiVsHuman.aiOnlySessions / aiVsHuman.totalConversations
      : 1;
  const aiDash = circumference * aiRatio;
  const humanDash = circumference * (1 - aiRatio);

  const topExisting = analytics?.topExistingDemands || [];
  const topMissed = analytics?.topMissedDemands || metrics?.missedDemands || [];
  const maxExisting = Math.max(1, ...topExisting.map((d) => d.searchCount));
  const maxMissed = Math.max(1, ...topMissed.map((d: any) => d.searchCount || 1));

  function formatRelativeTime(iso?: string) {
    if (!iso) return '';
    try {
      const dt = new Date(iso);
      return dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI TELEMETRY STRIP (INDUSTRIAL PRECISION) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="nx-kpi-tile">
          <div className="flex items-center justify-between text-xs text-[var(--nx-muted)]">
            <span>Mensagens hoje</span>
            <MessageSquare className="w-4 h-4 text-[var(--nx-primary)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {analytics?.messagesToday.received ?? 0}
            </span>
            <span className="text-xs text-[var(--nx-muted)]">recebidas</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>IA respondeu: {analytics?.messagesToday.aiReplies ?? 0}</span>
            <span>Humano: {analytics?.messagesToday.humanReplies ?? 0}</span>
          </div>
        </div>

        <div className="nx-kpi-tile">
          <div className="flex items-center justify-between text-xs text-[var(--nx-muted)]">
            <span>Autonomia da IA</span>
            <Activity className="w-4 h-4 text-[var(--nx-accent)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {aiVsHuman.automationRatePct}%
            </span>
            <span className="text-xs text-[var(--nx-accent)] font-medium">100% IA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>{aiVsHuman.aiOnlySessions} só IA</span>
            <span>{aiVsHuman.humanIntervenedSessions} com humano</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('contacts')}
          className="nx-kpi-tile text-left hover:border-[var(--nx-primary)] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[var(--nx-muted)]">
            <span>Contatos & Filtro IA</span>
            <Users className="w-4 h-4 text-[var(--nx-primary)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {analytics?.totalContactsCount ?? metrics?.activeSessions ?? 0}
            </span>
            <span className="text-xs text-[var(--nx-muted)]">contatos</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>{analytics?.blockedContactsCount ?? 0} bloqueados p/ IA</span>
            <span className="text-[var(--nx-primary)] font-medium">Gerenciar</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigateTab(
              enabledModules.includes('stock') || enabledModules.includes('services')
                ? 'promotions'
                : 'appointments'
            )
          }
          className="nx-kpi-tile text-left hover:border-[var(--nx-primary)] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[var(--nx-muted)]">
            <span>{enabledModules.includes('stock') ? 'Catálogo & Ofertas' : 'Serviços & Ofertas'}</span>
            <Tag className="w-4 h-4 text-[var(--nx-amber)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {enabledModules.includes('stock')
                ? metrics?.totalCatalog ?? 0
                : metrics?.totalServices ?? 0}
            </span>
            <span className="text-xs text-[var(--nx-muted)]">
              {enabledModules.includes('stock') ? 'produtos' : 'serviços'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>{analytics?.activePromotionsCount ?? 0} promoções ativas</span>
            <span className="text-[var(--nx-primary)] font-medium">Abrir</span>
          </div>
        </button>
      </div>

      {/* ROW 1: GRÁFICO DE MENSAGENS + IA VS HUMANO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 7: Volume de Mensagens (Hoje 24h ou 7 dias) */}
        <div className="lg:col-span-7 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--nx-text)]">
                Mensagens recebidas e respondidas
              </h3>
              <p className="text-[11px] text-[var(--nx-muted)]">
                Fluxo de entrada no WhatsApp comparado com respostas da IA e equipe humana.
              </p>
            </div>
            <div className="flex rounded-md border border-[var(--nx-border-strong)] p-0.5 bg-[var(--nx-bg)] text-[11px]">
              <button
                type="button"
                onClick={() => setChartRange('today')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  chartRange === 'today'
                    ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                    : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                }`}
              >
                Hoje (horas)
              </button>
              <button
                type="button"
                onClick={() => setChartRange('7d')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  chartRange === '7d'
                    ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                    : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                }`}
              >
                Últimos 7 dias
              </button>
            </div>
          </div>

          <div className="relative">
            <svg
              viewBox="0 0 600 200"
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label="Gráfico de mensagens recebidas e respondidas"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                const y = 165 - step * 145;
                const val = Math.round(maxBarValue * step);
                return (
                  <g key={step}>
                    <line
                      x1="28"
                      y1={y}
                      x2="594"
                      y2={y}
                      stroke="var(--nx-border)"
                      strokeDasharray={step === 0 ? undefined : '3 3'}
                      strokeWidth="1"
                    />
                    <text
                      x="22"
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="var(--nx-subtle)"
                      className="tabular-data"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {series.map((bucket, idx) => {
                const slotWidth = 560 / Math.max(1, series.length);
                const xStart = 32 + idx * slotWidth;
                const barW = Math.max(6, Math.min(18, slotWidth * 0.32));
                const hRec = (bucket.received / maxBarValue) * 145;
                const hAi = (bucket.aiReplies / maxBarValue) * 145;
                const hHum = (bucket.humanReplies / maxBarValue) * 145;
                const isHovered = hoveredIdx === idx;

                return (
                  <g
                    key={bucket.label}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    {isHovered && (
                      <rect
                        x={xStart}
                        y={16}
                        width={slotWidth - 2}
                        height={150}
                        rx="4"
                        fill="var(--nx-primary-soft)"
                        opacity="0.55"
                      />
                    )}

                    <rect
                      x={xStart + slotWidth * 0.16}
                      y={165 - hRec}
                      width={barW}
                      height={Math.max(hRec, bucket.received > 0 ? 3 : 0)}
                      rx="2"
                      fill="var(--nx-primary)"
                    />

                    <rect
                      x={xStart + slotWidth * 0.16 + barW + 2}
                      y={165 - hAi}
                      width={barW}
                      height={Math.max(hAi, bucket.aiReplies > 0 ? 3 : 0)}
                      rx="2"
                      fill="var(--nx-accent)"
                    />

                    {bucket.humanReplies > 0 && (
                      <rect
                        x={xStart + slotWidth * 0.16 + barW + 2}
                        y={165 - hAi - hHum}
                        width={barW}
                        height={Math.max(hHum, 3)}
                        rx="2"
                        fill="var(--nx-amber)"
                      />
                    )}

                    {(chartRange === '7d' || idx % 2 === 0) && (
                      <text
                        x={xStart + slotWidth / 2}
                        y="184"
                        textAnchor="middle"
                        fontSize="9.5"
                        fill="var(--nx-muted)"
                      >
                        {'shortLabel' in bucket ? bucket.shortLabel : bucket.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="mt-2 pt-2.5 border-t border-[var(--nx-border)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-4 text-[var(--nx-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--nx-primary)]" />
                  Recebidas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--nx-accent)]" />
                  Respostas IA
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--nx-amber)]" />
                  Atendente Humano
                </span>
              </div>

              {hoveredIdx !== null && series[hoveredIdx] && (
                <div className="text-[11px] text-[var(--nx-text)] bg-[var(--nx-bg)] px-2.5 py-0.5 rounded border border-[var(--nx-border)] tabular-data">
                  {series[hoveredIdx].label}: {series[hoveredIdx].received} rec /{' '}
                  {series[hoveredIdx].aiReplies} IA / {series[hoveredIdx].humanReplies} hum
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 5: IA 100% vs Intervenção Humana */}
        <div className="lg:col-span-5 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[var(--nx-text)]">
              Atendimento 100% IA vs Humano
            </h3>
            <p className="text-[11px] text-[var(--nx-muted)]">
              Conversas resolvidas sem intervenção comparadas com transbordos para equipe.
            </p>
          </div>

          <div className="flex items-center gap-5 my-2">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="var(--nx-surface-alt)"
                  strokeWidth="14"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="var(--nx-accent)"
                  strokeWidth="14"
                  strokeDasharray={`${aiDash} ${circumference}`}
                  strokeLinecap="butt"
                />
                {aiVsHuman.humanIntervenedSessions > 0 && (
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="var(--nx-amber)"
                    strokeWidth="14"
                    strokeDasharray={`${humanDash} ${circumference}`}
                    strokeDashoffset={-aiDash}
                    strokeLinecap="butt"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-data text-[var(--nx-text)] leading-none">
                  {aiVsHuman.automationRatePct}%
                </span>
                <span className="text-[10px] text-[var(--nx-muted)] mt-1">autônomo</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div className="p-2.5 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--nx-text)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--nx-accent)]" />
                    100% pela IA
                  </span>
                  <span className="font-bold tabular-data text-[var(--nx-text)]">
                    {aiVsHuman.aiOnlySessions}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--nx-subtle)] mt-0.5">
                  {aiVsHuman.aiMessagesTotal} mensagens enviadas pela IA
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--nx-text)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--nx-amber)]" />
                    Tratado por Humano
                  </span>
                  <span className="font-bold tabular-data text-[var(--nx-text)]">
                    {aiVsHuman.humanIntervenedSessions}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--nx-subtle)] mt-0.5">
                  {aiVsHuman.humanMessagesTotal} mensagens manuais da equipe
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--nx-muted)]">
              Total analisado:{' '}
              <strong className="tabular-data text-[var(--nx-text)]">
                {aiVsHuman.totalConversations}
              </strong>{' '}
              conversas
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('radar')}
              className="text-[var(--nx-primary)] font-semibold hover:underline"
            >
              Ver Radar ({analytics?.coldConversationsCount ?? 0})
            </button>
          </div>
        </div>
      </div>

      {/* ROW 2: ITENS & SERVIÇOS MAIS PROCURADOS (TEMOS VS OPORTUNIDADES EXPANSÍVEIS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 6: Mais procurados que TEMOS */}
        <div className="lg:col-span-6 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--nx-text)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--nx-primary)]" />
                Mais procurados no nosso catálogo
              </h3>
              <p className="text-[11px] text-[var(--nx-muted)]">
                Produtos e serviços ativos com maior volume de consulta no WhatsApp.
              </p>
            </div>
          </div>

          {topExisting.length === 0 ? (
            <div className="text-xs text-[var(--nx-subtle)] py-8 text-center border border-dashed border-[var(--nx-border)] rounded-lg">
              As consultas de produtos e serviços aparecerão aqui automaticamente.
            </div>
          ) : (
            <div className="space-y-3">
              {topExisting.map((item) => {
                const pct = Math.max(8, Math.round((item.searchCount / maxExisting) * 100));
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-[var(--nx-text)] truncate">
                        {item.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] font-semibold text-[11px] tabular-data shrink-0">
                        {item.searchCount}x
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--nx-surface-alt)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--nx-primary)] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Col 6: Oportunidades que ainda não oferecemos (EXPANSÍVEL COM CONVERSAS SALVAS) */}
        <div className="lg:col-span-6 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--nx-text)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--nx-amber)]" />
                Oportunidades: itens que ainda não oferecemos
              </h3>
              <p className="text-[11px] text-[var(--nx-muted)]">
                Clique em qualquer item para expandir e ver em quais conversas de WhatsApp os clientes pediram.
              </p>
            </div>
          </div>

          {topMissed.length === 0 ? (
            <div className="text-xs text-[var(--nx-subtle)] py-8 text-center border border-dashed border-[var(--nx-border)] rounded-lg">
              Nenhum item fora de catálogo solicitado recentemente.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topMissed.map((item: any) => {
                const rowId = item.id || item.name || item.term;
                const label = item.name || item.productName || item.term;
                const count = item.searchCount || 1;
                const pct = Math.max(8, Math.round((count / maxMissed) * 100));
                const occurrences: DemandOccurrence[] = Array.isArray(item.occurrences)
                  ? item.occurrences
                  : [];
                const isExpanded = expandedMissedId === rowId;

                return (
                  <div
                    key={rowId}
                    className={`rounded-lg border transition-colors ${
                      isExpanded
                        ? 'border-[var(--nx-amber)]/50 bg-[var(--nx-bg)]'
                        : 'border-[var(--nx-border)] bg-[var(--nx-surface)] hover:border-[var(--nx-border-strong)]'
                    }`}
                  >
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedMissedId(isExpanded ? null : rowId)}
                          className="flex items-center gap-2 min-w-0 text-left flex-1 group"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--nx-amber)] shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--nx-subtle)] group-hover:text-[var(--nx-text)] shrink-0" />
                          )}
                          <span className="font-semibold text-[var(--nx-text)] truncate">
                            {label}
                          </span>
                          {occurrences.length > 0 && (
                            <span className="text-[10px] text-[var(--nx-muted)] shrink-0">
                              ({occurrences.length} conversa{occurrences.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-[var(--nx-amber-bg)] text-[var(--nx-amber)] font-semibold text-[11px] tabular-data">
                            {count}x
                          </span>
                          <button
                            type="button"
                            onClick={() => onQuickCreateFromDemand(label)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] hover:text-[var(--nx-primary)] text-[11px] font-medium text-[var(--nx-text)] transition-colors"
                            title="Passar a oferecer este item"
                          >
                            <Plus className="w-3 h-3" />
                            Cadastrar
                          </button>
                        </div>
                      </div>

                      <div className="h-1.5 w-full bg-[var(--nx-surface-alt)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--nx-amber)] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Conversas registradas onde o cliente pediu este item */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-[var(--nx-border)] space-y-2 animate-fade-up">
                        {occurrences.length === 0 ? (
                          <div className="text-[11px] text-[var(--nx-subtle)] py-1">
                            Nenhuma conversa individual vinculada ainda. Próximas solicitações aparecerão aqui com link direto para o chat.
                          </div>
                        ) : (
                          occurrences.map((occ, idx) => (
                            <div
                              key={`${occ.customerPhone}-${idx}`}
                              className="p-2.5 rounded-md bg-[var(--nx-surface)] border border-[var(--nx-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-bold text-[var(--nx-text)]">
                                    {occ.customerName || `+${occ.customerPhone}`}
                                  </span>
                                  <span className="text-[var(--nx-subtle)] tabular-data">
                                    +{occ.customerPhone}
                                  </span>
                                  {occ.requestedAt && (
                                    <span className="text-[10px] text-[var(--nx-subtle)] tabular-data">
                                      {formatRelativeTime(occ.requestedAt)}
                                    </span>
                                  )}
                                </div>
                                {occ.messageSnippet && (
                                  <p className="text-[11px] text-[var(--nx-muted)] leading-snug">
                                    "{occ.messageSnippet}"
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  onOpenConversation
                                    ? onOpenConversation(occ.customerPhone)
                                    : onNavigateTab('inbox')
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--nx-primary)] bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] text-[11px] font-semibold hover:opacity-90 shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver conversa
                              </button>
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
    </div>
  );
};

export default OverviewAnalyticsPanel;
