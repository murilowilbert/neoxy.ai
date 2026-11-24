import React from 'react';
import NeoxyLogo from './NeoxyLogo';

interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = '' }) => (
  <div className={`nx-skeleton ${className}`} aria-hidden="true" />
);

/**
 * Card Skeleton fiel à referência visual (Imagem 4):
 * Bloco de mídia arredondado + título + subtítulo menor + dois botões-pílula,
 * comunicando claramente o layout que será carregado.
 */
export const CardSkeleton: React.FC<{ withMedia?: boolean }> = ({ withMedia = true }) => (
  <div
    className="rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-surface)] overflow-hidden p-4 space-y-4 shadow-sm"
    aria-busy="true"
    aria-label="Carregando conteúdo"
  >
    {withMedia && <SkeletonBlock className="w-full h-44 rounded-xl" />}
    <div className="space-y-2.5 px-1">
      <SkeletonBlock className="h-5 w-3/4 rounded-full" />
      <SkeletonBlock className="h-3.5 w-2/5 rounded-full" />
      <div className="pt-1 space-y-1.5">
        <SkeletonBlock className="h-3 w-full rounded-full" />
        <SkeletonBlock className="h-3 w-5/6 rounded-full" />
      </div>
    </div>
    <div className="flex items-center gap-2.5 px-1 pt-1">
      <SkeletonBlock className="h-10 w-28 rounded-full" />
      <SkeletonBlock className="h-10 w-24 rounded-full" />
    </div>
  </div>
);

export const CardGridSkeleton: React.FC<{
  count?: number;
  columns?: 2 | 3;
  withMedia?: boolean;
}> = ({ count = 6, columns = 3, withMedia = true }) => (
  <div
    className={`grid grid-cols-1 ${
      columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'
    } gap-5`}
    role="status"
    aria-live="polite"
    aria-label="Carregando cartões..."
  >
    {Array.from({ length: count }).map((_, idx) => (
      <CardSkeleton key={idx} withMedia={withMedia} />
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div
    className="rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-surface)] overflow-hidden"
    role="status"
    aria-live="polite"
    aria-label="Carregando lista..."
  >
    <div className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] px-5 py-3.5 flex items-center gap-4">
      <SkeletonBlock className="h-3.5 w-20 rounded-full" />
      <SkeletonBlock className="h-3.5 w-44 rounded-full" />
      <SkeletonBlock className="h-3.5 w-24 rounded-full hidden sm:block" />
      <SkeletonBlock className="h-3.5 w-24 rounded-full ml-auto" />
    </div>
    <div className="divide-y divide-[var(--nx-border)]">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="px-5 py-4 flex items-center gap-4">
          <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-2/5 rounded-full" />
            <SkeletonBlock className="h-3 w-1/4 rounded-full" />
          </div>
          <SkeletonBlock className="h-6 w-20 rounded-full hidden sm:block" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const OverviewSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando painel...">
    {/* 4 KPI Tiles Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3.5 w-28 rounded-full" />
            <SkeletonBlock className="h-7 w-7 rounded-lg" />
          </div>
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
          <div className="pt-2 border-t border-[var(--nx-border)] flex justify-between">
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="h-3 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>

    {/* Charts Row Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-7 rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-48 rounded-full" />
            <SkeletonBlock className="h-3 w-64 rounded-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="w-full h-56 rounded-xl" />
      </div>

      <div className="lg:col-span-5 rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-5 space-y-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-44 rounded-full" />
          <SkeletonBlock className="h-3 w-56 rounded-full" />
        </div>
        <div className="flex items-center gap-5 py-3">
          <SkeletonBlock className="w-40 h-40 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-16 w-full rounded-xl" />
            <SkeletonBlock className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ChatReplySkeleton: React.FC = () => (
  <div
    className="rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-bg)] p-4 space-y-3"
    role="status"
    aria-label="Processando resposta da IA..."
  >
    <div className="flex items-center gap-2.5">
      <SkeletonBlock className="w-7 h-7 rounded-full shrink-0" />
      <SkeletonBlock className="h-3.5 w-32 rounded-full" />
    </div>
    <div className="space-y-2 pl-9">
      <SkeletonBlock className="h-3.5 w-11/12 rounded-full" />
      <SkeletonBlock className="h-3.5 w-3/4 rounded-full" />
      <SkeletonBlock className="h-3.5 w-1/2 rounded-full" />
    </div>
  </div>
);

/**
 * Skeleton completo de inicialização do app (substitui spinner / texto genérico).
 */
export const AppBootSkeleton: React.FC = () => (
  <div
    className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] px-4 sm:px-6 pt-5 pb-12"
    role="status"
    aria-live="polite"
    aria-label="Carregando ambiente NEO"
  >
    {/* Floating Liquid Glass Navbar Skeleton */}
    <div className="max-w-6xl mx-auto nx-liquid-glass rounded-2xl sm:rounded-full px-5 h-16 flex items-center justify-between mb-10">
      <div className="flex items-center gap-3">
        <NeoxyLogo variant="lockup" height={18} />
      </div>
      <div className="hidden md:flex items-center gap-4">
        <SkeletonBlock className="h-3.5 w-16 rounded-full" />
        <SkeletonBlock className="h-3.5 w-16 rounded-full" />
        <SkeletonBlock className="h-3.5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2.5">
        <SkeletonBlock className="h-9 w-9 rounded-full" />
        <SkeletonBlock className="h-9 w-24 rounded-full" />
      </div>
    </div>

    {/* Layout Skeleton Cards */}
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <SkeletonBlock className="h-6 w-36 rounded-full" />
          <SkeletonBlock className="h-10 w-11/12 rounded-xl" />
          <SkeletonBlock className="h-10 w-3/4 rounded-xl" />
          <SkeletonBlock className="h-4 w-5/6 rounded-full" />
          <div className="flex items-center gap-3 pt-2">
            <SkeletonBlock className="h-11 w-36 rounded-full" />
            <SkeletonBlock className="h-11 w-36 rounded-full" />
          </div>
        </div>
        <div className="lg:col-span-6">
          <SkeletonBlock className="w-full aspect-[4/3] rounded-2xl" />
        </div>
      </div>

      <CardGridSkeleton count={3} columns={3} />
    </div>
  </div>
);

export default SkeletonBlock;
