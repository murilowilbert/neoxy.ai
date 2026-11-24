import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useLanguage, type Language } from './LanguageProvider';

interface LangOption {
  code: Language;
  short: string;
  label: string;
  country: string;
}

const OPTIONS: LangOption[] = [
  { code: 'pt', short: 'PT', label: 'Português', country: 'Brasil' },
  { code: 'en', short: 'EN', label: 'English', country: 'United States' },
  { code: 'es', short: 'ES', label: 'Español', country: 'España' }
];

const TOOLTIP_PREFIX: Record<Language, string> = {
  pt: 'Idioma',
  en: 'Language',
  es: 'Idioma'
};

/** Bandeiras circulares minimalistas (estilo circle-flags) em SVG inline com cores oficiais */
export const FlagCircleIcon: React.FC<{ lang: Language; size?: number }> = ({ lang, size = 18 }) => {
  const uid = `flag-${lang}-${size}`;

  if (lang === 'pt') {
    // Brasil: Verde #009C3B, Amarelo #FFDF00, Azul #002776 + faixa branca sutil
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="rounded-full shrink-0 block">
        <defs>
          <clipPath id={`${uid}-clip`}>
            <circle cx="12" cy="12" r="12" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-clip)`}>
          <rect width="24" height="24" fill="#009C3B" />
          <polygon points="12,3.4 21.4,12 12,20.6 2.6,12" fill="#FFDF00" />
          <circle cx="12" cy="12" r="4.6" fill="#002776" />
          <path d="M7.6 10.9c2.7-1.1 6.3-.4 8.7 1.6" stroke="#FFFFFF" strokeWidth="1.25" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (lang === 'en') {
    // Estados Unidos: Vermelho #B22234, Branco #FFFFFF, Azul #3C3B6E com estrelas minimalistas
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="rounded-full shrink-0 block">
        <defs>
          <clipPath id={`${uid}-clip`}>
            <circle cx="12" cy="12" r="12" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-clip)`}>
          <rect width="24" height="24" fill="#FFFFFF" />
          <rect y="0" width="24" height="2.4" fill="#B22234" />
          <rect y="4.8" width="24" height="2.4" fill="#B22234" />
          <rect y="9.6" width="24" height="2.4" fill="#B22234" />
          <rect y="14.4" width="24" height="2.4" fill="#B22234" />
          <rect y="19.2" width="24" height="2.4" fill="#B22234" />
          <rect width="12.2" height="12.2" fill="#3C3B6E" />
          <circle cx="3.6" cy="3.8" r="0.95" fill="#FFFFFF" />
          <circle cx="7.0" cy="3.8" r="0.95" fill="#FFFFFF" />
          <circle cx="10.0" cy="3.8" r="0.95" fill="#FFFFFF" />
          <circle cx="5.3" cy="6.6" r="0.95" fill="#FFFFFF" />
          <circle cx="8.6" cy="6.6" r="0.95" fill="#FFFFFF" />
          <circle cx="3.6" cy="9.4" r="0.95" fill="#FFFFFF" />
          <circle cx="7.0" cy="9.4" r="0.95" fill="#FFFFFF" />
          <circle cx="10.0" cy="9.4" r="0.95" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  // Espanha: Vermelho #AA151B, Amarelo #F1BF00 + detalhe minimalista do brasão
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="rounded-full shrink-0 block">
      <defs>
        <clipPath id={`${uid}-clip`}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="24" height="24" fill="#AA151B" />
        <rect y="6" width="24" height="12" fill="#F1BF00" />
        <rect x="6.5" y="9.5" width="3.8" height="5" rx="1.6" fill="#AA151B" />
        <rect x="7.4" y="10.4" width="2" height="2.2" rx="0.6" fill="#F1BF00" />
      </g>
    </svg>
  );
};

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const active = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];

  const updatePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popW = 168;
    const rawLeft = rect.right - popW;
    const left = Math.max(12, Math.min(window.innerWidth - popW - 12, rawLeft));
    const top = Math.min(window.innerHeight - 156, rect.bottom + 8);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onResizeOrScroll = () => updatePosition();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [open]);

  const tooltipLabel = `${TOOLTIP_PREFIX[lang]}: ${active.label}`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-9 w-9 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)]/80 text-[var(--nx-text)] hover:border-[var(--nx-volt)] hover:shadow-[0_0_0_3px_var(--nx-primary-ring)] transition-all flex items-center justify-center shrink-0 ${
          open ? 'border-[var(--nx-volt)] shadow-[0_0_0_3px_var(--nx-primary-ring)]' : ''
        } ${className}`}
        aria-label={tooltipLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={tooltipLabel}
      >
        <span className="rounded-full ring-1 ring-black/10 dark:ring-white/15 overflow-hidden flex items-center justify-center">
          <FlagCircleIcon lang={lang} size={18} />
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popRef}
            role="listbox"
            aria-label={TOOLTIP_PREFIX[lang]}
            className="nx-lang-popover fixed z-[9995] w-[168px] p-1.5"
            style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
          >
            {OPTIONS.map((opt) => {
              const selected = opt.code === lang;
              return (
                <button
                  key={opt.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setLang(opt.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left text-[13px] font-medium transition-colors ${
                    selected
                      ? 'bg-[var(--nx-volt-surface)] text-[var(--nx-text)] font-semibold'
                      : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]/80'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="rounded-full ring-1 ring-black/10 dark:ring-white/15 overflow-hidden shrink-0">
                      <FlagCircleIcon lang={opt.code} size={18} />
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {selected ? (
                    <span className="w-4 h-4 rounded-full bg-[var(--nx-volt)] text-[#09090B] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[var(--nx-subtle)] shrink-0">
                      {opt.short}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};

export default LanguageToggle;
