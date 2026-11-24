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
  ExternalLink,
  Package,
  Scissors
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTheme } from '../ThemeProvider';
import { OverviewSkeleton } from '../Skeleton';

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
  imageUrl?: string | null;
  category?: string | null;
  price?: number | null;
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
  loading?: boolean;
  onQuickCreateFromDemand: (name: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenConversation?: (customerPhone: string) => void;
}

const MessagesFloatingTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const fullLabel = payload[0]?.payload?.label || label;
  return (
    <div
      className="rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] px-3 py-2.5 shadow-lg text-xs min-w-[165px]"
      style={{ pointerEvents: 'none' }}
    >
      <div className="font-bold text-[var(--nx-text)] pb-1.5 mb-1.5 border-b border-[var(--nx-border)]">
        {fullLabel}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-[var(--nx-muted)]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-bold tabular-data text-[var(--nx-text)]">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DonutFloatingTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div
      className="rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] px-3 py-2 shadow-lg text-xs"
      style={{ pointerEvents: 'none' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: entry.payload?.fill }}
        />
        <span className="font-semibold text-[var(--nx-text)]">{entry.name}</span>
      </div>
      <div className="mt-1 text-[11px] text-[var(--nx-muted)] tabular-data">
        <strong className="text-[var(--nx-text)]">{entry.value}</strong> conversa
        {entry.value === 1 ? '' : 's'} ({entry.payload?.pct}%)
      </div>
    </div>
  );
};

