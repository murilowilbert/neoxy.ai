import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

interface CustomTimePickerProps {
  value: string;
  onChange: (nextVal: string) => void;
  ariaLabel?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const QUICK_MINUTES = ['00', '15', '30', '45'];

function parseTime(val: string): { hour: string; minute: string } {
  const match = String(val || '').match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return { hour: '08', minute: '00' };
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return {
    hour: String(h).padStart(2, '0'),
    minute: String(m).padStart(2, '0')
  };
}

function normalizeTypedTime(raw: string, fallback: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return fallback;
  let h = 0;
  let m = 0;
  if (digits.length <= 2) {
    h = Number(digits);
    m = 0;
  } else if (digits.length === 3) {
    h = Number(digits.slice(0, 1));
    m = Number(digits.slice(1, 3));
  } else {
    h = Number(digits.slice(0, 2));
    m = Number(digits.slice(2, 4));
  }
  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Seletor de horário oficial NEO (substitui o <input type="time"> nativo do navegador).
 * Permite digitar diretamente (ex: 0830 -> 08:30) ou escolher na lista flutuante em Portal
 * estilizada com a paleta NEO Volt, Preto Real e Modo Claro.
 */
export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  ariaLabel = 'Selecionar horário',
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '08:00');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({
    left: 0
  });

  const { hour: selectedHour, minute: selectedMinute } = parseTime(value);

  useEffect(() => {
    setDraft(value || '08:00');
  }, [value]);

  function updatePosition() {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popW = 204;
    const popH = 292;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < popH && rect.top > spaceBelow;
    const maxLeft = window.innerWidth - popW - 12;
    const left = Math.max(12, Math.min(rect.left, maxLeft));

    if (openUp) {
      setPos({ bottom: window.innerHeight - rect.top + 6, left });
    } else {
      setPos({ top: rect.bottom + 6, left });
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    // Centraliza a hora e minuto selecionados nas colunas ao abrir
    requestAnimationFrame(() => {
      const hBtn = hourColRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
      const mBtn = minColRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
      if (hBtn && hourColRef.current) {
        hourColRef.current.scrollTop =
          hBtn.offsetTop - hourColRef.current.clientHeight / 2 + hBtn.clientHeight / 2;
      }
      if (mBtn && minColRef.current) {
        minColRef.current.scrollTop =
          mBtn.offsetTop - minColRef.current.clientHeight / 2 + mBtn.clientHeight / 2;
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const handleRelayout = (e: Event) => {
      if (popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleRelayout);
    window.addEventListener('scroll', handleRelayout, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleRelayout);
      window.removeEventListener('scroll', handleRelayout, true);
    };
  }, [open]);

  function commitTime(nextHour: string, nextMinute: string) {
    const formatted = `${nextHour}:${nextMinute}`;
    setDraft(formatted);
    onChange(formatted);
  }

  function handleDraftChange(raw: string) {
    // Permite digitar dígitos e ":" livremente (até 5 caracteres)
    const cleaned = raw.replace(/[^\d:]/g, '').slice(0, 5);
    setDraft(cleaned);
    if (/^\d{2}:\d{2}$/.test(cleaned)) {
      const parsed = parseTime(cleaned);
      onChange(`${parsed.hour}:${parsed.minute}`);
    }
  }

  function handleDraftBlur() {
    const normalized = normalizeTypedTime(draft, `${selectedHour}:${selectedMinute}`);
    setDraft(normalized);
    if (normalized !== value) {
      onChange(normalized);
    }
  }

  const popoverPortal =
    open &&
    createPortal(
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={ariaLabel}
        className="nx-time-popover animate-slide-down"
        style={{
          position: 'fixed',
          top: pos.top !== undefined ? `${pos.top}px` : undefined,
          bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
          left: `${pos.left}px`,
          width: '204px',
          zIndex: 230
        }}
      >
        <div className="grid grid-cols-2 gap-1.5 px-2 pt-2 pb-1.5 border-b border-[var(--nx-border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--nx-subtle)] text-center">
          <span>Hora</span>
          <span>Min</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2">
          <div
            ref={hourColRef}
            className="nx-time-col h-44 overflow-y-auto space-y-1 pr-0.5"
          >
            {HOURS.map((h) => {
              const isSelected = h === selectedHour;
              return (
                <button
                  key={h}
                  type="button"
                  data-selected={isSelected ? 'true' : undefined}
                  onClick={() => commitTime(h, selectedMinute)}
                  className={`nx-time-cell ${isSelected ? 'nx-time-cell--selected' : ''}`}
                >
                  {h}
                </button>
              );
            })}
          </div>

          <div
            ref={minColRef}
            className="nx-time-col h-44 overflow-y-auto space-y-1 pl-0.5 border-l border-[var(--nx-border)]"
          >
            {MINUTES.map((m) => {
              const isSelected = m === selectedMinute;
              return (
                <button
                  key={m}
                  type="button"
                  data-selected={isSelected ? 'true' : undefined}
                  onClick={() => commitTime(selectedHour, m)}
                  className={`nx-time-cell ${isSelected ? 'nx-time-cell--selected' : ''}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-2 py-2 border-t border-[var(--nx-border)] flex items-center justify-between gap-1 bg-[var(--nx-bg)]/60 rounded-b-2xl">
          <div className="flex items-center gap-1">
            {QUICK_MINUTES.map((qm) => (
              <button
                key={qm}
                type="button"
                onClick={() => commitTime(selectedHour, qm)}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-data transition-colors ${
                  selectedMinute === qm
                    ? 'bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border border-[var(--nx-volt-border)]'
                    : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]'
                }`}
              >
                :{qm}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2.5 py-1 rounded-full text-[10.5px] font-bold nx-volt-badge hover:opacity-90 transition-opacity"
          >
            OK
          </button>
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={wrapRef} className={`relative inline-flex ${className}`.trim()}>
      <div
        className={`nx-time-trigger ${open ? 'is-open' : ''}`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onBlur={handleDraftBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleDraftBlur();
              setOpen(false);
            }
          }}
          className="w-[46px] bg-transparent text-xs font-semibold tabular-data text-[var(--nx-text)] outline-none text-center"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          aria-label={open ? 'Fechar lista de horários' : 'Abrir lista de horários'}
          className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors ${
            open
              ? 'bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)]'
              : 'text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      </div>
      {popoverPortal}
    </div>
  );
};

export default CustomTimePicker;