export const OverviewAnalyticsPanel: React.FC<OverviewAnalyticsPanelProps> = ({
  analytics,
  metrics,
  enabledModules,
  loading = false,
  onQuickCreateFromDemand,
  onNavigateTab,
  onOpenConversation
}) => {
  const { theme } = useTheme();
  const [chartRange, setChartRange] = useState<'today' | '7d'>('today');
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');
  const [expandedMissedId, setExpandedMissedId] = useState<string | null>(null);

  if (loading && !analytics) {
    return <OverviewSkeleton />;
  }

  const receivedColor = theme === 'dark' ? '#D4FF00' : '#111113';
  const aiColor = theme === 'dark' ? '#4ADE80' : '#15803D';
  const humanColor = theme === 'dark' ? '#FACC15' : '#D97706';

  const aiVsHuman = analytics?.aiVsHuman || {
    totalConversations: metrics?.activeSessions || 0,
    aiOnlySessions: Math.max(0, (metrics?.activeSessions || 0) - (metrics?.handoffSessions || 0)),
    humanIntervenedSessions: metrics?.handoffSessions || 0,
    automationRatePct: 100,
    aiMessagesTotal: 0,
    humanMessagesTotal: 0,
    userMessagesTotal: 0
  };

  const series: Array<{
    axisLabel: string;
    label: string;
    received: number;
    aiReplies: number;
    humanReplies: number;
  }> =
    chartRange === 'today'
      ? (analytics?.messagesByHourToday || [])
          .filter((_, idx) => idx >= 7 && idx <= 22)
          .map((b) => ({
            axisLabel: b.label,
            label: b.label,
            received: b.received,
            aiReplies: b.aiReplies,
            humanReplies: b.humanReplies
          }))
      : (analytics?.messagesLast7Days || []).map((b) => ({
          axisLabel: b.shortLabel,
          label: b.label,
          received: b.received,
          aiReplies: b.aiReplies,
          humanReplies: b.humanReplies
        }));

  const totalSessionsSafe = Math.max(1, aiVsHuman.totalConversations);
  const donutData =
    aiVsHuman.totalConversations > 0
      ? [
          {
            name: '100% pela IA',
            value: aiVsHuman.aiOnlySessions,
            pct: Math.round((aiVsHuman.aiOnlySessions / totalSessionsSafe) * 100),
            fill: aiColor
          },
          {
            name: 'Tratado por Humano',
            value: aiVsHuman.humanIntervenedSessions,
            pct: Math.round((aiVsHuman.humanIntervenedSessions / totalSessionsSafe) * 100),
            fill: humanColor
          }
        ].filter((d) => d.value > 0)
      : [
          {
            name: 'Sem conversas ainda',
            value: 1,
            pct: 100,
            fill: 'var(--nx-border-strong)'
          }
        ];

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
      {/* KPI TELEMETRY STRIP (STUDIO-LIT SPOTLIGHT TILES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="nx-kpi-tile">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--nx-muted)]">
            <span>Mensagens hoje</span>
            <span className="nx-icon-tile nx-icon-tile--sm">
              <MessageSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {analytics?.messagesToday.received ?? 0}
            </span>
            <span className="text-xs text-[var(--nx-muted)]">recebidas</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>IA respondeu: {analytics?.messagesToday.aiReplies ?? 0}</span>
            <span>Humano: {analytics?.messagesToday.humanReplies ?? 0}</span>
          </div>
        </div>

        <div className="nx-kpi-tile">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--nx-muted)]">
            <span>Autonomia da IA</span>
            <span className="nx-icon-tile nx-icon-tile--sm text-[var(--nx-accent)]">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {aiVsHuman.automationRatePct}%
            </span>
            <span className="text-xs text-[var(--nx-accent)] font-medium">100% IA</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>{aiVsHuman.aiOnlySessions} só IA</span>
            <span>{aiVsHuman.humanIntervenedSessions} com humano</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('contacts')}
          className="nx-kpi-tile text-left"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--nx-muted)]">
            <span>Contatos & Filtro IA</span>
            <span className="nx-icon-tile nx-icon-tile--sm">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {analytics?.totalContactsCount ?? metrics?.activeSessions ?? 0}
            </span>
            <span className="text-xs text-[var(--nx-muted)]">contatos</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>{analytics?.blockedContactsCount ?? 0} bloqueados p/ IA</span>
            <span className="text-[var(--nx-volt-ink)] font-semibold">Gerenciar</span>
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
          className="nx-kpi-tile text-left"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--nx-muted)]">
            <span>{enabledModules.includes('stock') ? 'Catálogo & Ofertas' : 'Serviços & Ofertas'}</span>
            <span className="nx-icon-tile nx-icon-tile--sm text-[var(--nx-amber)]">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-data text-[var(--nx-text)]">
              {enabledModules.includes('stock')
                ? metrics?.totalCatalog ?? 0
                : metrics?.totalServices ?? 0}
            </span>
            <span className="text-xs text-[var(--nx-muted)]">
              {enabledModules.includes('stock') ? 'produtos' : 'serviços'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] flex items-center justify-between text-[11px] text-[var(--nx-subtle)]">
            <span>{analytics?.activePromotionsCount ?? 0} promoções ativas</span>
            <span className="text-[var(--nx-volt-ink)] font-semibold">Abrir</span>
          </div>
        </button>
      </div>

      {/* ROW 1: GRÁFICO INTERATIVO RECHARTS (ÁREA SUAVE / BARRAS) + DONUT MODERNO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 7: Volume de Mensagens com Tooltip flutuando acima do mouse */}
        <div className="lg:col-span-7 nx-spotlight-card p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--nx-text)]">
                Mensagens recebidas e respondidas
              </h3>
              <p className="text-xs text-[var(--nx-muted)] mt-0.5">
                Passe o mouse sobre o gráfico para inspecionar cada horário ou dia em detalhe.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-[var(--nx-border-strong)] p-0.5 bg-[var(--nx-bg)] text-[11px]">
                <button
                  type="button"
                  onClick={() => setChartStyle('area')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    chartStyle === 'area'
                      ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  Curva
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('bar')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    chartStyle === 'bar'
                      ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  Barras
                </button>
              </div>

              <div className="flex rounded-lg border border-[var(--nx-border-strong)] p-0.5 bg-[var(--nx-bg)] text-[11px]">
                <button
                  type="button"
                  onClick={() => setChartRange('today')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    chartRange === 'today'
                      ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setChartRange('7d')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    chartRange === '7d'
                      ? 'bg-[var(--nx-surface)] text-[var(--nx-text)] shadow-sm'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)]'
                  }`}
                >
                  7 dias
                </button>
              </div>
            </div>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'area' ? (
                <AreaChart data={series} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nxGradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={receivedColor} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={receivedColor} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="nxGradAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={aiColor} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={aiColor} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="nxGradHuman" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={humanColor} stopOpacity={0.26} />
                      <stop offset="95%" stopColor={humanColor} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--nx-border)"
                    strokeDasharray="3 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="axisLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--nx-muted)' }}
                    interval={chartRange === 'today' ? 1 : 0}
                    dy={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--nx-subtle)' }}
                  />
                  <Tooltip
                    content={<MessagesFloatingTooltip />}
                    cursor={{ stroke: 'var(--nx-border-strong)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Recebidas"
                    stroke={receivedColor}
                    strokeWidth={2.2}
                    fill="url(#nxGradReceived)"
                    activeDot={{ r: 5, stroke: 'var(--nx-surface)', strokeWidth: 2, fill: receivedColor }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aiReplies"
                    name="Respostas IA"
                    stroke={aiColor}
                    strokeWidth={2.2}
                    fill="url(#nxGradAi)"
                    activeDot={{ r: 5, stroke: 'var(--nx-surface)', strokeWidth: 2, fill: aiColor }}
                  />
                  <Area
                    type="monotone"
                    dataKey="humanReplies"
                    name="Humano"
                    stroke={humanColor}
                    strokeWidth={2}
                    fill="url(#nxGradHuman)"
                    activeDot={{ r: 5, stroke: 'var(--nx-surface)', strokeWidth: 2, fill: humanColor }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={series} margin={{ top: 10, right: 12, left: -18, bottom: 0 }} barGap={3}>
                  <CartesianGrid
                    stroke="var(--nx-border)"
                    strokeDasharray="3 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="axisLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--nx-muted)' }}
                    interval={chartRange === 'today' ? 1 : 0}
                    dy={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--nx-subtle)' }}
                  />
                  <Tooltip
                    content={<MessagesFloatingTooltip />}
                    cursor={{ fill: 'var(--nx-primary-soft)', radius: 6 }}
                  />
                  <Bar dataKey="received" name="Recebidas" fill={receivedColor} radius={[5, 5, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="aiReplies" name="Respostas IA" fill={aiColor} radius={[5, 5, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="humanReplies" name="Humano" fill={humanColor} radius={[5, 5, 0, 0]} maxBarSize={16} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] flex flex-wrap items-center gap-4 text-[11px] text-[var(--nx-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: receivedColor }} />
              Recebidas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: aiColor }} />
              Respostas IA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: humanColor }} />
              Atendente Humano
            </span>
          </div>
        </div>

        {/* Col 5: Donut Moderno Interativo (IA 100% vs Intervenção Humana) */}
        <div className="lg:col-span-5 nx-spotlight-card p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-bold text-[var(--nx-text)]">
              Atendimento 100% IA vs Humano
            </h3>
            <p className="text-xs text-[var(--nx-muted)] mt-0.5">
              Conversas resolvidas sem intervenção comparadas com transbordos para equipe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 my-1">
            <div className="relative w-44 h-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={74}
                    paddingAngle={donutData.length > 1 ? 5 : 0}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {donutData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutFloatingTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold tabular-data text-[var(--nx-text)] leading-none">
                  {aiVsHuman.automationRatePct}%
                </span>
                <span className="text-[11px] text-[var(--nx-muted)] mt-1">autônomo</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2.5 min-w-0">
              <div className="p-3 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--nx-text)]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: aiColor }} />
                    100% pela IA
                  </span>
                  <span className="font-bold tabular-data text-[var(--nx-text)]">
                    {aiVsHuman.aiOnlySessions}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--nx-subtle)] mt-1">
                  {aiVsHuman.aiMessagesTotal} mensagens enviadas pela IA
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--nx-text)]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: humanColor }} />
                    Tratado por Humano
                  </span>
                  <span className="font-bold tabular-data text-[var(--nx-text)]">
                    {aiVsHuman.humanIntervenedSessions}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--nx-subtle)] mt-1">
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

      {/* ROW 2: ITENS & SERVIÇOS MAIS PROCURADOS (COM THUMBNAIL) VS OPORTUNIDADES EXPANSÍVEIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 6: Mais procurados que TEMOS (com miniatura da foto do produto/serviço) */}
        <div className="lg:col-span-6 nx-spotlight-card p-5">
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
                const isService = item.itemType === 'SERVICE';
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    {/* Miniatura do Produto ou Serviço */}
                    <div className="w-10 h-10 rounded-lg border border-[var(--nx-border)] bg-[var(--nx-bg)] overflow-hidden flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isService ? (
                        <Scissors className="w-4 h-4 text-[var(--nx-muted)]" />
                      ) : (
                        <Package className="w-4 h-4 text-[var(--nx-muted)]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--nx-text)] truncate">
                            {item.name}
                          </div>
                          {(item.category || (item.price !== null && item.price !== undefined)) && (
                            <div className="text-[10px] text-[var(--nx-subtle)] flex items-center gap-2">
                              {item.category && <span>{item.category}</span>}
                              {item.price !== null && item.price !== undefined && (
                                <span className="tabular-data font-medium text-[var(--nx-muted)]">
                                  R$ {Number(item.price).toFixed(2).replace('.', ',')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Col 6: Oportunidades que ainda não oferecemos (EXPANSÍVEL COM CONVERSAS SALVAS) */}
        <div className="lg:col-span-6 nx-spotlight-card p-5">
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
